import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  contributorId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  amount: number;
  state: 'REQUESTED' | 'OTP_VERIFIED' | 'PENDING_ADMIN' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
  otpCode?: string;
  otpVerifiedAt?: Date;
  otpExpiresAt?: Date;
  ledgerEventId?: mongoose.Types.ObjectId;
  requestedAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    contributorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contributor',
      required: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    state: {
      type: String,
      required: true,
      enum: ['REQUESTED', 'OTP_VERIFIED', 'PENDING_ADMIN', 'APPROVED', 'EXECUTED', 'REJECTED'],
      default: 'REQUESTED',
    },
    otpCode: String,
    otpVerifiedAt: Date,
    otpExpiresAt: Date,
    ledgerEventId: {
      type: Schema.Types.ObjectId,
      ref: 'LedgerEvent',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    rejectionReason: String,
    executedAt: Date,
  },
  {
    timestamps: true,
  }
);

WithdrawalSchema.index({ contributorId: 1 });
WithdrawalSchema.index({ agentId: 1 });
WithdrawalSchema.index({ state: 1 });
WithdrawalSchema.index({ otpCode: 1 });

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
