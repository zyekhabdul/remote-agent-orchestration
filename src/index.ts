/**
 * Application Entry Point
 * Initializes Express server, WebSocket, and core services
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import { logger } from '@utils/logger';
import { appConfig, validateAppConfig } from '@config/app.config';
import { validateAuthConfig } from '@config/auth.config';
import { validateDatabaseConfig } from '@config/database.config';
import { healthMonitor } from '@core/health_monitor';
import { agentManager } from '@core/agent_manager';
import { commandRouter } from '@core/command_router';
import { wsServer } from '@websocket/server';
import { agentService } from '@services/agent.service';
import { commandService } from '@services/command.service';
import { AgentController, CommandController } from '@api/controllers';
import {
  requestIdMiddleware,
  optionalAuthMiddleware,
  loggingMiddleware,
  errorHandler,
  notFoundHandler,
} from '@api/middleware';

class Application {
  private app: Express;
  private server?: http.Server;
  private port: number;

  constructor() {
    this.app = express();
    this.port = appConfig.port;
  }

  /**
   * Initialize application
   */
  async initialize(): Promise<void> {
    logger.info('Initializing application...');

    try {
      // Validate configurations
      this.validateConfigurations();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Initialize core services
      this.initializeCoreServices();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      throw error;
    }
  }

  /**
   * Validate all configurations
   */
  private validateConfigurations(): void {
    logger.info('Validating configurations...');

    try {
      validateAppConfig();
      validateAuthConfig();
      validateDatabaseConfig();
      logger.info('All configurations validated');
    } catch (error) {
      logger.error('Configuration validation failed', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Request ID middleware
    this.app.use(requestIdMiddleware);

    // Security middleware
    if (appConfig.helmetEnabled) {
      this.app.use(helmet());
    }

    // Trust proxy
    if (appConfig.trustProxy) {
      this.app.set('trust proxy', true);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Logging
    this.app.use(logger.getHttpLogger() as any);
    this.app.use(loggingMiddleware);

    // Rate limiting
    if (appConfig.rateLimitEnabled) {
      const limiter = rateLimit({
        windowMs: appConfig.rateLimitWindowMs,
        max: appConfig.rateLimitMaxRequests,
        message: 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use(limiter);
    }

    // CORS
    if (appConfig.corsEnabled) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', appConfig.corsOrigins.join(','));
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Optional authentication for some endpoints
    this.app.use(optionalAuthMiddleware);

    logger.info('Middleware setup complete');
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    const apiPrefix = appConfig.apiPrefix;

    // Health check endpoint
    this.app.get(`${apiPrefix}/health`, (req: Request, res: Response) => {
      const health = healthMonitor.getSystemHealth();
      res.status(health.overallStatus === 'healthy' ? 200 : 503).json({
        success: health.overallStatus === 'healthy',
        data: health,
        requestId: req.requestId,
      });
    });

    // Agent endpoints
    this.app.post(`${apiPrefix}/agents`, async (req: Request, res: Response) => {
      await AgentController.register(req, res);
    });

    this.app.get(`${apiPrefix}/agents`, async (req: Request, res: Response) => {
      await AgentController.getAll(req, res);
    });

    this.app.get(`${apiPrefix}/agents/:agentId`, async (req: Request, res: Response) => {
      await AgentController.getById(req, res);
    });

    this.app.get(`${apiPrefix}/agents/:agentId/health`, async (req: Request, res: Response) => {
      await AgentController.getHealth(req, res);
    });

    this.app.delete(`${apiPrefix}/agents/:agentId`, async (req: Request, res: Response) => {
      await AgentController.deregister(req, res);
    });

    // Command endpoints
    this.app.post(`${apiPrefix}/commands`, async (req: Request, res: Response) => {
      await CommandController.submit(req, res);
    });

    this.app.get(`${apiPrefix}/commands/:commandId`, async (req: Request, res: Response) => {
      await CommandController.getById(req, res);
    });

    this.app.get(`${apiPrefix}/commands/:commandId/status`, async (req: Request, res: Response) => {
      await CommandController.getStatus(req, res);
    });

    this.app.delete(`${apiPrefix}/commands/:commandId`, async (req: Request, res: Response) => {
      await CommandController.cancel(req, res);
    });

    // Status endpoint
    this.app.get(`${apiPrefix}/status`, (req: Request, res: Response) => {
      const stats = {
        agents: agentManager.getStatistics(),
        commands: commandRouter.getStatistics(),
        system: healthMonitor.getSystemHealth(),
      };
      res.json({
        success: true,
        data: stats,
        requestId: req.requestId,
      });
    });

    logger.info('Routes setup complete');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: notFoundHandler);

    // Global error handler
    this.app.use(errorHandlerogger.info('Error handling setup complete');
  }

  /**
   * Initialize core services
   */
  private initializeCoreServices(): void {
    logger.info('Initializing core services...');

    // Start health monitoring
    healthMonitor.startMonitoring();

    logger.info('Core services initialized');
  }

  /**
   * Start server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app.listen(this.port, appConfig.host, () => {
        logger.info(`Server listening on ${appConfig.host}:${this.port}`);
        resolve();
      });

      this.app.on('error', (error) => {
        logger.error('Server error', error);
        reject(error);
      });
    });
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    healthMonitor.stopMonitoring();
    logry {
        // Create HTTP server
        this.server = http.createServer(this.app);

        // Setup WebSocket on HTTP server
        wsServer.start(this.server);

        // Start listening
        this.server.listen(this.port, appConfig.host, () => {
          logger.info(`🚀 HTTP Server listening on http://${appConfig.host}:${this.port}`);
          logger.info(`🔌 WebSocket Server listening on ws://${appConfig.host}:${appConfig.wsPort}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('Server error', error);
          reject(error);
    wsServer.stop();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Application stopped');
          resolve();
        });
      } else {
        logger.info('Application stopped');
        resolve();
      }
    }
      } catch (error) {
        logger.error('Failed to start server', error);
        reject(error);
      }
}

// Export application class
export default Application;

// Start application if this is the main module
if (require.main === module) {
  const app = new Application();

  app
    .initialize()
    .then(() => app.start())
    .catch((error) => {
      logger.fatal('Failed to start application', error);
      process.exit(1);
    });

  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down...');
    await app.stop();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal('Unhandled rejection', reason);
    process.exit(1);
  });
}
