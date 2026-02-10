import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { JWTPayload, UserRole } from '../types';

/**
 * Generate JWT token for a user
 */
export function generateToken(userId: string, role: UserRole, email?: string): string {
  const payload: JWTPayload = {
    userId,
    role,
    email,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
