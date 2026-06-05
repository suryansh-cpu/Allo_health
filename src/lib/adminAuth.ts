import type { NextApiRequest, NextApiResponse } from 'next';
 
/**
 * Hardcoded admin password guard.
 * 
 * To change the password:
 *   Option A — set ADMIN_PASSWORD in your .env file (recommended for production)
 *   Option B — change the fallback string below directly
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
 
export function withAdminAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const provided = req.headers['x-admin-password'];
    if (!provided || provided !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handler(req, res);
  };
}
 