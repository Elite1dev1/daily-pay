import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAgent, requireOperationsAdmin } from '../middleware/rbac';
import { withdrawalService } from '../services/withdrawalService';
import { WithdrawalState } from '../types';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/withdrawals
 * Create withdrawal request (Agent only)
 */
router.post(
  '/',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contributorId, amount } = req.body;

      if (!contributorId || !amount) {
        return res.status(400).json({
          success: false,
          error: { message: 'contributorId and amount are required' },
        });
      }

      const withdrawal = await withdrawalService.createWithdrawal({
        contributorId,
        amount: parseFloat(amount),
        agentId: req.user!.userId,
      });

      return res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request created. OTP sent to contributor.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to create withdrawal' },
      });
    }
  }
);

/**
 * POST /api/v1/withdrawals/:id/verify-otp
 * Verify OTP for withdrawal (Agent only)
 */
router.post(
  '/:id/verify-otp',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { otpCode } = req.body;

      if (!otpCode) {
        return res.status(400).json({
          success: false,
          error: { message: 'OTP code is required' },
        });
      }

      const withdrawal = await withdrawalService.verifyWithdrawalOTP(
        req.params.id,
        otpCode,
        req.user!.userId
      );

      return res.json({
        success: true,
        data: withdrawal,
        message: 'OTP verified. Waiting for admin approval.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to verify OTP' },
      });
    }
  }
);

/**
 * POST /api/v1/withdrawals/:id/approve
 * Approve withdrawal (Operations Admin only)
 */
router.post(
  '/:id/approve',
  authenticate,
  requireOperationsAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const withdrawal = await withdrawalService.approveWithdrawal(
        req.params.id,
        req.user!.userId
      );

      return res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal approved and executed successfully.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to approve withdrawal' },
      });
    }
  }
);

/**
 * POST /api/v1/withdrawals/:id/reject
 * Reject withdrawal (Operations Admin only)
 */
router.post(
  '/:id/reject',
  authenticate,
  requireOperationsAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { message: 'Rejection reason is required' },
        });
      }

      const withdrawal = await withdrawalService.rejectWithdrawal(
        req.params.id,
        req.user!.userId,
        reason
      );

      return res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal rejected.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to reject withdrawal' },
      });
    }
  }
);

/**
 * GET /api/v1/withdrawals
 * Get withdrawals (filtered by role)
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const state = req.query.state as WithdrawalState | undefined;

      // Agents only see their own withdrawals
      const agentId = req.user!.role === 'agent' ? req.user!.userId : undefined;

      const result = await withdrawalService.getWithdrawals(
        agentId,
        state,
        limit,
        offset
      );

      return res.json({
        success: true,
        data: result.withdrawals,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get withdrawals' },
      });
    }
  }
);

/**
 * GET /api/v1/withdrawals/pending
 * Get pending withdrawals for admin approval
 */
router.get(
  '/pending',
  authenticate,
  requireOperationsAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await withdrawalService.getWithdrawals(
        undefined,
        WithdrawalState.OTP_VERIFIED,
        limit,
        offset
      );

      return res.json({
        success: true,
        data: result.withdrawals,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get pending withdrawals' },
      });
    }
  }
);

export default router;
