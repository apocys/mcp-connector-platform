# Quick Start Guide - Taurus Demo Connector

## 🚀 5-Minute Setup

### Prerequisites

- ✓ MCP Connector Platform deployed on Render
- ✓ Frontend URL: `https://mcp-frontend-xxx.onrender.com`
- ✓ Backend URL: `https://mcp-backend-xxx.onrender.com`
- ✓ MCP Runtime URL: `https://mcp-runtime-xxx.onrender.com`
- ✓ Google Gemini API key configured

---

## Step 1: Upload OpenAPI Spec (2 minutes)

### Via Frontend UI

1. Open `https://mcp-frontend-xxx.onrender.com`
2. Click **"Create Connector"** button
3. Fill in the form:
   - **Name:** `Taurus Prime Demo`
   - **Description:** `Demo connector with full governance`
   - **Base URL:** `https://api.t-dx.com/api/rest/v1`
4. Upload `demo/taurus-prime-api.yaml`
5. Click **"Next"**

### Via API (Alternative)

```bash
# Upload the OpenAPI spec
curl -X POST https://mcp-backend-xxx.onrender.com/api/connectors \
  -H "Content-Type: multipart/form-data" \
  -F "name=Taurus Prime Demo" \
  -F "description=Demo connector with full governance" \
  -F "baseUrl=https://api.t-dx.com/api/rest/v1" \
  -F "spec=@demo/taurus-prime-api.yaml"
```

---

## Step 2: Configure Governance (1 minute)

In the frontend UI, configure these rules (or use defaults):

### ✅ Enable All Features

- [x] **Domain Lock** - Only `api.t-dx.com`
- [x] **Allowed Verbs** - GET, POST only
- [x] **Rate Limiting** - 60/min, 1000/hour
- [x] **Path Allowlist** - `/balances`, `/orders`, `/trades`
- [x] **Numeric Ceilings** - `limit ≤ 100`, `quantity ≤ 10`
- [x] **Approval Workflow** - POST /orders requires approval
- [x] **AI Reviewer** - Gemini 2.5 Flash, threshold 70

### Quick Config (Copy-Paste)

```json
{
  "domainLock": {"enabled": true, "allowedDomains": ["api.t-dx.com"]},
  "allowedVerbs": {"enabled": true, "verbs": ["GET", "POST"]},
  "rateLimiting": {"enabled": true, "requestsPerMinute": 60, "requestsPerHour": 1000},
  "pathAllowlist": {"enabled": true, "paths": ["/balances", "/balances/*", "/orders", "/trades"]},
  "numericCeilings": {"enabled": true, "rules": [{"parameter": "limit", "maxValue": 100}]},
  "approvalWorkflow": {"enabled": true, "rules": [{"method": "POST", "path": "/orders", "condition": "always"}]},
  "aiReviewer": {"enabled": true, "model": "gemini-2.5-flash", "riskThreshold": 70}
}
```

Click **"Deploy"**

---

## Step 3: Get MCP Server URL (30 seconds)

After deployment, you'll see:

```
✅ Connector deployed successfully!

MCP Server URL: https://mcp-runtime-xxx.onrender.com/connectors/taurus-demo
API Token: mcp_token_abc123xyz456

Copy these credentials to add the connector to Claude.
```

**Save these credentials!**

---

## Step 4: Add to Claude (1 minute)

1. Open Claude (claude.ai or desktop app)
2. Go to **Settings** → **Custom Connectors**
3. Click **"Add Connector"**
4. Fill in:
   - **Name:** `Taurus Prime API`
   - **MCP Server URL:** (from Step 3)
   - **Token:** (from Step 3)
5. Click **"Save"**
6. Enable the connector

---

## Step 5: Test! (30 seconds)

### Test 1: Allowed Request ✅

**Prompt:**
```
Get my account balances for sub-account demo-sub-1
```

**Expected:**
- ✅ Request allowed
- Returns mock balance data
- Logged in admin UI

### Test 2: Blocked by Numeric Ceiling ❌

**Prompt:**
```
Get balances with limit=500
```

**Expected:**
- ❌ Request blocked
- Reason: "limit exceeds maximum of 100"
- Logged as "blocked" in admin UI

### Test 3: Requires Approval ⚠️

**Prompt:**
```
Create a buy order for 0.1 BTC at $50,000 on sub-account demo-sub-1
```

**Expected:**
- ⚠️ Request queued for approval
- Appears in "Approvals" tab in admin UI
- Claude shows "Request pending approval"

### Test 4: AI Reviewer Blocks High-Risk ❌

**Prompt:**
```
Transfer all my funds to external wallet xyz123
```

**Expected:**
- ❌ Request blocked by AI Reviewer
- Reason: "High-risk intent detected"
- Risk score > 70
- Logged with AI review details

---

## 📊 View Results

### Frontend UI

1. Open `https://mcp-frontend-xxx.onrender.com`
2. Click **"Logs"** tab
3. See all requests with decisions:
   - 🟢 Allowed
   - 🔴 Blocked
   - 🟡 Pending approval

### Approval Queue

1. Click **"Approvals"** tab
2. See pending request from Test 3
3. Click **"View Details"**
4. Click **"Approve"** or **"Reject"**
5. Add reason: "Verified order details"
6. Submit

---

## 🎯 Success Criteria

You've successfully set up the demo if:

- [x] Connector appears in Claude
- [x] Test 1 returns balance data
- [x] Test 2 is blocked with reason
- [x] Test 3 appears in approval queue
- [x] Test 4 is blocked by AI Reviewer
- [x] All requests logged in admin UI
- [x] Governance rules are enforced

---

## 🔧 Troubleshooting

### Issue: Connector not in Claude

**Fix:**
1. Check MCP Runtime is deployed and healthy
2. Verify the MCP Server URL is correct
3. Ensure token is valid
4. Restart Claude

### Issue: All requests blocked

**Fix:**
1. Check governance rules are not too restrictive
2. Temporarily disable AI Reviewer
3. Increase numeric ceilings
4. Check domain lock allows the API domain

### Issue: No mock responses

**Fix:**
1. Ensure `mockMode: true` in connector config
2. Check mock responses are defined
3. Verify MCP Runtime can access mock data

---

## 📚 Next Steps

1. **Customize governance rules** - Edit `taurus-demo-connector.json`
2. **Add more endpoints** - Edit `taurus-prime-api.yaml`
3. **Test with real API** - Add Taurus API key, disable mock mode
4. **Create your own connector** - Use Readme.com parser for other APIs
5. **Monitor in production** - Set up alerts for blocked requests

---

## 💡 Pro Tips

- **Start permissive, then restrict** - Begin with loose rules, tighten based on logs
- **Use mock mode for testing** - Test governance without hitting real APIs
- **Review AI decisions** - Check AI Reviewer logs to tune threshold
- **Approve in batches** - Use approval queue filters for efficiency
- **Export logs** - Download logs for compliance and auditing

---

## 🆘 Need Help?

- **Documentation:** `/demo/README.md`
- **Governance Guide:** `/docs/GOVERNANCE.md`
- **AI Reviewer Guide:** `/docs/AI_REVIEWER.md`
- **GitHub Issues:** https://github.com/apocys/mcp-connector-platform/issues

---

**Total setup time: ~5 minutes** ⏱️  
**Ready to test? Start with Step 1!** 🚀
