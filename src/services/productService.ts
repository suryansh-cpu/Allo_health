import { prisma } from '../lib/prisma';

export async function getProductsWithInventory() {
  const products = await prisma.product.findMany({
    include: {
      inventory: {
        include: { warehouse: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return products.map((product) => ({
    ...product,
    inventory: product.inventory.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      warehouseLocation: inv.warehouse.location,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
    })),
  }));
}

export async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
}