import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...');

  // ── Warehouses ────────────────────────────────────────────────────────────
  const mumbai = await prisma.warehouse.upsert({
    where: { id: 'wh-mum' },
    update: {},
    create: { id: 'wh-mum', name: 'Mumbai Hub', location: 'Andheri East, Mumbai' },
  });

  const delhi = await prisma.warehouse.upsert({
    where: { id: 'wh-del' },
    update: {},
    create: { id: 'wh-del', name: 'Delhi NCR Hub', location: 'Gurugram, Haryana' },
  });

  const bengaluru = await prisma.warehouse.upsert({
    where: { id: 'wh-blr' },
    update: {},
    create: { id: 'wh-blr', name: 'Bengaluru Hub', location: 'Whitefield, Bengaluru' },
  });

  console.log('✔  Warehouses created');

  // ── Products ──────────────────────────────────────────────────────────────
  const headphones = await prisma.product.upsert({
    where: { id: 'prod-001' },
    update: {},
    create: {
      id: 'prod-001',
      name: 'Sony WH-1000XM5',
      description:
        'Industry-leading noise-cancelling headphones with 30-hour battery and multipoint Bluetooth.',
      price: 2999900,
      category: 'Audio',
    },
  });

  const keyboard = await prisma.product.upsert({
    where: { id: 'prod-002' },
    update: {},
    create: {
      id: 'prod-002',
      name: 'Keychron K2 Pro',
      description:
        'Compact wireless mechanical keyboard with QMK/VIA support and hot-swappable switches.',
      price: 1299900,
      category: 'Peripherals',
    },
  });

  const hub = await prisma.product.upsert({
    where: { id: 'prod-003' },
    update: {},
    create: {
      id: 'prod-003',
      name: 'Anker 7-in-1 USB-C Hub',
      description: '4K HDMI, 100W Power Delivery, USB-A 3.0 × 2, SD + microSD card reader.',
      price: 349900,
      category: 'Accessories',
    },
  });

  const monitor = await prisma.product.upsert({
    where: { id: 'prod-004' },
    update: {},
    create: {
      id: 'prod-004',
      name: 'LG 27UK850-W Monitor',
      description: '27" 4K UHD IPS display with USB-C connectivity and hardware calibration.',
      price: 5499900,
      category: 'Displays',
    },
  });

  console.log('✔  Products created');

  // ── Inventory ─────────────────────────────────────────────────────────────
  type InventoryRow = { productId: string; warehouseId: string; totalUnits: number };
  const rows: InventoryRow[] = [
    // Headphones — intentionally low to demo race-condition
    { productId: headphones.id, warehouseId: mumbai.id, totalUnits: 3 },
    { productId: headphones.id, warehouseId: delhi.id, totalUnits: 1 }, // only 1 → great for 409
    { productId: headphones.id, warehouseId: bengaluru.id, totalUnits: 2 },
    // Keyboard
    { productId: keyboard.id, warehouseId: mumbai.id, totalUnits: 8 },
    { productId: keyboard.id, warehouseId: delhi.id, totalUnits: 5 },
    // USB Hub
    { productId: hub.id, warehouseId: mumbai.id, totalUnits: 20 },
    { productId: hub.id, warehouseId: bengaluru.id, totalUnits: 15 },
    // Monitor — single unit, one warehouse
    { productId: monitor.id, warehouseId: delhi.id, totalUnits: 1 },
  ];

  for (const row of rows) {
    await prisma.inventory.upsert({
      where: { productId_warehouseId: { productId: row.productId, warehouseId: row.warehouseId } },
      update: { totalUnits: row.totalUnits, reservedUnits: 0 },
      create: { ...row, reservedUnits: 0 },
    });
  }

  console.log('✔  Inventory seeded');
  console.log('🎉  Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
