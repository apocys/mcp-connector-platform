import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const CreateTokenSchema = z.object({
  connectorId: z.string().uuid(),
  name: z.string().optional(),
  expiresIn: z.number().optional(), // days
});

/**
 * GET /api/tokens
 * List MCP tokens
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch tokens from database
    res.json({
      tokens: [
        {
          id: 'token-1',
          connectorId: 'connector-1',
          name: 'Production Token',
          token: 'mcp_***...***', // Masked
          isActive: true,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsedAt: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/tokens
 * Issue new MCP token (Point 7)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateTokenSchema.parse(req.body);

    // Generate token
    const token = `mcp_${crypto.randomBytes(32).toString('hex')}`;

    // TODO: Store token in database
    // TODO: Associate with connector

    res.json({
      id: 'token-new',
      connectorId: input.connectorId,
      name: input.name || 'New Token',
      token, // Only shown once
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 24 * 60 * 60 * 1000).toISOString()
        : null,
      message: 'Token created successfully. Store it securely - it will not be shown again.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /api/tokens/:id
 * Revoke token (Point 7)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: Mark token as inactive in database

    res.json({
      id,
      status: 'revoked',
      message: 'Token revoked successfully',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
