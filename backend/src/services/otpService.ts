import crypto from 'crypto';
import mongoose from 'mongoose';
import { OtpRecord } from '../models/OtpRecord';
import { logger } from '../utils/logger';
import { smsService } from './smsService';
import { systemConfig } from '../config/database';

/**
 * Generate OTP code
 */
export function generateOTP(length: number = systemConfig.otpLength): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

/**
 * Create OTP record
 */
export async function createOTP(
  contributorId: string,
  withdrawalId: string,
  purpose: 'WITHDRAWAL' | 'BALANCE_CHECK' = 'WITHDRAWAL'
): Promise<string> {
  const otpCode = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + systemConfig.otpExpiryMinutes);

  await OtpRecord.create({
    contributorId: new mongoose.Types.ObjectId(contributorId),
    withdrawalId: new mongoose.Types.ObjectId(withdrawalId),
    otpCode,
    purpose,
    expiresAt,
    verified: false,
    attempts: 0,
    maxAttempts: 3,
  });

  return otpCode;
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  contributorId: string,
  withdrawalId: string,
  otpCode: string
): Promise<boolean> {
  const otpRecord = await OtpRecord.findOne({
    contributorId: new mongoose.Types.ObjectId(contributorId),
    withdrawalId: new mongoose.Types.ObjectId(withdrawalId),
    otpCode,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    // Increment attempts for failed verification
    const latestOtp = await OtpRecord.findOne({
      contributorId: new mongoose.Types.ObjectId(contributorId),
      withdrawalId: new mongoose.Types.ObjectId(withdrawalId),
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      latestOtp.attempts += 1;
      await latestOtp.save();
    }
    return false;
  }

  // Check if already verified
  if (otpRecord.verified) {
    return true; // Already verified
  }

  // Check if expired
  if (otpRecord.expiresAt < new Date()) {
    throw new Error('OTP has expired. Please request a new OTP.');
  }

  // Check attempts
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
  }

  // Verify OTP
  otpRecord.verified = true;
  otpRecord.verifiedAt = new Date();
  await otpRecord.save();

  return true;
}

/**
 * Send OTP to contributor
 */
export async function sendOTP(
  contributorId: string,
  withdrawalId: string,
  phoneNumber: string
): Promise<string> {
  const otpCode = await createOTP(contributorId, withdrawalId, 'WITHDRAWAL');

  try {
    await smsService.sendOTP(phoneNumber, otpCode, 'WITHDRAWAL');
  } catch (error) {
    logger.error('Failed to send OTP SMS', { error, contributorId, withdrawalId });
    throw new Error('Failed to send OTP. Please try again.');
  }

  return otpCode;
}

export const otpService = {
  generateOTP,
  createOTP,
  verifyOTP,
  sendOTP,
};
