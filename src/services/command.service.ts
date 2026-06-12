/**
 * Command Service
 * Business logic for command execution and management
 */

import { logger } from '@utils/logger';
import { commandRouter } from '@core/command_router';
import { eventEmitter } from '@core/event_emitter';
import { Command, CommandRequest, CommandStatus } from '@types/command.types';
import { PaginatedResponse } from '@types/api.types';

export class CommandService {
  /**
   * Submit command for execution
   */
  async submitCommand(request: CommandRequest): Promise<Command> {
    try {
      const command = commandRouter.createCommand(request);
      const routing = commandRouter.routeCommand(command);

      if (routing.selectedAgents.length === 0) {
        throw new Error('No suitable agents found for command execution');
      }

      logger.info(`Command service: submitted command ${command.id}`);
      return command;
    } catch (error) {
      logger.error('Failed to submit command', error);
      throw new Error('Command submission failed');
    }
  }

  /**
   * Execute command
   */
  async executeCommand(commandId: string): Promise<Command> {
    try {
      const command = commandRouter.getCommand(commandId);
      if (!command) {
        throw new Error(`Command not found: ${commandId}`);
      }

      const executed = await commandRouter.executeCommand(command);
      logger.info(`Command service: executed command ${commandId}`);
      return executed;
    } catch (error) {
      logger.error('Failed to execute command', error);
      throw new Error('Command execution failed');
    }
  }

  /**
   * Get command by ID
   */
  async getCommand(commandId: string): Promise<Command | null> {
    const command = commandRouter.getCommand(commandId);
    return command || null;
  }

  /**
   * Get command status
   */
  async getCommandStatus(commandId: string): Promise<CommandStatus | null> {
    const status = commandRouter.getCommandStatus(commandId);
    return status || null;
  }

  /**
   * Get queued commands with pagination
   */
  async getQueuedCommands(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Command>> {
    const commands = commandRouter.getQueuedCommands();
    const total = commands.length;
    const offset = (page - 1) * limit;
    const items = commands.slice(offset, offset + limit);

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
   * Get executed commands with pagination
   */
  async getExecutedCommands(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Command>> {
    const commands = commandRouter.getExecutedCommands(100);
    const total = commands.length;
    const offset = (page - 1) * limit;
    const items = commands.slice(offset, offset + limit);

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
   * Cancel command
   */
  async cancelCommand(commandId: string): Promise<boolean> {
    const success = commandRouter.cancelCommand(commandId);
    if (success) {
      logger.info(`Command service: cancelled command ${commandId}`);
    }
    return success;
  }

  /**
   * Get command statistics
   */
  async getStatistics(): Promise<any> {
    return commandRouter.getStatistics();
  }

  /**
   * Search commands by criteria
   */
  async searchCommands(criteria: any): Promise<Command[]> {
    let results = [...commandRouter.getQueuedCommands(), ...commandRouter.getExecutedCommands()];

    if (criteria.status) {
      results = results.filter((c) => c.status === criteria.status);
    }

    if (criteria.module) {
      results = results.filter((c) => c.module === criteria.module);
    }

    if (criteria.agentId) {
      results = results.filter((c) => c.executedOn?.includes(criteria.agentId));
    }

    if (criteria.priority) {
      results = results.filter((c) => c.priority === criteria.priority);
    }

    return results.slice(0, 100); // Limit to 100 results
  }

  /**
   * Retry command
   */
  async retryCommand(commandId: string): Promise<Command> {
    try {
      const originalCommand = commandRouter.getCommand(commandId);
      if (!originalCommand) {
        throw new Error(`Command not found: ${commandId}`);
      }

      // Create new command with same parameters
      const request: CommandRequest = {
        name: originalCommand.name,
        module: originalCommand.module,
        action: originalCommand.action,
        parameters: originalCommand.parameters.reduce(
          (acc, p) => ({ ...acc, [p.name]: p.value }),
          {}
        ),
        target: originalCommand.target,
        priority: originalCommand.priority,
        timeout: originalCommand.timeoutPolicy.executionTimeoutMs,
      };

      return this.submitCommand(request);
    } catch (error) {
      logger.error('Failed to retry command', error);
      throw new Error('Command retry failed');
    }
  }

  /**
   * Get command history for agent
   */
  async getAgentCommandHistory(agentId: string, limit: number = 50): Promise<Command[]> {
    const allCommands = [...commandRouter.getQueuedCommands(), ...commandRouter.getExecutedCommands(100)];

    return allCommands
      .filter((c) => c.executedOn?.includes(agentId))
      .slice(-limit);
  }
}

export const commandService = new CommandService();
export default CommandService;
