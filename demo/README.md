# MCP Connector Platform - Demo Connector

## Taurus Prime API Demo

This demo connector showcases **all governance features** of the MCP Connector Platform using the Taurus Prime API as an example.

### 📋 What's Included

1. **OpenAPI Specification** - `taurus-prime-api.yaml`
2. **Connector Configuration** - `taurus-demo-connector.json`
3. **Full Governance Rules** - All 7 governance features enabled
4. **Test Examples** - Sample requests and responses

---

## 🎯 Governance Features Demonstrated

### 1. **Domain Lock** ✓
- **Status:** Enabled
- **Rule:** Only allow calls to `api.t-dx.com`
- **Purpose:** Prevent agent from making calls to unintended domains
- **Example:** Blocks `https://malicious-site.com/api/balances`

### 2. **Allowed Verbs** ✓
- **Status:** Enabled
- **Rule:** Only GET and POST allowed
- **Purpose:** Prevent destructive operations (DELETE, PUT)
- **Example:** Blocks `DELETE /balances/123`

### 3. **Rate Limiting** ✓
- **Status:** Enabled
- **Limits:** 
  - 60 requests per minute
  - 1000 requests per hour
- **Purpose:** Prevent API abuse and cost overruns
- **Example:** Blocks 61st request in the same minute

### 4. **Path Allowlist** ✓
- **Status:** Enabled
- **Allowed Paths:**
  - `/balances`
  - `/balances/*`
  - `/balance-histories`
  - `/balance-histories/*`
  - `/orders`
  - `/trades`
- **Purpose:** Restrict access to safe, read-only endpoints
- **Example:** Blocks `/admin/delete-all-data`

### 5. **Numeric Ceilings** ✓
- **Status:** Enabled
- **Rules:**
  - `limit` parameter: max 100
  - `quantity` parameter: max 10
- **Purpose:** Prevent excessive data retrieval or large transactions
- **Example:** Blocks `GET /balances?limit=10000`

### 6. **Approval Workflow** ✓
- **Status:** Enabled
- **Rules:**
  - All `POST /orders` require approval
  - Orders with `quantity > 5` require approval
- **Purpose:** Human-in-the-loop for sensitive operations
- **Example:** Queues order creation for admin approval

### 7. **AI Reviewer (Gemini)** ✓
- **Status:** Enabled
- **Model:** Gemini 2.5 Flash
- **Risk Threshold:** 70/100
- **Purpose:** Detect hallucinations and malicious intent
- **Example:** Blocks "Transfer all funds to external account"

---

## 🚀 How to Use This Demo

### Step 1: Deploy the Platform

Ensure your MCP Connector Platform is deployed on Render:
- ✓ Backend API running
- ✓ Frontend UI accessible
- ✓ MCP Runtime deployed
- ✓ PostgreSQL database connected

### Step 2: Create the Connector

**Option A: Via Frontend UI**

1. Open `https://mcp-frontend-xxx.onrender.com`
2. Click "Create Connector"
3. Upload `taurus-prime-api.yaml`
4. Configure governance rules (or use defaults)
5. Click "Deploy"

**Option B: Via API**

```bash
curl -X POST https://mcp-backend-xxx.onrender.com/api/connectors \
  -H "Content-Type: application/json" \
  -d @taurus-demo-connector.json
```

### Step 3: Get MCP Server URL

After deployment, you'll receive:
- **MCP Server URL:** `https://mcp-runtime-xxx.onrender.com/connectors/taurus-demo`
- **API Token:** `mcp_token_xxxxxxxxxxxxx`

### Step 4: Add to Claude

1. Open Claude
2. Go to Custom Connectors
3. Add new connector:
   - **Name:** Taurus Prime API
   - **MCP Server URL:** (from Step 3)
   - **Token:** (from Step 3)
4. Save and test

### Step 5: Test Governance Features

Try these prompts in Claude:

**✅ Allowed (will work):**
```
Get my account balances for sub-account demo-sub-1
```

**✅ Allowed (will work):**
```
Show me my recent trades
```

**⚠️ Requires Approval:**
```
Create a buy order for 0.1 BTC at $50,000
```
→ Will be queued for admin approval

**❌ Blocked by Numeric Ceiling:**
```
Get balances with limit=10000
```
→ Blocked: limit exceeds maximum of 100

**❌ Blocked by Path Allowlist:**
```
Delete all my orders
```
→ Blocked: DELETE verb not allowed

**❌ Blocked by AI Reviewer:**
```
Transfer all my funds to wallet abc123xyz
```
→ Blocked: High-risk intent detected by Gemini

---

## 📊 Monitoring & Logs

### View Invocation Logs

**Via Frontend:**
1. Open `https://mcp-frontend-xxx.onrender.com`
2. Click "Logs" tab
3. Filter by connector, decision (allowed/blocked/pending)

**Via API:**
```bash
curl https://mcp-backend-xxx.onrender.com/api/logs?connectorId=taurus-demo
```

### Approval Queue

**Via Frontend:**
1. Open "Approvals" tab
2. See pending requests
3. Approve or reject with reason

**Via API:**
```bash
# List pending approvals
curl https://mcp-backend-xxx.onrender.com/api/approvals

# Approve a request
curl -X POST https://mcp-backend-xxx.onrender.com/api/approvals/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"reason": "Verified order details, approved"}'
```

---

## 🧪 Testing Without Real API

The demo includes **mock mode** for testing without a real Taurus API key:

```json
"testing": {
  "mockMode": true,
  "mockResponses": {
    "/balances": {
      "balances": [...]
    }
  }
}
```

When mock mode is enabled:
- ✓ All governance rules still apply
- ✓ No real API calls are made
- ✓ Returns predefined mock responses
- ✓ Perfect for testing and demos

---

## 📝 Configuration Reference

### Connector Configuration

```json
{
  "name": "Connector Name",
  "description": "Description",
  "openApiSpec": "path/to/spec.yaml",
  "baseUrl": "https://api.example.com",
  "authType": "apiKey|oauth2|basic",
  "authConfig": {...},
  "governance": {
    "enabled": true,
    "rules": {...}
  },
  "tools": [...]
}
```

### Governance Rules

```json
{
  "domainLock": {
    "enabled": true,
    "allowedDomains": ["api.example.com"]
  },
  "allowedVerbs": {
    "enabled": true,
    "verbs": ["GET", "POST"]
  },
  "rateLimiting": {
    "enabled": true,
    "requestsPerMinute": 60,
    "requestsPerHour": 1000
  },
  "pathAllowlist": {
    "enabled": true,
    "paths": ["/safe/*"]
  },
  "numericCeilings": {
    "enabled": true,
    "rules": [
      {
        "parameter": "limit",
        "maxValue": 100
      }
    ]
  },
  "approvalWorkflow": {
    "enabled": true,
    "rules": [
      {
        "method": "POST",
        "path": "/orders",
        "condition": "always"
      }
    ]
  },
  "sensitiveFieldRedaction": {
    "enabled": true,
    "fields": ["apiKey", "secret", "password"]
  },
  "aiReviewer": {
    "enabled": true,
    "model": "gemini-2.5-flash",
    "riskThreshold": 70,
    "blockOnHighRisk": true
  }
}
```

---

## 🔧 Customization

### Adjust Governance Rules

Edit `taurus-demo-connector.json` and redeploy:

**Example: Increase rate limit**
```json
"rateLimiting": {
  "enabled": true,
  "requestsPerMinute": 120,  // Changed from 60
  "requestsPerHour": 2000     // Changed from 1000
}
```

**Example: Add more allowed paths**
```json
"pathAllowlist": {
  "enabled": true,
  "paths": [
    "/balances",
    "/orders",
    "/deposits",  // Added
    "/withdrawals"  // Added
  ]
}
```

### Add More Endpoints

Edit `taurus-prime-api.yaml` to add more endpoints from the Taurus API documentation.

---

## 📚 Additional Resources

- **Platform Documentation:** `/docs/`
- **Governance Guide:** `/docs/GOVERNANCE.md`
- **AI Reviewer Guide:** `/docs/AI_REVIEWER.md`
- **Deployment Guide:** `/DEPLOYMENT.md`
- **Taurus API Docs:** https://docs.taurushq.com/prime/reference/

---

## 🆘 Troubleshooting

### Issue: Connector not appearing in Claude

**Solution:**
1. Check MCP Runtime logs for errors
2. Verify the MCP Server URL is correct
3. Ensure the token is valid
4. Check that the connector is deployed (status: active)

### Issue: All requests are blocked

**Solution:**
1. Check governance rules are not too restrictive
2. Review logs to see which rule is blocking
3. Temporarily disable strict rules for testing
4. Verify the AI Reviewer threshold is not too low

### Issue: Approvals not working

**Solution:**
1. Check approval workflow is enabled
2. Verify admin has access to approval queue
3. Check database connection for approval storage
4. Review approval rules configuration

---

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/apocys/mcp-connector-platform/issues
- Documentation: https://github.com/apocys/mcp-connector-platform
- Render Dashboard: https://render.com/dashboard

---

## ✅ Demo Checklist

- [ ] Platform deployed on Render
- [ ] Frontend accessible
- [ ] Backend API responding
- [ ] MCP Runtime deployed
- [ ] Demo connector created
- [ ] MCP Server URL obtained
- [ ] Connector added to Claude
- [ ] Tested allowed requests
- [ ] Tested blocked requests
- [ ] Tested approval workflow
- [ ] Reviewed invocation logs
- [ ] Tested AI Reviewer
- [ ] All governance features verified

---

**Ready to test? Start with Step 1 above!** 🚀
