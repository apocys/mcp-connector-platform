# Governance Framework

## Overview

The governance framework provides multiple layers of protection to prevent misuse and reduce risk from agent hallucinations. It combines deterministic rule enforcement with optional AI-powered safety review.

## Architecture

### Decision Pipeline

For each tool invocation, the platform executes this pipeline:

1. **Authentication** - Validate MCP token
2. **Tool Resolution** - Verify tool exists and is enabled
3. **Input Validation** - Check against JSON schema
4. **Deterministic Checks (Pre)**
   - Domain lock / SSRF protection
   - Rate limits
   - Endpoint allowlist (verbs + paths)
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

## Deterministic Rules

### Domain Lock (SSRF Protection)

Prevents Server-Side Request Forgery attacks by validating the upstream base URL.

**Rules:**
- Block private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Block IPv6 private ranges (fc00::/7, fd00::/8)
- Block localhost (127.0.0.1, ::1)
- Allow only public, routable IPs

**Configuration:** Automatic, no admin action required

### Rate Limiting

Prevents abuse by limiting requests per token.

**Configuration:**
```json
{
  "rateLimitPerMinute": 60
}
```

**Behavior:**
- Per-token rate limiting
- 1-minute rolling window
- Returns 429 when exceeded
- Resets automatically

### Endpoint Allowlist

Restricts which endpoints can be called.

**Configuration:**
```json
{
  "allowedVerbs": ["GET"],
  "allowedPaths": ["/v1/invoices", "/v1/customers/*"]
}
```

**Behavior:**
- Whitelist model (only allowed endpoints work)
- Supports wildcards in paths
- Default: GET only (safe by default)

### Numeric Ceilings

Prevents large transactions by capping numeric values.

**Configuration:**
```json
{
  "numericCeilings": {
    "amount": 100000,
    "qty": 1000,
    "quantity": 500
  }
}
```

**Behavior:**
- Monitors fields: amount, notional, qty, quantity, size
- Blocks requests exceeding ceiling
- Can trigger approval instead of blocking

## Approval Workflow

### When Approval is Required

Requests require human approval if:
- Tool category is WRITE (POST, PUT, PATCH, DELETE)
- Tool category is DANGEROUS (heuristic-based)
- Numeric ceiling exceeded
- AI Reviewer risk score in approval range
- Admin explicitly configured

### Approval Process

1. **Request Queued** - Added to approval queue with:
   - Tool name and method
   - Arguments (redacted)
   - AI Reviewer assessment
   - Expiration time (24 hours default)

2. **Admin Review** - Admin sees:
   - Tool details
   - Arguments (sensitive fields masked)
   - Reviewer risk score and reasons
   - Approve/Reject buttons

3. **Execution** - After approval:
   - Exact stored payload executed
   - Immutable audit trail
   - Logged as human-approved

4. **Expiration** - If not approved within 24 hours:
   - Request auto-rejected
   - Logged as expired
   - Client notified

## Default Safe Configuration

The platform ships with secure defaults:

```json
{
  "allowedVerbs": ["GET"],
  "allowedPaths": [],
  "rateLimitPerMinute": 60,
  "requireApprovalForWrites": true,
  "requireApprovalForHighRisk": true,
  "dryRunMode": false,
  "redactSensitiveFields": true,
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

### What This Means

- **Read-only by default** - Only GET endpoints exposed
- **WRITE disabled** - POST/PUT/PATCH/DELETE require approval
- **Rate limited** - 60 requests per minute per token
- **AI Reviewer on** - All WRITE calls reviewed
- **Safe fallback** - If reviewer fails, require approval

## Endpoint Classification

The platform automatically categorizes endpoints:

### READ
- HTTP method: GET, HEAD, OPTIONS
- No side effects
- Lower risk
- May bypass AI review if low-risk heuristic

### WRITE
- HTTP method: POST, PUT, PATCH, DELETE
- Modifies state
- Requires approval by default
- Always reviewed by AI

### DANGEROUS
- Contains keywords: transfer, withdraw, delete, trade, order, payment, charge, refund, cancel, execute
- High-risk operations
- Always requires approval
- Always reviewed by AI
- Higher risk thresholds

## Sensitive Field Redaction

The platform automatically masks sensitive fields in logs:

**Redacted patterns:**
- api_key, apikey
- secret, secrets
- token, tokens
- password, passwd
- auth, authorization
- credential, credentials

**Example:**
```json
// Before
{
  "api_key": "sk_live_123456",
  "amount": 5000,
  "description": "Invoice payment"
}

// After (in logs)
{
  "api_key": "[REDACTED]",
  "amount": 5000,
  "description": "Invoice payment"
}
```

## Dry Run Mode

When enabled, requests are not executed against the upstream API:

```json
{
  "dryRunMode": true
}
```

**Behavior:**
- Governance checks still run
- AI Reviewer still assesses
- Approval workflow still applies
- Returns simulated response: "would have called X with payload Y"
- Useful for testing and validation

## Customization

### Adjusting Risk Thresholds

For different risk profiles:

**Conservative (High Security):**
```json
{
  "aiReviewerAllowMaxRisk": 20,
  "aiReviewerApprovalMinRisk": 21,
  "aiReviewerBlockMinRisk": 51,
  "requireApprovalForWrites": true,
  "requireApprovalForHighRisk": true
}
```

**Moderate (Balanced):**
```json
{
  "aiReviewerAllowMaxRisk": 30,
  "aiReviewerApprovalMinRisk": 31,
  "aiReviewerBlockMinRisk": 71,
  "requireApprovalForWrites": true,
  "requireApprovalForHighRisk": true
}
```

**Permissive (High Velocity):**
```json
{
  "aiReviewerAllowMaxRisk": 50,
  "aiReviewerApprovalMinRisk": 51,
  "aiReviewerBlockMinRisk": 81,
  "requireApprovalForWrites": false,
  "requireApprovalForHighRisk": false
}
```

### Enabling Specific Endpoints

To allow specific WRITE endpoints:

```json
{
  "allowedVerbs": ["GET", "POST"],
  "allowedPaths": [
    "/v1/invoices",
    "/v1/invoices/{id}/send"
  ],
  "requireApprovalForWrites": true
}
```

### Disabling AI Review

For high-velocity scenarios where deterministic rules suffice:

```json
{
  "aiReviewerEnabled": false,
  "requireApprovalForWrites": true
}
```

## Monitoring & Audit

### Key Metrics

Track these metrics to understand governance effectiveness:

- **Approval Rate** - % of requests requiring approval
- **Block Rate** - % of requests blocked
- **AI Reviewer Accuracy** - False positive/negative rate
- **Latency Impact** - Time added by governance checks
- **Reviewer Timeout Rate** - % of requests timing out

### Audit Trail

Every invocation is logged with:

```json
{
  "id": "log-123",
  "connectorId": "stripe-1",
  "toolName": "create_invoice",
  "method": "POST",
  "path": "/v1/invoices",
  "deterministicDecision": "allowed",
  "reviewerDecision": "REQUIRE_HUMAN_APPROVAL",
  "reviewerRiskScore": 45,
  "finalDecision": "pending",
  "humanApproved": false,
  "reviewLatencyMs": 280,
  "executionLatencyMs": 450,
  "createdAt": "2024-12-16T06:00:00Z"
}
```

## Best Practices

1. **Start Conservative** - Enable all safety features initially
2. **Monitor Metrics** - Track approval and block rates
3. **Tune Gradually** - Adjust thresholds based on data
4. **Review Logs** - Regularly audit invocation logs
5. **Test Changes** - Use dry-run mode before deploying
6. **Document Policies** - Keep governance rules documented
7. **Rotate Tokens** - Revoke and reissue tokens regularly
8. **Update Allowlists** - Keep endpoint allowlists current

## Troubleshooting

### High Approval Rate

**Symptoms:** Many requests requiring approval

**Solutions:**
- Review AI Reviewer risk thresholds
- Check if DANGEROUS classification is too broad
- Consider disabling AI review for read-only operations
- Adjust numeric ceilings if too restrictive

### False Positives

**Symptoms:** Legitimate requests blocked

**Solutions:**
- Review blocked requests in logs
- Adjust risk thresholds
- Add endpoints to allowlist
- Increase numeric ceilings
- Disable dry-run mode if enabled

### Performance Issues

**Symptoms:** Slow request processing

**Solutions:**
- Increase AI Reviewer timeout
- Disable AI review for read-only operations
- Check upstream API latency
- Review rate limit settings

## Security Considerations

- **Never log secrets** - Sensitive fields are redacted
- **Immutable audit trail** - All decisions logged
- **Token rotation** - Regularly revoke and reissue tokens
- **Domain validation** - SSRF protection prevents internal access
- **Rate limiting** - Prevents abuse and DoS
- **Approval workflow** - Human oversight for risky operations

## License

MIT
