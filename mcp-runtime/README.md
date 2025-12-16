# MCP Connector Platform - Runtime

The hosted execution layer that implements the MCP (Model Context Protocol) server interface and executes tool calls with governance enforcement.

## Overview

The MCP Runtime is responsible for:
- Implementing the MCP server protocol over HTTP
- Executing tool calls against upstream APIs
- Enforcing governance rules and rate limits
- Integrating with the AI Reviewer
- Logging all invocations
- Managing approval workflows

## Architecture

### Core Responsibilities

**Tool Execution**
- Receive tool invocation requests from Claude
- Validate inputs against JSON schemas
- Call upstream APIs with proper authentication
- Return results in MCP format
- Handle errors gracefully

**Governance Enforcement**
- Domain lock (SSRF protection)
- Rate limiting per token
- Endpoint allowlist validation
- Numeric ceiling checks
- Sensitive field redaction

**AI Review Integration** (Point 12)
- Send requests to AI Reviewer
- Implement risk-based decision logic
- Handle timeouts with fallback behavior
- Log review decisions

**Approval Workflow**
- Queue requests requiring approval
- Notify control plane
- Wait for human decision
- Execute approved requests
- Reject blocked requests

## MCP Protocol Implementation

### Endpoints

**POST /mcp/tools/list**
Lists all available tools for a connector.

Request:
```json
{
  "connectorId": "connector-1"
}
```

Response:
```json
{
  "tools": [
    {
      "name": "list_invoices",
      "description": "List all invoices",
      "inputSchema": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" }
        }
      }
    }
  ]
}
```

**POST /mcp/tools/call**
Execute a tool with governance checks.

Request:
```json
{
  "connectorId": "connector-1",
  "toolName": "list_invoices",
  "arguments": {
    "limit": 10
  }
}
```

Headers:
```
Authorization: Bearer mcp_token_here
```

Response:
```json
{
  "result": { "invoices": [...] },
  "metadata": {
    "toolName": "list_invoices",
    "connectorId": "connector-1",
    "timestamp": "2024-12-16T06:00:00Z"
  }
}
```

### Decision Pipeline

For each tool invocation:

1. **Authentication** - Validate MCP token
2. **Tool Resolution** - Verify tool exists and is enabled
3. **Input Validation** - Check against JSON schema
4. **Deterministic Checks** (Pre)
   - Domain lock / SSRF protection
   - Rate limits
   - Endpoint allowlist
   - Numeric ceilings
5. **AI Reviewer** (Optional)
   - Send redacted request
   - Get risk score and decision
   - Apply risk thresholds
6. **Approval Check**
   - If REQUIRE_HUMAN_APPROVAL, queue and return pending
   - Otherwise proceed
7. **Execution**
   - Call upstream API
   - Redact sensitive fields
8. **Logging**
   - Store full invocation record
   - Track decision and latency

## Configuration

Environment variables:

```env
MCP_RUNTIME_PORT=4000
MCP_RUNTIME_URL=https://mcp.example.com
CONTROL_PLANE_URL=http://localhost:3000
NODE_ENV=production
```

## Installation

```bash
npm install
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Internal APIs (Control Plane Integration)

**POST /internal/connectors/register**
Register a connector for execution.

Request:
```json
{
  "id": "connector-1",
  "baseUrl": "https://api.example.com",
  "authType": "bearer_token",
  "authSecret": "sk_live_...",
  "tools": [
    {
      "name": "list_invoices",
      "description": "List invoices",
      "inputSchema": { "type": "object" }
    }
  ],
  "governance": {
    "allowedVerbs": ["GET"],
    "rateLimitPerMinute": 60
  }
}
```

Response:
```json
{
  "id": "connector-1",
  "status": "registered",
  "mcpUrl": "https://mcp.example.com/mcp/connector-1"
}
```

## Error Handling

All errors return structured JSON:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 60,
    "window": "1 minute"
  }
}
```

Error codes:
- `INVALID_TOKEN` - Authentication failed
- `TOOL_NOT_FOUND` - Tool doesn't exist
- `SCHEMA_VALIDATION_ERROR` - Input validation failed
- `GOVERNANCE_VIOLATION` - Governance rule violated
- `RATE_LIMIT_EXCEEDED` - Rate limit hit
- `APPROVAL_REQUIRED` - Waiting for human approval
- `UPSTREAM_ERROR` - Upstream API error
- `TOOL_EXECUTION_ERROR` - General execution error

## Scaling

### Multi-tenant Isolation

For MVP, logical isolation is acceptable:
- Per-connector rate limiting
- Per-token authentication
- Separate governance configs
- Isolated approval queues

### Future: Physical Isolation

- Separate containers per connector
- Dedicated databases
- Network segmentation
- Resource quotas

## Monitoring

### Metrics to Track
- Tool invocation count
- Average latency
- Error rate
- Approval rate
- AI Reviewer latency
- Upstream API latency

### Logging

All invocations logged with:
- Timestamp
- Connector ID
- Tool name
- Decision (allowed/blocked/pending)
- Latencies
- Error codes
- Risk scores

## Security

### Token Management
- Tokens stored securely in database
- Never logged or exposed
- Rotated regularly
- Revoked on demand

### Upstream API Keys
- Encrypted at rest
- Never exposed to client
- Never logged
- Rotated by control plane

### Request Redaction
- Sensitive fields masked in logs
- API keys, secrets, tokens redacted
- PII masking optional
- Audit trail preserved

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Deployment

### Docker
```bash
docker build -t mcp-connector-runtime .
docker run -p 4000:4000 -e CONTROL_PLANE_URL=... mcp-connector-runtime
```

### Kubernetes
```bash
kubectl apply -f k8s/runtime.yaml
```

## Performance Targets

- Tool list response: < 100ms
- Tool execution: < 2s (including AI review)
- AI Reviewer timeout: 2s (configurable)
- Rate limit check: < 1ms
- Governance checks: < 5ms

## License

MIT
