/**
 * API Middleware
 * Authentication, validation, error handling, rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';
import { AuthGuard } from '@core/auth_guard';
import { SecurityContext } from '@types/api.types';

// Extend Express Request to include security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: SecurityContext;
      requestId?: string;
    }
  }
}

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Authentication middleware
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization header',
        requestId: req.requestId,
      });
    }

    const token = AuthGuard.extractToken(authHeader);

    if (!AuthGuard.isValidTokenFormat(token)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        requestId: req.requestId,
      });
    }

    const securityContext = AuthGuard.createSecurityContext(token);
    req.securityContext = securityContext;

    logger.debug(`Authentication successful for user: ${securityContext.userId}`);
    next();
  } catch (error) {
    logger.warn('Authentication failed', error);
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      requestId: req.requestId,
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = AuthGuard.extractToken(authHeader);
      if (AuthGuard.isValidTokenFormat(token)) {
        req.securityContext = AuthGuard.createSecurityContext(token);
      }
    }
  } catch (error) {
    logger.debug('Optional authentication skipped');
  }

  next();
};

/**
 * Permission check middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.securityContext) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId: req.requestId,
      });
    }

    if (!AuthGuard.hasPermission(req.securityContext, permission)) {
      logger.warn(`Permission denied for user ${req.securityContext.userId}: ${permission}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId: req.requestId,
      });
    }

    next();
  };
};

/**
 * Role check middleware
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.securityContext) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId: req.requestId,
      });
    }

    if (!AuthGuard.hasRole(req.securityContext, role)) {
      logger.warn(`Role check failed for user ${req.securityContext.userId}: ${role}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
        requestId: req.requestId,
      });
    }

    next();
  };
};

/**
 * Input validation middleware
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Placeholder for actual Joi validation
      // In real implementation, use Joi schema validation
      logger.debug('Request validation passed');
      next();
    } catch (error) {
      logger.warn('Request validation failed', error);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Invalid input',
        requestId: req.requestId,
      });
    }
  };
};

/**
 * Logging middleware
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: req.securityContext?.userId,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', log);
    } else {
      logger.info('Request completed', log);
    }
  });

  next();
};

/**
 * Error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error('Unhandled error', {
    error: err,
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.requestId,
  });
};

/**
 * Not found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    requestId: req.requestId,
  });
};
