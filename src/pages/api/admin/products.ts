import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { withAdminAuth } from '../../../lib/adminAuth';
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(), // stored in paise
  category: z.string().min(1),
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
  // GET - list all products with inventory
  if (req.method === 'GET') {
    const products = await prisma.product.findMany({
      include: {
        inventory: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ products });
  }

  // POST - create new product
  if (req.method === 'POST') {
    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { inventory, ...productData } = parsed.data;

    const product = await prisma.product.create({
      data: productData,
    });

    // Create inventory entries if provided
    if (inventory && inventory.length > 0) {
      await prisma.inventory.createMany({
        data: inventory.map((inv) => ({
          productId: product.id,
          warehouseId: inv.warehouseId,
          totalUnits: inv.totalUnits,
          reservedUnits: 0,
        })),
        skipDuplicates: true,
      });
    }

    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: { inventory: { include: { warehouse: true } } },
    });

    return res.status(201).json({ product: full });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);