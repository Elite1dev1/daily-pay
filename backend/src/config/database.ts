import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  uri: process.env.MONGODB_URI || 
    `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'daili_pay'}`,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '27017', 10),
  database: process.env.DB_NAME || 'daili_pay',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

export const systemConfig = {
  circuitBreakerLimit: parseFloat(process.env.CIRCUIT_BREAKER_LIMIT || '10000'),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),
  gpsRequired: process.env.GPS_REQUIRED === 'true',
  syncRetryIntervalMinutes: parseInt(process.env.SYNC_RETRY_INTERVAL_MINUTES || '15', 10),
  maxOfflineHours: parseInt(process.env.MAX_OFFLINE_HOURS || '72', 10),
};
