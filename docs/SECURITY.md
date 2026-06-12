# Security Guide

## Overview
This document outlines the security architecture and best practices for the Remote Agent Orchestration Framework.

## Authentication

### JWT Token Strategy
- **Algorithm**: HS256 (HMAC-SHA256)
- **Expiration**: 24 hours (configurable)
- **Refresh Token**: 7 days validity
- **Secret Rotation**: Recommended every 90 days

### Token Generation
```typescript
const token = AuthGuard.generateToken({
  sub: userId,
  scope: ['agents:read', 'commands:write']
});
```

### Token Validation
```typescript
const securityContext = AuthGuard.createSecurityContext(token);
if (AuthGuard.hasPermission(securityContext, 'agents:write')) {
  // Allowed
}
```

## Encryption

### Message Encryption
- **Algorithm**: AES-256-GCM
- **Key Size**: 256-bit (32 bytes)
- **IV**: Random 16-byte initialization vector
- **Auth Tag**: 16-byte authentication tag

### Encryption Process
```typescript
const encrypted = secureTransport.encryptMessage({
  payload: commandData,
  sender: 'server',
  recipient: 'agent-1'
});
```

### Key Derivation
- **Algorithm**: PBKDF2
- **Iterations**: 100,000
- **Hash Function**: SHA-256
- **Salt**: Unique per key

## Message Signing

### HMAC Signature
- **Algorithm**: HMAC-SHA256
- **Purpose**: Ensure message integrity
- **Verification**: Constant-time comparison

```typescript
const signature = secureTransport.signMessage(message);
const isValid = secureTransport.verifyMessageSignature(message, signature);
```

## Transport Security

### TLS/SSL Configuration
Enable in production:
```env
TLS_ENABLED=true
TLS_KEY_PATH=./certs/server.key
TLS_CERT_PATH=./certs/server.cert
```

### Certificate Management
- Use certificates from trusted CAs
- Implement certificate pinning for agents
- Rotate certificates before expiration
- Monitor certificate validity

## Authorization

### Role-Based Access Control (RBAC)
```typescript
// Define roles
const roles = {
  admin: ['agents:*', 'commands:*', 'system:*'],
  operator: ['agents:read', 'commands:write', 'commands:read'],
  viewer: ['agents:read', 'commands:read']
};
```

### Permission Checking
```typescript
if (!AuthGuard.hasRole(context, 'admin')) {
  throw new UnauthorizedError('Admin role required');
}
```

## Rate Limiting

### Configuration
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # per window
```

### Per-Agent Limits
- Heartbeat: 1 per minute
- Command submission: 10 per minute
- Results: Unlimited

## Input Validation

### Request Validation
- Validate all input parameters
- Use schema validation (Joi)
- Sanitize user inputs
- Reject oversized payloads (10MB limit)

### Command Validation
```typescript
const schema = {
  name: Joi.string().required(),
  module: Joi.string().required(),
  action: Joi.string().required(),
  parameters: Joi.object(),
  target: Joi.object().required()
};
```

## CORS Configuration

### Allowed Origins
```env
CORS_ENABLED=true
CORS_ORIGINS=https://dashboard.example.com,https://api.example.com
```

### Headers
- `Access-Control-Allow-Origin`: Specific domains only
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE
- `Access-Control-Allow-Headers`: Content-Type, Authorization

## Security Headers

### Helmet.js Configuration
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Headers Applied
- `Content-Security-Policy`: Restrict resource loading
- `Strict-Transport-Security`: Force HTTPS
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking
- `X-XSS-Protection`: Browser XSS protection

## Password Security

### Password Hashing
- **Algorithm**: PBKDF2
- **Iterations**: 100,000
- **Hash Function**: SHA-512
- **Salt**: 16 bytes random

```typescript
const hash = cryptoService.hashPassword(password, 10);
const isValid = cryptoService.verifyPassword(password, hash);
```

### Password Policy
- Minimum length: 8 characters
- Require uppercase letters
- Require numbers
- Require special characters
- Expiration: 90 days

## Audit Logging

### Logged Events
- Agent registration/deregistration
- Command submission/execution
- Authentication attempts (success & failure)
- Authorization failures
- Configuration changes
- Error conditions

### Audit Log Format
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "event": "agent:registered",
  "agentId": "agent-uuid",
  "userId": "user-uuid",
  "ipAddress": "192.168.1.1",
  "status": "success",
  "details": {}
}
```

## Secure Agent Communication

### Agent Authentication
1. Generate agent certificate/key pair
2. Exchange public keys via secure channel
3. Validate certificate during handshake
4. Use certificate pinning to prevent MITM

### Message Authentication
1. Sign all messages with HMAC
2. Include timestamp (prevent replay)
3. Include sequence number
4. Verify timestamp freshness (5 min window)

## Threat Models & Mitigations

### Man-in-the-Middle (MITM)
**Mitigation**:
- TLS encryption
- Message signing (HMAC)
- Certificate pinning
- Public key infrastructure

### Replay Attack
**Mitigation**:
- Timestamp validation (5 minute window)
- Sequence numbers
- Nonce values

### Brute Force
**Mitigation**:
- Rate limiting (5 attempts / 15 minutes)
- Account lockout (15 minutes)
- Strong password policy

### SQL Injection
**Mitigation**:
- Parameterized queries
- Input validation
- ORM usage (if using SQL)

### Cross-Site Scripting (XSS)
**Mitigation**:
- Content-Security-Policy header
- Input sanitization
- Output encoding

### Denial of Service (DoS)
**Mitigation**:
- Rate limiting
- Connection pooling
- Request size limits
- Circuit breaker pattern

## Compliance Standards

### GDPR Compliance
- Data retention policies
- Right to be forgotten
- Data minimization
- Audit logging

### HIPAA Compliance
- Encryption at rest & in transit
- Access controls
- Audit trails
- Incident reporting

### PCI DSS
- Secure password storage
- Encryption of cardholder data
- Access logging
- Vulnerability management

## Development Security

### Environment Variables
```
DO NOT commit .env to version control
USE strong secrets in production
ROTATE secrets regularly
```

### Dependencies
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Lock versions
npm ci
```

### Code Review
- Review all authentication/authorization code
- Review encryption implementation
- Review audit logging
- Review error messages (no sensitive data)

## Deployment Security

### Production Checklist
- [ ] Enable TLS/SSL
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set LOG_LEVEL=info (not debug)
- [ ] Use environment variables for secrets
- [ ] Enable audit logging
- [ ] Configure database encryption
- [ ] Set up monitoring/alerts
- [ ] Regular backup with encryption

### Secrets Management
Options:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- .env with restricted access

### Network Security
- Run behind load balancer
- Use VPC/security groups
- Restrict agent IP ranges
- Use VPN for agent connections
- Enable DDoS protection

## Incident Response

### Security Incident Steps
1. **Detect**: Monitor logs & alerts
2. **Respond**: Isolate affected systems
3. **Investigate**: Determine root cause
4. **Remediate**: Fix vulnerability
5. **Recover**: Restore service
6. **Review**: Post-mortem analysis
7. **Update**: Improve processes

### Monitoring
- Failed authentication attempts
- Rate limit violations
- Unusual agent activity
- Slow query detection
- Error rate spikes

## Security Testing

### Automated Testing
```bash
npm audit          # Dependency vulnerabilities
npm test           # Unit tests
npm run lint       # Code quality
```

### Manual Testing
- Penetration testing
- Authentication bypass attempts
- Authorization checks
- Encryption validation
- Rate limit testing

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cybersecurity](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: 2024-01-01
**Next Review**: 2024-04-01
