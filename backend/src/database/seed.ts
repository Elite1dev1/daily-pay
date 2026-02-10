import { connectDB } from './connection';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Seed script to create initial Super Admin user
 * This is a one-time setup script to bootstrap the system
 */
export async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');
    
    await connectDB();
    
    // Check if any users exist
    const existingUsers = await User.countDocuments();
    
    if (existingUsers > 0) {
      logger.info('Users already exist. Skipping seed.');
      return;
    }
    
    // Get Super Admin credentials from environment or use defaults
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@dailipay.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#';
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Administrator';
    
    // Hash password
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);
    
    // Create Super Admin
    const superAdmin = await User.create({
      email: superAdminEmail.toLowerCase(),
      passwordHash,
      role: 'super_admin',
      fullName: superAdminName,
      isActive: true,
    });
    
    logger.info('Super Admin created successfully', {
      userId: superAdmin._id.toString(),
      email: superAdminEmail,
    });
    
    logger.info(`
╔══════════════════════════════════════════════════════════════╗
║           DAI LI PAY - INITIAL SETUP COMPLETE                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Super Admin Credentials:                                     ║
║  Email:    ${superAdminEmail.padEnd(50)}║
║  Password: ${superAdminPassword.padEnd(50)}║
║                                                              ║
║  ⚠️  IMPORTANT: Change this password after first login!      ║
║                                                              ║
║  You can set custom credentials using environment variables: ║
║  - SUPER_ADMIN_EMAIL                                          ║
║  - SUPER_ADMIN_PASSWORD                                       ║
║  - SUPER_ADMIN_NAME                                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed', { error });
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding error', { error });
      process.exit(1);
    });
}
