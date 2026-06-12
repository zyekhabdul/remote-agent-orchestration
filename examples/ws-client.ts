/**
 * Example: WebSocket Client
 * Shows how to connect and communicate with the orchestration server
 */

import WebSocket from 'ws';

interface WSMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  sender: string;
}

class OrchestrationClient {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string, clientId?: string) {
    this.url = url;
    this.clientId = clientId || `client-${Date.now()}`;
  }

  /**
   * Connect to orchestration server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.url}?client_id=${this.clientId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log(`✅ Connected to ${wsUrl}`);
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('⚠️  WebSocket closed');
          this.attemptReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`🔄 Reconnecting in ${delay}ms...`);

      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch((err) => {
          console.error('Reconnection failed:', err.message);
        });
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Register agent
   */
  registerAgent(agentData: any): void {
    const message: WSMessage = {
      id: `register-${Date.now()}`,
      type: 'agent:register',
      payload: agentData,
      timestamp: new Date(),
      sender: this.clientId,
    };

    this.send(message);
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(agentId: string, resources: any): void {
    const message: WSMessage = {
      id: `heartbeat-${Date.now()}`,
      type: 'agent:heartbeat',
      payload: {
        agentId,
        resources,
        timestamp: new Date(),
      },
      timestamp: new Date(),
      sender: this.clientId,
    };

    this.send(message);
  }

  /**
   * Send command result
   */
  sendCommandResult(commandId: string, result: any): void {
    const message: WSMessage = {
      id: `result-${Date.now()}`,
      type: 'command:result',
      payload: {
        commandId,
        ...result,
      },
      timestamp: new Date(),
      sender: this.clientId,
    };

    this.send(message);
  }

  /**
   * Send health report
   */
  sendHealthReport(agentId: string, health: any): void {
    const message: WSMessage = {
      id: `health-${Date.now()}`,
      type: 'health:report',
      payload: {
        agentId,
        ...health,
      },
      timestamp: new Date(),
      sender: this.clientId,
    };

    this.send(message);
  }

  /**
   * Send ping
   */
  ping(): void {
    const message: WSMessage = {
      id: `ping-${Date.now()}`,
      type: 'ping',
      payload: {},
      timestamp: new Date(),
      sender: this.clientId,
    };

    this.send(message);
  }

  /**
   * Send message
   */
  private send(message: WSMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
    console.log(`📤 Sent: ${message.type}`);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      console.log(`📨 Received: ${message.type}`, message.payload);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   WebSocket Client Example');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new OrchestrationClient('ws://localhost:3001', 'example-agent-001');

  try {
    // Connect
    await client.connect();

    // Register agent
    console.log('\n📋 Registering agent...\n');
    client.registerAgent({
      name: 'example-agent',
      metadata: {
        version: '1.0.0',
        platform: 'Linux',
        architecture: 'x86_64',
        osVersion: '5.10.0',
        hostname: 'example-host',
        timezone: 'UTC',
      },
      capabilities: [
        { name: 'shell', version: '1.0', enabled: true },
        { name: 'file-transfer', version: '1.0', enabled: true },
      ],
      resources: {
        cpu: 30,
        memory: 2048,
        disk: 20480,
        bandwidth: 200,
      },
    });

    // Wait a bit then send heartbeat
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n💓 Sending heartbeat...\n');
    client.sendHeartbeat('agent-123', {
      cpu: 35,
      memory: 2100,
      disk: 20480,
      bandwidth: 180,
    });

    // Wait and send health report
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n🏥 Sending health report...\n');
    client.sendHealthReport('agent-123', {
      status: 'online',
      uptime: 86400000,
      errorCount: 0,
      averageResponseTime: 150,
    });

    // Keep connection alive
    setInterval(() => {
      client.ping();
    }, 30000);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { OrchestrationClient };
