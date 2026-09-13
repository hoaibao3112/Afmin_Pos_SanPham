import { Request, Response, NextFunction } from 'express';
import { runWithContext } from '../lib/context.js';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Lấy accountId từ custom header hoặc fallback về default-account
  const accountIdHeader = req.headers['x-account-id'];
  const accountId = (typeof accountIdHeader === 'string' && accountIdHeader.trim())
    ? accountIdHeader.trim()
    : (process.env.DEFAULT_ACCOUNT_ID || 'acc_default');

  runWithContext({ accountId }, async () => {
    next();
  });
}
