/**
 * Database Configuration
 * Database connection and ORM settings
 */

import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  // Database Type
  type: process.env.DB_TYPE || 'redis',
  
  // Redis Configuration (for caching and session store)
  redis: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6379', 10),
    password: process.env.DB_PASSWORD || undefined,
    db: parseInt(process.env.DB_DATABASE || '0', 10),
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    // Connection pool
    maxConnections: 10,
    minConnections: 2,
  },

  // MongoDB Configuration (optional for document storage)
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DB || 'orchestration',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      maxPoolSize: 10,
      minPoolSize: 5,
    },
  },

  // PostgreSQL Configuration (optional for relational storage)
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DB || 'orchestration',
    ssl: process.env.PG_SSL === 'true',
    poolMin: 2,
    poolMax: 10,
  },

  // Query Configuration
  query: {
    timeout: 30000, // 30 seconds
    retries: 3,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  },

  // Connection Pooling
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  // Cache Configuration
  cache: {
    enabled: true,
    defaultTTL: 3600, // 1 hour in seconds
    commandResultTTL: 300, // 5 minutes for command results
    agentDataTTL: 600, // 10 minutes for agent data
  },

  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED !== 'false',
    frequency: 'daily', // daily, weekly, monthly
    retentionDays: 30,
    location: process.env.BACKUP_LOCATION || './backups',
  },

  // Logging
  logging: {
    enabled: true,
    level: process.env.DB_LOG_LEVEL || 'error',
    queries: process.env.NODE_ENV === 'development',
  },
};

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): void {
  const { type } = databaseConfig;

  if (!['redis', 'mongodb', 'postgresql', 'memory'].includes(type)) {
    throw new Error(`Invalid database type: ${type}`);
  }

  if (type === 'redis' && databaseConfig.redis.host === 'localhost' && process.env.NODE_ENV === 'production') {
    console.warn('Using localhost for Redis in production is not recommended');
  }

  if (type === 'postgresql') {
    const { host, port } = databaseConfig.postgresql;
    if (port < 1 || port > 65535) {
      throw new Error(`Invalid PostgreSQL port: ${port}`);
    }
    console.info(`Configured PostgreSQL: ${host}:${port}`);
  }
}

export default databaseConfig;
