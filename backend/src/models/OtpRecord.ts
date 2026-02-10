import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpRecord extends Document {
  contributorId: mongoose.Types.ObjectId;
  withdrawalId?: mongoose.Types.ObjectId;
  otpCode: string;
  purpose: 'WITHDRAWAL' | 'BALANCE_CHECK';
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>(
  {
    contributorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contributor',
      required: true,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: 'Withdrawal',
    },
    otpCode: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ['WITHDRAWAL', 'BALANCE_CHECK'],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

OtpRecordSchema.index({ contributorId: 1 });
OtpRecordSchema.index({ otpCode: 1 });
OtpRecordSchema.index({ expiresAt: 1 });

export const OtpRecord = mongoose.model<IOtpRecord>('OtpRecord', OtpRecordSchema);
