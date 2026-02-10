export type UserRole = 'contributor' | 'agent' | 'operations_admin' | 'super_admin';

export enum WithdrawalState {
  REQUESTED = 'REQUESTED',
  OTP_VERIFIED = 'OTP_VERIFIED',
  PENDING_ADMIN = 'PENDING_ADMIN',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REVERSAL = 'REVERSAL',
  RECONCILIATION = 'RECONCILIATION'
}

export interface Contributor {
  id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  qrHash: string;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  contributorId: string;
  agentId: string;
  state?: WithdrawalState;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  referenceId: string;
  createdAt: string;
  synced: boolean;
}
