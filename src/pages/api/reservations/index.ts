import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createReservation } from '../../../services/reservationService';

const CreateReservationSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  quantity: z.number().int().positive().default(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = CreateReservationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' });
  }

  const idempotencyKey = req.headers['idempotency-key'];
  const result = await createReservation(
    parsed.data.productId,
    parsed.data.warehouseId,
    parsed.data.quantity,
    parsed.data.customerName,
    parsed.data.customerEmail,
    typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
  );

  if (!result.success) {
    return res.status(result.statusCode).json({ error: result.error });
  }

  return res.status(201).json({ reservation: result.reservation });
}
