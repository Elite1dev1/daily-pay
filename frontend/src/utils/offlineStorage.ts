import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TransactionRecord {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  contributorId: string;
  qrHash: string;
  amount: number;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAccuracy?: number;
  referenceId: string;
  synced: boolean;
  createdAt: string;
  syncedAt?: string;
}

interface OfflineDBSchema extends DBSchema {
  transactions: {
    key: string;
    value: TransactionRecord;
    indexes: { 
      'by-synced': boolean; 
      'by-created': string;
    };
  } & DBSchema[string];
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineStorage(): Promise<void> {
  db = await openDB<OfflineDBSchema>('daili-pay-offline', 1, {
    upgrade(db) {
      const transactionStore = db.createObjectStore('transactions', {
        keyPath: 'id',
      });

      transactionStore.createIndex('by-synced', 'synced');
      transactionStore.createIndex('by-created', 'createdAt');
    },
  });
}

/**
 * Get database instance
 */
function getDB(): IDBPDatabase<OfflineDBSchema> {
  if (!db) {
    throw new Error('Offline storage not initialized. Call initOfflineStorage() first.');
  }
  return db;
}

/**
 * Store transaction offline
 */
export async function storeTransactionOffline(transaction: TransactionRecord): Promise<void> {
  const database = getDB();
  await database.put('transactions', transaction);
}

/**
 * Get unsynced transactions
 */
export async function getUnsyncedTransactions(): Promise<TransactionRecord[]> {
  const database = getDB();
  const index = database.transaction('transactions').store.index('by-synced');
  const transactions = await index.getAll(false);
  return transactions;
}

/**
 * Mark transaction as synced
 */
export async function markTransactionSynced(id: string): Promise<void> {
  const database = getDB();
  const transaction = await database.get('transactions', id);
  if (transaction) {
    transaction.synced = true;
    transaction.syncedAt = new Date().toISOString();
    await database.put('transactions', transaction);
  }
}

/**
 * Delete synced transaction (cleanup)
 */
export async function deleteSyncedTransaction(id: string): Promise<void> {
  const database = getDB();
  await database.delete('transactions', id);
}

/**
 * Get all transactions
 */
export async function getAllTransactions(): Promise<TransactionRecord[]> {
  const database = getDB();
  return database.getAll('transactions');
}

/**
 * Clear all transactions (for testing/cleanup)
 */
export async function clearAllTransactions(): Promise<void> {
  const database = getDB();
  await database.clear('transactions');
}
