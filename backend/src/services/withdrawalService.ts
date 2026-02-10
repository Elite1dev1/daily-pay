import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { transaction } from '../database/connection';
import { Withdrawal } from '../models/Withdrawal';
import { User } from '../models/User';
import { LedgerEvent } from '../models/LedgerEvent';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLogService';
import { smsService } from './smsService';
import { otpService } from './otpService';
import { contributorService } from './contributorService';
import { getContributorBalance } from '../database/helpers';
import { WithdrawalState } from '../types';

export interface CreateWithdrawalData {
  contributorId: string;
  amount: number;
  agentId: string;
}

export interface Withdrawal {
  id: string;
  contributorId: string;
  contributorName: string;
  contributorPhone: string;
  agentId: string;
  amount: number;
  state: WithdrawalState;
  otpCode?: string;
  otpVerifiedAt?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedAt?: string;
  ledgerEventId?: string;
  createdAt: string;
}

/**
 * Create withdrawal request
 * State: REQUESTED
 */
export async function createWithdrawal(
  data: CreateWithdrawalData
): Promise<Withdrawal> {
  const { contributorId, amount, agentId } = data;

  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error('Withdrawal amount must be greater than zero');
  }

  // Verify agent
  const agent = await User.findById(agentId);

  if (!agent || agent.role !== 'agent') {
    throw new Error('Invalid agent');
  }

  // Get contributor
  const contributor = await contributorService.getContributorById(contributorId);
  if (!contributor) {
    throw new Error('Contributor not found');
  }

  // Check balance
  if (contributor.balance < amount) {
    throw new Error(`Insufficient balance. Available: ₦${contributor.balance.toLocaleString()}`);
  }

  // Create withdrawal request
  const withdrawal = await transaction(async (session) => {
    const newWithdrawal = await Withdrawal.create([{
      contributorId: new mongoose.Types.ObjectId(contributorId),
      agentId: new mongoose.Types.ObjectId(agentId),
      amount,
      state: WithdrawalState.REQUESTED,
      requestedAt: new Date(),
    }], { session });

    const created = newWithdrawal[0];

    // Log audit event
    await auditLogService.log({
      actorId: agentId,
      actorRole: 'agent',
      actionType: 'WITHDRAWAL_REQUESTED',
      resourceType: 'WITHDRAWAL',
      resourceId: created._id.toString(),
      metadata: {
        contributorId,
        amount,
      },
    });

    return created;
  });

  // Send OTP to contributor
  try {
    await otpService.sendOTP(contributorId, withdrawal._id.toString(), contributor.phoneNumber);
  } catch (error: any) {
    logger.error('Failed to send OTP for withdrawal', { error, withdrawalId: withdrawal._id.toString() });
    throw new Error('Failed to send OTP. Please try again.');
  }

  logger.info('Withdrawal request created', {
    withdrawalId: withdrawal._id.toString(),
    contributorId,
    agentId,
    amount,
  });

  return {
    id: withdrawal._id.toString(),
    contributorId: withdrawal.contributorId.toString(),
    contributorName: contributor.fullName,
    contributorPhone: contributor.phoneNumber,
    agentId: withdrawal.agentId.toString(),
    amount: withdrawal.amount,
    state: withdrawal.state as WithdrawalState,
    requestedAt: withdrawal.requestedAt.toISOString(),
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

/**
 * Verify OTP for withdrawal
 * State: REQUESTED → OTP_VERIFIED
 */
export async function verifyWithdrawalOTP(
  withdrawalId: string,
  otpCode: string,
  agentId: string
): Promise<Withdrawal> {
  if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
    throw new Error('Invalid withdrawal ID');
  }

  // Get withdrawal with contributor
  const withdrawal = await Withdrawal.findById(withdrawalId)
    .populate('contributorId', 'fullName phoneNumber');

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  // Verify agent owns this withdrawal
  if (withdrawal.agentId.toString() !== agentId) {
    throw new Error('Unauthorized. This withdrawal belongs to another agent.');
  }

  // Check state
  if (withdrawal.state !== WithdrawalState.REQUESTED) {
    throw new Error(`Invalid state. Current state: ${withdrawal.state}`);
  }

  // Verify OTP
  const isValid = await otpService.verifyOTP(
    withdrawal.contributorId.toString(),
    withdrawalId,
    otpCode
  );

  if (!isValid) {
    throw new Error('Invalid OTP code');
  }

  // Update withdrawal state
  withdrawal.state = WithdrawalState.OTP_VERIFIED;
  withdrawal.otpVerifiedAt = new Date();
  await withdrawal.save();

  // Log audit event
  await auditLogService.log({
    actorId: agentId,
    actorRole: 'agent',
    actionType: 'WITHDRAWAL_OTP_VERIFIED',
    resourceType: 'WITHDRAWAL',
    resourceId: withdrawalId,
    metadata: { otpVerified: true },
  });

  logger.info('Withdrawal OTP verified', { withdrawalId });

  const contributor = withdrawal.contributorId as any;

  return {
    id: withdrawal._id.toString(),
    contributorId: withdrawal.contributorId.toString(),
    contributorName: contributor?.fullName || '',
    contributorPhone: contributor?.phoneNumber || '',
    agentId: withdrawal.agentId.toString(),
    amount: withdrawal.amount,
    state: withdrawal.state as WithdrawalState,
    otpVerifiedAt: withdrawal.otpVerifiedAt?.toISOString(),
    requestedAt: withdrawal.requestedAt.toISOString(),
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

/**
 * Approve withdrawal (Admin only)
 * State: OTP_VERIFIED → APPROVED → EXECUTED
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string
): Promise<Withdrawal> {
  if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
    throw new Error('Invalid withdrawal ID');
  }

  const result = await transaction(async (session) => {
    // Get withdrawal with contributor
    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('contributorId', 'fullName phoneNumber')
      .session(session);

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    // Check state
    if (withdrawal.state !== WithdrawalState.OTP_VERIFIED) {
      throw new Error(`Invalid state. Expected OTP_VERIFIED, got: ${withdrawal.state}`);
    }

    // Verify balance (double-check)
    const balance = await getContributorBalance(withdrawal.contributorId.toString());
    if (balance < withdrawal.amount) {
      throw new Error('Insufficient balance');
    }

    // Generate reference ID
    const referenceId = `WDL-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create ledger event (immutable)
    const ledgerEvent = await LedgerEvent.create([{
      eventType: 'WITHDRAWAL',
      contributorId: withdrawal.contributorId,
      agentId: withdrawal.agentId,
      amount: withdrawal.amount,
      referenceId,
      synced: true,
      syncedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(adminId),
    }], { session });

    // Update withdrawal
    withdrawal.state = WithdrawalState.EXECUTED;
    withdrawal.approvedBy = new mongoose.Types.ObjectId(adminId);
    withdrawal.approvedAt = new Date();
    withdrawal.executedAt = new Date();
    withdrawal.ledgerEventId = ledgerEvent[0]._id;
    await withdrawal.save({ session });

    // Log audit event
    await auditLogService.log({
      actorId: adminId,
      actorRole: 'operations_admin',
      actionType: 'WITHDRAWAL_APPROVED',
      resourceType: 'WITHDRAWAL',
      resourceId: withdrawalId,
      metadata: {
        ledgerEventId: ledgerEvent[0]._id.toString(),
        referenceId,
      },
    });

    const contributor = withdrawal.contributorId as any;

    return {
      withdrawal,
      contributor: {
        fullName: contributor?.fullName || '',
        phoneNumber: contributor?.phoneNumber || '',
      },
      referenceId,
    };
  });

  // Send confirmation SMS
  try {
    const updatedContributor = await contributorService.getContributorById(
      result.withdrawal.contributorId.toString()
    );
    const newBalance = updatedContributor?.balance || 0;

    await smsService.sendWithdrawalConfirmation(
      result.contributor.phoneNumber,
      result.withdrawal.amount,
      newBalance,
      result.referenceId
    );
  } catch (error) {
    logger.warn('Failed to send withdrawal confirmation SMS', { error, withdrawalId });
  }

  logger.info('Withdrawal approved and executed', { withdrawalId, adminId });

  return {
    id: result.withdrawal._id.toString(),
    contributorId: result.withdrawal.contributorId.toString(),
    contributorName: result.contributor.fullName,
    contributorPhone: result.contributor.phoneNumber,
    agentId: result.withdrawal.agentId.toString(),
    amount: result.withdrawal.amount,
    state: result.withdrawal.state as WithdrawalState,
    approvedBy: result.withdrawal.approvedBy?.toString(),
    approvedAt: result.withdrawal.approvedAt?.toISOString(),
    executedAt: result.withdrawal.executedAt?.toISOString(),
    ledgerEventId: result.withdrawal.ledgerEventId?.toString(),
    requestedAt: result.withdrawal.requestedAt.toISOString(),
    createdAt: result.withdrawal.createdAt.toISOString(),
  };
}

/**
 * Reject withdrawal (Admin only)
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminId: string,
  reason: string
): Promise<Withdrawal> {
  if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
    throw new Error('Invalid withdrawal ID');
  }

  const withdrawal = await transaction(async (session) => {
    // Get withdrawal
    const w = await Withdrawal.findById(withdrawalId)
      .populate('contributorId', 'fullName phoneNumber')
      .session(session);

    if (!w) {
      throw new Error('Withdrawal not found');
    }

    // Check state
    if (w.state !== WithdrawalState.OTP_VERIFIED && w.state !== WithdrawalState.PENDING_ADMIN) {
      throw new Error(`Invalid state. Cannot reject withdrawal in state: ${w.state}`);
    }

    // Update withdrawal
    w.state = WithdrawalState.REJECTED;
    w.rejectedBy = new mongoose.Types.ObjectId(adminId);
    w.rejectedAt = new Date();
    w.rejectionReason = reason;
    await w.save({ session });

    // Log audit event
    await auditLogService.log({
      actorId: adminId,
      actorRole: 'operations_admin',
      actionType: 'WITHDRAWAL_REJECTED',
      resourceType: 'WITHDRAWAL',
      resourceId: withdrawalId,
      metadata: { reason },
    });

    return w;
  });

  logger.info('Withdrawal rejected', { withdrawalId, adminId, reason });

  // Get contributor for response
  const contributor = withdrawal.contributorId as any;

  return {
    id: withdrawal._id.toString(),
    contributorId: withdrawal.contributorId.toString(),
    contributorName: contributor?.fullName || '',
    contributorPhone: contributor?.phoneNumber || '',
    agentId: withdrawal.agentId.toString(),
    amount: withdrawal.amount,
    state: withdrawal.state as WithdrawalState,
    rejectedBy: withdrawal.rejectedBy?.toString(),
    rejectedAt: withdrawal.rejectedAt?.toISOString(),
    rejectionReason: withdrawal.rejectionReason,
    requestedAt: withdrawal.requestedAt.toISOString(),
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

/**
 * Get withdrawals (filtered by role)
 */
export async function getWithdrawals(
  agentId?: string,
  state?: WithdrawalState,
  limit: number = 50,
  offset: number = 0
): Promise<{ withdrawals: Withdrawal[]; total: number }> {
  const query: any = {};

  if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
    query.agentId = new mongoose.Types.ObjectId(agentId);
  }

  if (state) {
    query.state = state;
  }

  const [withdrawals, total] = await Promise.all([
    Withdrawal.find(query)
      .populate('contributorId', 'fullName phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean(),
    Withdrawal.countDocuments(query),
  ]);

  const formattedWithdrawals = withdrawals.map((w: any) => {
    const contributor = w.contributorId as any;
    return {
      id: w._id.toString(),
      contributorId: contributor?._id?.toString() || w.contributorId?.toString(),
      contributorName: contributor?.fullName || '',
      contributorPhone: contributor?.phoneNumber || '',
      agentId: w.agentId.toString(),
      amount: w.amount,
      state: w.state as WithdrawalState,
      otpVerifiedAt: w.otpVerifiedAt?.toISOString(),
      requestedAt: w.requestedAt.toISOString(),
      approvedBy: w.approvedBy?.toString(),
      approvedAt: w.approvedAt?.toISOString(),
      rejectedBy: w.rejectedBy?.toString(),
      rejectedAt: w.rejectedAt?.toISOString(),
      rejectionReason: w.rejectionReason,
      executedAt: w.executedAt?.toISOString(),
      ledgerEventId: w.ledgerEventId?.toString(),
      createdAt: w.createdAt.toISOString(),
    };
  });

  return { withdrawals: formattedWithdrawals, total };
}

export const withdrawalService = {
  createWithdrawal,
  verifyWithdrawalOTP,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawals,
};
