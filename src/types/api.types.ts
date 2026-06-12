/**
 * API Type Definitions
 * Defines interfaces for API requests, responses, and errors
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ApiError[];
  timestamp: Date;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  path?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuthPayload {
  sub: string; // subject (user ID)
  aud: string; // audience
  iss: string; // issuer
  iat: number; // issued at
  exp: number; // expiration
  scope: string[];
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SecurityContext {
  userId: string;
  username: string;
  permissions: string[];
  roles: string[];
  authenticated: boolean;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ApiMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number; // milliseconds
  requestSize: number;
  responseSize: number;
  userId?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number; // milliseconds
  version: string;
  checks: {
    database: ComponentHealth;
    cache: ComponentHealth;
    agents: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, unknown>;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: SortParam[];
  pagination: PaginationParams;
}

export interface SortParam {
  field: string;
  direction: 'asc' | 'desc';
}

export interface WebSocketMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: Date;
  sender: string;
  recipient?: string;
}

export interface WebSocketError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}
