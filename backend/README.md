# MCP Connector Platform - Backend

The control plane API for managing connectors, governance rules, and approvals.

## Architecture

The backend is a modular Express.js application with the following components:

### Core Modules

**OpenAPI Parser** (`src/utils/openApiParser.ts`)
- Parses OpenAPI 3.x specifications from URLs or file content
- Extracts endpoints and categorizes them (READ, WRITE, DANGEROUS)
- Generates MCP tool definitions with input schemas
- Calculates danger scores based on heuristics

**Governance Engine** (`src/utils/governanceEngine.ts`)
- Enforces deterministic governance rules
- Implements domain lock (SSRF protection)
- Manages rate limiting per token
- Validates against endpoint allowlists
- Checks numeric ceilings for sensitive fields
- Redacts sensitive fields from logs

**AI Reviewer** (`src/utils/aiReviewer.ts`) - Point 12
- Integrates with OpenAI for intelligent safety review
- Assesses tool invocation intent and plausibility
- Returns risk scores and recommendations
- Detects hallucinations and prompt injection attempts
- Supports configurable risk thresholds
- Implements timeout and fallback mechanisms

### API Routes

**Connectors** (`src/routes/connectors.ts`) - Point 7
- `POST /api/connectors` - Create connector from OpenAPI
- `GET /api/connectors/:id/preview` - Preview generated tools
- `PATCH /api/connectors/:id/endpoints` - Update endpoint selection
- `PATCH /api/connectors/:id/governance` - Update governance rules
- `POST /api/connectors/:id/deploy` - Deploy connector

**Tokens** (`src/routes/tokens.ts`) - Point 7
- `GET /api/tokens` - List MCP tokens
- `POST /api/tokens` - Issue new token
- `DELETE /api/tokens/:id` - Revoke token

**Approvals** (`src/routes/approvals.ts`) - Point 7
- `GET /api/approvals` - List pending approvals
- `POST /api/approvals/:id/approve` - Approve pending action
- `POST /api/approvals/:id/reject` - Reject pending action

**Logs** (`src/routes/logs.ts`) - Point 7
- `GET /api/logs` - List invocation logs with filtering
- `GET /api/logs/:id` - Get detailed log entry

## Data Models - Point 6

### Users & Organizations
- Users with email/password authentication
- Organizations with member management
- Role-based access control (admin, member)

### Connectors
- OpenAPI spec storage
- Base URL and auth configuration
- Selected endpoints list
- Generated tool definitions
- Deployment status and URL

### Governance Configuration
- Allowed HTTP verbs (default: GET only)
- Allowed paths (endpoint allowlist)
- Rate limits (per token, per minute)
- Numeric ceilings for sensitive fields
- Approval requirements for WRITE and DANGEROUS operations
- AI Reviewer settings (Point 12)

### Tokens
- MCP authentication tokens
- Per-connector token management
- Token lifecycle (active/revoked/expired)
- Usage tracking

### Logs & Approvals
- Invocation logs with full decision tracking
- Deterministic and reviewer decisions
- Risk scores and reasons
- Approval requests with expiration
- Audit trail for compliance

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mcp_connector
OPENAI_API_KEY=sk-...
NODE_ENV=development
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

## API Examples

### Create Connector from OpenAPI
```bash
curl -X POST http://localhost:3000/api/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stripe API",
    "openApiUrl": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
    "baseUrl": "https://api.stripe.com",
    "authType": "bearer_token",
    "authSecret": "sk_live_..."
  }'
```

### Update Governance Rules
```bash
curl -X PATCH http://localhost:3000/api/connectors/connector-1/governance \
  -H "Content-Type: application/json" \
  -d '{
    "allowedVerbs": ["GET"],
    "rateLimitPerMinute": 60,
    "requireApprovalForWrites": true,
    "aiReviewerEnabled": true,
    "aiReviewerMode": "ENFORCING"
  }'
```

### Issue MCP Token
```bash
curl -X POST http://localhost:3000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "connectorId": "connector-1",
    "name": "Production Token",
    "expiresIn": 365
  }'
```

### List Invocation Logs
```bash
curl http://localhost:3000/api/logs?connectorId=connector-1&limit=50
```

## Point 8: Minimal Configuration

Users only need to provide:
1. **OpenAPI file or URL** - The API specification
2. **Base URL** - Auto-detected from spec, editable
3. **Auth token/key** - Single field for authentication
4. **Click deploy** - Everything else defaults safely

All other settings use secure defaults:
- GET-only endpoints exposed
- WRITE tools disabled by default
- Rate limiting enabled (60 req/min)
- AI Reviewer enabled in ENFORCING mode
- Approval required for WRITE and DANGEROUS operations

## Point 11: Implementation

The backend follows a modular architecture:
- Single Express app with focused route modules
- Reusable utility modules (parser, governance, reviewer)
- Database-backed storage with Drizzle ORM
- Async/await for clean error handling
- Validation with Zod schemas

No microservices complexity - everything runs in one process for MVP simplicity.

## Point 12: AI Reviewer

The AI Reviewer provides intelligent safety assessment:

### Features
- Risk scoring (0-100)
- Intent validation
- Hallucination detection
- Prompt injection resistance
- Configurable thresholds

### Configuration
```json
{
  "aiReviewerEnabled": true,
  "aiReviewerMode": "ENFORCING",
  "aiReviewerWriteCallsOnly": true,
  "aiReviewerHighRiskOnly": true,
  "aiReviewerTimeoutMs": 2000,
  "aiReviewerAllowMaxRisk": 30,
  "aiReviewerApprovalMinRisk": 31,
  "aiReviewerBlockMinRisk": 71,
  "aiReviewerFallback": "REQUIRE_HUMAN_APPROVAL"
}
```

### Decision Pipeline
1. Auth + Tool resolution
2. Deterministic checks (domain lock, rate limits, allowlist)
3. AI Reviewer assessment (if enabled)
4. Approval workflow (if needed)
5. Execution or rejection

## Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

## Deployment

### Docker
```bash
docker build -t mcp-connector-backend .
docker run -p 3000:3000 -e DATABASE_URL=... mcp-connector-backend
```

### Kubernetes
```bash
kubectl apply -f k8s/backend.yaml
```

## License

MIT
