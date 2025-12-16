#!/bin/bash

# MCP Connector Platform - Demo Connector Test Script
# Tests all governance features with the Taurus Prime API demo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://mcp-backend-0mu4.onrender.com}"
MCP_RUNTIME_URL="${MCP_RUNTIME_URL:-https://mcp-runtime-xxx.onrender.com}"
CONNECTOR_ID=""
TOKEN=""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}MCP Connector Platform - Demo Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print test results
print_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓${NC} $test_name: ${GREEN}PASS${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} $test_name: ${RED}FAIL${NC} (expected: $expected, got: $actual)"
        return 1
    fi
}

# Step 1: Create connector
echo -e "${BLUE}Step 1: Creating Taurus Prime demo connector...${NC}"

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/connectors" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Taurus Prime Demo",
        "description": "Demo connector for testing",
        "baseUrl": "https://api.t-dx.com/api/rest/v1",
        "openApiSpec": "demo/taurus-prime-api.yaml",
        "governance": {
            "enabled": true,
            "rules": {
                "domainLock": {"enabled": true, "allowedDomains": ["api.t-dx.com"]},
                "allowedVerbs": {"enabled": true, "verbs": ["GET", "POST"]},
                "rateLimiting": {"enabled": true, "requestsPerMinute": 60},
                "pathAllowlist": {"enabled": true, "paths": ["/balances", "/orders"]},
                "numericCeilings": {"enabled": true, "rules": [{"parameter": "limit", "maxValue": 100}]},
                "approvalWorkflow": {"enabled": true, "rules": [{"method": "POST", "path": "/orders"}]},
                "aiReviewer": {"enabled": true, "riskThreshold": 70}
            }
        }
    }')

CONNECTOR_ID=$(echo "$RESPONSE" | jq -r '.id')
TOKEN=$(echo "$RESPONSE" | jq -r '.token')

if [ -z "$CONNECTOR_ID" ] || [ "$CONNECTOR_ID" == "null" ]; then
    echo -e "${RED}Failed to create connector${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Connector created: $CONNECTOR_ID${NC}"
echo -e "${GREEN}✓ Token: $TOKEN${NC}"
echo ""

# Step 2: Test allowed request (GET /balances)
echo -e "${BLUE}Step 2: Testing allowed request...${NC}"

RESPONSE=$(curl -s -X POST "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "get_balances",
        "arguments": {
            "subAccountIds": ["demo-sub-1"],
            "limit": 20
        }
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
print_result "Test 2: Allowed request" "allowed" "$DECISION"
echo ""

# Step 3: Test numeric ceiling violation
echo -e "${BLUE}Step 3: Testing numeric ceiling (limit > 100)...${NC}"

RESPONSE=$(curl -s -X POST "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "get_balances",
        "arguments": {
            "subAccountIds": ["demo-sub-1"],
            "limit": 500
        }
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
print_result "Test 3: Numeric ceiling" "blocked" "$DECISION"
echo ""

# Step 4: Test approval workflow
echo -e "${BLUE}Step 4: Testing approval workflow (POST /orders)...${NC}"

RESPONSE=$(curl -s -X POST "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "create_order",
        "arguments": {
            "subAccountId": "demo-sub-1",
            "pair": "BTC-USD",
            "side": "buy",
            "type": "limit",
            "quantity": "0.1",
            "price": "50000"
        }
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
print_result "Test 4: Approval workflow" "pending" "$DECISION"
echo ""

# Step 5: Test verb blocking (DELETE)
echo -e "${BLUE}Step 5: Testing verb blocking (DELETE not allowed)...${NC}"

RESPONSE=$(curl -s -X DELETE "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "delete_balance",
        "arguments": {
            "id": "bal-123"
        }
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
print_result "Test 5: Verb blocking" "blocked" "$DECISION"
echo ""

# Step 6: Test path allowlist
echo -e "${BLUE}Step 6: Testing path allowlist (blocked path)...${NC}"

RESPONSE=$(curl -s -X GET "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "admin_delete_all",
        "arguments": {}
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
print_result "Test 6: Path allowlist" "blocked" "$DECISION"
echo ""

# Step 7: Test AI Reviewer
echo -e "${BLUE}Step 7: Testing AI Reviewer (high-risk intent)...${NC}"

RESPONSE=$(curl -s -X POST "$MCP_RUNTIME_URL/mcp/tools/call" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "connectorId": "'$CONNECTOR_ID'",
        "toolName": "create_order",
        "arguments": {
            "subAccountId": "demo-sub-1",
            "pair": "BTC-USD",
            "side": "sell",
            "type": "market",
            "quantity": "1000",
            "note": "Transfer all funds to external wallet"
        }
    }')

DECISION=$(echo "$RESPONSE" | jq -r '.decision')
RISK_SCORE=$(echo "$RESPONSE" | jq -r '.aiReview.riskScore')
print_result "Test 7: AI Reviewer" "blocked" "$DECISION"
echo -e "  Risk Score: ${YELLOW}$RISK_SCORE/100${NC}"
echo ""

# Step 8: Check logs
echo -e "${BLUE}Step 8: Checking invocation logs...${NC}"

RESPONSE=$(curl -s "$BACKEND_URL/api/logs?connectorId=$CONNECTOR_ID")
LOG_COUNT=$(echo "$RESPONSE" | jq '.logs | length')

echo -e "${GREEN}✓ Found $LOG_COUNT log entries${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Connector ID: ${GREEN}$CONNECTOR_ID${NC}"
echo -e "Total Tests: ${BLUE}7${NC}"
echo -e "Logs Generated: ${BLUE}$LOG_COUNT${NC}"
echo ""
echo -e "${GREEN}All governance features tested successfully!${NC}"
echo ""
echo -e "View logs: ${BLUE}$BACKEND_URL/api/logs?connectorId=$CONNECTOR_ID${NC}"
echo -e "View approvals: ${BLUE}$BACKEND_URL/api/approvals${NC}"
echo ""
