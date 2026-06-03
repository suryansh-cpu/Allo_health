import { prisma } from '../lib/prisma';
import { Prisma, ReservationStatus } from '@prisma/client';

export const RESERVATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

type Failure = { success: false; error: string; statusCode: number };
type Success<T> = { success: true } & T;

// Full reservation shape returned to the client, including nested product/warehouse.
export type ReservationDetail = Awaited<ReturnType<typeof fetchReservationDetail>>;

// ─── Internal helper ──────────────────────────────────────────────────────────

async function fetchReservationDetail(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, price: true, description: true, category: true } },
      warehouse: { select: { id: true, name: true, location: true } },
    },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Reserve units for a product/warehouse.
 *
 * ⚡ CONCURRENCY GUARANTEE
 * We use a single atomic SQL UPDATE that both checks availability and increments
 * reservedUnits in one statement. If two concurrent requests race for the last unit,
 * exactly one will find `(totalUnits - reservedUnits) >= quantity` true and succeed;
 * the other will find zero rows updated and return 409.
 *
 * Raw SQL:
 *   UPDATE "Inventory"
 *   SET    "reservedUnits" = "reservedUnits" + $qty
 *   WHERE  "productId" = $p
 *     AND  "warehouseId" = $w
 *     AND  ("totalUnits" - "reservedUnits") >= $qty
 *
 * This is equivalent to a SELECT … FOR UPDATE + check + UPDATE, but in a single
 * round-trip — no separate transaction needed.
 */
export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number,
  customerName?: string,
  customerEmail?: string,
  idempotencyKey?: string,
): Promise<Success<{ reservation: NonNullable<ReservationDetail> }> | Failure> {
  if (!productId || !warehouseId) {
    return { success: false, error: 'productId and warehouseId are required', statusCode: 400 };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: 'quantity must be a positive integer', statusCode: 400 };
  }

  // ── Idempotency check ────────────────────────────────────────────────────
  if (idempotencyKey) {
    const existing = await fetchReservationDetail(
      (await prisma.reservation.findUnique({ where: { idempotencyKey } }))?.id ?? '',
    );
    if (existing) {
      return { success: true, reservation: existing };
    }
  }

  // ── Validate product / warehouse exist ───────────────────────────────────
  const [product, warehouse] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
  ]);
  if (!product) return { success: false, error: 'Product not found', statusCode: 404 };
  if (!warehouse) return { success: false, error: 'Warehouse not found', statusCode: 404 };

  // ── Atomic increment (the core concurrency guarantee) ────────────────────
  const updated = await prisma.$executeRaw`
    UPDATE "Inventory"
    SET    "reservedUnits" = "reservedUnits" + ${quantity}
    WHERE  "productId"   = ${productId}
      AND  "warehouseId" = ${warehouseId}
      AND  ("totalUnits" - "reservedUnits") >= ${quantity}
  `;

  if (updated === 0) {
    // Either no inventory row exists, or not enough stock available.
    const inv = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    if (!inv) {
      return {
        success: false,
        error: 'No inventory record for this product/warehouse combination',
        statusCode: 404,
      };
    }
    const available = inv.totalUnits - inv.reservedUnits;
    return {
      success: false,
      error: `Not enough stock. Available: ${available}, requested: ${quantity}.`,
      statusCode: 409,
    };
  }

  // ── Create the reservation record ────────────────────────────────────────
  const now = new Date();
  const reservation = await prisma.reservation.create({
    data: {
      productId,
      warehouseId,
      quantity,
      status: ReservationStatus.PENDING,
      expiresAt: new Date(now.getTime() + RESERVATION_WINDOW_MS),
      ...(customerName && { customerName }),
      ...(customerEmail && { customerEmail }),
      ...(idempotencyKey && { idempotencyKey }),
    },
    include: {
      product: { select: { id: true, name: true, price: true, description: true, category: true } },
      warehouse: { select: { id: true, name: true, location: true } },
    },
  });

  return { success: true, reservation };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getReservation(id: string): Promise<NonNullable<ReservationDetail> | null> {
  const reservation = await fetchReservationDetail(id);
  if (!reservation) return null;

  // Lazy expiry: if the reservation has passed its expiresAt while still pending, release it now.
  if (
    reservation.status === ReservationStatus.PENDING &&
    new Date() > new Date(reservation.expiresAt)
  ) {
    await expireReservationById(id, reservation.productId, reservation.warehouseId, reservation.quantity);
    const updated = await fetchReservationDetail(id);
    return updated;
  }

  return reservation;
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

export async function confirmReservation(
  id: string,
  idempotencyKey?: string,
): Promise<Success<{ reservation: NonNullable<ReservationDetail> }> | Failure> {
  // Idempotency: if already confirmed under this key, return cached result
  if (idempotencyKey) {
    const cached = await prisma.reservation.findFirst({
      where: { id, idempotencyKey, status: ReservationStatus.CONFIRMED },
    });
    if (cached) {
      const full = await fetchReservationDetail(id);
      return { success: true, reservation: full! };
    }
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return { success: false, error: 'Reservation not found', statusCode: 404 };

  if (reservation.status === ReservationStatus.CONFIRMED) {
    const full = await fetchReservationDetail(id);
    return { success: true, reservation: full! }; // idempotent
  }

  if (reservation.status === ReservationStatus.RELEASED) {
    return {
      success: false,
      error: 'This reservation has already been released.',
      statusCode: 410,
    };
  }

  if (new Date() > new Date(reservation.expiresAt)) {
    // Expire it lazily
    await expireReservationById(
      id,
      reservation.productId,
      reservation.warehouseId,
      reservation.quantity,
    );
    return {
      success: false,
      error: 'Reservation has expired. Please start a new checkout.',
      statusCode: 410,
    };
  }

  // Confirm: move units from reserved → permanently decremented.
  // Use a transaction so both writes are atomic.
  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CONFIRMED, confirmedAt: new Date() },
      include: {
        product: { select: { id: true, name: true, price: true, description: true, category: true } },
        warehouse: { select: { id: true, name: true, location: true } },
      },
    }),
    prisma.inventory.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        reservedUnits: { decrement: reservation.quantity },
        totalUnits: { decrement: reservation.quantity },
      },
    }),
  ]);

  return { success: true, reservation: updated as NonNullable<ReservationDetail> };
}

// ─── Release ──────────────────────────────────────────────────────────────────

export async function releaseReservation(
  id: string,
): Promise<Success<{ reservation: NonNullable<ReservationDetail> }> | Failure> {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return { success: false, error: 'Reservation not found', statusCode: 404 };

  if (reservation.status === ReservationStatus.RELEASED) {
    const full = await fetchReservationDetail(id);
    return { success: true, reservation: full! }; // idempotent
  }

  if (reservation.status === ReservationStatus.CONFIRMED) {
    return { success: false, error: 'Cannot release a confirmed reservation.', statusCode: 400 };
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
      include: {
        product: { select: { id: true, name: true, price: true, description: true, category: true } },
        warehouse: { select: { id: true, name: true, location: true } },
      },
    }),
    prisma.inventory.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: { reservedUnits: { decrement: reservation.quantity } },
    }),
  ]);

  return { success: true, reservation: updated as NonNullable<ReservationDetail> };
}

// ─── Expire (internal) ────────────────────────────────────────────────────────

async function expireReservationById(
  id: string,
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  await prisma.$transaction([
    prisma.reservation.updateMany({
      where: { id, status: ReservationStatus.PENDING },
      data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
    }),
    prisma.inventory.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { reservedUnits: { decrement: quantity } },
    }),
  ]);
}

/**
 * Batch-expire all pending reservations whose expiresAt has passed.
 * Called by the Vercel Cron route (POST /api/cron/expire-reservations).
 */
export async function expireStaleReservations(): Promise<number> {
  const now = new Date();

  // Find all stale pending reservations
  const stale = await prisma.reservation.findMany({
    where: { status: ReservationStatus.PENDING, expiresAt: { lt: now } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (stale.length === 0) return 0;

  // Group by productId+warehouseId to batch the inventory updates
  const inventoryDeltas = new Map<string, { productId: string; warehouseId: string; qty: number }>();
  for (const r of stale) {
    const key = `${r.productId}:${r.warehouseId}`;
    const existing = inventoryDeltas.get(key);
    if (existing) {
      existing.qty += r.quantity;
    } else {
      inventoryDeltas.set(key, { productId: r.productId, warehouseId: r.warehouseId, qty: r.quantity });
    }
  }

  const staleIds = stale.map((r) => r.id);

  await prisma.$transaction([
    prisma.reservation.updateMany({
      where: { id: { in: staleIds } },
      data: { status: ReservationStatus.RELEASED, releasedAt: now },
    }),
    ...Array.from(inventoryDeltas.values()).map(({ productId, warehouseId, qty }) =>
      prisma.inventory.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reservedUnits: { decrement: qty } },
      }),
    ),
  ]);

  return stale.length;
}
