import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentReconciliation extends Document {
  agentId: mongoose.Types.ObjectId;
  unreconciledBalanceBefore: number;
  cashAmountPresented: number;
  reconciledAmount: number;
  discrepancy?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reconciledBy?: mongoose.Types.ObjectId;
  reconciledAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentReconciliationSchema = new Schema<IAgentReconciliation>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    unreconciledBalanceBefore: {
      type: Number,
      required: true,
    },
    cashAmountPresented: {
      type: Number,
      required: true,
    },
    reconciledAmount: {
      type: Number,
      required: true,
    },
    discrepancy: Number,
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reconciledAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

AgentReconciliationSchema.index({ agentId: 1 });
AgentReconciliationSchema.index({ status: 1 });
AgentReconciliationSchema.index({ createdAt: 1 });

export const AgentReconciliation = mongoose.model<IAgentReconciliation>('AgentReconciliation', AgentReconciliationSchema);
