import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { auditLogService } from '../services/auditLogService';

/**
 * Middleware to log all requests for audit purposes
 */
export const auditLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end function to capture response
  res.end = function (chunk?: any, encoding?: any, cb?: () => void): Response {
    // Restore original end
    res.end = originalEnd;

    // Log the request/response
    const user = req.user;
    auditLogService.log({
      actorId: user?.userId,
      actorRole: user?.role,
      actionType: `${req.method}_${req.path}`,
      resourceType: undefined, // Can be enhanced to detect resource type
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      deviceId: req.headers['x-device-id'] as string,
      requestPath: req.path,
      requestMethod: req.method,
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      responseStatus: res.statusCode,
      metadata: {
        query: req.query,
        params: req.params,
      },
    }).catch(() => {
      // Silently fail - audit logging should not break requests
    });

    // Call original end
    if (cb) {
      return originalEnd(chunk, encoding, cb);
    } else if (encoding && typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    } else {
      return originalEnd(chunk, encoding);
    }
  };

  next();
};
