# MCP Connector Platform - Frontend

The admin UI for managing connectors, governance rules, and approvals.

## Features

### Connector Management (Point 3A)
- **Connectors List** - View all deployed connectors with status
- **Create Connector** - Multi-step wizard to:
  - Upload OpenAPI spec (URL or file)
  - Configure base URL and authentication
  - Select endpoints to expose
  - Deploy to MCP runtime
  - Get MCP URL and token for Claude

### Governance Configuration (Point 4)
- **Deterministic Rules**
  - Allowed HTTP verbs (default: GET only)
  - Rate limiting per token
  - Approval requirements for WRITE and DANGEROUS operations
  - Dry-run mode for safe testing

- **AI Reviewer Settings** (Point 12)
  - Enable/disable AI review
  - ADVISORY or ENFORCING mode
  - Configurable timeouts
  - Risk-based thresholds (allow/approval/block)

### Approval Queue (Point 4)
- View pending approvals with:
  - Tool name and method
  - Arguments (redacted)
  - AI Reviewer risk score and reasons
  - Approve or reject buttons
- Automatic execution after approval

### Audit Logs (Point 6)
- Filter by decision (allowed/blocked/pending)
- View detailed invocation records:
  - Deterministic and reviewer decisions
  - Risk scores and latencies
  - Error codes and messages

## Architecture

### Components

**App.tsx** - Main application shell with navigation

**ConnectorList.tsx** - Display and manage connectors

**CreateConnector.tsx** - Multi-step connector creation wizard

**GovernancePanel.tsx** - Configure governance rules and AI Reviewer

**ApprovalQueue.tsx** - Review and approve pending requests

**LogsViewer.tsx** - Search and analyze invocation logs

### Styling

- **App.css** - Comprehensive styling with:
  - Responsive design
  - Component library (buttons, cards, forms, tables)
  - Color scheme and typography
  - Accessibility features

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts Vite dev server on http://localhost:5173 with API proxy to http://localhost:3000

## Building

```bash
npm run build
```

Produces optimized production build in `dist/`

## Configuration

The frontend expects the backend API at `http://localhost:3000` (configurable in `vite.config.ts`)

## Key Workflows

### Create Connector (Point 2 - Flow A)
1. User signs up / logs in
2. Clicks "Create Connector"
3. Uploads OpenAPI spec (URL or file)
4. Configures base URL (auto-detected)
5. Selects endpoints to expose
6. Clicks Deploy
7. Receives MCP URL and token
8. Pastes into Claude Custom Connectors

### Governance (Point 2 - Flow B)
1. Admin opens Governance for connector
2. Sets rules:
   - Allowed HTTP verbs
   - Rate limits
   - Approval requirements
   - AI Reviewer settings
3. Saves configuration
4. Rules apply to all future invocations

### Approval Workflow (Point 4)
1. Tool call arrives at runtime
2. Governance checks run
3. AI Reviewer assesses (if enabled)
4. If approval needed, added to queue
5. Admin reviews in Approval Queue
6. Approves or rejects
7. Approved requests execute immediately

## Minimal Configuration (Point 8)

Users only need to provide:
1. OpenAPI file/URL
2. Base URL (auto-detected)
3. Auth token/key
4. Click deploy

Everything else uses safe defaults:
- GET-only endpoints
- WRITE tools disabled
- Rate limiting enabled
- AI Reviewer enabled in ENFORCING mode

## Testing

Mock data is included for demo purposes. To test with real backend:

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Navigate to http://localhost:5173

## Deployment

### Docker
```bash
docker build -t mcp-connector-frontend .
docker run -p 80:5173 mcp-connector-frontend
```

### Static Hosting
```bash
npm run build
# Upload dist/ to static hosting (Vercel, Netlify, S3, etc.)
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
