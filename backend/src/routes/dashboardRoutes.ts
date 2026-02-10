import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/rbac';
import { dashboardService } from '../services/dashboardService';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/dashboard/financial-summary
 * Get financial summary metrics
 */
router.get(
  '/financial-summary',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const period = (req.query.period as any) || 'daily';
      const customRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const summary = await dashboardService.getFinancialSummary(period, customRange);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Failed to get financial summary', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get financial summary' },
      });
    }
  }
);

/**
 * GET /api/v1/dashboard/transactions
 * Get transaction logs with filtering
 */
router.get(
  '/transactions',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const period = (req.query.period as any) || 'daily';
      const customRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const filters = {
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        contributorId: req.query.contributorId as string | undefined,
        agentId: req.query.agentId as string | undefined,
        search: req.query.search as string | undefined,
      };

      const pagination = {
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const result = await dashboardService.getTransactionLogs(
        period,
        customRange,
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.transactions,
        pagination: {
          total: result.total,
          limit: pagination.limit,
          offset: pagination.offset,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get transaction logs', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get transaction logs' },
      });
    }
  }
);

/**
 * GET /api/v1/dashboard/contributors/:id/transactions
 * Get contributor transaction view
 */
router.get(
  '/contributors/:id/transactions',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const period = (req.query.period as any) || 'daily';
      const customRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const view = await dashboardService.getContributorTransactionView(
        id,
        period,
        customRange
      );

      res.json({
        success: true,
        data: view,
      });
    } catch (error: any) {
      logger.error('Failed to get contributor transactions', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get contributor transactions' },
      });
    }
  }
);

/**
 * GET /api/v1/dashboard/agents
 * Get all agents with monitoring info
 */
router.get(
  '/agents',
  authenticate,
  requireSuperAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const agents = await dashboardService.getAgentsList();

      res.json({
        success: true,
        data: agents,
      });
    } catch (error: any) {
      logger.error('Failed to get agents list', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get agents list' },
      });
    }
  }
);

/**
 * GET /api/v1/dashboard/agents/:id/activity
 * Get agent activity tracking
 */
router.get(
  '/agents/:id/activity',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const activities = await dashboardService.getAgentActivity(id, limit);

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      logger.error('Failed to get agent activity', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get agent activity' },
      });
    }
  }
);

/**
 * GET /api/v1/dashboard/analytics
 * Get analytics data
 */
router.get(
  '/analytics',
  authenticate,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const period = (req.query.period as any) || 'daily';
      const customRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const analytics = await dashboardService.getAnalyticsData(period, customRange);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('Failed to get analytics data', { error: error.message });
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get analytics data' },
      });
    }
  }
);

export default router;
