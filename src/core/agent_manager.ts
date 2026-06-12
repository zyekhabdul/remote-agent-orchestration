/**
 * Agent Manager
 * Central registry for managing agent lifecycle, discovery, and state
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logger';
import { eventEmitter } from '@core/event_emitter';
import { appConfig } from '@config/app.config';
import {
  Agent,
  AgentStatus,
  AgentRegistrationRequest,
  AgentHealthReport,
  AgentEvent,
} from '@types/agent.types';

export class AgentManager {
  private agents: Map<string, Agent>;
  private agentsByTag: Map<string, Set<string>>;
  private agentsByCapability: Map<string, Set<string>>;
  private healthReports: Map<string, AgentHealthReport>;
  private eventLogs: Map<string, AgentEvent[]>;

  constructor() {
    this.agents = new Map();
    this.agentsByTag = new Map();
    this.agentsByCapability = new Map();
    this.healthReports = new Map();
    this.eventLogs = new Map();
    this.initializeHealthChecks();
  }

  /**
   * Register a new agent
   */
  registerAgent(request: AgentRegistrationRequest): Agent {
    const agentId = uuidv4();

    const agent: Agent = {
      id: agentId,
      name: request.name,
      status: AgentStatus.REGISTERED,
      priority: 'normal',
      lastHeartbeat: new Date(),
      registeredAt: new Date(),
      metadata: request.metadata,
      capabilities: request.capabilities,
      resources: request.resources,
      tags: request.tags || {},
    };

    this.agents.set(agentId, agent);

    // Index by tags
    Object.entries(agent.tags).forEach(([key, value]) => {
      const tagKey = `${key}:${value}`;
      if (!this.agentsByTag.has(tagKey)) {
        this.agentsByTag.set(tagKey, new Set());
      }
      this.agentsByTag.get(tagKey)!.add(agentId);
    });

    // Index by capabilities
    agent.capabilities.forEach((cap) => {
      if (!this.agentsByCapability.has(cap.name)) {
        this.agentsByCapability.set(cap.name, new Set());
      }
      this.agentsByCapability.get(cap.name)!.add(agentId);
    });

    // Emit event
    eventEmitter.emit('agent:registered', agent);
    logger.info(`Agent registered: ${agentId} (${agent.name})`);

    return agent;
  }

  /**
   * Deregister an agent
   */
  deregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = AgentStatus.DEREGISTERED;

    // Remove from indices
    Object.keys(agent.tags).forEach((key) => {
      const tagKey = `${key}:${agent.tags[key]}`;
      const agents = this.agentsByTag.get(tagKey);
      if (agents) {
        agents.delete(agentId);
      }
    });

    agent.capabilities.forEach((cap) => {
      const agents = this.agentsByCapability.get(cap.name);
      if (agents) {
        agents.delete(agentId);
      }
    });

    this.agents.delete(agentId);

    eventEmitter.emit('agent:deregistered', agent);
    logger.info(`Agent deregistered: ${agentId}`);

    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentStatus): Agent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.status === status);
  }

  /**
   * Get agents by tag
   */
  getAgentsByTag(key: string, value: string): Agent[] {
    const tagKey = `${key}:${value}`;
    const agentIds = this.agentsByTag.get(tagKey) || new Set();
    return Array.from(agentIds)
      .map((id) => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capabilityName: string): Agent[] {
    const agentIds = this.agentsByCapability.get(capabilityName) || new Set();
    return Array.from(agentIds)
      .map((id) => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const oldStatus = agent.status;
    agent.status = status;

    if (oldStatus !== status) {
      eventEmitter.emit('agent:statusChanged', {
        agentId,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
      });

      logger.info(`Agent ${agentId} status changed: ${oldStatus} -> ${status}`);
    }

    return true;
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string, resources?: any): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.lastHeartbeat = new Date();

    if (resources) {
      agent.resources = resources;
    }

    // Update status to online if offline
    if (agent.status !== AgentStatus.ONLINE && agent.status !== AgentStatus.UNHEALTHY) {
      this.updateAgentStatus(agentId, AgentStatus.ONLINE);
    }

    return true;
  }

  /**
   * Record health report
   */
  recordHealthReport(report: AgentHealthReport): void {
    const agent = this.agents.get(report.agentId);
    if (!agent) {
      logger.warn(`Health report for unknown agent: ${report.agentId}`);
      return;
    }

    // Update agent status based on report
    if (report.status !== agent.status) {
      this.updateAgentStatus(report.agentId, report.status);
    }

    // Store health report
    this.healthReports.set(report.agentId, report);

    // Emit health event
    eventEmitter.emit('agent:healthReport', report);
  }

  /**
   * Get health report for agent
   */
  getHealthReport(agentId: string): AgentHealthReport | undefined {
    return this.healthReports.get(agentId);
  }

  /**
   * Log agent event
   */
  logAgentEvent(agentId: string, event: Omit<AgentEvent, 'id' | 'agentId'>): void {
    if (!this.agents.has(agentId)) {
      logger.warn(`Event log for unknown agent: ${agentId}`);
      return;
    }

    const agentEvent: AgentEvent = {
      id: uuidv4(),
      agentId,
      ...event,
    };

    if (!this.eventLogs.has(agentId)) {
      this.eventLogs.set(agentId, []);
    }

    this.eventLogs.get(agentId)!.push(agentEvent);

    // Limit event log size
    const logs = this.eventLogs.get(agentId)!;
    if (logs.length > 1000) {
      logs.shift();
    }

    eventEmitter.emit('agent:event', agentEvent);
  }

  /**
   * Get agent events
   */
  getAgentEvents(agentId: string, limit: number = 100): AgentEvent[] {
    const logs = this.eventLogs.get(agentId) || [];
    return logs.slice(-limit);
  }

  /**
   * Get agent discovery info (for discovery clients)
   */
  getDiscoveryInfo(): any {
    const onlineAgents = this.getAgentsByStatus(AgentStatus.ONLINE);
    const capabilities: Record<string, any> = {};

    this.agentsByCapability.forEach((agentIds, capabilityName) => {
      capabilities[capabilityName] = Array.from(agentIds)
        .map((id) => this.agents.get(id))
        .filter((agent): agent is Agent => agent !== undefined && agent.status === AgentStatus.ONLINE)
        .length;
    });

    return {
      totalAgents: this.agents.size,
      onlineAgents: onlineAgents.length,
      offlineAgents: this.getAgentsByStatus(AgentStatus.OFFLINE).length,
      unhealthyAgents: this.getAgentsByStatus(AgentStatus.UNHEALTHY).length,
      capabilities,
      timestamp: new Date(),
    };
  }

  /**
   * Initialize periodic health checks
   */
  private initializeHealthChecks(): void {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = appConfig.agentHeartbeatTimeout;

      this.agents.forEach((agent) => {
        const timeSinceHeartbeat = now - new Date(agent.lastHeartbeat).getTime();

        if (timeSinceHeartbeat > timeout) {
          if (agent.status !== AgentStatus.OFFLINE) {
            this.updateAgentStatus(agent.id, AgentStatus.OFFLINE);
            this.logAgentEvent(agent.id, {
              type: 'state_change',
              severity: 'warning',
              message: 'Agent heartbeat timeout',
            });
          }
        }
      });
    }, appConfig.agentHeartbeatInterval);

    // Clean up on process exit
    process.on('exit', () => clearInterval(interval));
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const allAgents = this.getAllAgents();

    return {
      total: allAgents.length,
      byStatus: {
        registered: this.getAgentsByStatus(AgentStatus.REGISTERED).length,
        online: this.getAgentsByStatus(AgentStatus.ONLINE).length,
        offline: this.getAgentsByStatus(AgentStatus.OFFLINE).length,
        unhealthy: this.getAgentsByStatus(AgentStatus.UNHEALTHY).length,
        deregistered: 0,
      },
      capabilities: Array.from(this.agentsByCapability.entries()).map(([name, ids]) => ({
        name,
        agentCount: ids.size,
      })),
      averageResources: {
        cpu: (allAgents.reduce((sum, a) => sum + a.resources.cpu, 0) / allAgents.length) || 0,
        memory: (allAgents.reduce((sum, a) => sum + a.resources.memory, 0) / allAgents.length) || 0,
      },
    };
  }
}

export const agentManager = new AgentManager();
export default AgentManager;
