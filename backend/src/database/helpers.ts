import mongoose from 'mongoose';

/**
 * Helper functions to replace SQL query patterns with MongoDB operations
 */

// Helper to calculate contributor balance (replaces SQL view)
export async function getContributorBalance(contributorId: string): Promise<number> {
  const { LedgerEvent } = await import('../models/LedgerEvent');
  
  if (!mongoose.Types.ObjectId.isValid(contributorId)) {
    return 0;
  }
  
  const result = await LedgerEvent.aggregate([
    {
      $match: {
        contributorId: new mongoose.Types.ObjectId(contributorId),
        synced: true,
        eventType: { $in: ['DEPOSIT', 'WITHDRAWAL', 'REVERSAL'] },
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ['$eventType', 'DEPOSIT'] },
              '$amount',
              {
                $cond: [
                  { $in: ['$eventType', ['WITHDRAWAL', 'REVERSAL']] },
                  { $multiply: ['$amount', -1] },
                  0,
                ],
              },
            ],
          },
        },
      },
    },
  ]);

  return result.length > 0 ? result[0].balance || 0 : 0;
}

// Helper to calculate agent unreconciled balance (replaces SQL view)
export async function getAgentUnreconciledBalance(agentId: string): Promise<number> {
  const { LedgerEvent } = await import('../models/LedgerEvent');
  const { AgentReconciliation } = await import('../models/AgentReconciliation');
  
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    return 0;
  }
  
  // Get the latest approved reconciliation for this agent
  const latestReconciliation = await AgentReconciliation.findOne({
    agentId: new mongoose.Types.ObjectId(agentId),
    status: 'APPROVED',
  }).sort({ reconciledAt: -1 });

  const matchStage: any = {
    agentId: new mongoose.Types.ObjectId(agentId),
    synced: true,
    eventType: { $ne: 'RECONCILIATION' },
  };

  // Exclude transactions that have been reconciled
  if (latestReconciliation?.reconciledAt) {
    matchStage.createdAt = { $gt: latestReconciliation.reconciledAt };
  }

  const result = await LedgerEvent.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ['$eventType', 'DEPOSIT'] },
              '$amount',
              {
                $cond: [
                  { $in: ['$eventType', ['WITHDRAWAL', 'REVERSAL']] },
                  { $multiply: ['$amount', -1] },
                  0,
                ],
              },
            ],
          },
        },
      },
    },
  ]);

  return result.length > 0 ? result[0].balance || 0 : 0;
}

// Helper to check if agent is locked (circuit breaker)
export async function isAgentLocked(agentId: string): Promise<boolean> {
  const { systemConfig } = await import('../config/database');
  
  const balance = await getAgentUnreconciledBalance(agentId);
  const limit = systemConfig.circuitBreakerLimit;
  
  return balance >= limit;
}
