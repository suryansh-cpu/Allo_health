import type { NextApiRequest, NextApiResponse } from 'next';
import { confirmReservation } from '../../../../services/reservationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid reservation ID' });
  }

  const idempotencyKey = req.headers['idempotency-key'];
  const result = await confirmReservation(
    id,
    typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
  );

  if (!result.success) {
    return res.status(result.statusCode).json({ error: result.error });
  }

  return res.status(200).json({ reservation: result.reservation });
}
