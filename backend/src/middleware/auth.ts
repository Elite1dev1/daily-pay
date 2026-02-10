import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please provide a valid token.',
        },
      });
      return;
    }

    const decoded = verifyToken(token);
    (req as AuthenticatedRequest).user = decoded;

    next();
  } catch (error: any) {
    logger.warn('Authentication failed', { 
      error: error.message,
      path: req.path 
    });
    
    res.status(401).json({
      success: false,
      error: {
        message: error.message || 'Invalid or expired token',
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't fail if missing
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const decoded = verifyToken(token);
      (req as AuthenticatedRequest).user = decoded;
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  next();
};
