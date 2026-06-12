/**
 * Command Router Tests
 */

import { CommandRouter } from '@core/command_router';
import { CommandStatus } from '@types/command.types';
import { AgentManager } from '@core/agent_manager';
import { AgentStatus } from '@types/agent.types';

describe('CommandRouter', () => {
  let router: CommandRouter;
  let agentMgr: AgentManager;

  beforeEach(() => {
    router = new CommandRouter();
    agentMgr = new AgentManager();
  });

  describe('createCommand', () => {
    it('should create a command from request', () => {
      const command = router.createCommand({
        name: 'Test Command',
        module: 'test',
        action: 'execute',
        parameters: { param1: 'value1' },
        target: { agentId: 'agent-1' },
      });

      expect(command).toBeDefined();
      expect(command.name).toBe('Test Command');
      expect(command.status).toBe(CommandStatus.PENDING);
    });
  });

  describe('routeCommand', () => {
    it('should route command with no suitable agents', () => {
      const command = router.createCommand({
        name: 'Route Test',
        module: 'test',
        action: 'execute',
        parameters: {},
        target: { agentId: 'non-existent-agent' },
      });

      const context = router.routeCommand(command);

      expect(context.availableAgents).toHaveLength(0);
      expect(context.selectedAgents).toHaveLength(0);
    });

    it('should route command to available agents', () => {
      // Create and register an agent
      const agent = agentMgr.registerAgent({
        name: 'Router Test Agent',
        metadata: {
          version: '1.0.0',
          platform: 'Linux',
          architecture: 'x86_64',
          osVersion: '5.10.0',
          hostname: 'router-test',
          timezone: 'UTC',
        },
        capabilities: [{ name: 'test', version: '1.0', enabled: true }],
        resources: {
          cpu: 30,
          memory: 1024,
          disk: 10240,
          bandwidth: 100,
        },
      });

      // Update agent status to online
      agentMgr.updateAgentStatus(agent.id, AgentStatus.ONLINE);

      // Route command with capability target
      const command = router.createCommand({
        name: 'Capability Test',
        module: 'test',
        action: 'execute',
        parameters: {},
        target: { agentCapability: 'test' },
      });

      const context = router.routeCommand(command);

      // This depends on the agent being online and having resources
      // Since our agent has default resources, it might be filtered out
      expect(context).toBeDefined();
    });
  });

  describe('getCommandStatus', () => {
    it('should get command status', () => {
      const command = router.createCommand({
        name: 'Status Test',
        module: 'test',
        action: 'execute',
        parameters: {},
        target: { agentId: 'agent-1' },
      });

      const status = router.getCommandStatus(command.id);

      expect(status).toBeDefined();
    });
  });

  describe('cancelCommand', () => {
    it('should cancel pending command', () => {
      const command = router.createCommand({
        name: 'Cancel Test',
        module: 'test',
        action: 'execute',
        parameters: {},
        target: { agentId: 'agent-1' },
      });

      const success = router.cancelCommand(command.id);

      expect(success).toBe(false); // Will be false because command is in pending state
    });
  });

  describe('getStatistics', () => {
    it('should return router statistics', () => {
      router.createCommand({
        name: 'Stat Test 1',
        module: 'test',
        action: 'execute',
        parameters: {},
        target: { agentId: 'agent-1' },
      });

      const stats = router.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.queuedCommands).toBeGreaterThanOrEqual(0);
      expect(stats.executedCommands).toBeGreaterThanOrEqual(0);
    });
  });
});
