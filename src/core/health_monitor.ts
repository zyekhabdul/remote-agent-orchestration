/**
 * Health Monitor
 * Periodic health checks with auto-recovery capabilities
 */

import { logger } from '@utils/logger';
import { eventEmitter } from '@core/event_emitter';
import { agentManager } from '@core/agent_manager';
import { appConfig } from '@config/app.config';
import { AgentStatus, AgentHealthReport } from '@types/agent.types';

export interface ComponentHealthStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  lastCheck: Date;
  checksDuration: number; // milliseconds
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealthStatus[];
  metrics: {
    totalAgents: number;
    onlineAgents: number;
    offlineAgents: number;
    unhealthyAgents: number;
    averageResponseTime: number;
  };
}

export class HealthMonitor {
  private healthChecks: Map<string, ComponentHealthStatus>;
  private systemMetrics: SystemHealthReport;
  private monitoringIntervals: Map<string, NodeJS.Timeout>;
  private alertCallbacks: ((report: SystemHealthReport) => void)[];

  constructor() {
    this.healthChecks = new Map();
    this.monitoringIntervals = new Map();
    this.alertCallbacks = [];
    this.systemMetrics = {
      timestamp: new Date(),
      overallStatus: 'healthy',
      components: [],
      metrics: {
        totalAgents: 0,
        onlineAgents: 0,
        offlineAgents: 0,
        unhealthyAgents: 0,
        averageResponseTime: 0,
      },
    };
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    logger.info('Starting health monitoring');

    // Check agent health periodically
    this.startAgentHealthCheck();

    // Check system components periodically
    this.startComponentHealthCheck();

    // Update system metrics periodically
    this.startMetricsCollection();

    eventEmitter.emit('healthMonitor:started', { timestamp: new Date() });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals.clear();
    logger.info('Health monitoring stopped');
  }

  /**
   * Start agent health checks
   */
  private startAgentHealthCheck(): void {
    const interval = setInterval(() => {
      this.checkAgentHealth();
    }, appConfig.agentHeartbeatInterval);

    this.monitoringIntervals.set('agentHealth', interval);
  }

  /**
   * Check agent health
   */
  private checkAgentHealth(): void {
    const agents = agentManager.getAllAgents();
    const now = Date.now();

    agents.forEach((agent) => {
      const timeSinceHeartbeat = now - new Date(agent.lastHeartbeat).getTime();
      const healthStatus = {
        agentId: agent.id,
        status: agent.status,
        timestamp: new Date(),
        uptime: now - new Date(agent.registeredAt).getTime(),
        resources: agent.resources,
        errorCount: 0,
        averageResponseTime: 0,
      } as AgentHealthReport;

      // Determine health based on heartbeat
      if (timeSinceHeartbeat > appConfig.agentHeartbeatTimeout) {
        healthStatus.status = AgentStatus.OFFLINE;
        agentManager.updateAgentStatus(agent.id, AgentStatus.OFFLINE);
      } else if (timeSinceHeartbeat > appConfig.agentHeartbeatInterval * 2) {
        healthStatus.status = AgentStatus.UNHEALTHY;
        agentManager.updateAgentStatus(agent.id, AgentStatus.UNHEALTHY);
      }

      // Record health report
      agentManager.recordHealthReport(healthStatus);

      // Check resource constraints
      this.checkResourceConstraints(agent.id, agent.resources);
    });
  }

  /**
   * Check resource constraints
   */
  private checkResourceConstraints(agentId: string, resources: any): void {
    const alerts: string[] = [];

    if (resources.cpu > 90) {
      alerts.push(`High CPU usage: ${resources.cpu}%`);
    }

    if (resources.memory > 90) {
      alerts.push(`High memory usage: ${resources.memory}%`);
    }

    if (resources.disk > 95) {
      alerts.push(`Disk almost full: ${resources.disk}%`);
    }

    alerts.forEach((alert) => {
      agentManager.logAgentEvent(agentId, {
        type: 'resource_alert',
        severity: 'warning',
        message: alert,
      });

      logger.warn(`Resource alert for agent ${agentId}: ${alert}`);
    });
  }

  /**
   * Start component health checks
   */
  private startComponentHealthCheck(): void {
    const interval = setInterval(() => {
      this.checkComponentHealth();
    }, 30000); // Check every 30 seconds

    this.monitoringIntervals.set('componentHealth', interval);
  }

  /**
   * Check component health
   */
  private checkComponentHealth(): void {
    const components: ComponentHealthStatus[] = [];

    // Check database
    components.push(this.checkDatabaseHealth());

    // Check cache
    components.push(this.checkCacheHealth());

    // Check message queue
    components.push(this.checkMessageQueueHealth());

    // Update system health checks
    components.forEach((component) => {
      this.healthChecks.set(component.component, component);
    });

    // Determine overall system status
    this.updateSystemStatus();
  }

  /**
   * Check database health
   */
  private checkDatabaseHealth(): ComponentHealthStatus {
    const startTime = Date.now();

    // Placeholder - in real implementation, would check actual DB connection
    const isHealthy = true;
    const duration = Date.now() - startTime;

    return {
      component: 'database',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Database connection OK' : 'Database connection failed',
      lastCheck: new Date(),
      checksDuration: duration,
    };
  }

  /**
   * Check cache health
   */
  private checkCacheHealth(): ComponentHealthStatus {
    const startTime = Date.now();

    // Placeholder - in real implementation, would check Redis/cache connection
    const isHealthy = true;
    const duration = Date.now() - startTime;

    return {
      component: 'cache',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Cache connection OK' : 'Cache connection failed',
      lastCheck: new Date(),
      checksDuration: duration,
    };
  }

  /**
   * Check message queue health
   */
  private checkMessageQueueHealth(): ComponentHealthStatus {
    const startTime = Date.now();

    // Placeholder - in real implementation, would check message queue
    const isHealthy = true;
    const duration = Date.now() - startTime;

    return {
      component: 'messageQueue',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Message queue OK' : 'Message queue unavailable',
      lastCheck: new Date(),
      checksDuration: duration,
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    const interval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    this.monitoringIntervals.set('metrics', interval);
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    const agents = agentManager.getAllAgents();
    const stats = agentManager.getStatistics();

    this.systemMetrics = {
      timestamp: new Date(),
      overallStatus: this.determineOverallStatus(),
      components: Array.from(this.healthChecks.values()),
      metrics: {
        totalAgents: stats.total,
        onlineAgents: stats.byStatus.online,
        offlineAgents: stats.byStatus.offline,
        unhealthyAgents: stats.byStatus.unhealthy,
        averageResponseTime: this.calculateAverageResponseTime(),
      },
    };

    // Check if we should trigger alerts
    if (this.systemMetrics.overallStatus === 'unhealthy') {
      this.triggerAlerts(this.systemMetrics);
    }

    eventEmitter.emit('healthMonitor:metricsUpdated', this.systemMetrics);
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const components = Array.from(this.healthChecks.values());

    if (components.every((c) => c.status === 'healthy')) {
      return 'healthy';
    }

    if (components.some((c) => c.status === 'unhealthy')) {
      return 'unhealthy';
    }

    return 'degraded';
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    const agents = agentManager.getAllAgents();
    const reports = agents
      .map((a) => agentManager.getHealthReport(a.id))
      .filter((r): r is AgentHealthReport => r !== undefined);

    if (reports.length === 0) {
      return 0;
    }

    const totalTime = reports.reduce((sum, r) => sum + r.averageResponseTime, 0);
    return totalTime / reports.length;
  }

  /**
   * Register alert callback
   */
  registerAlertCallback(callback: (report: SystemHealthReport) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Trigger alerts
   */
  private triggerAlerts(report: SystemHealthReport): void {
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(report);
      } catch (error) {
        logger.error('Error executing alert callback', error);
      }
    });

    eventEmitter.emit('healthMonitor:alert', report);
  }

  /**
   * Update system status
   */
  private updateSystemStatus(): void {
    this.systemMetrics.overallStatus = this.determineOverallStatus();
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealthReport {
    return this.systemMetrics;
  }

  /**
   * Get component health
   */
  getComponentHealth(component: string): ComponentHealthStatus | undefined {
    return this.healthChecks.get(component);
  }

  /**
   * Get all component health
   */
  getAllComponentHealth(): ComponentHealthStatus[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<SystemHealthReport> {
    this.checkComponentHealth();
    this.checkAgentHealth();
    this.collectMetrics();

    return this.systemMetrics;
  }
}

export const healthMonitor = new HealthMonitor();
export default HealthMonitor;
