import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAgent } from '../middleware/rbac';
import { depositService } from '../services/depositService';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/deposits
 * Create a deposit (Agent only)
 * Requires QR scan (scanner-gate rule) and GPS
 */
router.post(
  '/',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        contributorId,
        qrHash,
        amount,
        gpsLatitude,
        gpsLongitude,
        gpsAccuracy,
      } = req.body;

      // Validate all required fields
      if (!contributorId || typeof contributorId !== 'string' || contributorId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'contributorId is required and must be a valid string',
          },
        });
      }

      if (!qrHash || !amount || gpsLatitude === undefined || gpsLongitude === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'qrHash, amount, gpsLatitude, and gpsLongitude are required',
          },
        });
      }

      const deviceId = req.headers['x-device-id'] as string || 'unknown';

      // Create deposit (will be synced if online)
      const deposit = await depositService.createDeposit({
        contributorId,
        qrHash,
        amount: parseFloat(amount),
        agentId: req.user!.userId,
        gpsLatitude: parseFloat(gpsLatitude),
        gpsLongitude: parseFloat(gpsLongitude),
        gpsAccuracy: gpsAccuracy ? parseFloat(gpsAccuracy) : undefined,
        deviceId,
        synced: true, // Assume online for now - can be made dynamic based on connectivity
      });

      return res.status(201).json({
        success: true,
        data: deposit,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('locked') || 
                        error.message.includes('QR code') ||
                        error.message.includes('GPS') ? 403 : 400;

      return res.status(statusCode).json({
        success: false,
        error: { message: error.message || 'Failed to create deposit' },
      });
    }
  }
);

/**
 * POST /api/v1/deposits/sync/:id
 * Sync an offline deposit
 */
router.post(
  '/sync/:id',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await depositService.syncDeposit(req.params.id);

      return res.json({
        success: true,
        message: 'Deposit synced successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to sync deposit' },
      });
    }
  }
);

/**
 * GET /api/v1/deposits
 * Get deposits for current agent
 */
router.get(
  '/',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await depositService.getAgentDeposits(
        req.user!.userId,
        limit,
        offset
      );

      return res.json({
        success: true,
        data: result.deposits,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get deposits' },
      });
    }
  }
);

/**
 * GET /api/v1/deposits/status
 * Get agent deposit status (unreconciled balance, locked status)
 */
router.get(
  '/status',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const balance = await depositService.getAgentUnreconciledBalance(req.user!.userId);
      const isLocked = await depositService.isAgentLocked(req.user!.userId);

      return res.json({
        success: true,
        data: {
          unreconciledBalance: balance,
          isLocked,
          canDeposit: !isLocked,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get deposit status' },
      });
    }
  }
);

export default router;
