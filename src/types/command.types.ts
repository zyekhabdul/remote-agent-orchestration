/**
 * Command Type Definitions
 * Defines interfaces and types for command execution and routing
 */

export enum CommandStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export enum CommandPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface CommandTarget {
  agentId?: string;
  agentTag?: Record<string, string>;
  agentCapability?: string;
  count?: number; // number of agents to target
}

export interface CommandRetryPolicy {
  maxRetries: number;
  delayMs: number;
  exponentialBackoff: boolean;
  backoffMultiplier: number;
}

export interface CommandTimeoutPolicy {
  executionTimeoutMs: number;
  totalTimeoutMs: number;
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  value?: unknown;
}

export interface Command {
  id: string;
  name: string;
  description?: string;
  module: string; // capability module to execute on
  action: string;
  parameters: CommandParameter[];
  target: CommandTarget;
  status: CommandStatus;
  priority: CommandPriority;
  retryPolicy: CommandRetryPolicy;
  timeoutPolicy: CommandTimeoutPolicy;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  requestedBy?: string;
  executedOn?: string[]; // array of agent IDs
  result?: CommandResult;
  error?: CommandError;
}

export interface CommandResult {
  agentId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CommandError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface CommandRequest {
  name: string;
  module: string;
  action: string;
  parameters?: Record<string, unknown>;
  target: CommandTarget;
  priority?: CommandPriority;
  timeout?: number;
  retries?: number;
}

export interface CommandAuditLog {
  id: string;
  commandId: string;
  agentId: string;
  status: CommandStatus;
  requestedBy: string;
  executedBy?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: CommandResult;
  error?: CommandError;
  metadata?: Record<string, unknown>;
}

export interface CommandRoutingRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  priority: number;
}

export interface RoutingCondition {
  type: 'agent_status' | 'agent_resource' | 'agent_capability' | 'command_priority' | 'time_based';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

export interface RoutingAction {
  type: 'route_to_agents' | 'rate_limit' | 'queue' | 'reject' | 'transform';
  parameters: Record<string, unknown>;
}

export interface BatchCommandRequest {
  commands: CommandRequest[];
  parallelLimit?: number;
  stopOnError?: boolean;
}

export interface BatchCommandResult {
  batchId: string;
  totalCommands: number;
  successCount: number;
  failureCount: number;
  results: CommandResult[];
  errors: CommandError[];
}
