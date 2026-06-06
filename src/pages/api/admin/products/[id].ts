import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { withAdminAuth } from '../../../../lib/adminAuth';
import { z } from 'zod';

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  category: z.string().min(1).optional(),
  inventory: z
    .array(
      z.object({
        warehouseId: z.string(),
        totalUnits: z.number().int().min(0),
      })
    )
    .optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // GET - single product with full inventory
  if (req.method === 'GET') {
    const full = await prisma.product.findUnique({
      where: { id },
      include: { inventory: { include: { warehouse: true } } },
    });
    return res.status(200).json({ product: full });
  }

  // PUT - update product details and/or inventory
  if (req.method === 'PUT') {
    const parsed = UpdateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { inventory, ...productData } = parsed.data;

    if (Object.keys(productData).length > 0) {
      await prisma.product.update({ where: { id }, data: productData });
    }

    // Upsert each inventory row (never reduce below reservedUnits)
    if (inventory) {
      for (const inv of inventory) {
        if (inv.totalUnits === 0) {
          // If the admin cleared a warehouse to 0, delete its row (if no active reservations)
          const existing = await prisma.inventory.findUnique({
            where: { productId_warehouseId: { productId: id, warehouseId: inv.warehouseId } },
          });
          if (existing && existing.reservedUnits === 0) {
            await prisma.inventory.delete({
              where: { productId_warehouseId: { productId: id, warehouseId: inv.warehouseId } },
            });
          }
          // If there are active reservations, leave the row alone (don't create a 0-unit ghost)
          continue;
        }

        // Ensure totalUnits >= reservedUnits so available never goes negative
        const existing = await prisma.inventory.findUnique({
          where: { productId_warehouseId: { productId: id, warehouseId: inv.warehouseId } },
        });
        const minUnits = existing?.reservedUnits ?? 0;
        const safeTotal = Math.max(inv.totalUnits, minUnits);

        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: { productId: id, warehouseId: inv.warehouseId },
          },
          update: { totalUnits: safeTotal },
          create: {
            productId: id,
            warehouseId: inv.warehouseId,
            totalUnits: safeTotal,
            reservedUnits: 0,
          },
        });
      }
    }

    const full = await prisma.product.findUnique({
      where: { id },
      include: { inventory: { include: { warehouse: true } } },
    });
    return res.status(200).json({ product: full });
  }

  // DELETE - safe delete (blocks if pending reservations exist)
  if (req.method === 'DELETE') {
    const pendingReservations = await prisma.reservation.count({
      where: { productId: id, status: 'PENDING' },
    });
    if (pendingReservations > 0) {
      return res
        .status(409)
        .json({ error: `Cannot delete: ${pendingReservations} pending reservation(s) exist` });
    }

    await prisma.inventory.deleteMany({ where: { productId: id } });
    await prisma.reservation.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);