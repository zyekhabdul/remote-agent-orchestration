/**
 * Elasticsearch Logger Configuration (Optional)
 * For production deployments with centralized logging
 */

export const elasticsearchConfig = {
  enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
  host: process.env.ELASTICSEARCH_HOST || 'localhost',
  port: parseInt(process.env.ELASTICSEARCH_PORT || '9200', 10),
  protocol: process.env.ELASTICSEARCH_PROTOCOL || 'http',
  username: process.env.ELASTICSEARCH_USER || '',
  password: process.env.ELASTICSEARCH_PASSWORD || '',
  indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'orchestration',
  indexRotation: 'daily',
  bulkSize: 100,
  flushInterval: 5000,
};

/**
 * Monitoring & Alerts Configuration
 */
export const monitoringConfig = {
  // Prometheus metrics
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),

  // Alert thresholds
  alerts: {
    // Agent alerts
    agentOfflineThreshold: parseInt(process.env.AGENT_OFFLINE_THRESHOLD || '300000', 10), // 5 minutes
    agentUnhealthyThreshold: parseInt(process.env.AGENT_UNHEALTHY_THRESHOLD || '120000', 10), // 2 minutes
    agentHighCpuThreshold: parseInt(process.env.AGENT_HIGH_CPU_THRESHOLD || '90', 10),
    agentHighMemoryThreshold: parseInt(process.env.AGENT_HIGH_MEMORY_THRESHOLD || '90', 10),
    agentLowDiskThreshold: parseInt(process.env.AGENT_LOW_DISK_THRESHOLD || '5', 10), // 5% free

    // Command alerts
    commandFailureRate: parseInt(process.env.COMMAND_FAILURE_RATE || '10', 10), // percentage
    commandTimeoutRate: parseInt(process.env.COMMAND_TIMEOUT_RATE || '5', 10), // percentage

    // System alerts
    systemHighMemory: parseInt(process.env.SYSTEM_HIGH_MEMORY || '80', 10),
    systemHighCpu: parseInt(process.env.SYSTEM_HIGH_CPU || '85', 10),
  },

  // Slack notifications
  slack: {
    enabled: process.env.SLACK_ENABLED === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_CHANNEL || '#alerts',
    username: process.env.SLACK_USERNAME || 'Orchestration Bot',
  },

  // Email notifications
  email: {
    enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    fromAddress: process.env.EMAIL_FROM || 'noreply@orchestration.local',
    recipients: (process.env.EMAIL_RECIPIENTS || '').split(','),
  },

  // PagerDuty
  pagerduty: {
    enabled: process.env.PAGERDUTY_ENABLED === 'true',
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
  },
};

/**
 * Advanced Routing Rules Configuration
 */
export const advancedRoutingConfig = {
  // Custom routing rules
  rules: [
    {
      id: 'rule-critical-priority',
      name: 'Route critical commands to best agents',
      enabled: true,
      priority: 100,
      conditions: [
        {
          type: 'command_priority',
          operator: 'equals',
          value: 'critical',
        },
      ],
      actions: [
        {
          type: 'route_to_agents',
          parameters: {
            strategy: 'least-loaded',
            minAgents: 2,
            requireHealthy: true,
          },
        },
      ],
    },
  ],

  // Load balancing
  loadBalancing: {
    strategy: 'least-loaded',
    strategies: {
      'round-robin': {},
      'least-loaded': {
        metric: 'cpu',
      },
      'least-memory': {
        metric: 'memory',
      },
      'random': {},
      'broadcast': {},
    },
  },

  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenRequests: 3,
  },
};

/**
 * Compliance & Audit Configuration
 */
export const complianceConfig = {
  // Audit logging
  audit: {
    enabled: true,
    logLevel: 'all', // all, critical, changes
    retentionDays: 90,
    storage: 'database', // database, file, both
  },

  // Compliance standards
  compliance: {
    hipaa: false,
    gdpr: false,
    pci: false,
    sox: false,
  },

  // Data retention
  dataRetention: {
    commandResults: 90, // days
    agentEvents: 30,
    auditLogs: 90,
    metrics: 7,
  },

  // Encryption
  encryption: {
    atRest: true,
    inTransit: true,
    keyRotation: 90, // days
  },
};

export default {
  elasticsearchConfig,
  monitoringConfig,
  advancedRoutingConfig,
  complianceConfig,
};
