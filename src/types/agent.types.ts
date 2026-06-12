/**
 * Agent Type Definitions
 * Defines interfaces and types for agent management and lifecycle
 */

export enum AgentStatus {
  REGISTERED = 'registered',
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNHEALTHY = 'unhealthy',
  DEREGISTERED = 'deregistered',
}

export enum AgentPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface AgentCapability {
  name: string;
  version: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

export interface AgentResource {
  cpu: number; // percentage: 0-100
  memory: number; // MB
  disk: number; // MB
  bandwidth: number; // Mbps
}

export interface AgentMetadata {
  version: string;
  platform: string;
  architecture: string;
  osVersion: string;
  hostname: string;
  timezone: string;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  priority: AgentPriority;
  lastHeartbeat: Date;
  registeredAt: Date;
  metadata: AgentMetadata;
  capabilities: AgentCapability[];
  resources: AgentResource;
  tags: Record<string, string>;
  connectionId?: string;
  endpoint?: string;
}

export interface AgentRegistrationRequest {
  name: string;
  metadata: AgentMetadata;
  capabilities: AgentCapability[];
  resources: AgentResource;
  tags?: Record<string, string>;
}

export interface AgentHealthReport {
  agentId: string;
  status: AgentStatus;
  timestamp: Date;
  uptime: number; // milliseconds
  resources: AgentResource;
  lastCommand?: string;
  errorCount: number;
  averageResponseTime: number; // milliseconds
}

export interface AgentEvent {
  id: string;
  agentId: string;
  type: 'heartbeat' | 'error' | 'state_change' | 'resource_alert' | 'custom';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
