import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { logger } from '../utils/logger';

/**
 * Role-Based Access Control middleware
 * Checks if the authenticated user has the required role(s)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: user.userId,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions. Access denied.',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Require Agent role
 */
export const requireAgent = requireRole(UserRole.AGENT);

/**
 * Require Operations Admin role
 */
export const requireOperationsAdmin = requireRole(UserRole.OPERATIONS_ADMIN);

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Require Admin or Super Admin role
 */
export const requireAdmin = requireRole(
  UserRole.OPERATIONS_ADMIN,
  UserRole.SUPER_ADMIN
);

/**
 * Require any authenticated user (agent, admin, or super admin)
 * Contributors don't have web access
 */
export const requireAnyUser = requireRole(
  UserRole.AGENT,
  UserRole.OPERATIONS_ADMIN,
  UserRole.SUPER_ADMIN
);
