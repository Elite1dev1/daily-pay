import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
