import mongoose from 'mongoose';
import { transaction } from '../database/connection';
import { AgentReconciliation } from '../models/AgentReconciliation';
import { User } from '../models/User';
import { LedgerEvent } from '../models/LedgerEvent';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLogService';
import { depositService } from './depositService';
import { websocketService } from './websocketService';
import { dashboardService } from './dashboardService';

export interface CreateReconciliationData {
  agentId: string;
  cashAmountPresented: number;
  notes?: string;
}

export interface Reconciliation {
  id: string;
  agentId: string;
  agentName: string;
  unreconciledBalanceBefore: number;
  cashAmountPresented: number;
  reconciledAmount: number;
  discrepancy: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reconciledBy?: string;
  reconciledAt?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Create reconciliation request
 * Agent presents cash to admin
 */
export async function createReconciliation(
  data: CreateReconciliationData
): Promise<Reconciliation> {
  const { agentId, cashAmountPresented, notes } = data;

  // Validate amount
  if (cashAmountPresented < 0) {
    throw new Error('Cash amount cannot be negative');
  }

  // Get agent unreconciled balance
  const unreconciledBalance = await depositService.getAgentUnreconciledBalance(agentId);

  if (unreconciledBalance <= 0) {
    throw new Error('No unreconciled balance to reconcile');
  }

  // Calculate discrepancy
  const discrepancy = cashAmountPresented - unreconciledBalance;

  // Get agent info
  const agent = await User.findById(agentId);

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Create reconciliation record
  const reconciliation = await transaction(async (session) => {
    const newReconciliation = await AgentReconciliation.create([{
      agentId: new mongoose.Types.ObjectId(agentId),
      unreconciledBalanceBefore: unreconciledBalance,
      cashAmountPresented,
      reconciledAmount: unreconciledBalance, // Reconciled amount is the balance, not cash presented
      discrepancy,
      notes: notes || undefined,
      status: 'PENDING',
    }], { session });

    const created = newReconciliation[0];

    // Log audit event
    await auditLogService.log({
      actorId: agentId,
      actorRole: 'agent',
      actionType: 'RECONCILIATION_REQUESTED',
      resourceType: 'RECONCILIATION',
      resourceId: created._id.toString(),
      metadata: {
        unreconciledBalanceBefore: unreconciledBalance,
        cashAmountPresented,
        discrepancy,
      },
    });

    return created;
  });

  logger.info('Reconciliation request created', {
    reconciliationId: reconciliation._id.toString(),
    agentId,
    unreconciledBalance,
    cashAmountPresented,
    discrepancy,
  });

  return {
    id: reconciliation._id.toString(),
    agentId: reconciliation.agentId.toString(),
    agentName: agent.fullName,
    unreconciledBalanceBefore: reconciliation.unreconciledBalanceBefore,
    cashAmountPresented: reconciliation.cashAmountPresented,
    reconciledAmount: reconciliation.reconciledAmount,
    discrepancy: reconciliation.discrepancy || 0,
    status: reconciliation.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    notes: reconciliation.notes,
    createdAt: reconciliation.createdAt.toISOString(),
  };
}

/**
 * Approve reconciliation (Admin only)
 * This resets the agent's unreconciled balance to 0
 */
export async function approveReconciliation(
  reconciliationId: string,
  adminId: string
): Promise<Reconciliation> {
  if (!mongoose.Types.ObjectId.isValid(reconciliationId)) {
    throw new Error('Invalid reconciliation ID');
  }

  const result = await transaction(async (session) => {
    // Get reconciliation with agent
    const reconciliation = await AgentReconciliation.findById(reconciliationId)
      .populate('agentId', 'fullName')
      .session(session);

    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    // Check status
    if (reconciliation.status !== 'PENDING') {
      throw new Error(`Reconciliation is not pending. Current status: ${reconciliation.status}`);
    }

    // Create reconciliation ledger event
    const referenceId = `REC-${Date.now()}-${reconciliation._id.toString().substring(0, 8).toUpperCase()}`;

    // For reconciliation events, contributorId is optional (not required)
    const ledgerEventData: any = {
      eventType: 'RECONCILIATION',
      agentId: reconciliation.agentId,
      amount: reconciliation.reconciledAmount,
      referenceId,
      synced: true,
      syncedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(adminId),
    };
    // contributorId is not set for RECONCILIATION events (it's optional in schema)
    
    await LedgerEvent.create([ledgerEventData], { session });

    // Update reconciliation status
    reconciliation.status = 'APPROVED';
    reconciliation.reconciledBy = new mongoose.Types.ObjectId(adminId);
    reconciliation.reconciledAt = new Date();
    await reconciliation.save({ session });

    // Log audit event
    await auditLogService.log({
      actorId: adminId,
      actorRole: 'operations_admin',
      actionType: 'RECONCILIATION_APPROVED',
      resourceType: 'RECONCILIATION',
      resourceId: reconciliationId,
      metadata: {
        agentId: reconciliation.agentId.toString(),
        reconciledAmount: reconciliation.reconciledAmount,
        discrepancy: reconciliation.discrepancy,
        referenceId,
      },
    });

    const agent = reconciliation.agentId as any;

    return {
      reconciliation,
      agentName: agent?.fullName || '',
    };
  });

  logger.info('Reconciliation approved', {
    reconciliationId,
    adminId,
    agentId: result.reconciliation.agentId.toString(),
  });

  // Broadcast dashboard updates
  try {
    const [financialSummary, agentsList] = await Promise.all([
      dashboardService.getFinancialSummary('daily'),
      dashboardService.getAgentsList(),
    ]);
    websocketService.broadcastFinancialUpdate(financialSummary);
    websocketService.broadcastAgentUpdate(agentsList);
  } catch (error) {
    logger.warn('Failed to broadcast reconciliation update', { error });
  }

  return {
    id: result.reconciliation._id.toString(),
    agentId: result.reconciliation.agentId.toString(),
    agentName: result.agentName,
    unreconciledBalanceBefore: result.reconciliation.unreconciledBalanceBefore,
    cashAmountPresented: result.reconciliation.cashAmountPresented,
    reconciledAmount: result.reconciliation.reconciledAmount,
    discrepancy: result.reconciliation.discrepancy || 0,
    status: 'APPROVED',
    reconciledBy: result.reconciliation.reconciledBy?.toString(),
    reconciledAt: result.reconciliation.reconciledAt?.toISOString(),
    notes: result.reconciliation.notes,
    createdAt: result.reconciliation.createdAt.toISOString(),
  };
}

/**
 * Reject reconciliation (Admin only)
 */
export async function rejectReconciliation(
  reconciliationId: string,
  adminId: string,
  reason: string
): Promise<Reconciliation> {
  if (!mongoose.Types.ObjectId.isValid(reconciliationId)) {
    throw new Error('Invalid reconciliation ID');
  }

  const result = await transaction(async (session) => {
    // Get reconciliation with agent
    const reconciliation = await AgentReconciliation.findById(reconciliationId)
      .populate('agentId', 'fullName')
      .session(session);

    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    // Check status
    if (reconciliation.status !== 'PENDING') {
      throw new Error(`Reconciliation is not pending. Current status: ${reconciliation.status}`);
    }

    // Update reconciliation status
    reconciliation.status = 'REJECTED';
    reconciliation.reconciledBy = new mongoose.Types.ObjectId(adminId);
    reconciliation.reconciledAt = new Date();
    reconciliation.notes = reason;
    await reconciliation.save({ session });

    // Log audit event
    await auditLogService.log({
      actorId: adminId,
      actorRole: 'operations_admin',
      actionType: 'RECONCILIATION_REJECTED',
      resourceType: 'RECONCILIATION',
      resourceId: reconciliationId,
      metadata: { reason },
    });

    const agent = reconciliation.agentId as any;

    return {
      reconciliation,
      agentName: agent?.fullName || '',
    };
  });

  logger.info('Reconciliation rejected', {
    reconciliationId,
    adminId,
    reason,
  });

  return {
    id: result.reconciliation._id.toString(),
    agentId: result.reconciliation.agentId.toString(),
    agentName: result.agentName,
    unreconciledBalanceBefore: result.reconciliation.unreconciledBalanceBefore,
    cashAmountPresented: result.reconciliation.cashAmountPresented,
    reconciledAmount: result.reconciliation.reconciledAmount,
    discrepancy: result.reconciliation.discrepancy || 0,
    status: 'REJECTED',
    reconciledBy: result.reconciliation.reconciledBy?.toString(),
    reconciledAt: result.reconciliation.reconciledAt?.toISOString(),
    notes: result.reconciliation.notes,
    createdAt: result.reconciliation.createdAt.toISOString(),
  };
}

/**
 * Get reconciliations
 */
export async function getReconciliations(
  agentId?: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  limit: number = 50,
  offset: number = 0
): Promise<{ reconciliations: Reconciliation[]; total: number }> {
  const query: any = {};

  if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
    query.agentId = new mongoose.Types.ObjectId(agentId);
  }

  if (status) {
    query.status = status;
  }

  const [reconciliations, total] = await Promise.all([
    AgentReconciliation.find(query)
      .populate('agentId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean(),
    AgentReconciliation.countDocuments(query),
  ]);

  const formattedReconciliations = reconciliations.map((r: any) => {
    const agent = r.agentId as any;
    return {
      id: r._id.toString(),
      agentId: r.agentId.toString(),
      agentName: agent?.fullName || '',
      unreconciledBalanceBefore: r.unreconciledBalanceBefore,
      cashAmountPresented: r.cashAmountPresented,
      reconciledAmount: r.reconciledAmount,
      discrepancy: r.discrepancy || 0,
      status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      reconciledBy: r.reconciledBy?.toString(),
      reconciledAt: r.reconciledAt?.toISOString(),
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { reconciliations: formattedReconciliations, total };
}

export const reconciliationService = {
  createReconciliation,
  approveReconciliation,
  rejectReconciliation,
  getReconciliations,
};
