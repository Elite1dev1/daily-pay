import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

export interface AuditLogData {
  actorId?: string | null;
  actorRole?: string | null;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  requestPath?: string;
  requestMethod?: string;
  requestBody?: any;
  responseStatus?: number;
  errorMessage?: string;
  metadata?: any;
}

/**
 * Audit Log Service
 * Logs all system actions for compliance and audit purposes
 */
class AuditLogService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await AuditLog.create({
        actorId: data.actorId ? new mongoose.Types.ObjectId(data.actorId) : undefined,
        actorRole: data.actorRole || undefined,
        actionType: data.actionType,
        resourceType: data.resourceType || undefined,
        resourceId: data.resourceId ? new mongoose.Types.ObjectId(data.resourceId) : undefined,
        ipAddress: data.ipAddress || undefined,
        userAgent: data.userAgent || undefined,
        deviceId: data.deviceId || undefined,
        requestPath: data.requestPath || undefined,
        requestMethod: data.requestMethod || undefined,
        requestBody: data.requestBody || undefined,
        responseStatus: data.responseStatus || undefined,
        errorMessage: data.errorMessage || undefined,
        metadata: data.metadata || undefined,
      });
    } catch (error) {
      // Don't throw - audit logging should never break the application
      logger.error('Failed to write audit log', { error, data });
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(filters: {
    actorId?: string;
    actionType?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const query: any = {};

    if (filters.actorId && mongoose.Types.ObjectId.isValid(filters.actorId)) {
      query.actorId = new mongoose.Types.ObjectId(filters.actorId);
    }

    if (filters.actionType) {
      query.actionType = filters.actionType;
    }

    if (filters.resourceType) {
      query.resourceType = filters.resourceType;
    }

    if (filters.resourceId && mongoose.Types.ObjectId.isValid(filters.resourceId)) {
      query.resourceId = new mongoose.Types.ObjectId(filters.resourceId);
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return logs;
  }
}

export const auditLogService = new AuditLogService();
