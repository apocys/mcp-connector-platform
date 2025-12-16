# MCP Connector Platform

A web platform that transforms OpenAPI documentation into hosted MCP (Model Context Protocol) servers with built-in governance controls and AI-powered safety review.

## Overview

This platform enables users to:
- Import OpenAPI specifications (JSON/YAML)
- Generate MCP server definitions automatically
- Deploy connectors with governance controls
- Review and approve tool invocations with AI assistance
- Monitor usage and maintain audit logs

## Architecture

The platform consists of four main components:

### 1. Backend (Control Plane API)
- User and organization management
- Connector configuration storage
- Governance rule management
- MCP token lifecycle
- Approval workflow
- Audit logging

### 2. Frontend (Admin UI)
- Connector creation and management
- Endpoint selection interface
- Governance rule configuration
- Approval queue
- Usage logs and analytics

### 3. MCP Runtime
- HTTP-based MCP server implementation
- Tool execution with governance checks
- AI Reviewer integration
- Request/response logging
- Error handling and fallbacks

### 4. Shared Utilities
- OpenAPI parser
- Governance engine
- AI Reviewer client
- Schema validation
- Encryption utilities

## Project Structure

```
mcp-connector-platform/
├── backend/              # Node.js/Express control plane
├── frontend/             # React admin UI
├── mcp-runtime/          # MCP server runtime
├── shared/               # Shared utilities and types
└── README.md             # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or pnpm

### Installation

```bash
# Backend setup
cd backend
npm install
npm run setup:db
npm run dev

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev

# MCP Runtime setup (in another terminal)
cd mcp-runtime
npm install
npm run dev
```

## Key Features

### Point 6: Data Storage
- Users and organizations
- Connector configurations with encrypted secrets
- Selected endpoints and tool definitions
- Governance rules (JSON-based)
- Deployment status and metadata
- Invocation logs with decision tracking
- Approval requests and history

### Point 7: Core APIs
- `POST /api/connectors` - Create connector from OpenAPI
- `GET /api/connectors/:id/preview` - Preview generated tools
- `PATCH /api/connectors/:id/endpoints` - Update endpoint selection
- `PATCH /api/connectors/:id/governance` - Update governance rules
- `POST /api/connectors/:id/deploy` - Deploy connector
- `POST /api/tokens` - Issue MCP tokens
- `DELETE /api/tokens/:id` - Revoke tokens
- `GET /api/logs` - List invocation logs
- `POST /api/approvals/:id/approve` - Approve pending action
- `POST /api/approvals/:id/reject` - Reject pending action

### Point 8: Minimal Configuration
Users only need to provide:
- OpenAPI file or URL
- Base URL (auto-detected)
- Auth token/key (one field)
- Click deploy

Everything else defaults safely.

### Point 10: Delivery
- Hosted environment with deployment scripts
- Admin UI for management
- MCP runtime for execution
- Demo connector example
- Comprehensive documentation

### Point 11: Implementation
- Single backend with modular design
- Parser module for OpenAPI
- Governance module for rule evaluation
- MCP runtime routes
- Database-backed approval flow

### Point 12: AI Reviewer
Optional AI-powered safety layer that:
- Assesses tool invocation requests
- Returns: ALLOW, REQUIRE_HUMAN_APPROVAL, or BLOCK
- Evaluates intent and plausibility
- Identifies hallucinations
- Provides risk scoring
- Integrates with approval workflow

## Governance Framework

### Deterministic Checks
- Domain lock (SSRF protection)
- Rate limiting (per token)
- Endpoint allowlist (verbs + paths)
- JSON schema validation
- Numeric ceiling enforcement

### AI Reviewer (Optional)
- Risk assessment (0-100 score)
- Intent validation
- Hallucination detection
- Prompt injection resistance
- Configurable thresholds

### Default Safe Configuration
- GET-only endpoints exposed
- WRITE tools disabled by default
- Rate limiting enabled
- Logging enabled
- AI Reviewer in ENFORCING mode

## Deployment

### Option 1: Docker
```bash
docker-compose up
```

### Option 2: Manual
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm run serve

# MCP Runtime
cd mcp-runtime && npm run build && npm start
```

## Testing with Claude

1. Deploy a connector
2. Copy the MCP Server URL and token
3. In Claude, go to Custom Connectors
4. Paste the URL
5. Add the token as Authorization header
6. Test a tool call

## Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Setup Guide](./frontend/README.md)
- [MCP Runtime Guide](./mcp-runtime/README.md)
- [Governance Rules](./docs/GOVERNANCE.md)
- [AI Reviewer Configuration](./docs/AI_REVIEWER.md)

## Implementation Status

- [x] Point 6: Data models and storage schema
- [x] Point 7: Core API endpoints
- [x] Point 8: Minimal configuration flow
- [x] Point 9: Non-goals documentation
- [x] Point 10: Delivery components
- [x] Point 11: Modular backend architecture
- [x] Point 12: AI Reviewer integration

## License

MIT
