/**
 * WebSocket Server
 * Real-time bidirectional communication with agents
 */

import WebSocket from 'ws';
import http from 'http';
import https from 'https';
import { logger } from '@utils/logger';
import { appConfig } from '@config/app.config';
import { secureTransport } from '@core/secure_transport';
import { agentManager } from '@core/agent_manager';
import { eventEmitter } from '@core/event_emitter';
import { WebSocketMessage } from '@types/api.types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private server?: http.Server | https.Server;
  private clientConnections: Map<string, WebSocket>;

  constructor() {
    this.clientConnections = new Map();
    this.wss = new WebSocket.Server({ noServer: true });
    this.setupHandlers();
  }

  /**
   * Setup WebSocket handlers
   */
  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientId = req.headers['x-client-id'] as string;
      
      if (!clientId) {
        logger.warn('WebSocket connection without client ID');
        ws.close(1008, 'Missing client ID');
        return;
      }

      this.clientConnections.set(clientId, ws);
      logger.info(`WebSocket client connected: ${clientId}`);

      // Message handler
      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(clientId, data);
      });

      // Error handler
      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${clientId}`, error);
      });

      // Close handler
      ws.on('close', () => {
        this.clientConnections.delete(clientId);
        logger.info(`WebSocket client disconnected: ${clientId}`);
        eventEmitter.emit('ws:disconnected', { clientId, timestamp: new Date() });
      });

      // Send welcome message
      this.sendMessage(clientId, {
        id: `welcome-${Date.now()}`,
        type: 'connection',
        payload: { message: 'Connected to orchestration server', timestamp: new Date() },
        timestamp: new Date(),
        sender: 'server',
      });

      eventEmitter.emit('ws:connected', { clientId, timestamp: new Date() });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', error);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(clientId: string, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      logger.debug(`WebSocket message from ${clientId}: ${message.type}`);

      switch (message.type) {
        case 'agent:register':
          this.handleAgentRegister(clientId, message);
          break;

        case 'agent:heartbeat':
          this.handleAgentHeartbeat(clientId, message);
          break;

        case 'command:result':
          this.handleCommandResult(clientId, message);
          break;

        case 'health:report':
          this.handleHealthReport(clientId, message);
          break;

        case 'ping':
          this.sendMessage(clientId, {
            id: `pong-${Date.now()}`,
            type: 'pong',
            payload: { timestamp: new Date() },
            timestamp: new Date(),
            sender: 'server',
          });
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

      eventEmitter.emit('ws:messageReceived', { clientId, type: message.type });
    } catch (error) {
      logger.error(`Error handling WebSocket message from ${clientId}`, error);
      this.sendError(clientId, 'INVALID_MESSAGE', 'Failed to parse message');
    }
  }

  /**
   * Handle agent registration
   */
  private handleAgentRegister(clientId: string, message: WebSocketMessage): void {
    try {
      const payload = message.payload as any;
      const agent = agentManager.registerAgent(payload);

      // Associate WebSocket connection with agent
      agentManager.updateHeartbeat(agent.id);

      this.sendMessage(clientId, {
        id: `register-ack-${Date.now()}`,
        type: 'agent:registered',
        payload: { agentId: agent.id, status: 'registered' },
        timestamp: new Date(),
        sender: 'server',
      });

      logger.info(`Agent registered via WebSocket: ${agent.id}`);
    } catch (error) {
      logger.error('Failed to register agent', error);
      this.sendError(clientId, 'REGISTRATION_FAILED', 'Agent registration failed');
    }
  }

  /**
   * Handle agent heartbeat
   */
  private handleAgentHeartbeat(clientId: string, message: WebSocketMessage): void {
    try {
      const payload = message.payload as any;
      const agentId = payload.agentId;

      if (!agentId) {
        this.sendError(clientId, 'INVALID_HEARTBEAT', 'Missing agentId');
        return;
      }

      agentManager.updateHeartbeat(agentId, payload.resources);

      this.sendMessage(clientId, {
        id: `heartbeat-ack-${Date.now()}`,
        type: 'agent:heartbeat_ack',
        payload: { agentId, acknowledged: true },
        timestamp: new Date(),
        sender: 'server',
      });
    } catch (error) {
      logger.error('Failed to handle heartbeat', error);
    }
  }

  /**
   * Handle command result
   */
  private handleCommandResult(clientId: string, message: WebSocketMessage): void {
    try {
      const payload = message.payload as any;

      logger.info(`Command result received from ${clientId}:`, payload);

      eventEmitter.emit('command:result_received', {
        clientId,
        result: payload,
        timestamp: new Date(),
      });

      this.sendMessage(clientId, {
        id: `result-ack-${Date.now()}`,
        type: 'command:result_ack',
        payload: { received: true },
        timestamp: new Date(),
        sender: 'server',
      });
    } catch (error) {
      logger.error('Failed to handle command result', error);
    }
  }

  /**
   * Handle health report
   */
  private handleHealthReport(clientId: string, message: WebSocketMessage): void {
    try {
      const payload = message.payload as any;
      const agentId = payload.agentId;

      agentManager.recordHealthReport(payload);

      this.sendMessage(clientId, {
        id: `health-ack-${Date.now()}`,
        type: 'health:report_ack',
        payload: { received: true },
        timestamp: new Date(),
        sender: 'server',
      });
    } catch (error) {
      logger.error('Failed to handle health report', error);
    }
  }

  /**
   * Send message to client
   */
  sendMessage(clientId: string, message: WebSocketMessage): void {
    const ws = this.clientConnections.get(clientId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send message to ${clientId}: connection not open`);
      return;
    }

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send message to ${clientId}`, error);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    this.clientConnections.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error(`Failed to broadcast to ${clientId}`, error);
        }
      }
    });
  }

  /**
   * Send error message
   */
  sendError(clientId: string, code: string, message: string): void {
    this.sendMessage(clientId, {
      id: `error-${Date.now()}`,
      type: 'error',
      payload: { code, message },
      timestamp: new Date(),
      sender: 'server',
    });
  }

  /**
   * Start WebSocket server
   */
  start(server: http.Server | https.Server): void {
    this.server = server;

    server.on('upgrade', (request, socket, head) => {
      const url = request.url || '';
      const clientId = url.split('client_id=')[1] || `client-${Date.now()}`;

      // Add client ID to request for handler
      (request as any).headers['x-client-id'] = clientId;

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    logger.info(`WebSocket server listening on ws://0.0.0.0:${appConfig.wsPort}`);
  }

  /**
   * Stop WebSocket server
   */
  stop(): void {
    this.clientConnections.forEach((ws) => {
      ws.close(1000, 'Server closing');
    });
    this.clientConnections.clear();
    this.wss.close();
    logger.info('WebSocket server stopped');
  }

  /**
   * Get connected clients count
   */
  getConnectionCount(): number {
    return this.clientConnections.size;
  }

  /**
   * Get all connected client IDs
   */
  getConnectedClients(): string[] {
    return Array.from(this.clientConnections.keys());
  }
}

export const wsServer = new WebSocketServer();
export default WebSocketServer;
