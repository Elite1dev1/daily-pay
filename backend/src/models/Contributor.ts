import mongoose, { Schema, Document } from 'mongoose';

export interface IContributor extends Document {
  fullName: string;
  phoneNumber: string;
  address?: string;
  idPhotographUrl?: string;
  qrHash: string;
  qrIssuedAt: Date;
  isActive: boolean;
  onboardedByAgentId: mongoose.Types.ObjectId;
  onboardedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContributorSchema = new Schema<IContributor>(
  {
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    address: String,
    idPhotographUrl: String,
    qrHash: {
      type: String,
      required: true,
      unique: true,
    },
    qrIssuedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onboardedByAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    onboardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ContributorSchema.index({ phoneNumber: 1 });
ContributorSchema.index({ qrHash: 1 });
ContributorSchema.index({ onboardedByAgentId: 1 });

export const Contributor = mongoose.model<IContributor>('Contributor', ContributorSchema);
