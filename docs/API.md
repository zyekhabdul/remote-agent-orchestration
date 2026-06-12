# API Reference

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Most endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer {token}
```

## Response Format
All responses follow this structure:
```json
{
  "success": boolean,
  "data": {},
  "error": string,
  "requestId": string,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Endpoints

### Health & Status

#### Health Check
```
GET /health
```
Returns system health status
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "components": [
      {"component": "database", "status": "healthy"}
    ]
  }
}
```

#### System Status
```
GET /status
```
Returns comprehensive system status
```json
{
  "success": true,
  "data": {
    "agents": {
      "total": 10,
      "online": 9,
      "offline": 1
    },
    "commands": {
      "queued": 5,
      "running": 3,
      "completed": 100
    }
  }
}
```

---

### Agent Management

#### Register Agent
```
POST /agents
```
Register a new agent

**Request Body**:
```json
{
  "name": "prod-server-01",
  "metadata": {
    "version": "1.0.0",
    "platform": "Linux",
    "architecture": "x86_64",
    "osVersion": "5.10.0",
    "hostname": "prod-server-01",
    "timezone": "UTC"
  },
  "capabilities": [
    {
      "name": "shell",
      "version": "1.0",
      "enabled": true
    }
  ],
  "resources": {
    "cpu": 50,
    "memory": 2048,
    "disk": 10240,
    "bandwidth": 100
  },
  "tags": {
    "environment": "production",
    "region": "us-east-1"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "agent-uuid",
    "name": "prod-server-01",
    "status": "registered",
    ...
  }
}
```

#### List Agents
```
GET /agents?page=1&limit=20
```
List all agents with pagination

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Results per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

#### Get Agent
```
GET /agents/{agentId}
```
Get agent details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "agent-uuid",
    "name": "prod-server-01",
    "status": "online",
    "lastHeartbeat": "2024-01-01T12:00:00Z",
    ...
  }
}
```

#### Get Agent Health
```
GET /agents/{agentId}/health
```
Get agent health status

**Response** (200):
```json
{
  "success": true,
  "data": {
    "agentId": "agent-uuid",
    "status": "online",
    "health": {
      "uptime": 86400000,
      "averageResponseTime": 150
    },
    "recentEvents": [...]
  }
}
```

#### Deregister Agent
```
DELETE /agents/{agentId}
```
Deregister an agent

**Response** (200):
```json
{
  "success": true,
  "data": {
    "agentId": "agent-uuid",
    "deregistered": true
  }
}
```

---

### Command Management

#### Submit Command
```
POST /commands
```
Submit a command for execution

**Request Body**:
```json
{
  "name": "Health Check",
  "module": "shell",
  "action": "execute",
  "parameters": {
    "command": "curl https://health.example.com"
  },
  "target": {
    "agentCapability": "shell"
  },
  "priority": "high",
  "timeout": 30000,
  "retries": 3
}
```

**Response** (202):
```json
{
  "success": true,
  "data": {
    "id": "cmd-uuid",
    "status": "queued",
    "selectedAgents": ["agent-1", "agent-2"]
  }
}
```

#### Get Command
```
GET /commands/{commandId}
```
Get command details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "cmd-uuid",
    "name": "Health Check",
    "status": "completed",
    "result": {
      "exitCode": 0,
      "stdout": "OK",
      "stderr": ""
    }
  }
}
```

#### Get Command Status
```
GET /commands/{commandId}/status
```
Get command execution status

**Response** (200):
```json
{
  "success": true,
  "data": {
    "commandId": "cmd-uuid",
    "status": "running"
  }
}
```

#### Cancel Command
```
DELETE /commands/{commandId}
```
Cancel a pending command

**Response** (200):
```json
{
  "success": true,
  "data": {
    "commandId": "cmd-uuid",
    "cancelled": true
  }
}
```

---

## WebSocket Messages

### Connection
```
ws://localhost:3001?client_id=agent-001
```

### Agent Registration
```json
{
  "id": "msg-1",
  "type": "agent:register",
  "payload": {
    "name": "agent-01",
    "metadata": {...},
    "capabilities": [...],
    "resources": {...}
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "sender": "agent-001"
}
```

### Agent Heartbeat
```json
{
  "id": "msg-2",
  "type": "agent:heartbeat",
  "payload": {
    "agentId": "agent-uuid",
    "resources": {
      "cpu": 45,
      "memory": 1024,
      "disk": 5120,
      "bandwidth": 100
    }
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "sender": "agent-001"
}
```

### Command Result
```json
{
  "id": "msg-3",
  "type": "command:result",
  "payload": {
    "commandId": "cmd-uuid",
    "exitCode": 0,
    "stdout": "success",
    "stderr": ""
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "sender": "agent-001"
}
```

### Health Report
```json
{
  "id": "msg-4",
  "type": "health:report",
  "payload": {
    "agentId": "agent-uuid",
    "status": "online",
    "uptime": 86400000,
    "errorCount": 0,
    "averageResponseTime": 150
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "sender": "agent-001"
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 202 | Accepted | Request accepted for processing |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Response**: `429 Too Many Requests` with `Retry-After` header

---

## Pagination
Use `page` and `limit` parameters:
```
GET /agents?page=2&limit=50
```

Responses include:
- `total`: Total items
- `page`: Current page
- `limit`: Items per page
- `totalPages`: Total pages
- `hasNextPage`: Is there next page
- `hasPreviousPage`: Is there previous page
