/**
 * Authentication Guard
 * JWT validation, token refresh, and authorization logic
 */

import jwt from 'jsonwebtoken';
import { authConfig } from '@config/auth.config';
import { logger } from '@utils/logger';
import { AuthPayload, SecurityContext } from '@types/api.types';

export class AuthGuard {
  /**
   * Verify JWT token
   */
  static verifyToken(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret) as AuthPayload;
      return decoded;
    } catch (error) {
      logger.error('Token verification failed', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: Partial<AuthPayload>, expiresIn?: string | number): string {
    const tokenPayload: AuthPayload = {
      sub: payload.sub || '',
      aud: payload.aud || 'orchestration-api',
      iss: payload.iss || 'orchestration',
      iat: Math.floor(Date.now() / 1000),
      exp: 0, // Will be set by jwt.sign
      scope: payload.scope || [],
    };

    return jwt.sign(tokenPayload, authConfig.jwtSecret, {
      expiresIn: expiresIn || authConfig.jwtExpiration,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      authConfig.jwtRefreshSecret,
      {
        expiresIn: authConfig.jwtRefreshExpiration,
        algorithm: 'HS256',
      }
    );
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { sub: string; type: string } {
    try {
      const decoded = jwt.verify(token, authConfig.jwtRefreshSecret) as {
        sub: string;
        type: string;
      };
      return decoded;
    } catch (error) {
      logger.error('Refresh token verification failed', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Create security context from token
   */
  static createSecurityContext(token: string): SecurityContext {
    const payload = this.verifyToken(token);

    return {
      userId: payload.sub,
      username: payload.sub, // Can be enhanced with actual username from DB
      permissions: payload.scope || [],
      roles: ['user'], // Can be enhanced with role lookup
      authenticated: true,
      timestamp: new Date(),
    };
  }

  /**
   * Check if user has permission
   */
  static hasPermission(context: SecurityContext, requiredPermission: string): boolean {
    return context.permissions.includes(requiredPermission) || context.permissions.includes('*');
  }

  /**
   * Check if user has role
   */
  static hasRole(context: SecurityContext, requiredRole: string): boolean {
    return context.roles.includes(requiredRole) || context.roles.includes('admin');
  }

  /**
   * Validate token expiration
   */
  static isTokenExpiring(token: string, thresholdMs: number = 300000): boolean {
    try {
      const decoded = jwt.decode(token) as AuthPayload | null;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const expiresAt = decoded.exp * 1000;
      const now = Date.now();

      return expiresAt - now < thresholdMs;
    } catch {
      return true;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractToken(authHeader?: string): string {
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }
}

export default AuthGuard;
