import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { transaction } from '../database/connection';
import { LedgerEvent } from '../models/LedgerEvent';
import { User } from '../models/User';
import { SyncQueue } from '../models/SyncQueue';
import { isAgentLocked, getAgentUnreconciledBalance } from '../database/helpers';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLogService';
import { smsService } from './smsService';
import { contributorService } from './contributorService';
import { systemConfig } from '../config/database';

export interface CreateDepositData {
  contributorId: string;
  qrHash: string; // Must match contributor's QR (scanner-gate rule)
  amount: number;
  agentId: string;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAccuracy?: number;
  deviceId: string;
  synced?: boolean; // For offline transactions
}

export interface Deposit {
  id: string;
  contributorId: string;
  amount: number;
  referenceId: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  synced: boolean;
  syncedAt?: string;
  createdAt: string;
}

/**
 * Create a deposit transaction
 * Enforces scanner-gate rule, GPS requirement, and circuit breaker
 */
export async function createDeposit(data: CreateDepositData): Promise<Deposit> {
  const {
    contributorId,
    qrHash,
    amount,
    agentId,
    gpsLatitude,
    gpsLongitude,
    gpsAccuracy,
    deviceId,
    synced = false,
  } = data;

  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error('Deposit amount must be greater than zero');
  }

  // Validate GPS (required)
  if (gpsLatitude === undefined || gpsLongitude === undefined) {
    throw new Error('GPS location is required for deposits');
  }

  // Verify agent exists and is active
  const agent = await User.findById(agentId);

  if (!agent) {
    throw new Error('Invalid agent');
  }

  if (agent.role !== 'agent') {
    throw new Error('Only agents can create deposits');
  }

  if (!agent.isActive) {
    throw new Error('Agent account is inactive');
  }

  // Verify contributor exists and is active
  const contributor = await contributorService.getContributorById(contributorId);
  if (!contributor) {
    throw new Error('Contributor not found');
  }

  if (!contributor.isActive) {
    throw new Error('Contributor account is inactive');
  }

  // SCANNER-GATE RULE: Verify QR hash matches contributor
  if (contributor.qrHash !== qrHash) {
    throw new Error('QR code does not match contributor. Please scan the correct QR card.');
  }

  // CIRCUIT BREAKER: Check if agent is locked
  if (synced) {
    // Only check circuit breaker for synced transactions
    const locked = await isAgentLocked(agentId);
    if (locked) {
      const balance = await getAgentUnreconciledBalance(agentId);
      throw new Error(
        `Agent is locked. Unreconciled balance (₦${balance.toLocaleString()}) has reached the limit (₦${systemConfig.circuitBreakerLimit.toLocaleString()}). Please reconcile before creating new deposits.`
      );
    }
  }

  // Generate unique reference ID
  const referenceId = `DEP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

  // Create deposit in transaction
  const deposit = await transaction(async (session) => {
    // Create ledger event (immutable)
    const ledgerEvent = await LedgerEvent.create([{
      eventType: 'DEPOSIT',
      contributorId: new mongoose.Types.ObjectId(contributorId),
      agentId: new mongoose.Types.ObjectId(agentId),
      amount,
      referenceId,
      gpsLatitude,
      gpsLongitude,
      gpsAccuracy: gpsAccuracy || undefined,
      deviceId,
      synced,
      syncedAt: synced ? new Date() : undefined,
      createdBy: new mongoose.Types.ObjectId(agentId),
    }], { session });

    const createdEvent = ledgerEvent[0];

    // If not synced, add to sync queue for background processing
    if (!synced) {
      await SyncQueue.create([{
        ledgerEventId: createdEvent._id,
        agentId: new mongoose.Types.ObjectId(agentId),
        deviceId,
        status: 'PENDING',
      }], { session });
    }

    // Log audit event
    await auditLogService.log({
      actorId: agentId,
      actorRole: 'agent',
      actionType: 'DEPOSIT_CREATED',
      resourceType: 'LEDGER_EVENT',
      resourceId: createdEvent._id.toString(),
      deviceId,
      metadata: {
        contributorId,
        amount,
        referenceId,
        synced,
        qrHash,
      },
    });

    return {
      id: createdEvent._id.toString(),
      contributorId,
      amount,
      referenceId: createdEvent.referenceId,
      gpsLocation: {
        latitude: createdEvent.gpsLatitude || gpsLatitude,
        longitude: createdEvent.gpsLongitude || gpsLongitude,
        accuracy: createdEvent.gpsAccuracy,
      },
      synced: createdEvent.synced,
      syncedAt: createdEvent.syncedAt?.toISOString(),
      createdAt: createdEvent.createdAt.toISOString(),
    };
  });

  // If synced, send SMS confirmation
  if (synced) {
    try {
      // Get updated balance
      const updatedContributor = await contributorService.getContributorById(contributorId);
      const newBalance = updatedContributor?.balance || 0;

      // Send SMS confirmation
      await smsService.sendDepositConfirmation(
        contributor.phoneNumber,
        amount,
        newBalance,
        referenceId
      );
    } catch (error) {
      logger.warn('Failed to send deposit confirmation SMS', {
        error,
        contributorId,
        referenceId,
      });
      // Don't fail deposit if SMS fails
    }

    logger.info('Deposit created and synced', {
      depositId: deposit.id,
      contributorId,
      agentId,
      amount,
      referenceId,
    });
  } else {
    logger.info('Deposit created (offline)', {
      depositId: deposit.id,
      contributorId,
      agentId,
      amount,
      referenceId,
    });
  }

  return deposit;
}

/**
 * Sync offline deposit
 * Called when agent comes back online
 */
export async function syncDeposit(ledgerEventId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(ledgerEventId)) {
    throw new Error('Invalid ledger event ID');
  }

  const result = await transaction(async (session) => {
    // Get ledger event with contributor
    const ledgerEvent = await LedgerEvent.findById(ledgerEventId)
      .populate('contributorId', 'phoneNumber')
      .session(session);

    if (!ledgerEvent) {
      throw new Error('Ledger event not found');
    }

    if (ledgerEvent.synced) {
      // Already synced
      return null;
    }

    // Check circuit breaker before syncing
    if (ledgerEvent.agentId) {
      const locked = await isAgentLocked(ledgerEvent.agentId.toString());
      if (locked) {
        throw new Error('Agent is locked. Cannot sync deposit. Please reconcile first.');
      }
    }

    // Mark as synced
    ledgerEvent.synced = true;
    ledgerEvent.syncedAt = new Date();
    await ledgerEvent.save({ session });

    // Update sync queue
    await SyncQueue.updateOne(
      { ledgerEventId: new mongoose.Types.ObjectId(ledgerEventId) },
      { status: 'SYNCED', updatedAt: new Date() },
      { session }
    );

    const contributor = ledgerEvent.contributorId as any;
    return {
      ledgerEvent,
      phoneNumber: contributor?.phoneNumber,
    };
  });

  if (!result) {
    return; // Already synced
  }

  // Send SMS confirmation
  try {
    if (!result.ledgerEvent.contributorId) {
      throw new Error('Contributor ID is missing from ledger event');
    }
    const contributor = await contributorService.getContributorById(
      result.ledgerEvent.contributorId.toString()
    );
    const newBalance = contributor?.balance || 0;

    await smsService.sendDepositConfirmation(
      result.phoneNumber || '',
      result.ledgerEvent.amount,
      newBalance,
      result.ledgerEvent.referenceId
    );
  } catch (error) {
    logger.warn('Failed to send sync confirmation SMS', { error, ledgerEventId });
  }

  logger.info('Deposit synced successfully', { ledgerEventId });
}

/**
 * Get deposits for an agent
 */
export async function getAgentDeposits(
  agentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ deposits: any[]; total: number }> {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    return { deposits: [], total: 0 };
  }

  const [deposits, total] = await Promise.all([
    LedgerEvent.find({
      agentId: new mongoose.Types.ObjectId(agentId),
      eventType: 'DEPOSIT',
    })
      .populate('contributorId', 'fullName phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean(),
    LedgerEvent.countDocuments({
      agentId: new mongoose.Types.ObjectId(agentId),
      eventType: 'DEPOSIT',
    }),
  ]);

  const formattedDeposits = deposits.map((deposit: any) => {
    const contributor = deposit.contributorId as any;
    return {
      id: deposit._id.toString(),
      contributorId: contributor?._id?.toString() || deposit.contributorId?.toString(),
      contributorName: contributor?.fullName,
      contributorPhone: contributor?.phoneNumber,
      amount: deposit.amount,
      referenceId: deposit.referenceId,
      gpsLocation: {
        latitude: deposit.gpsLatitude,
        longitude: deposit.gpsLongitude,
      },
      synced: deposit.synced,
      syncedAt: deposit.syncedAt?.toISOString(),
      createdAt: deposit.createdAt.toISOString(),
    };
  });

  return {
    deposits: formattedDeposits,
    total,
  };
}

export const depositService = {
  createDeposit,
  syncDeposit,
  getAgentDeposits,
  isAgentLocked,
  getAgentUnreconciledBalance,
};
