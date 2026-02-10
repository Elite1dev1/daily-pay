import { io } from '../server';
import { logger } from '../utils/logger';

/**
 * Broadcast dashboard updates to all connected clients
 */
export function broadcastDashboardUpdate(type: 'financial' | 'transaction' | 'agent' | 'analytics', data: any) {
  try {
    io.to('dashboard').emit('dashboard:update', {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    logger.debug('Dashboard update broadcasted', { type });
  } catch (error) {
    logger.error('Failed to broadcast dashboard update', { error });
  }
}

/**
 * Broadcast financial summary update
 */
export function broadcastFinancialUpdate(data: any) {
  broadcastDashboardUpdate('financial', data);
}

/**
 * Broadcast transaction update
 */
export function broadcastTransactionUpdate(data: any) {
  broadcastDashboardUpdate('transaction', data);
}

/**
 * Broadcast agent update
 */
export function broadcastAgentUpdate(data: any) {
  broadcastDashboardUpdate('agent', data);
}

/**
 * Broadcast analytics update
 */
export function broadcastAnalyticsUpdate(data: any) {
  broadcastDashboardUpdate('analytics', data);
}

export const websocketService = {
  broadcastDashboardUpdate,
  broadcastFinancialUpdate,
  broadcastTransactionUpdate,
  broadcastAgentUpdate,
  broadcastAnalyticsUpdate,
};
