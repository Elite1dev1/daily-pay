import { connectDB } from './connection';
import { SystemSetting } from '../models/SystemSetting';
import { logger } from '../utils/logger';

/**
 * Initialize MongoDB with default system settings
 * MongoDB doesn't require schema migrations like SQL databases
 * This function ensures default settings exist
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Initializing MongoDB with default settings...');
    
    await connectDB();
    
    // Insert default system settings if they don't exist
    const defaultSettings = [
      { key: 'CIRCUIT_BREAKER_LIMIT', value: '10000', description: 'Maximum unreconciled balance for agents (in kobo)' },
      { key: 'OTP_EXPIRY_MINUTES', value: '10', description: 'OTP expiration time in minutes' },
      { key: 'OTP_LENGTH', value: '6', description: 'OTP code length' },
      { key: 'GPS_REQUIRED', value: 'true', description: 'Whether GPS is required for deposits' },
      { key: 'SYNC_RETRY_INTERVAL_MINUTES', value: '15', description: 'Background sync retry interval in minutes' },
      { key: 'MAX_OFFLINE_HOURS', value: '72', description: 'Maximum hours agents can operate offline' },
    ];

    for (const setting of defaultSettings) {
      await SystemSetting.findOneAndUpdate(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true, new: true }
      );
    }
    
    logger.info('MongoDB initialization completed successfully');
  } catch (error) {
    logger.error('Initialization failed', { error });
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Initialization error', { error });
      process.exit(1);
    });
}
