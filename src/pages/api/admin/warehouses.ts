import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { withAdminAuth } from '../../../lib/adminAuth';
import { z } from 'zod';

const WarehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - list all warehouses with product count
  if (req.method === 'GET') {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { inventory: true } },
      },
    });
    return res.status(200).json({ warehouses });
  }

  // POST - create new warehouse
  if (req.method === 'POST') {
    const parsed = WarehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const warehouse = await prisma.warehouse.create({ data: parsed.data });
    return res.status(201).json({ warehouse });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);