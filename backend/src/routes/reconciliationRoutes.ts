import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAgent, requireOperationsAdmin } from '../middleware/rbac';
import { reconciliationService } from '../services/reconciliationService';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/reconciliation
 * Create reconciliation request (Agent only)
 */
router.post(
  '/',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cashAmountPresented, notes } = req.body;

      if (cashAmountPresented === undefined) {
        return res.status(400).json({
          success: false,
          error: { message: 'cashAmountPresented is required' },
        });
      }

      const reconciliation = await reconciliationService.createReconciliation({
        agentId: req.user!.userId,
        cashAmountPresented: parseFloat(cashAmountPresented),
        notes,
      });

      return res.status(201).json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation request submitted. Waiting for admin approval.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to create reconciliation' },
      });
    }
  }
);

/**
 * POST /api/v1/reconciliation/:id/approve
 * Approve reconciliation (Operations Admin only)
 */
router.post(
  '/:id/approve',
  authenticate,
  requireOperationsAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reconciliation = await reconciliationService.approveReconciliation(
        req.params.id,
        req.user!.userId
      );

      return res.json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation approved. Agent deposit functionality unlocked.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to approve reconciliation' },
      });
    }
  }
);

/**
 * POST /api/v1/reconciliation/:id/reject
 * Reject reconciliation (Operations Admin only)
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

      const reconciliation = await reconciliationService.rejectReconciliation(
        req.params.id,
        req.user!.userId,
        reason
      );

      return res.json({
        success: true,
        data: reconciliation,
        message: 'Reconciliation rejected.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to reject reconciliation' },
      });
    }
  }
);

/**
 * GET /api/v1/reconciliation
 * Get reconciliations (filtered by role)
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

      // Agents only see their own reconciliations
      const agentId = req.user!.role === 'agent' ? req.user!.userId : undefined;

      const result = await reconciliationService.getReconciliations(
        agentId,
        status,
        limit,
        offset
      );

      return res.json({
        success: true,
        data: result.reconciliations,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get reconciliations' },
      });
    }
  }
);

/**
 * GET /api/v1/reconciliation/pending
 * Get pending reconciliations for admin approval
 */
router.get(
  '/pending',
  authenticate,
  requireOperationsAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await reconciliationService.getReconciliations(
        undefined,
        'PENDING',
        limit,
        offset
      );

      return res.json({
        success: true,
        data: result.reconciliations,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get pending reconciliations' },
      });
    }
  }
);

export default router;
