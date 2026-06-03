import type { NextApiRequest, NextApiResponse } from 'next';
import { getReservation } from '../../../../services/reservationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid reservation ID' });
  }

  const reservation = await getReservation(id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  return res.status(200).json({ reservation });
}
