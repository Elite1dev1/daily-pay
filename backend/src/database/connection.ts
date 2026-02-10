import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 
  `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'daili_pay'}`;

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Connect to MongoDB
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(mongoUri, mongoOptions);
    logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//***:***@') });
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

// Helper function for transactions (MongoDB transactions)
export const transaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction failed', { error });
    throw error;
  } finally {
    session.endSession();
  }
};

// Export mongoose for direct use if needed
export default mongoose;
