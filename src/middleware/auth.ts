import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    id: string
    role: 'client' | 'artisan'
  }
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return sendError(res, 'No token!', 401);

    const decoded = verifyToken(token);
    if (!decoded) return sendError(res, 'Invalid token', 401);

    req.user = decoded as { id: string; role: 'client' | 'artisan' };
    next();
  } catch {
    sendError(res, 'Auth failed', 401);
  }
};

export const restrictTo = (
  ...roles: ('client' | 'artisan')[]
) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401)
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Access denied', 403)
    }

    next()
  }
}