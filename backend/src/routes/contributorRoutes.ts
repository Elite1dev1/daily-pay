import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAgent, requireAnyUser } from '../middleware/rbac';
import { contributorService } from '../services/contributorService';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/contributors/onboard
 * Onboard a new contributor (Agent only)
 * Requires QR scan before access
 */
router.post(
  '/onboard',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fullName, phoneNumber, address, idPhotographUrl, qrHash } = req.body;

      if (!fullName || !phoneNumber || !address || !qrHash) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'fullName, phoneNumber, address, and qrHash are required',
          },
        });
      }

      const contributor = await contributorService.onboardContributor({
        fullName,
        phoneNumber,
        address,
        idPhotographUrl,
        qrHash,
        agentId: req.user!.userId,
      });

      return res.status(201).json({
        success: true,
        data: contributor,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: { message: error.message || 'Failed to onboard contributor' },
      });
    }
  }
);

/**
 * GET /api/v1/contributors/:id
 * Get contributor by ID
 * Agents and admins can access (agents need this for withdrawals)
 */
router.get(
  '/:id',
  authenticate,
  requireAnyUser, // Allow agents and admins to look up contributors
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contributor = await contributorService.getContributorById(req.params.id);

      if (!contributor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Contributor not found' },
        });
      }

      return res.json({
        success: true,
        data: contributor,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get contributor' },
      });
    }
  }
);

/**
 * GET /api/v1/contributors/qr/:qrHash
 * Get contributor by QR hash (for deposit screen)
 * Agent only - requires QR scan
 */
router.get(
  '/qr/:qrHash',
  authenticate,
  requireAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contributor = await contributorService.getContributorByQRHash(req.params.qrHash);

      if (!contributor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Contributor not found for this QR code' },
        });
      }

      return res.json({
        success: true,
        data: contributor,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get contributor' },
      });
    }
  }
);

/**
 * GET /api/v1/contributors
 * List contributors
 * Agents see only their onboarded contributors
 * Admins see all contributors
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Agents only see their own contributors
      const agentId = req.user!.role === 'agent' ? req.user!.userId : undefined;

      const result = await contributorService.listContributors(agentId, limit, offset);

      return res.json({
        success: true,
        data: result.contributors,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to list contributors' },
      });
    }
  }
);

export default router;
