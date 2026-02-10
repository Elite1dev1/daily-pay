import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/rbac';
import { authService } from '../services/authService';
import { UserRole } from '../types';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' },
      });
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    const deviceId = req.headers['x-device-id'] as string;

    const result = await authService.login(
      { email, password },
      ipAddress,
      userAgent,
      deviceId
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: { message: error.message || 'Login failed' },
    });
  }
});

/**
 * POST /api/v1/auth/register
 * Register new user (Super Admin only)
 */
router.post(
  '/register',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password, fullName, phoneNumber, role } = req.body;

      if (!email || !password || !fullName || !role) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email, password, fullName, and role are required',
          },
        });
      }

      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid role' },
        });
      }

      // Don't allow registering contributors via this endpoint
      if (role === UserRole.CONTRIBUTOR) {
        return res.status(400).json({
          success: false,
          error: { message: 'Contributors cannot be registered via this endpoint' },
        });
      }

      const result = await authService.register(
        {
          email,
          password,
          fullName,
          phoneNumber,
          role,
        },
        req.user?.userId
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Registration failed' },
      });
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get user info' },
    });
  }
});

export default router;
