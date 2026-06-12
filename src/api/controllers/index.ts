/**
 * API Controllers
 * Request handlers for agents and commands
 */

import { Request, Response } from 'express';
import { logger } from '@utils/logger';
import { agentService } from '@services/agent.service';
import { commandService } from '@services/command.service';

/**
 * Agent Controller
 */
export class AgentController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const agent = await agentService.registerAgent(req.body);
      res.status(201).json({
        success: true,
        data: agent,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to register agent', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        requestId: req.requestId,
      });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await agentService.getAllAgents(page, limit);
      res.json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to get agents', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agents',
        requestId: req.requestId,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const agent = await agentService.getAgent(req.params.agentId);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: agent,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to get agent', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent',
        requestId: req.requestId,
      });
    }
  }

  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await agentService.getAgentHealth(req.params.agentId);

      if (!health) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: health,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to get agent health', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health',
        requestId: req.requestId,
      });
    }
  }

  static async deregister(req: Request, res: Response): Promise<void> {
    try {
      const success = await agentService.deregisterAgent(req.params.agentId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: { agentId: req.params.agentId, deregistered: true },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to deregister agent', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deregister agent',
        requestId: req.requestId,
      });
    }
  }
}

/**
 * Command Controller
 */
export class CommandController {
  static async submit(req: Request, res: Response): Promise<void> {
    try {
      const command = await commandService.submitCommand(req.body);
      res.status(202).json({
        success: true,
        data: command,
        message: 'Command submitted for execution',
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to submit command', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed',
        requestId: req.requestId,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const command = await commandService.getCommand(req.params.commandId);

      if (!command) {
        return res.status(404).json({
          success: false,
          error: 'Command not found',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: command,
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to get command', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve command',
        requestId: req.requestId,
      });
    }
  }

  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await commandService.getCommandStatus(req.params.commandId);

      if (status === null) {
        return res.status(404).json({
          success: false,
          error: 'Command not found',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: { commandId: req.params.commandId, status },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to get command status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve status',
        requestId: req.requestId,
      });
    }
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const success = await commandService.cancelCommand(req.params.commandId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Command not found or cannot be cancelled',
          requestId: req.requestId,
        });
      }

      res.json({
        success: true,
        data: { commandId: req.params.commandId, cancelled: true },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to cancel command', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel command',
        requestId: req.requestId,
      });
    }
  }
}
