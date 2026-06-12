/**
 * Command Router
 * Intelligent routing of commands to agents based on capabilities and resources
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logger';
import { eventEmitter } from '@core/event_emitter';
import { agentManager } from '@core/agent_manager';
import { appConfig } from '@config/app.config';
import { Command, CommandRequest, CommandStatus, CommandPriority, CommandResult } from '@types/command.types';
import { AgentStatus } from '@types/agent.types';

export interface RoutingContext {
  command: Command;
  availableAgents: string[];
  selectedAgents: string[];
  routingReason: string;
}

export class CommandRouter {
  private commandQueue: Map<string, Command>;
  private executedCommands: Map<string, Command>;
  private routingStrategies: Map<string, (context: RoutingContext) => string[]>;

  constructor() {
    this.commandQueue = new Map();
    this.executedCommands = new Map();
    this.routingStrategies = new Map();
    this.registerDefaultStrategies();
  }

  /**
   * Register default routing strategies
   */
  private registerDefaultStrategies(): void {
    // Round-robin strategy
    this.registerStrategy('round-robin', (context) => {
      if (context.availableAgents.length === 0) {
        return [];
      }
      // Return first available agent for round-robin
      return [context.availableAgents[0]];
    });

    // Least-loaded strategy
    this.registerStrategy('least-loaded', (context) => {
      if (context.availableAgents.length === 0) {
        return [];
      }

      const agents = context.availableAgents
        .map((id) => ({
          id,
          agent: agentManager.getAgent(id),
        }))
        .filter(({ agent }) => agent !== undefined);

      const leastLoaded = agents.reduce((prev, current) => {
        const prevCpu = prev.agent?.resources.cpu ?? 100;
        const currCpu = current.agent?.resources.cpu ?? 100;
        return currCpu < prevCpu ? current : prev;
      });

      return [leastLoaded.id];
    });

    // Random strategy
    this.registerStrategy('random', (context) => {
      if (context.availableAgents.length === 0) {
        return [];
      }
      const randomIndex = Math.floor(Math.random() * context.availableAgents.length);
      return [context.availableAgents[randomIndex]];
    });

    // Broadcast strategy (all agents)
    this.registerStrategy('broadcast', (context) => {
      return context.availableAgents;
    });
  }

  /**
   * Register custom routing strategy
   */
  registerStrategy(name: string, strategy: (context: RoutingContext) => string[]): void {
    this.routingStrategies.set(name, strategy);
    logger.info(`Routing strategy registered: ${name}`);
  }

  /**
   * Create command from request
   */
  createCommand(request: CommandRequest): Command {
    const command: Command = {
      id: uuidv4(),
      name: request.name,
      description: request.name,
      module: request.module,
      action: request.action,
      parameters: Object.entries(request.parameters || {}).map(([name, value]) => ({
        name,
        type: typeof value as 'string' | 'number' | 'boolean' | 'object' | 'array',
        required: true,
        value,
      })),
      target: request.target,
      status: CommandStatus.PENDING,
      priority: request.priority || CommandPriority.NORMAL,
      retryPolicy: {
        maxRetries: request.retries || appConfig.commandMaxRetries,
        delayMs: appConfig.commandRetryDelay,
        exponentialBackoff: true,
        backoffMultiplier: 2,
      },
      timeoutPolicy: {
        executionTimeoutMs: request.timeout || appConfig.commandTimeout,
        totalTimeoutMs: request.timeout ? request.timeout * 3 : appConfig.commandTimeout * 3,
      },
      createdAt: new Date(),
    };

    return command;
  }

  /**
   * Route command to agents
   */
  routeCommand(command: Command): RoutingContext {
    const availableAgents = this.findSuitableAgents(command);

    const strategy = this.getRoutingStrategy(command);
    const context: RoutingContext = {
      command,
      availableAgents,
      selectedAgents: [],
      routingReason: '',
    };

    if (availableAgents.length === 0) {
      context.routingReason = 'No suitable agents found';
      eventEmitter.emit('command:routingFailed', command);
      logger.warn(`No suitable agents for command: ${command.id}`);
      return context;
    }

    // Apply routing strategy
    try {
      context.selectedAgents = strategy(context);
      context.routingReason = `Routed to ${context.selectedAgents.length} agent(s) using strategy`;

      if (context.selectedAgents.length === 0) {
        context.routingReason = 'Routing strategy returned no agents';
        eventEmitter.emit('command:routingFailed', command);
        logger.warn(`Routing strategy failed for command: ${command.id}`);
      } else {
        command.status = CommandStatus.QUEUED;
        command.executedOn = context.selectedAgents;
        this.commandQueue.set(command.id, command);

        eventEmitter.emit('command:routed', {
          command,
          selectedAgents: context.selectedAgents,
          strategy: 'default',
        });

        logger.info(`Command routed: ${command.id} to ${context.selectedAgents.length} agent(s)`);
      }
    } catch (error) {
      context.routingReason = `Routing error: ${error}`;
      eventEmitter.emit('command:routingFailed', command);
      logger.error(`Error routing command: ${command.id}`, error);
    }

    return context;
  }

  /**
   * Find suitable agents for command
   */
  private findSuitableAgents(command: Command): string[] {
    const allAgents = agentManager.getAllAgents();

    // Filter by status (must be online)
    let filtered = allAgents.filter((agent) => agent.status === AgentStatus.ONLINE);

    // Filter by target
    if (command.target.agentId) {
      filtered = filtered.filter((agent) => agent.id === command.target.agentId);
    }

    if (command.target.agentCapability) {
      const capableAgents = agentManager.getAgentsByCapability(command.target.agentCapability);
      const capableIds = new Set(capableAgents.map((a) => a.id));
      filtered = filtered.filter((agent) => capableIds.has(agent.id));
    }

    if (command.target.agentTag) {
      const tagAgents = Object.entries(command.target.agentTag)
        .flatMap(([key, value]) => agentManager.getAgentsByTag(key, value))
        .map((a) => a.id);

      const tagAgentSet = new Set(tagAgents);
      filtered = filtered.filter((agent) => tagAgentSet.has(agent.id));
    }

    // Filter by resource constraints
    filtered = filtered.filter((agent) => {
      // Ensure agent has sufficient resources
      return agent.resources.cpu < 90 && agent.resources.memory > 100;
    });

    // Sort by priority and load
    filtered.sort((a, b) => {
      // Priority agents first
      if (a.priority !== b.priority) {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return (
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
        );
      }

      // Then by CPU load (ascending)
      return a.resources.cpu - b.resources.cpu;
    });

    return filtered.map((a) => a.id);
  }

  /**
   * Get routing strategy for command
   */
  private getRoutingStrategy(command: Command): (context: RoutingContext) => string[] {
    // For now, use round-robin by default
    // This can be enhanced with configuration
    const strategyName = 'round-robin';
    return this.routingStrategies.get(strategyName) || this.routingStrategies.get('round-robin')!;
  }

  /**
   * Execute command on agents
   */
  async executeCommand(command: Command): Promise<Command> {
    command.status = CommandStatus.RUNNING;
    command.startedAt = new Date();

    // Emit execution started event
    eventEmitter.emit('command:started', command);

    try {
      // Simulate command execution
      // In real implementation, this would send command to agents via WebSocket
      await this.simulateCommandExecution(command);

      command.status = CommandStatus.COMPLETED;
      command.completedAt = new Date();

      eventEmitter.emit('command:completed', command);
      logger.info(`Command executed: ${command.id}`);
    } catch (error) {
      command.status = CommandStatus.FAILED;
      command.completedAt = new Date();
      command.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      eventEmitter.emit('command:failed', command);
      logger.error(`Command execution failed: ${command.id}`, error);
    }

    this.executedCommands.set(command.id, command);
    return command;
  }

  /**
   * Simulate command execution (placeholder)
   */
  private async simulateCommandExecution(command: Command): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command execution timeout'));
      }, command.timeoutPolicy.executionTimeoutMs);

      // Simulate execution
      setTimeout(() => {
        clearTimeout(timeout);

        if (!command.executedOn || command.executedOn.length === 0) {
          reject(new Error('No agents to execute on'));
          return;
        }

        // Create mock result
        const result: CommandResult = {
          agentId: command.executedOn[0],
          exitCode: 0,
          stdout: `Executed ${command.name} on agent`,
          stderr: '',
          executionTimeMs: Math.random() * 1000,
          timestamp: new Date(),
        };

        command.result = result;
        resolve();
      }, Math.random() * 500);
    });
  }

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): CommandStatus | undefined {
    const queuedCommand = this.commandQueue.get(commandId);
    if (queuedCommand) {
      return queuedCommand.status;
    }

    const executedCommand = this.executedCommands.get(commandId);
    if (executedCommand) {
      return executedCommand.status;
    }

    return undefined;
  }

  /**
   * Get command details
   */
  getCommand(commandId: string): Command | undefined {
    return this.commandQueue.get(commandId) || this.executedCommands.get(commandId);
  }

  /**
   * Get queued commands
   */
  getQueuedCommands(): Command[] {
    return Array.from(this.commandQueue.values());
  }

  /**
   * Get executed commands
   */
  getExecutedCommands(limit: number = 100): Command[] {
    return Array.from(this.executedCommands.values()).slice(-limit);
  }

  /**
   * Cancel command
   */
  cancelCommand(commandId: string): boolean {
    const command = this.commandQueue.get(commandId);
    if (!command || command.status === CommandStatus.RUNNING || command.status === CommandStatus.COMPLETED) {
      return false;
    }

    command.status = CommandStatus.CANCELLED;
    eventEmitter.emit('command:cancelled', command);
    logger.info(`Command cancelled: ${commandId}`);

    return true;
  }

  /**
   * Get router statistics
   */
  getStatistics(): any {
    const queued = this.getQueuedCommands();
    const executed = this.getExecutedCommands();

    return {
      queuedCommands: queued.length,
      executedCommands: executed.length,
      commandsByStatus: {
        pending: queued.filter((c) => c.status === CommandStatus.PENDING).length,
        queued: queued.filter((c) => c.status === CommandStatus.QUEUED).length,
        running: queued.filter((c) => c.status === CommandStatus.RUNNING).length,
      },
    };
  }
}

export const commandRouter = new CommandRouter();
export default CommandRouter;
