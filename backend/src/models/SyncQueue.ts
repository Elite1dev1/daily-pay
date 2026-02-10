import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncQueue extends Document {
  ledgerEventId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  deviceId?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SyncQueueSchema = new Schema<ISyncQueue>(
  {
    ledgerEventId: {
      type: Schema.Types.ObjectId,
      ref: 'LedgerEvent',
      required: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 10,
    },
    lastRetryAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED'],
      default: 'PENDING',
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

SyncQueueSchema.index({ agentId: 1 });
SyncQueueSchema.index({ status: 1 });
SyncQueueSchema.index({ ledgerEventId: 1 });

export const SyncQueue = mongoose.model<ISyncQueue>('SyncQueue', SyncQueueSchema);
