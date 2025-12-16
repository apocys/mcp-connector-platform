import { pgTable, text, varchar, timestamp, integer, boolean, json, serial, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users and Organizations
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).notNull().default('member'), // admin, member
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Connectors (Point 6: Data to store)
export const connectors = pgTable('connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  baseUrl: varchar('base_url', { length: 1024 }).notNull(),
  authType: varchar('auth_type', { length: 50 }).notNull(), // 'api_key', 'bearer_token'
  authHeaderName: varchar('auth_header_name', { length: 255 }).default('Authorization'),
  encryptedAuthSecret: text('encrypted_auth_secret').notNull(),
  openApiSpec: json('openapi_spec').notNull(), // Full OpenAPI spec
  selectedEndpoints: json('selected_endpoints').notNull().default('[]'), // Array of endpoint paths
  toolDefinitions: json('tool_definitions').notNull().default('{}'), // Generated MCP tools
  deploymentStatus: varchar('deployment_status', { length: 50 }).default('draft'), // draft, deployed, failed
  deployedUrl: varchar('deployed_url', { length: 1024 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('connectors_org_idx').on(table.organizationId),
}));

// Governance Configuration (Point 6: Data to store)
export const governanceConfigs = pgTable('governance_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id),
  
  // Endpoint allowlist
  allowedVerbs: json('allowed_verbs').notNull().default('["GET"]'), // Array of HTTP verbs
  allowedPaths: json('allowed_paths').notNull().default('[]'), // Array of path patterns
  
  // Rate limits
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
  
  // Numeric ceilings
  numericCeilings: json('numeric_ceilings').notNull().default('{}'), // { "amount": 10000, "qty": 1000 }
  
  // Approval mode
  requireApprovalForWrites: boolean('require_approval_for_writes').default(true),
  requireApprovalForHighRisk: boolean('require_approval_for_high_risk').default(true),
  
  // Kill switch
  enabled: boolean('enabled').default(true),
  
  // Safe mode
  dryRunMode: boolean('dry_run_mode').default(false),
  
  // Response redaction
  redactSensitiveFields: boolean('redact_sensitive_fields').default(true),
  
  // AI Reviewer configuration (Point 12)
  aiReviewerEnabled: boolean('ai_reviewer_enabled').default(true),
  aiReviewerMode: varchar('ai_reviewer_mode', { length: 50 }).default('ENFORCING'), // ADVISORY, ENFORCING
  aiReviewerWriteCallsOnly: boolean('ai_reviewer_write_calls_only').default(true),
  aiReviewerHighRiskOnly: boolean('ai_reviewer_high_risk_only').default(true),
  aiReviewerTimeoutMs: integer('ai_reviewer_timeout_ms').default(2000),
  aiReviewerFallback: varchar('ai_reviewer_fallback', { length: 50 }).default('REQUIRE_HUMAN_APPROVAL'),
  aiReviewerAllowMaxRisk: integer('ai_reviewer_allow_max_risk').default(30),
  aiReviewerApprovalMinRisk: integer('ai_reviewer_approval_min_risk').default(31),
  aiReviewerBlockMinRisk: integer('ai_reviewer_block_min_risk').default(71),
  aiReviewerAllowedBusinessPurpose: text('ai_reviewer_allowed_business_purpose'),
  aiReviewerForbiddenActions: text('ai_reviewer_forbidden_actions'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// MCP Tokens (Point 7: Key APIs)
export const mcpTokens = pgTable('mcp_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  connectorIdx: index('tokens_connector_idx').on(table.connectorId),
}));

// Invocation Logs (Point 6: Data to store)
export const invocationLogs = pgTable('invocation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id),
  tokenId: uuid('token_id').references(() => mcpTokens.id),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 1024 }).notNull(),
  
  // Decision tracking
  deterministicDecision: varchar('deterministic_decision', { length: 50 }).notNull(), // allowed, blocked, pending
  reviewerDecision: varchar('reviewer_decision', { length: 50 }), // ALLOW, REQUIRE_HUMAN_APPROVAL, BLOCK
  reviewerRiskScore: integer('reviewer_risk_score'),
  reviewerReasons: json('reviewer_reasons'),
  finalDecision: varchar('final_decision', { length: 50 }).notNull(),
  
  // Approval tracking
  approvalId: uuid('approval_id').references(() => approvals.id),
  humanApproved: boolean('human_approved').default(false),
  
  // Performance metrics
  reviewLatencyMs: integer('review_latency_ms'),
  executionLatencyMs: integer('execution_latency_ms'),
  
  // Request/response (redacted)
  requestPayload: json('request_payload'),
  responsePayload: json('response_payload'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  connectorIdx: index('logs_connector_idx').on(table.connectorId),
  createdAtIdx: index('logs_created_at_idx').on(table.createdAt),
}));

// Approvals (Point 6: Data to store)
export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id),
  requestId: varchar('request_id', { length: 255 }).notNull(),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 1024 }).notNull(),
  
  // Request details
  arguments: json('arguments').notNull(),
  reviewerDecision: varchar('reviewer_decision', { length: 50 }),
  reviewerRiskScore: integer('reviewer_risk_score'),
  reviewerReasons: json('reviewer_reasons'),
  
  // Approval status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected
  approverId: uuid('approver_id').references(() => users.id),
  approvalNotes: text('approval_notes'),
  decisionTime: timestamp('decision_time'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  connectorIdx: index('approvals_connector_idx').on(table.connectorId),
  statusIdx: index('approvals_status_idx').on(table.status),
}));

// Deployments
export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id),
  version: integer('version').notNull().default(1),
  status: varchar('status', { length: 50 }).notNull(), // pending, active, failed
  mcpUrl: varchar('mcp_url', { length: 1024 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  connectorIdx: index('deployments_connector_idx').on(table.connectorId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizations),
  organizationMembers: many(organizationMembers),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  connectors: many(connectors),
}));

export const connectorsRelations = relations(connectors, ({ one, many }) => ({
  organization: one(organizations, { fields: [connectors.organizationId], references: [organizations.id] }),
  governance: one(governanceConfigs),
  tokens: many(mcpTokens),
  logs: many(invocationLogs),
  approvals: many(approvals),
  deployments: many(deployments),
}));
