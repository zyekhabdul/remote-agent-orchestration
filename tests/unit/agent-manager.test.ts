/**
 * Agent Manager Tests
 */

import { AgentManager } from '@core/agent_manager';
import { AgentStatus, AgentPriority } from '@types/agent.types';

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  describe('registerAgent', () => {
    it('should register a new agent', () => {
      const agent = manager.registerAgent({
        name: 'Test Agent',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'test-host',
          timezone: 'UTC',
        },
        capabilities: [
          {
            name: 'shell',
            version: '1.0',
            enabled: true,
          },
        ],
        resources: {
          cpu: 50,
          memory: 1024,
          disk: 10240,
          bandwidth: 100,
        },
      });

      expect(agent).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.status).toBe(AgentStatus.REGISTERED);
    });

    it('should get registered agent', () => {
      const registered = manager.registerAgent({
        name: 'Test Agent 2',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'test-host-2',
          timezone: 'UTC',
        },
        capabilities: [],
        resources: {
          cpu: 30,
          memory: 2048,
          disk: 20480,
          bandwidth: 200,
        },
      });

      const retrieved = manager.getAgent(registered.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.name).toBe('Test Agent 2');
    });
  });

  describe('deregisterAgent', () => {
    it('should deregister an agent', () => {
      const agent = manager.registerAgent({
        name: 'Test Agent 3',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'test-host-3',
          timezone: 'UTC',
        },
        capabilities: [],
        resources: {
          cpu: 40,
          memory: 1536,
          disk: 15360,
          bandwidth: 150,
        },
      });

      const success = manager.deregisterAgent(agent.id);

      expect(success).toBe(true);
      expect(manager.getAgent(agent.id)).toBeUndefined();
    });
  });

  describe('updateAgentStatus', () => {
    it('should update agent status', () => {
      const agent = manager.registerAgent({
        name: 'Test Agent 4',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'test-host-4',
          timezone: 'UTC',
        },
        capabilities: [],
        resources: {
          cpu: 25,
          memory: 512,
          disk: 5120,
          bandwidth: 50,
        },
      });

      const success = manager.updateAgentStatus(agent.id, AgentStatus.ONLINE);

      expect(success).toBe(true);
      expect(manager.getAgent(agent.id)?.status).toBe(AgentStatus.ONLINE);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', () => {
      manager.registerAgent({
        name: 'Stat Agent 1',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'stat-host-1',
          timezone: 'UTC',
        },
        capabilities: [],
        resources: {
          cpu: 60,
          memory: 2048,
          disk: 20480,
          bandwidth: 200,
        },
      });

      manager.registerAgent({
        name: 'Stat Agent 2',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'stat-host-2',
          timezone: 'UTC',
        },
        capabilities: [],
        resources: {
          cpu: 40,
          memory: 1024,
          disk: 10240,
          bandwidth: 100,
        },
      });

      const stats = manager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.registered).toBe(2);
    });
  });
});
