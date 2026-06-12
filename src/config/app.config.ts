/**
 * Application Configuration
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const appConfig = {
  // Server Configuration
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  apiVersion: 'v1',
  apiPrefix: `/api/v1`,

  // Security
  corsEnabled: process.env.CORS_ENABLED !== 'false',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  trustProxy: process.env.TRUST_PROXY === 'true',
  helmetEnabled: process.env.HELMET_ENABLED !== 'false',

  // TLS/SSL
  tlsEnabled: process.env.TLS_ENABLED === 'true',
  tlsKeyPath: process.env.TLS_KEY_PATH || './certs/server.key',
  tlsCertPath: process.env.TLS_CERT_PATH || './certs/server.cert',

  // WebSocket
  wsPort: parseInt(process.env.WS_PORT || '3001', 10),
  wsPingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
  wsPingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),

  // Agent Configuration
  agentHeartbeatInterval: parseInt(process.env.AGENT_HEARTBEAT_INTERVAL || '60000', 10),
  agentHeartbeatTimeout: parseInt(process.env.AGENT_HEARTBEAT_TIMEOUT || '120000', 10),
  agentMaxConnections: parseInt(process.env.AGENT_MAX_CONNECTIONS || '1000', 10),
  agentDiscoveryTTL: parseInt(process.env.AGENT_DISCOVERY_TTL || '300000', 10),

  // Command Configuration
  commandTimeout: parseInt(process.env.COMMAND_TIMEOUT || '30000', 10),
  commandMaxRetries: parseInt(process.env.COMMAND_MAX_RETRIES || '3', 10),
  commandRetryDelay: parseInt(process.env.COMMAND_RETRY_DELAY || '1000', 10),
  commandQueueMaxSize: parseInt(process.env.COMMAND_QUEUE_MAX_SIZE || '10000', 10),

  // Rate Limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'json',

  // Database
  dbType: process.env.DB_TYPE || 'redis',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '6379', 10),
  dbPassword: process.env.DB_PASSWORD || '',
  dbDatabase: parseInt(process.env.DB_DATABASE || '0', 10),

  // Encryption
  encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  encryptionKeyDerivation: process.env.ENCRYPTION_KEY_DERIVATION || 'pbkdf2',

  // Monitoring
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),

  // Audit
  auditLogEnabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '30', 10),

  // Alerts
  alertEmailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
  alertEmailHost: process.env.ALERT_EMAIL_HOST || 'smtp.gmail.com',
  alertEmailPort: parseInt(process.env.ALERT_EMAIL_PORT || '587', 10),
  alertEmailUser: process.env.ALERT_EMAIL_USER || '',
  alertEmailPassword: process.env.ALERT_EMAIL_PASSWORD || '',
  alertEmailFrom: process.env.ALERT_EMAIL_FROM || 'alerts@orchestration.local',

  // Debug
  debug: process.env.DEBUG === 'true',
  verbose: process.env.VERBOSE === 'true',

  // Validation
  validateOnStartup: process.env.VALIDATE_ON_STARTUP !== 'false',
};

/**
 * Validate critical configuration
 */
export function validateAppConfig(): void {
  const required = ['PORT', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (appConfig.port < 1 || appConfig.port > 65535) {
    throw new Error(`Invalid PORT: ${appConfig.port}`);
  }

  if (appConfig.wsPort < 1 || appConfig.wsPort > 65535) {
    throw new Error(`Invalid WS_PORT: ${appConfig.wsPort}`);
  }

  if (appConfig.port === appConfig.wsPort) {
    throw new Error('PORT and WS_PORT cannot be the same');
  }
}

export default appConfig;
