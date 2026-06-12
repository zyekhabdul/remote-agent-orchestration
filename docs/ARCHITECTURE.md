# Architecture Guide

## System Overview

The Remote Agent Orchestration Framework is a distributed system designed to manage and control multiple remote agents across a network. The architecture emphasizes security, scalability, and reliability.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│              (Web UI, CLI, External Services)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
    HTTP/REST                    WebSocket
         │                            │
┌────────▼────────────────────────────▼────────┐
│        Orchestration Server (Node.js)         │
│  ┌──────────────────────────────────────────┐ │
│  │            Express.js Server             │ │
│  │    - Request routing & middleware        │ │
│  │    - API endpoints & controllers         │ │
│  │    - Authentication & rate limiting      │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │        WebSocket Server (ws)             │ │
│  │    - Real-time bidirectional comm        │ │
│  │    - Agent connection management         │ │
│  │    - Message routing & handling          │ │
│  └──────────────────────────────────────────┘ │
└────────┬─────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │      Core Business Logic Layer       │
    │  ┌────────────────────────────────┐  │
    │  │  Agent Manager                 │  │
    │  │  - Registry & discovery        │  │
    │  │  - Status tracking             │  │
    │  │  - Health monitoring           │  │
    │  └────────────────────────────────┘  │
    │  ┌────────────────────────────────┐  │
    │  │  Command Router                │  │
    │  │  - Intelligent routing         │  │
    │  │  - Execution planning          │  │
    │  └────────────────────────────────┘  │
    │  ┌────────────────────────────────┐  │
    │  │  Health Monitor                │  │
    │  │  - Component checks            │  │
    │  │  - Alert management            │  │
    │  └────────────────────────────────┘  │
    │  ┌────────────────────────────────┐  │
    │  │  Security Components           │  │
    │  │  - Auth Guard (JWT)            │  │
    │  │  - Secure Transport (TLS, AES) │  │
    │  └────────────────────────────────┘  │
    │  ┌────────────────────────────────┐  │
    │  │  Event System                  │  │
    │  │  - Async pub/sub               │  │
    │  │  - Event history               │  │
    │  └────────────────────────────────┘  │
    └─────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │   Data & Service Layer              │
    │  ┌────────────────────────────────┐ │
    │  │  Agent Service                 │ │
    │  │  - Business logic              │ │
    │  │  - Validation                  │ │
    │  └────────────────────────────────┘ │
    │  ┌────────────────────────────────┐ │
    │  │  Command Service               │ │
    │  │  - Command lifecycle mgmt      │ │
    │  │  - Execution coordination      │ │
    │  └────────────────────────────────┘ │
    │  ┌────────────────────────────────┐ │
    │  │  Data Store                    │ │
    │  │  - Redis (cache/session)       │ │
    │  │  - Optional: PostgreSQL        │ │
    │  └────────────────────────────────┘ │
    └─────────────────────────────────────┘
         │
┌────────▼────────────────────────────────────┐
│        Remote Agents Network                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Agent 1  │  │ Agent 2  │  │ Agent N  │  │
│  │ (Linux)  │  │(Windows) │  │(k8s)     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Manager (`core/agent_manager.ts`)
**Responsibility**: Central registry for managing agent lifecycle

**Features**:
- Agent registration & deregistration
- Tag-based & capability-based indexing
- Status tracking (Online, Offline, Unhealthy, etc.)
- Health report recording
- Event logging per agent
- Discovery information

**Data Structures**:
```typescript
agents: Map<agentId, Agent>
agentsByTag: Map<tagKey, Set<agentId>>
agentsByCapability: Map<capabilityName, Set<agentId>>
healthReports: Map<agentId, HealthReport>
eventLogs: Map<agentId, AgentEvent[]>
```

**Performance**:
- O(1) lookup by ID
- O(n) filtering by tag/capability
- Periodic health checks every 60s
- Max 1,000 agents (configurable)

### 2. Command Router (`core/command_router.ts`)
**Responsibility**: Intelligent command routing and execution planning

**Routing Strategies**:
1. **Round-robin**: Rotate through available agents
2. **Least-loaded**: Send to agent with lowest CPU
3. **Random**: Random agent selection
4. **Broadcast**: Send to all agents

**Process**:
```
CommandRequest
    ↓
Create Command (PENDING)
    ↓
Find Suitable Agents (filter by:
  - Status (online)
  - Capability
  - Tags
  - Resources)
    ↓
Apply Routing Strategy
    ↓
Queue Command (QUEUED)
    ↓
Execute on Agents (RUNNING)
    ↓
Collect Results (COMPLETED/FAILED)
```

**Resource Constraints**:
- CPU < 90%
- Memory > 100MB
- Network bandwidth available

### 3. Secure Transport (`core/secure_transport.ts`)
**Responsibility**: End-to-end encryption and message integrity

**Security Layers**:
1. **Transport**: Optional TLS/SSL
2. **Message Encryption**: AES-256-GCM
3. **Message Signing**: HMAC-SHA256
4. **Message Validation**: Timestamp + signature check

**Encryption Flow**:
```
Plain Message
    ↓
Sign with HMAC
    ↓
Encrypt with AES-256-GCM
    ↓
Generate IV & Auth Tag
    ↓
Send Encrypted Package
```

### 4. Auth Guard (`core/auth_guard.ts`)
**Responsibility**: JWT-based authentication and authorization

**Features**:
- Token generation & verification
- Refresh token support
- Security context creation
- Permission & role checking
- Token expiration management

**Token Structure**:
```typescript
{
  sub: userId,
  aud: audience,
  iss: issuer,
  iat: issuedAt,
  exp: expiresAt,
  scope: [permissions]
}
```

### 5. Health Monitor (`core/health_monitor.ts`)
**Responsibility**: System and component health tracking

**Checks**:
- **Agent Health**: Heartbeat timeout, resource constraints
- **Database Health**: Connection status
- **Cache Health**: Redis/cache availability
- **System Health**: Overall status determination

**Alert Triggers**:
- High CPU (> 90%)
- High Memory (> 90%)
- Low Disk Space (< 5%)
- Command failure rate (> 10%)
- Agent offline timeout (> 2 min)

### 6. Event Emitter (`core/event_emitter.ts`)
**Responsibility**: Async event-driven architecture

**Events**:
- `agent:registered` - New agent registered
- `agent:statusChanged` - Status transition
- `command:routed` - Command routed to agents
- `command:completed` - Command finished
- `healthMonitor:alert` - Health alert triggered

**Implementation**:
- Node.js EventEmitter wrapper
- Async listener support
- Event history tracking
- Subscription management

## Request/Response Flow

### Agent Registration
```
POST /api/v1/agents
    ↓
AgentController.register()
    ↓
AgentService.registerAgent()
    ↓
AgentManager.registerAgent()
    ↓
Create Agent object + index by tags/capabilities
    ↓
Emit agent:registered event
    ↓
Return Agent with 201 Created
```

### Command Submission
```
POST /api/v1/commands
    ↓
CommandController.submit()
    ↓
CommandService.submitCommand()
    ↓
CommandRouter.createCommand()
    ↓
CommandRouter.routeCommand()
    ↓
Filter suitable agents → Apply strategy
    ↓
Queue command (QUEUED)
    ↓
Emit command:routed event
    ↓
Return Command with 202 Accepted
```

### WebSocket Agent Communication
```
Agent connects via WebSocket
    ↓
Authenticate & register
    ↓
Listen for messages:
  - agent:register
  - agent:heartbeat
  - command:result
  - health:report
    ↓
Process message in handler
    ↓
Update Agent state
    ↓
Send acknowledgment
    ↓
Emit relevant event
```

## Data Models

### Agent
```typescript
{
  id: string,
  name: string,
  status: AgentStatus,
  priority: AgentPriority,
  lastHeartbeat: Date,
  registeredAt: Date,
  metadata: AgentMetadata,
  capabilities: AgentCapability[],
  resources: AgentResource,
  tags: Record<string, string>,
  connectionId?: string,
  endpoint?: string
}
```

### Command
```typescript
{
  id: string,
  name: string,
  module: string,
  action: string,
  parameters: CommandParameter[],
  target: CommandTarget,
  status: CommandStatus,
  priority: CommandPriority,
  retryPolicy: CommandRetryPolicy,
  timeoutPolicy: CommandTimeoutPolicy,
  createdAt: Date,
  startedAt?: Date,
  completedAt?: Date,
  executedOn?: string[],
  result?: CommandResult,
  error?: CommandError
}
```

## Scalability Considerations

### Vertical Scaling
- Connection pooling for database
- In-memory caching with Redis
- Rate limiting per IP/user
- Request queuing

### Horizontal Scaling
- Stateless Express servers
- Shared Redis for session state
- Load balancer (Nginx/HAProxy)
- Database replication

### Performance Targets
- 1,000+ concurrent agents
- 10,000+ commands in queue
- <200ms average response time
- 99.9% uptime

## Security Architecture

1. **Authentication**: JWT tokens with refresh capability
2. **Encryption**: AES-256-GCM for data in transit
3. **Signing**: HMAC for message integrity
4. **Transport**: Optional TLS/SSL
5. **Authorization**: Role & permission-based access control
6. **Rate Limiting**: IP-based & user-based limits
7. **Input Validation**: Schema validation on all inputs
8. **Audit Logging**: All operations logged with timestamp & user

## Deployment Architecture

### Development
- Single server, no TLS
- Redis in-memory store
- Logs to console

### Staging
- Load-balanced servers
- Redis cache layer
- PostgreSQL backup
- TLS enabled

### Production
- Multi-region deployment
- Redis cluster
- PostgreSQL replication
- Elasticsearch logging
- Prometheus metrics
- Alert system integration
