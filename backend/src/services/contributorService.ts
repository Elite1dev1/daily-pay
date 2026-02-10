import crypto from 'crypto';
import mongoose from 'mongoose';
import { transaction } from '../database/connection';
import { Contributor } from '../models/Contributor';
import { User } from '../models/User';
import { getContributorBalance } from '../database/helpers';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLogService';
import { smsService } from './smsService';

export interface OnboardContributorData {
  fullName: string;
  phoneNumber: string;
  address: string;
  idPhotographUrl?: string;
  qrHash: string; // Scanned QR code hash
  agentId: string;
}

export interface Contributor {
  id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  idPhotographUrl?: string;
  qrHash: string;
  balance: number;
  isActive: boolean;
  onboardedAt: string;
  createdAt: string;
}

/**
 * Generate QR hash from QR code data
 */
export function generateQRHash(qrData: string): string {
  return crypto.createHash('sha256').update(qrData).digest('hex');
}

/**
 * Onboard a new contributor
 * Binds physical QR card to contributor profile
 */
export async function onboardContributor(
  data: OnboardContributorData
): Promise<Contributor> {
  const { fullName, phoneNumber, address, idPhotographUrl, qrHash, agentId } = data;

  // Validate phone number format (basic validation)
  if (!phoneNumber || phoneNumber.length < 10) {
    throw new Error('Invalid phone number');
  }

  // Check if QR hash is already bound
  const existingQR = await Contributor.findOne({ qrHash });

  if (existingQR) {
    throw new Error('QR code is already bound to another contributor');
  }

  // Check if phone number is already registered
  const existingPhone = await Contributor.findOne({ phoneNumber });

  if (existingPhone) {
    throw new Error('Phone number is already registered');
  }

  // Verify agent exists and is active
  const agent = await User.findOne({
    _id: new mongoose.Types.ObjectId(agentId),
    isActive: true,
  });

  if (!agent) {
    throw new Error('Invalid or inactive agent');
  }

  if (agent.role !== 'agent') {
    throw new Error('Only agents can onboard contributors');
  }

  // Create contributor in transaction
  const contributor = await transaction(async (session) => {
    // Create contributor
    const newContributor = await Contributor.create([{
      fullName,
      phoneNumber,
      address,
      idPhotographUrl: idPhotographUrl || undefined,
      qrHash,
      onboardedByAgentId: new mongoose.Types.ObjectId(agentId),
      isActive: true,
    }], { session });

    const createdContributor = newContributor[0];

    // Log audit event
    await auditLogService.log({
      actorId: agentId,
      actorRole: 'agent',
      actionType: 'CONTRIBUTOR_ONBOARDED',
      resourceType: 'CONTRIBUTOR',
      resourceId: createdContributor._id.toString(),
      metadata: {
        phoneNumber,
        qrHash,
        fullName,
      },
    });

    return createdContributor;
  });

  // Send welcome SMS
  try {
    await smsService.sendSMS(
      phoneNumber,
      'Welcome to DaiLi Pay. Your account is active. Always demand an SMS for every deposit.'
    );
  } catch (error) {
    logger.warn('Failed to send welcome SMS', { error, phoneNumber });
    // Don't fail onboarding if SMS fails
  }

  logger.info('Contributor onboarded', {
    contributorId: contributor._id.toString(),
    agentId,
    phoneNumber,
  });

  const balance = await getContributorBalance(contributor._id.toString());

  return {
    id: contributor._id.toString(),
    fullName: contributor.fullName,
    phoneNumber: contributor.phoneNumber,
    address: contributor.address || '',
    idPhotographUrl: contributor.idPhotographUrl,
    qrHash: contributor.qrHash,
    balance,
    isActive: contributor.isActive,
    onboardedAt: contributor.onboardedAt.toISOString(),
    createdAt: contributor.createdAt.toISOString(),
  };
}

/**
 * Get contributor by ID
 */
export async function getContributorById(contributorId: string): Promise<Contributor | null> {
  if (!mongoose.Types.ObjectId.isValid(contributorId)) {
    return null;
  }

  const contributor = await Contributor.findById(contributorId);

  if (!contributor) {
    return null;
  }

  const balance = await getContributorBalance(contributorId);

  return {
    id: contributor._id.toString(),
    fullName: contributor.fullName,
    phoneNumber: contributor.phoneNumber,
    address: contributor.address || '',
    idPhotographUrl: contributor.idPhotographUrl,
    qrHash: contributor.qrHash,
    balance,
    isActive: contributor.isActive,
    onboardedAt: contributor.onboardedAt.toISOString(),
    createdAt: contributor.createdAt.toISOString(),
  };
}

/**
 * Get contributor by QR hash
 */
export async function getContributorByQRHash(qrHash: string): Promise<Contributor | null> {
  const contributor = await Contributor.findOne({
    qrHash,
    isActive: true,
  });

  if (!contributor) {
    return null;
  }

  const balance = await getContributorBalance(contributor._id.toString());

  return {
    id: contributor._id.toString(),
    fullName: contributor.fullName,
    phoneNumber: contributor.phoneNumber,
    address: contributor.address || '',
    idPhotographUrl: contributor.idPhotographUrl,
    qrHash: contributor.qrHash,
    balance,
    isActive: contributor.isActive,
    onboardedAt: contributor.onboardedAt.toISOString(),
    createdAt: contributor.createdAt.toISOString(),
  };
}

/**
 * Get contributor by phone number
 */
export async function getContributorByPhone(phoneNumber: string): Promise<Contributor | null> {
  const contributor = await Contributor.findOne({
    phoneNumber,
    isActive: true,
  });

  if (!contributor) {
    return null;
  }

  const balance = await getContributorBalance(contributor._id.toString());

  return {
    id: contributor._id.toString(),
    fullName: contributor.fullName,
    phoneNumber: contributor.phoneNumber,
    address: contributor.address || '',
    idPhotographUrl: contributor.idPhotographUrl,
    qrHash: contributor.qrHash,
    balance,
    isActive: contributor.isActive,
    onboardedAt: contributor.onboardedAt.toISOString(),
    createdAt: contributor.createdAt.toISOString(),
  };
}

/**
 * List contributors (for agents to see their onboarded contributors)
 */
export async function listContributors(
  agentId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ contributors: Contributor[]; total: number }> {
  const query: any = { isActive: true };

  if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
    query.onboardedByAgentId = new mongoose.Types.ObjectId(agentId);
  }

  const [contributors, total] = await Promise.all([
    Contributor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean(),
    Contributor.countDocuments(query),
  ]);

  // Get balances for all contributors
  const contributorsWithBalance = await Promise.all(
    contributors.map(async (contributor) => {
      const balance = await getContributorBalance(contributor._id.toString());
      return {
        id: contributor._id.toString(),
        fullName: contributor.fullName,
        phoneNumber: contributor.phoneNumber,
        address: contributor.address || '',
        idPhotographUrl: contributor.idPhotographUrl,
        qrHash: contributor.qrHash,
        balance,
        isActive: contributor.isActive,
        onboardedAt: contributor.onboardedAt.toISOString(),
        createdAt: contributor.createdAt.toISOString(),
      };
    })
  );

  return { contributors: contributorsWithBalance, total };
}

export const contributorService = {
  onboardContributor,
  getContributorById,
  getContributorByQRHash,
  getContributorByPhone,
  listContributors,
  generateQRHash,
};
