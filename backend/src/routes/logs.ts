import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const LogsQuerySchema = z.object({
  connectorId: z.string().uuid().optional(),
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  decision: z.enum(['allowed', 'blocked', 'pending']).optional(),
});

/**
 * GET /api/logs
 * List invocation logs (Point 7)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = LogsQuerySchema.parse(req.query);

    // TODO: Fetch logs from database with filters
    res.json({
      logs: [
        {
          id: 'log-1',
          connectorId: 'connector-1',
          toolName: 'list_invoices',
          method: 'GET',
          path: '/v1/invoices',
          deterministicDecision: 'allowed',
          reviewerDecision: 'ALLOW',
          reviewerRiskScore: 15,
          finalDecision: 'allowed',
          humanApproved: false,
          reviewLatencyMs: 250,
          executionLatencyMs: 450,
          errorCode: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log-2',
          connectorId: 'connector-1',
          toolName: 'create_invoice',
          method: 'POST',
          path: '/v1/invoices',
          deterministicDecision: 'allowed',
          reviewerDecision: 'REQUIRE_HUMAN_APPROVAL',
          reviewerRiskScore: 45,
          finalDecision: 'pending',
          humanApproved: false,
          reviewLatencyMs: 280,
          executionLatencyMs: null,
          errorCode: null,
          errorMessage: null,
          createdAt: new Date(Date.now() - 60000).toISOString(),
        },
      ],
      total: 2,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/logs/:id
 * Get detailed log entry
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Fetch detailed log from database
    res.json({
      id,
      connectorId: 'connector-1',
      toolName: 'create_invoice',
      method: 'POST',
      path: '/v1/invoices',
      deterministicDecision: 'allowed',
      reviewerDecision: 'REQUIRE_HUMAN_APPROVAL',
      reviewerRiskScore: 45,
      reviewerReasons: [
        'High-impact write operation',
        'Large numeric value (amount: 5000)',
        'Payment-related endpoint',
      ],
      finalDecision: 'pending',
      humanApproved: false,
      approvalId: 'approval-1',
      reviewLatencyMs: 280,
      executionLatencyMs: null,
      requestPayload: {
        amount: 5000,
        currency: 'USD',
        description: '[REDACTED]', // Sensitive fields redacted
      },
      responsePayload: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
