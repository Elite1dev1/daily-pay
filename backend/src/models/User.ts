import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'agent' | 'operations_admin' | 'super_admin';
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  deviceId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['agent', 'operations_admin', 'super_admin'],
    },
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    deviceId: String,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ deviceId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
