import { Request } from 'express';

// User Roles
export enum UserRole {
  CONTRIBUTOR = 'contributor',
  AGENT = 'agent',
  OPERATIONS_ADMIN = 'operations_admin',
  SUPER_ADMIN = 'super_admin'
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  role: UserRole;
  email?: string;
}

// Withdrawal States
export enum WithdrawalState {
  REQUESTED = 'REQUESTED',
  OTP_VERIFIED = 'OTP_VERIFIED',
  PENDING_ADMIN = 'PENDING_ADMIN',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED'
}

// Transaction Types
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REVERSAL = 'REVERSAL',
  RECONCILIATION = 'RECONCILIATION'
}

// Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
