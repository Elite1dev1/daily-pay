import { apiService } from './api';
import {
  getUnsyncedTransactions,
  markTransactionSynced,
  deleteSyncedTransaction,
} from '../utils/offlineStorage';
import { logger as logUtil } from '../utils/logger';

const SYNC_RETRY_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Sync offline transactions with server
 */
export async function syncOfflineTransactions(): Promise<void> {
  try {
    const unsyncedTransactions = await getUnsyncedTransactions();

    if (unsyncedTransactions.length === 0) {
      return; // Nothing to sync
    }

    logUtil.info(`Syncing ${unsyncedTransactions.length} offline transactions`);

    for (const transaction of unsyncedTransactions) {
      try {
        if (transaction.type === 'DEPOSIT') {
          // Create deposit on server (offline deposits aren't in DB yet)
          await apiService.createDeposit({
            contributorId: transaction.contributorId,
            qrHash: transaction.qrHash,
            amount: transaction.amount,
            gpsLatitude: transaction.gpsLatitude,
            gpsLongitude: transaction.gpsLongitude,
            gpsAccuracy: transaction.gpsAccuracy,
          });
          await markTransactionSynced(transaction.id);
          logUtil.info(`Synced deposit: ${transaction.referenceId}`);
        }
        // Add other transaction types as needed
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        logUtil.error(`Failed to sync transaction ${transaction.id}`, { 
          error: errorMessage,
          transactionId: transaction.id,
          transactionType: transaction.type,
          fullError: error 
        });
        // Continue with next transaction
      }
    }

    // Clean up old synced transactions (older than 7 days)
    const allTransactions = await getUnsyncedTransactions();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const transaction of allTransactions) {
      if (transaction.synced && transaction.syncedAt) {
        const syncedTime = new Date(transaction.syncedAt).getTime();
        if (syncedTime < sevenDaysAgo) {
          await deleteSyncedTransaction(transaction.id);
        }
      }
    }
  } catch (error) {
    logUtil.error('Sync failed', { error });
    throw error;
  }
}

/**
 * Start background sync service
 * Retries every 15 minutes
 */
export function startBackgroundSync(): () => void {
  let syncInterval: number | null = null;

  const performSync = async () => {
    try {
      await syncOfflineTransactions();
    } catch (error) {
      logUtil.error('Background sync error', { error });
    }
  };

  // Initial sync
  performSync();

  // Set up interval
  syncInterval = window.setInterval(performSync, SYNC_RETRY_INTERVAL);

  // Return cleanup function
  return () => {
    if (syncInterval !== null) {
      clearInterval(syncInterval);
    }
  };
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function setupOnlineListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
