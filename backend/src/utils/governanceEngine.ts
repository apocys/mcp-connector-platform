import { MCPTool } from './openApiParser';

export interface GovernanceConfig {
  allowedVerbs: string[];
  allowedPaths: string[];
  rateLimitPerMinute: number;
  numericCeilings: Record<string, number>;
  requireApprovalForWrites: boolean;
  requireApprovalForHighRisk: boolean;
  enabled: boolean;
  dryRunMode: boolean;
  redactSensitiveFields: boolean;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  violations: string[];
}

export interface RateLimitState {
  requestCount: number;
  resetTime: number;
}

export class GovernanceEngine {
  private rateLimitMap = new Map<string, RateLimitState>();

  /**
   * Run all deterministic governance checks
   */
  checkGovernance(
    tool: MCPTool,
    arguments_: Record<string, any>,
    config: GovernanceConfig,
    baseUrl: string,
    rateLimitKey: string
  ): GovernanceCheckResult {
    const violations: string[] = [];

    // Check if connector is enabled
    if (!config.enabled) {
      return {
        allowed: false,
        reason: 'Connector is disabled',
        requiresApproval: false,
        violations: ['Connector disabled'],
      };
    }

    // Domain lock / SSRF protection
    const domainCheck = this.checkDomainLock(baseUrl);
    if (!domainCheck.allowed) {
      violations.push(domainCheck.reason);
    }

    // Rate limit check
    const rateLimitCheck = this.checkRateLimit(rateLimitKey, config.rateLimitPerMinute);
    if (!rateLimitCheck.allowed) {
      violations.push(rateLimitCheck.reason);
    }

    // Endpoint allowlist check
    const allowlistCheck = this.checkEndpointAllowlist(tool, config);
    if (!allowlistCheck.allowed) {
      violations.push(allowlistCheck.reason);
    }

    // JSON schema validation
    const schemaCheck = this.validateSchema(arguments_, tool.inputSchema);
    if (!schemaCheck.allowed) {
      violations.push(schemaCheck.reason);
    }

    // Numeric ceiling check
    const ceilingCheck = this.checkNumericCeilings(arguments_, config.numericCeilings);
    if (!ceilingCheck.allowed) {
      violations.push(ceilingCheck.reason);
    }

    // Determine if approval is needed
    let requiresApproval = false;
    if (config.requireApprovalForWrites && tool.category === 'WRITE') {
      requiresApproval = true;
    }
    if (config.requireApprovalForHighRisk && tool.category === 'DANGEROUS') {
      requiresApproval = true;
    }

    const allowed = violations.length === 0;

    return {
      allowed,
      reason: allowed ? 'All checks passed' : `Governance violations: ${violations.join('; ')}`,
      requiresApproval: allowed ? requiresApproval : false,
      violations,
    };
  }

  /**
   * Check domain lock to prevent SSRF
   */
  private checkDomainLock(baseUrl: string): { allowed: boolean; reason: string } {
    try {
      const url = new URL(baseUrl);
      const hostname = url.hostname;

      // Block private/internal IPs
      if (this.isPrivateIP(hostname)) {
        return {
          allowed: false,
          reason: `Domain lock violation: ${hostname} is a private IP`,
        };
      }

      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return {
          allowed: false,
          reason: 'Domain lock violation: localhost not allowed',
        };
      }

      return { allowed: true, reason: 'Domain lock passed' };
    } catch {
      return {
        allowed: false,
        reason: 'Invalid base URL format',
      };
    }
  }

  /**
   * Check if hostname is a private IP
   */
  private isPrivateIP(hostname: string): boolean {
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^fc00:/i,
      /^fd00:/i,
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(key: string, limitPerMinute: number): { allowed: boolean; reason: string } {
    const now = Date.now();
    const state = this.rateLimitMap.get(key) || { requestCount: 0, resetTime: now + 60000 };

    // Reset if time window has passed
    if (now > state.resetTime) {
      state.requestCount = 0;
      state.resetTime = now + 60000;
    }

    if (state.requestCount >= limitPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${limitPerMinute} requests per minute`,
      };
    }

    state.requestCount++;
    this.rateLimitMap.set(key, state);

    return {
      allowed: true,
      reason: `Rate limit check passed (${state.requestCount}/${limitPerMinute})`,
    };
  }

  /**
   * Check endpoint allowlist
   */
  private checkEndpointAllowlist(tool: MCPTool, config: GovernanceConfig): { allowed: boolean; reason: string } {
    // Check HTTP verb
    if (!config.allowedVerbs.includes(tool.method)) {
      return {
        allowed: false,
        reason: `HTTP method ${tool.method} not in allowlist: ${config.allowedVerbs.join(', ')}`,
      };
    }

    // Check path
    if (config.allowedPaths.length > 0) {
      const pathAllowed = config.allowedPaths.some(pattern => this.matchPath(tool.path, pattern));
      if (!pathAllowed) {
        return {
          allowed: false,
          reason: `Path ${tool.path} not in allowlist`,
        };
      }
    }

    return {
      allowed: true,
      reason: 'Endpoint allowlist check passed',
    };
  }

  /**
   * Match path against pattern (supports wildcards)
   */
  private matchPath(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Validate arguments against schema
   */
  private validateSchema(arguments_: Record<string, any>, schema: Record<string, any>): { allowed: boolean; reason: string } {
    try {
      // Basic type checking
      if (schema.type === 'object' && typeof arguments_ !== 'object') {
        return {
          allowed: false,
          reason: 'Arguments must be an object',
        };
      }

      // Check required fields
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (!(field in arguments_)) {
            return {
              allowed: false,
              reason: `Missing required field: ${field}`,
            };
          }
        }
      }

      // Check property types
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          if (key in arguments_) {
            const propSchema = value as any;
            const propValue = arguments_[key];

            if (!this.validateType(propValue, propSchema.type)) {
              return {
                allowed: false,
                reason: `Field ${key} has invalid type, expected ${propSchema.type}`,
              };
            }
          }
        }
      }

      return {
        allowed: true,
        reason: 'Schema validation passed',
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Schema validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate value type
   */
  private validateType(value: any, expectedType: string): boolean {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    return actualType === expectedType;
  }

  /**
   * Check numeric ceilings
   */
  private checkNumericCeilings(arguments_: Record<string, any>, ceilings: Record<string, number>): { allowed: boolean; reason: string } {
    const ceilingFields = ['amount', 'notional', 'qty', 'quantity', 'size'];

    for (const field of ceilingFields) {
      if (field in arguments_ && field in ceilings) {
        const value = arguments_[field];
        const ceiling = ceilings[field];

        if (typeof value === 'number' && value > ceiling) {
          return {
            allowed: false,
            reason: `Field ${field} value ${value} exceeds ceiling ${ceiling}`,
          };
        }
      }
    }

    return {
      allowed: true,
      reason: 'Numeric ceilings check passed',
    };
  }

  /**
   * Redact sensitive fields from payload
   */
  redactSensitiveFields(payload: Record<string, any>): Record<string, any> {
    const sensitivePatterns = ['api_key', 'secret', 'token', 'password', 'auth', 'credential'];
    const redacted = JSON.parse(JSON.stringify(payload));

    const redactRecursive = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redactRecursive(obj[key]);
        }
      }
    };

    redactRecursive(redacted);
    return redacted;
  }

  /**
   * Calculate risk score for tool invocation
   */
  calculateRiskScore(tool: MCPTool, arguments_: Record<string, any>): number {
    let score = 0;

    // Category scoring
    if (tool.category === 'DANGEROUS') score += 50;
    else if (tool.category === 'WRITE') score += 25;

    // Danger tags
    score += tool.dangerTags.length * 10;

    // Large numeric values
    const numericFields = ['amount', 'notional', 'qty', 'quantity', 'size'];
    for (const field of numericFields) {
      if (field in arguments_ && typeof arguments_[field] === 'number') {
        if (arguments_[field] > 100000) score += 15;
        else if (arguments_[field] > 10000) score += 10;
        else if (arguments_[field] > 1000) score += 5;
      }
    }

    // Cap at 100
    return Math.min(score, 100);
  }
}
