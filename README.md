# Allo — Inventory & Order Reservation Platform

> Solving the checkout race condition for multi-warehouse retail and D2C brands.

**Live demo → [allo-platform-app-4.vercel.app](https://allo-platform-app-4.vercel.app)**  
**GitHub → [github.com/suryansh-cpu/allo-platform](https://github.com/suryansh-cpu/allo-platform)**

When a customer hits checkout, we hold their units for 10 minutes. Payment succeeds → reservation confirmed, stock permanently decremented. Timer runs out or user cancels → hold released, units back on the shelf instantly.

---

## Running Locally

**Prerequisites:** Node.js 18+, a hosted PostgreSQL instance ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have free tiers)

```bash
# 1. Clone and install
git clone https://github.com/suryansh-cpu/allo-platform.git
cd allo-platform
npm install

# 2. Set up environment
cp .env.example .env.local
# → Edit .env.local and paste your DATABASE_URL
```

Your `.env.local` should look like:
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
CRON_SECRET=""
```

```bash
# 3. Push schema to your database and seed it
npm run db:push
npm run db:seed

# 4. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see 4 products seeded across 3 warehouses.

---

## HOW TO ADD DATA INTO THE DATABASE

1. Open a new terminal and go to project directoryy
2. use this command ->
```bash
npx prisma studio
```
3. You will see a list and click on products and then press add record and enter details
4. go to inventory now and add the respective product in inventory and also select a warehouse on the warehouse section of the inventory add record field too.
5. refresh the page

## How Expiry Works in Production

Reservations that aren't confirmed before `expiresAt` are released automatically via two complementary mechanisms:

**1. Vercel Cron job** (`vercel.json` → `POST /api/cron/expire-reservations`, runs daily)

Calls `expireStaleReservations()`, which finds all `PENDING` reservations past their `expiresAt` and releases them in a single batched Prisma transaction — decrementing `reservedUnits` per warehouse/product in one shot.

> Note: Vercel's Hobby plan caps cron jobs at once per day. In production on a paid plan this would run every minute. The lazy expiry layer below covers the gap.

**2. Lazy expiry on read** (`getReservation()`)

Every time a reservation is fetched, we check `status === PENDING && expiresAt < now` and expire it inline if true. This means a `confirm` call on an expired reservation **always** returns `410` immediately — even if the cron hasn't fired yet.

Together these two layers mean: stock is guaranteed to free up within at most one cron interval, and the user-facing paths (confirm/release) are always correct to the millisecond.

---

## Concurrency Guarantee

The hard part: if two requests come in simultaneously for the last unit, exactly one must win.

**Solution — single atomic SQL UPDATE:**

```sql
UPDATE "Inventory"
SET    "reservedUnits" = "reservedUnits" + $quantity
WHERE  "productId"   = $productId
  AND  "warehouseId" = $warehouseId
  AND  ("totalUnits" - "reservedUnits") >= $quantity
```

Postgres acquires a row-level lock on this statement. Two concurrent requests are serialised by the database: the first increments and returns 1 row affected; the second finds the condition false and returns 0 rows — which the API converts to a `409`. No separate transaction or SELECT FOR UPDATE needed — it's a single round-trip.

This works correctly under horizontal scaling (multiple Vercel instances, k8s, etc.), unlike an in-process Node.js check which would break the moment you have more than one server.

---

## Idempotency (Bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` both accept an `Idempotency-Key` header.

The key is stored on the `Reservation` row with a `@unique` constraint. On a retry:
- If the key already exists → return the original response, no side effects
- If not → proceed normally and store the key

The database-level unique constraint means even concurrent retries can't slip through — one will get a unique violation and the other will succeed, with both ultimately returning the same result.

---

## API Reference

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/api/products` | Products with per-warehouse available stock |
| `GET` | `/api/warehouses` | All warehouses |
| `POST` | `/api/reservations` | Create reservation — `409` if insufficient stock |
| `GET` | `/api/reservations/:id` | Fetch reservation details |
| `POST` | `/api/reservations/:id/confirm` | Confirm payment — `410` if expired |
| `POST` | `/api/reservations/:id/release` | Cancel / payment failed |
| `POST` | `/api/cron/expire-reservations` | Internal — Vercel Cron endpoint |

---

## Data Model

```
Product ──────────────────── Warehouse
    │                            │
    └──── Inventory ─────────────┘
           productId + warehouseId (unique)
           totalUnits      — physical stock
           reservedUnits   — held by PENDING reservations
           availableUnits  — totalUnits - reservedUnits (computed, never stored)

Reservation
    status:   PENDING ──► CONFIRMED  (payment success)
                     ──► RELEASED   (cancelled or expired)
    expiresAt = createdAt + 10 minutes
```

---

## Trade-offs & What I'd Do Differently

**Shared Zod schemas** — validation schemas are currently server-only. Sharing them between API routes and React forms would give free client-side validation and a single source of truth for field shapes.

**Live stock updates** — the product listing uses `getServerSideProps` so stock counts are only fresh on page load. SWR or React Query polling (or WebSockets/SSE) would keep counts live without a refresh.

**Exact-second expiry** — the daily cron means a reservation could technically stay "pending" longer than 10 minutes before being swept. A Redis delayed job queue (BullMQ + Upstash) would fire a release job at exactly `expiresAt`.

**Payment integration** — "Confirm Purchase" currently skips a real payment step. Production would call a payment gateway, listen for a webhook, and only confirm on webhook success — with the reservation window acting as the hold during the payment flow.

**With more time:** Redis distributed lock for concurrency instead of raw SQL, WebSocket push for live inventory, multi-unit reservation UI (the API already supports `quantity > 1`), and an ops-facing reservation dashboard.