import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { UserRole } from '../types';
import { logger } from '../utils/logger';
import { auditLogService } from './auditLogService';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    phoneNumber?: string;
  };
}

/**
 * Authenticate user and generate JWT token
 */
export async function login(
  credentials: LoginCredentials,
  ipAddress?: string,
  userAgent?: string,
  deviceId?: string
): Promise<AuthResponse> {
  const { email, password } = credentials;

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive. Please contact administrator.');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    await auditLogService.log({
      actorId: undefined,
      actorRole: undefined,
      actionType: 'LOGIN_FAILED',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      ipAddress,
      userAgent,
      deviceId,
      metadata: { email, reason: 'invalid_password' },
    });

    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id.toString(), user.role as UserRole, user.email);

  // Log successful login
  await auditLogService.log({
    actorId: user._id.toString(),
    actorRole: user.role,
    actionType: 'USER_LOGIN',
    resourceType: 'USER',
    resourceId: user._id.toString(),
    ipAddress,
    userAgent,
    deviceId,
  });

  logger.info('User logged in', { userId: user._id.toString(), role: user.role });

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
    },
  };
}

/**
 * Register a new user (typically for agents or admins)
 * Super admins can register other users
 */
export async function register(
  data: RegisterData,
  createdBy?: string
): Promise<AuthResponse> {
  const { email, password, fullName, phoneNumber, role } = data;

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role,
    fullName,
    phoneNumber: phoneNumber || undefined,
    isActive: true,
  });

  // Log registration
  await auditLogService.log({
    actorId: createdBy || user._id.toString(),
    actorRole: createdBy ? undefined : (role as any),
    actionType: 'USER_REGISTERED',
    resourceType: 'USER',
    resourceId: user._id.toString(),
    metadata: { email, role, createdBy: createdBy || 'self' },
  });

  logger.info('User registered', { userId: user._id.toString(), role });

  // Generate token for immediate use
  const token = generateToken(user._id.toString(), role, user.email);

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: role,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).select('email role fullName phoneNumber isActive createdAt');

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    is_active: user.isActive,
    created_at: user.createdAt,
  };
}

// Export as service object for consistency
export const authService = {
  login,
  register,
  getUserById,
};
