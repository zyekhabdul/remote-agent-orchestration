/**
 * Logger Utility
 * Provides structured logging with pino
 */

import pino, { Logger as PinoLogger } from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

class Logger {
  private logger: PinoLogger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.logger.info({ ...metadata, requestId: uuidv4() }, message);
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.error({ err: error, stack: error.stack, requestId: uuidv4() }, message);
    } else {
      this.logger.error({ ...error, requestId: uuidv4() }, message);
    }
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warn({ ...metadata, requestId: uuidv4() }, message);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug({ ...metadata, requestId: uuidv4() }, message);
  }

  fatal(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.fatal({ err: error, stack: error.stack, requestId: uuidv4() }, message);
    } else {
      this.logger.fatal({ ...error, requestId: uuidv4() }, message);
    }
  }

  getHttpLogger() {
    return pinoHttp({
      logger: this.logger,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.ip,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
          headers: res.getHeaders(),
        }),
      },
    });
  }

  child(metadata: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(metadata);
    return childLogger;
  }
}

export const logger = new Logger();
export default Logger;
