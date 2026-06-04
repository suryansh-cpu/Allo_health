import type { NextApiRequest, NextApiResponse } from 'next';
import { expireStaleReservations } from '../../../services/reservationService';

/**
 * Vercel Cron endpoint — fires every minute (configured in vercel.json).
 * Releases all PENDING reservations whose expiresAt has passed.
 *
 * Vercel sets the Authorization header to `Bearer <CRON_SECRET>` when invoking
 * cron jobs. We verify this to prevent unauthenticated calls.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Vercel's cron secret (only enforced when CRON_SECRET is set in env)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const released = await expireStaleReservations();
    return res.status(200).json({ ok: true, released });
  } catch (err) {
    console.error('[cron/expire-reservations]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
