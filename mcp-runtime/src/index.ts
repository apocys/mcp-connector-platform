import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.MCP_RUNTIME_PORT || 4000;

app.use(cors());
app.use(express.json());

// Types
interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

interface ConnectorConfig {
  id: string;
  baseUrl: string;
  authType: string;
  authSecret: string;
  tools: MCPTool[];
  governance: {
    allowedVerbs: string[];
    rateLimitPerMinute: number;
  };
}

// In-memory connector store (replace with DB in production)
const connectors = new Map<string, ConnectorConfig>();

/**
 * MCP Protocol: List available tools
 */
app.post('/mcp/tools/list', (req, res) => {
  try {
    const { connectorId } = req.body;
    const connector = connectors.get(connectorId);

    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    res.json({
      tools: connector.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * MCP Protocol: Call a tool
 * This is where governance checks and AI review happen
 */
app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { connectorId, toolName, arguments: toolArguments } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    // Validate connector
    const connector = connectors.get(connectorId);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // Validate token
    if (!authToken || authToken !== process.env[`TOKEN_${connectorId}`]) {
      return res.status(401).json({ error: 'Invalid or missing token' });
    }

    // Find tool
    const tool = connector.tools.find(t => t.name === toolName);
    if (!tool) {
      return res.status(404).json({ error: `Tool ${toolName} not found` });
    }

    // Validate input schema
    const schemaValidation = validateSchema(toolArguments, tool.inputSchema);
    if (!schemaValidation.valid) {
      return res.status(400).json({ error: schemaValidation.error });
    }

    // TODO: Run governance checks
    // TODO: Run AI Reviewer if enabled
    // TODO: Check approval queue if needed

    // Call upstream API
    const upstreamResponse = await callUpstreamAPI(
      connector,
      tool,
      toolArguments
    );

    // TODO: Log the invocation
    // TODO: Redact sensitive fields

    res.json({
      result: upstreamResponse,
      metadata: {
        toolName,
        connectorId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Tool call error:', error);
    res.status(500).json({
      error: (error as Error).message,
      code: 'TOOL_EXECUTION_ERROR',
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Register a connector (called by control plane)
 */
app.post('/internal/connectors/register', (req, res) => {
  try {
    const { id, baseUrl, authType, authSecret, tools, governance } = req.body;

    connectors.set(id, {
      id,
      baseUrl,
      authType,
      authSecret,
      tools,
      governance,
    });

    res.json({
      id,
      status: 'registered',
      mcpUrl: `${process.env.MCP_RUNTIME_URL || 'http://localhost:4000'}/mcp/${id}`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Validate input against schema
 */
function validateSchema(
  input: any,
  schema: Record<string, any>
): { valid: boolean; error?: string } {
  try {
    if (schema.type === 'object' && typeof input !== 'object') {
      return { valid: false, error: 'Input must be an object' };
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in input)) {
          return { valid: false, error: `Missing required field: ${field}` };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

/**
 * Call upstream API
 */
async function callUpstreamAPI(
  connector: ConnectorConfig,
  tool: MCPTool,
  arguments_: Record<string, any>
): Promise<any> {
  try {
    // Extract HTTP method and path from tool
    const method = tool.name.split('_')[0].toUpperCase(); // Simplified
    const path = arguments_.path || '/'; // Would be extracted from tool metadata

    // Build request
    const url = `${connector.baseUrl}${path}`;
    const headers: Record<string, string> = {};

    // Add authentication
    if (connector.authType === 'bearer_token') {
      headers.Authorization = `Bearer ${connector.authSecret}`;
    } else if (connector.authType === 'api_key') {
      headers['X-API-Key'] = connector.authSecret;
    }

    // Make request
    const response = await axios({
      method: method as any,
      url,
      data: arguments_,
      headers,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Upstream API error: ${error.response?.status} ${error.message}`);
    }
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`MCP Runtime listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
