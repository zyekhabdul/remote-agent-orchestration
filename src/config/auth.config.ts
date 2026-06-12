/**
 * Authentication Configuration
 * JWT and security settings
 */

import dotenv from 'dotenv';

dotenv.config();

export const authConfig = {
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',

  // Session Configuration
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  sessionRefreshThreshold: 60 * 60 * 1000, // 1 hour before expiry

  // Security
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordExpirationDays: 90,

  // OAuth Configuration (if needed)
  oauthEnabled: false,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',

  // API Key Configuration
  apiKeyEnabled: true,
  apiKeyPrefix: 'sk_',
  apiKeyLength: 32,
  apiKeyExpirationDays: 365,

  // Two-Factor Authentication
  mfaEnabled: false,
  mfaWindow: 30, // TOTP time window in seconds
  backupCodesCount: 10,

  // Rate Limiting for Auth
  authRateLimitWindow: 15 * 60 * 1000, // 15 minutes
  authRateLimitAttempts: 5,

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  corsCredentials: true,
  corsMaxAge: 86400,

  // HTTPS
  requireHttps: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1 year
  hstIncludeSubDomains: true,
  hstsPreload: true,

  // Content Security Policy
  cspEnabled: true,
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },

  // Rate Limiting for API
  apiRateLimitWindow: 900000, // 15 minutes
  apiRateLimitRequests: 100,
  apiRateLimitPerAgent: 1000,
};

/**
 * Validate auth configuration
 */
export function validateAuthConfig(): void {
  if (!authConfig.jwtSecret || authConfig.jwtSecret.includes('change-in-production')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be changed from default in production');
    }
  }

  if (authConfig.passwordMinLength < 6) {
    console.warn('Password minimum length is less than 6 characters');
  }
}

export default authConfig;
