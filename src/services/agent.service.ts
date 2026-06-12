/**
 * Agent Service
 * Business logic for agent management
 */

import { logger } from '@utils/logger';
import { agentManager } from '@core/agent_manager';
import { eventEmitter } from '@core/event_emitter';
import { Agent, AgentStatus, AgentRegistrationRequest } from '@types/agent.types';
import { ApiResponse, PaginatedResponse } from '@types/api.types';

export class AgentService {
  /**
   * Register a new agent
   */
  async registerAgent(request: AgentRegistrationRequest): Promise<Agent> {
    try {
      const agent = agentManager.registerAgent(request);
      logger.info(`Agent service: registered agent ${agent.id}`);
      return agent;
    } catch (error) {
      logger.error('Failed to register agent', error);
      throw new Error('Agent registration failed');
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    const agent = agentManager.getAgent(agentId);
    return agent || null;
  }

  /**
   * Get all agents with pagination
   */
  async getAllAgents(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Agent>> {
    const agents = agentManager.getAllAgents();
    const total = agents.length;
    const offset = (page - 1) * limit;
    const items = agents.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: offset + limit < total,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get agents by status
   */
  async getAgentsByStatus(status: AgentStatus): Promise<Agent[]> {
    return agentManager.getAgentsByStatus(status);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<boolean> {
    const success = agentManager.updateAgentStatus(agentId, status);
    if (success) {
      logger.info(`Agent service: updated agent ${agentId} status to ${status}`);
    }
    return success;
  }

  /**
   * Deregister agent
   */
  async deregisterAgent(agentId: string): Promise<boolean> {
    const success = agentManager.deregisterAgent(agentId);
    if (success) {
      logger.info(`Agent service: deregistered agent ${agentId}`);
    }
    return success;
  }

  /**
   * Get agent health
   */
  async getAgentHealth(agentId: string): Promise<any> {
    const agent = agentManager.getAgent(agentId);
    if (!agent) {
      return null;
    }

    const health = agentManager.getHealthReport(agentId);
    const events = agentManager.getAgentEvents(agentId, 10);

    return {
      agentId,
      status: agent.status,
      lastHeartbeat: agent.lastHeartbeat,
      health,
      recentEvents: events,
    };
  }

  /**
   * Get agent discovery information
   */
  async getDiscoveryInfo(): Promise<any> {
    return agentManager.getDiscoveryInfo();
  }

  /**
   * Get agent statistics
   */
  async getStatistics(): Promise<any> {
    return agentManager.getStatistics();
  }

  /**
   * Search agents by criteria
   */
  async searchAgents(criteria: any): Promise<Agent[]> {
    let results = agentManager.getAllAgents();

    if (criteria.status) {
      results = results.filter((a) => a.status === criteria.status);
    }

    if (criteria.capability) {
      const capable = agentManager.getAgentsByCapability(criteria.capability);
      const capableIds = new Set(capable.map((a) => a.id));
      results = results.filter((a) => capableIds.has(a.id));
    }

    if (criteria.tag) {
      const byTag = agentManager.getAgentsByTag(criteria.tag.key, criteria.tag.value);
      const tagIds = new Set(byTag.map((a) => a.id));
      results = results.filter((a) => tagIds.has(a.id));
    }

    if (criteria.minCpu !== undefined) {
      results = results.filter((a) => a.resources.cpu <= criteria.minCpu);
    }

    if (criteria.minMemory !== undefined) {
      results = results.filter((a) => a.resources.memory >= criteria.minMemory);
    }

    return results;
  }
}

export const agentService = new AgentService();
export default AgentService;
