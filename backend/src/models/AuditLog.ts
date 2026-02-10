import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  actionType: string;
  resourceType?: string;
  resourceId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  requestPath?: string;
  requestMethod?: string;
  requestBody?: Record<string, any>;
  responseStatus?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorRole: String,
    actionType: {
      type: String,
      required: true,
    },
    resourceType: String,
    resourceId: Schema.Types.ObjectId,
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    requestPath: String,
    requestMethod: String,
    requestBody: {
      type: Schema.Types.Mixed,
    },
    responseStatus: Number,
    errorMessage: String,
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Prevent updates (immutability)
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable.');
});

AuditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable.');
});

AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ actionType: 1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ createdAt: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
