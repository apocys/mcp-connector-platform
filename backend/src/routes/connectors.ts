import { Router } from 'express';
import { OpenAPIParser } from '../utils/openApiParser.js';
import { GovernanceEngine } from '../utils/governanceEngine.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CreateConnectorSchema = z.object({
  name: z.string().min(1),
  openApiUrl: z.string().url().optional(),
  openApiContent: z.string().optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['api_key', 'bearer_token']),
  authSecret: z.string().min(1),
});

const UpdateEndpointsSchema = z.object({
  selectedEndpoints: z.array(z.string()),
});

const UpdateGovernanceSchema = z.object({
  allowedVerbs: z.array(z.string()).optional(),
  allowedPaths: z.array(z.string()).optional(),
  rateLimitPerMinute: z.number().optional(),
  numericCeilings: z.record(z.number()).optional(),
  requireApprovalForWrites: z.boolean().optional(),
  requireApprovalForHighRisk: z.boolean().optional(),
  aiReviewerEnabled: z.boolean().optional(),
  aiReviewerMode: z.enum(['ADVISORY', 'ENFORCING']).optional(),
  aiReviewerTimeoutMs: z.number().optional(),
});

/**
 * POST /api/connectors
 * Create connector from OpenAPI spec (Point 7)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateConnectorSchema.parse(req.body);

    // Parse OpenAPI spec
    let spec;
    if (input.openApiUrl) {
      spec = await OpenAPIParser.parseSpec(input.openApiUrl);
    } else if (input.openApiContent) {
      spec = await OpenAPIParser.parseSpec(input.openApiContent);
    } else {
      return res.status(400).json({ error: 'Either openApiUrl or openApiContent required' });
    }

    // Extract endpoints
    const endpoints = OpenAPIParser.extractEndpoints(spec);

    // Auto-detect base URL if not provided
    const baseUrl = input.baseUrl || OpenAPIParser.extractBaseUrl(spec);
    if (!baseUrl) {
      return res.status(400).json({ error: 'Could not determine base URL' });
    }

    // Generate MCP tools
    const tools = endpoints.map(endpoint => OpenAPIParser.generateMCPTool(endpoint, baseUrl));

    // TODO: Store connector in database
    // For now, return preview
    res.json({
      id: 'temp-id',
      name: input.name,
      baseUrl,
      endpoints: endpoints.map(e => ({
        path: e.path,
        method: e.method,
        summary: e.summary,
        category: e.category,
        dangerScore: OpenAPIParser.calculateDangerScore(e),
      })),
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        dangerTags: t.dangerTags,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/connectors/:id/preview
 * Preview generated tools (Point 7)
 */
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Fetch connector from database
    // For now, return mock data
    res.json({
      id,
      tools: [
        {
          name: 'list_items',
          description: 'List all items',
          category: 'READ',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Maximum items to return' },
              offset: { type: 'integer', description: 'Pagination offset' },
            },
          },
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /api/connectors/:id/endpoints
 * Update endpoint selection (Point 7)
 */
router.patch('/:id/endpoints', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = UpdateEndpointsSchema.parse(req.body);

    // TODO: Update connector endpoints in database
    res.json({
      id,
      selectedEndpoints: input.selectedEndpoints,
      message: 'Endpoints updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /api/connectors/:id/governance
 * Update governance rules (Point 7)
 */
router.patch('/:id/governance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = UpdateGovernanceSchema.parse(req.body);

    // TODO: Update governance config in database
    res.json({
      id,
      governance: {
        allowedVerbs: input.allowedVerbs || ['GET'],
        allowedPaths: input.allowedPaths || [],
        rateLimitPerMinute: input.rateLimitPerMinute || 60,
        requireApprovalForWrites: input.requireApprovalForWrites ?? true,
        requireApprovalForHighRisk: input.requireApprovalForHighRisk ?? true,
        aiReviewerEnabled: input.aiReviewerEnabled ?? true,
        aiReviewerMode: input.aiReviewerMode || 'ENFORCING',
        aiReviewerTimeoutMs: input.aiReviewerTimeoutMs || 2000,
      },
      message: 'Governance rules updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/connectors/:id/deploy
 * Deploy connector (Point 7)
 */
router.post('/:id/deploy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Trigger deployment to MCP runtime
    const mcpUrl = `https://mcp.example.com/${id}`;
    const token = `mcp_${Math.random().toString(36).substring(2, 15)}`;

    res.json({
      id,
      status: 'deployed',
      mcpUrl,
      token,
      message: 'Connector deployed successfully',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
