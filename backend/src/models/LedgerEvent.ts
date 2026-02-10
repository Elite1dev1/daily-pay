import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerEvent extends Document {
  eventType: 'DEPOSIT' | 'WITHDRAWAL' | 'REVERSAL' | 'RECONCILIATION';
  contributorId?: mongoose.Types.ObjectId; // Optional for RECONCILIATION events
  agentId?: mongoose.Types.ObjectId;
  amount: number;
  referenceId: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  deviceId?: string;
  synced: boolean;
  syncedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const LedgerEventSchema = new Schema<ILedgerEvent>(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['DEPOSIT', 'WITHDRAWAL', 'REVERSAL', 'RECONCILIATION'],
    },
    contributorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contributor',
      required: false, // Optional - validation handled in service layer
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },
    gpsLatitude: Number,
    gpsLongitude: Number,
    gpsAccuracy: Number,
    deviceId: String,
    synced: {
      type: Boolean,
      default: false,
    },
    syncedAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Prevent updates (immutability)
LedgerEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('Ledger events are immutable. Use reversal + re-entry for corrections.');
});

LedgerEventSchema.pre('updateOne', function () {
  throw new Error('Ledger events are immutable. Use reversal + re-entry for corrections.');
});


LedgerEventSchema.index({ contributorId: 1 });
LedgerEventSchema.index({ agentId: 1 });
LedgerEventSchema.index({ referenceId: 1 });
LedgerEventSchema.index({ synced: 1 });
LedgerEventSchema.index({ createdAt: 1 });
LedgerEventSchema.index({ eventType: 1 });

export const LedgerEvent = mongoose.model<ILedgerEvent>('LedgerEvent', LedgerEventSchema);
