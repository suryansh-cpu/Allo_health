<!-- # Allo — Inventory & Order Reservation Platform

**Live demo → [allo-health-kappa.vercel.app](https://allo-health-kappa.vercel.app/)**  
**GitHub → [github.com/suryansh-cpu/Allo_health](https://github.com/suryansh-cpu/Allo_health)**

---

## The Problem

Allo is building an inventory and order-fulfillment platform for multi-warehouse retail and D2C brands. When a customer reaches checkout, there's a race condition: payment can take several minutes (3DS flows, UPI confirmations, wallet redirects), and during that window other shoppers may be looking at the same product page.

- **Decrement stock at payment time** → two customers can pay for the same physical unit. One gets a refund, the other a bad experience, ops cleans up the mess manually.
- **Decrement stock at add-to-cart** → inventory looks depleted even though 80% of carts are abandoned. Conversion tanks.

**The solution is a reservation.** When a customer proceeds to checkout, we temporarily hold the units for 10 minutes. If payment succeeds, we confirm the reservation and stock is permanently decremented. If payment fails or the timer runs out, we release the hold so the units become available again instantly.

---

## What Was Built

A full-stack Next.js application that implements the reservation system end-to-end:

### Features
- **Product listing** — all products with per-warehouse available stock and an "Add to bag" button
- **Multi-item cart** — add items from multiple products/warehouses into a single bag before checking out
- **Atomic reservation** — checking out creates reservations for all cart items simultaneously; if any item fails (e.g. out of stock), all are rolled back
- **10-minute countdown** — live timer on the checkout page; confirms or cancels within the window
- **Checkout persistence** — if you navigate away mid-checkout, a sticky banner shows the remaining time and a "Resume Checkout →" button on the product page
- **Checkout guard** — attempting to add items to the bag while a checkout is in progress shows a warning toast instead
- **Error surfaces** — `409` (insufficient stock) and `410` (reservation expired) are shown to the user explicitly, never swallowed
- **Automatic expiry** — stale reservations are released automatically (see below)
- **Idempotency** (bonus) — `POST /api/reservations` and `POST /api/reservations/:id/confirm` are idempotent via `Idempotency-Key` header

### Stack
- **Next.js** (Pages Router) + **TypeScript**
- **Prisma** + **Neon (hosted Postgres)** — data layer
- **Vercel** — deployment + cron jobs
- No Redis — concurrency is handled at the database layer (see below)

---

## Running Locally

**Prerequisites:** Node.js 18+, a hosted PostgreSQL instance ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have free tiers)

```bash
# 1. Clone and install
git clone https://github.com/suryansh-cpu/Allo_health.git
cd Allo_health
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local and paste your DATABASE_URL
```

`.env.local` should look like:
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
CRON_SECRET=""
```

```bash
# 3. Push schema and seed
npm run db:push
npm run db:seed

# 4. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see 4 products seeded across 3 warehouses.

### Adding data manually

```bash
npx prisma studio
```

Open Prisma Studio, go to **Product** → Add Record, fill in details. Then go to **Inventory**, add a record linking the product to a warehouse with `totalUnits` set. Refresh the app.

---

## How Expiry Works in Production

Reservations not confirmed before `expiresAt` are released automatically via two complementary mechanisms:

**1. Vercel Cron job** (`vercel.json` → `POST /api/cron/expire-reservations`, currently runs daily on Hobby plan)

Calls `expireStaleReservations()`, which finds all `PENDING` reservations past their `expiresAt` and releases them in a single batched Prisma transaction — decrementing `reservedUnits` per warehouse/product atomically.

> Vercel's Hobby plan caps cron jobs at once per day. On a paid plan this would run every minute. The lazy expiry layer below covers the gap.

**2. Lazy expiry on read** (`getReservation()`)

Every time a reservation is fetched, we check `status === PENDING && expiresAt < now` and expire it inline if true. This means a `confirm` call on an expired reservation **always** returns `410` immediately — even if the cron hasn't fired yet.

Together: stock is guaranteed to free up within at most one cron interval, and all user-facing paths (confirm/release) are correct to the millisecond regardless.

---

## Concurrency Guarantee

The core problem: if two requests come in simultaneously for the last unit, exactly one must win and the other must get a `409`.

**Solution — single atomic SQL `UPDATE`:**

```sql
UPDATE "Inventory"
SET    "reservedUnits" = "reservedUnits" + $quantity
WHERE  "productId"   = $productId
  AND  "warehouseId" = $warehouseId
  AND  ("totalUnits" - "reservedUnits") >= $quantity
```

Postgres acquires a row-level lock on this statement. Two concurrent requests are serialised by the database: the first increments and returns 1 row affected; the second finds the condition false and returns 0 rows — which the API converts to a `409`. No separate transaction or `SELECT FOR UPDATE` needed — it's a single round-trip.

This works correctly under horizontal scaling (multiple Vercel instances, etc.), unlike an in-process Node.js check which would break the moment you have more than one server.

---

## Idempotency (Bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` both accept an `Idempotency-Key` header.

The key is stored on the `Reservation` row with a `@unique` constraint. On a retry:
- Key already exists → return the original response, no side effects
- Key not present → proceed normally and store the key

The database-level unique constraint means even concurrent retries can't slip through — one gets a unique violation and both ultimately return the same result.

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

**Cron granularity** — Vercel Hobby caps cron jobs at once per day, so a reservation could technically stay `PENDING` in the DB for longer than 10 minutes before being swept. Lazy expiry on read makes this invisible to users, but a Redis delayed job queue (BullMQ + Upstash) firing at exactly `expiresAt` would be cleaner in production.

**Live stock on the listing page** — `getServerSideProps` means stock counts are only fresh on page load. SWR polling or WebSockets would keep them live without a refresh, important when multiple users are competing for limited stock.

**Payment integration** — "Confirm Purchase" currently skips a real payment step. Production would call a payment gateway, listen for a webhook, and confirm the reservation only on webhook success — the 10-minute window acts as the hold during the payment flow.

**Shared Zod schemas** — validation is currently server-only. Sharing schemas between API routes and React forms would give free client-side validation and a single source of truth for field shapes.

**Redis for locking** — the raw SQL `UPDATE` with a conditional `WHERE` is correct and sufficient, but a Redis distributed lock would make the concurrency strategy more explicit and easier for teammates to reason about at a glance.

**Multi-unit UI** — the API already supports `quantity > 1` in reservations. The cart UI exposes quantity controls, but a dedicated quantity picker on the product card would make this more obvious. -->

# Allo — Inventory & Order Reservation Platform

**Live demo → [allo-health-kappa.vercel.app](https://allo-health-kappa.vercel.app/)**  
**Admin panel → [allo-health-kappa.vercel.app/admin](https://allo-health-kappa.vercel.app/admin)**  
**GitHub → [github.com/suryansh-cpu/Allo_health](https://github.com/suryansh-cpu/Allo_health)**

---

## The Problem

Allo is building an inventory and order-fulfillment platform for multi-warehouse retail and D2C brands. When a customer reaches checkout, there's a race condition: payment can take several minutes (3DS flows, UPI confirmations, wallet redirects), and during that window other shoppers may be looking at the same product page.

- **Decrement stock at payment time** → two customers can pay for the same physical unit. One gets a refund, the other a bad experience, ops cleans up the mess manually.
- **Decrement stock at add-to-cart** → inventory looks depleted even though 80% of carts are abandoned. Conversion tanks.

**The solution is a reservation.** When a customer proceeds to checkout, we temporarily hold the units for 10 minutes. If payment succeeds, we confirm the reservation and stock is permanently decremented. If payment fails or the timer runs out, we release the hold so the units become available again instantly.

---

## What Was Built

A full-stack Next.js application that implements the reservation system end-to-end:

### Features
- **Product listing** — all products with per-warehouse available stock and an "Add to bag" button
- **Multi-item cart** — add items from multiple products/warehouses into a single bag before checking out
- **Atomic reservation** — checking out creates reservations for all cart items simultaneously; if any item fails (e.g. out of stock), all are rolled back
- **10-minute countdown** — live timer on the checkout page; confirms or cancels within the window
- **Checkout persistence** — if you navigate away mid-checkout, a sticky banner shows the remaining time and a "Resume Checkout →" button on the product page
- **Checkout guard** — attempting to add items to the bag while a checkout is in progress shows a warning toast instead
- **Error surfaces** — `409` (insufficient stock) and `410` (reservation expired) are shown to the user explicitly, never swallowed
- **Automatic expiry** — stale reservations are released automatically (see below)
- **Idempotency** — `POST /api/reservations` and `POST /api/reservations/:id/confirm` are idempotent via `Idempotency-Key` header
- **Admin panel** — password-protected dashboard at `/admin` to manage products, warehouses, and inventory without touching the database directly (implemented and working)

### Stack
- **Next.js** (Pages Router) + **TypeScript**
- **Prisma** + **Neon (hosted Postgres)** — data layer
- **Vercel** — deployment + cron jobs
- No Redis — concurrency is handled at the database layer (see below)

---

## Running Locally

**Prerequisites:** Node.js 18+, a hosted PostgreSQL instance ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have free tiers)

```bash
# 1. Clone and install
git clone https://github.com/suryansh-cpu/Allo_health.git
cd Allo_health
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local and paste your DATABASE_URL and ADMIN_PASSWORD
```

`.env.local` should look like:
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
CRON_SECRET=""
ADMIN_PASSWORD="your-secret-admin-password"
```

```bash
# 3. Push schema and seed
npm run db:push
npm run db:seed

# 4. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see products seeded across warehouses.  
Open [http://localhost:3000/admin](http://localhost:3000/admin) — admin panel to manage products and inventory.

---

## Admin Panel

The admin panel lives at `/admin` and is password-protected. It does not require any additional dependencies — it uses Next.js, Prisma, and Zod which are already in the project.

### Access
Navigate to `/admin` and enter your admin password. The session lives only in React state and clears when you close the tab.

Set your password via environment variable (recommended):
```env
ADMIN_PASSWORD="your-secret-password"
```

Or change the fallback directly in `src/lib/adminAuth.ts`.

### What it lets you do

**Dashboard stats** — total products, warehouses, available units, reserved units, out-of-stock count at a glance.

**Products tab**
- Search and filter by name or category
- Create a new product with name, category, price (₹), description, and per-warehouse stock in one form
- Edit any product — all fields including stock levels per warehouse
- Delete a product — blocked with a clear error if any `PENDING` reservations exist for it

**Warehouses tab**
- Create new warehouses (name + location)
- See per-warehouse SKU count and total units across all products

**Inventory safety rules**
- Editing stock never lets `totalUnits` drop below `reservedUnits` — available stock can never go negative
- Deleting a product with active reservations is blocked at the API level, not just the UI

### Admin API endpoints

All endpoints require the header `x-admin-password: <your password>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/products` | List all products with inventory |
| `POST` | `/api/admin/products` | Create product |
| `GET` | `/api/admin/products/:id` | Get single product |
| `PUT` | `/api/admin/products/:id` | Update product + inventory |
| `DELETE` | `/api/admin/products/:id` | Delete (blocked if PENDING reservations exist) |
| `GET` | `/api/admin/warehouses` | List warehouses |
| `POST` | `/api/admin/warehouses` | Create warehouse |

---

## How Expiry Works in Production

Reservations not confirmed before `expiresAt` are released automatically via two complementary mechanisms:

**1. Vercel Cron job** (`vercel.json` → `POST /api/cron/expire-reservations`, currently runs daily on Hobby plan)

Calls `expireStaleReservations()`, which finds all `PENDING` reservations past their `expiresAt` and releases them in a single batched Prisma transaction — decrementing `reservedUnits` per warehouse/product atomically.

> Vercel's Hobby plan caps cron jobs at once per day. On a paid plan this would run every minute. The lazy expiry layer below covers the gap.

**2. Lazy expiry on read** (`getReservation()`)

Every time a reservation is fetched, we check `status === PENDING && expiresAt < now` and expire it inline if true. This means a `confirm` call on an expired reservation **always** returns `410` immediately — even if the cron hasn't fired yet.

Together: stock is guaranteed to free up within at most one cron interval, and all user-facing paths (confirm/release) are correct to the millisecond regardless.

---

## Concurrency Guarantee

The core problem: if two requests come in simultaneously for the last unit, exactly one must win and the other must get a `409`.

**Solution — single atomic SQL `UPDATE`:**

```sql
UPDATE "Inventory"
SET    "reservedUnits" = "reservedUnits" + $quantity
WHERE  "productId"   = $productId
  AND  "warehouseId" = $warehouseId
  AND  ("totalUnits" - "reservedUnits") >= $quantity
```

Postgres acquires a row-level lock on this statement. Two concurrent requests are serialised by the database: the first increments and returns 1 row affected; the second finds the condition false and returns 0 rows — which the API converts to a `409`. No separate transaction or `SELECT FOR UPDATE` needed — it's a single round-trip.

This works correctly under horizontal scaling (multiple Vercel instances, etc.), unlike an in-process Node.js check which would break the moment you have more than one server.

---

## Idempotency

`POST /api/reservations` and `POST /api/reservations/:id/confirm` both accept an `Idempotency-Key` header.

The key is stored on the `Reservation` row with a `@unique` constraint. On a retry:
- Key already exists → return the original response, no side effects
- Key not present → proceed normally and store the key

The database-level unique constraint means even concurrent retries can't slip through — one gets a unique violation and both ultimately return the same result.

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

**Cron granularity** — Vercel Hobby caps cron jobs at once per day, so a reservation could technically stay `PENDING` in the DB for longer than 10 minutes before being swept. Lazy expiry on read makes this invisible to users, but a Redis delayed job queue (BullMQ + Upstash) firing at exactly `expiresAt` would be cleaner in production.

**Live stock on the listing page** — `getServerSideProps` means stock counts are only fresh on page load. SWR polling or WebSockets would keep them live without a refresh, important when multiple users are competing for limited stock. *(implemented and working — warehouses that sell out show "Out of stock" with a disabled button rather than disappearing, so users always see accurate state on refresh)*

**Payment integration** — "Confirm Purchase" currently skips a real payment step. Production would call a payment gateway, listen for a webhook, and confirm the reservation only on webhook success — the 10-minute window acts as the hold during the payment flow.

**Shared Zod schemas** — validation is currently server-only. Sharing schemas between API routes and React forms would give free client-side validation and a single source of truth for field shapes.

**Redis for locking** — the raw SQL `UPDATE` with a conditional `WHERE` is correct and sufficient, but a Redis distributed lock would make the concurrency strategy more explicit and easier for teammates to reason about at a glance.

**Multi-unit UI** — the API already supports `quantity > 1` in reservations. The cart UI exposes quantity controls, but a dedicated quantity picker on the product card would make this more obvious.

**Admin panel** — password-protected `/admin` dashboard to create, edit, and delete products and warehouses and adjust inventory without touching the database directly. *(implemented and working)*