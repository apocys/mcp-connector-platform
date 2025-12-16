import { OpenAPI } from 'openapi-types';
import axios from 'axios';
import * as yaml from 'js-yaml';

export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: Record<string, any>[];
  requestBody?: Record<string, any>;
  responses: Record<string, any>;
  category: 'READ' | 'WRITE' | 'DANGEROUS';
  dangerTags: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  category: 'READ' | 'WRITE' | 'DANGEROUS';
  method: string;
  path: string;
  dangerTags: string[];
}

const DANGEROUS_KEYWORDS = [
  'transfer', 'withdraw', 'delete', 'trade', 'order', 'payment',
  'charge', 'refund', 'cancel', 'remove', 'destroy', 'purge',
  'execute', 'deploy', 'release', 'publish', 'submit'
];

const DANGEROUS_PATH_PATTERNS = [
  /transfer/i, /withdraw/i, /delete/i, /trade/i, /order/i, 
  /payment/i, /charge/i, /refund/i, /cancel/i, /execute/i
];

export class OpenAPIParser {
  /**
   * Parse OpenAPI spec from URL or file content
   */
  static async parseSpec(input: string | Record<string, any>): Promise<OpenAPI.Document> {
    let spec: any;

    if (typeof input === 'string') {
      // Try to parse as URL
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const response = await axios.get(input);
        spec = response.data;
      } else {
        // Try to parse as YAML/JSON string
        try {
          spec = JSON.parse(input);
        } catch {
          spec = yaml.load(input);
        }
      }
    } else {
      spec = input;
    }

    return spec as OpenAPI.Document;
  }

  /**
   * Extract all endpoints from OpenAPI spec
   */
  static extractEndpoints(spec: OpenAPI.Document): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];
    const paths = spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)?.[method];
        if (!operation) continue;

        const endpoint: ParsedEndpoint = {
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId || `${method}_${path.replace(/\//g, '_')}`,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
          category: this.categorizeEndpoint(method, path, operation),
          dangerTags: this.extractDangerTags(operation),
        };

        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  /**
   * Categorize endpoint as READ, WRITE, or DANGEROUS
   */
  private static categorizeEndpoint(method: string, path: string, operation: any): 'READ' | 'WRITE' | 'DANGEROUS' {
    // Check for dangerous patterns in path
    for (const pattern of DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(path)) {
        return 'DANGEROUS';
      }
    }

    // Check for dangerous keywords in operation
    const operationText = JSON.stringify(operation).toLowerCase();
    for (const keyword of DANGEROUS_KEYWORDS) {
      if (operationText.includes(keyword)) {
        return 'DANGEROUS';
      }
    }

    // Categorize by HTTP method
    if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      return 'READ';
    }

    return 'WRITE';
  }

  /**
   * Extract danger tags from operation
   */
  private static extractDangerTags(operation: any): string[] {
    const tags: string[] = [];
    const operationText = JSON.stringify(operation).toLowerCase();

    for (const keyword of DANGEROUS_KEYWORDS) {
      if (operationText.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags;
  }

  /**
   * Generate MCP tool from endpoint
   */
  static generateMCPTool(endpoint: ParsedEndpoint, baseUrl: string): MCPTool {
    const inputSchema = this.buildInputSchema(endpoint);

    return {
      name: this.sanitizeToolName(endpoint.operationId),
      description: endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`,
      inputSchema,
      category: endpoint.category,
      method: endpoint.method,
      path: endpoint.path,
      dangerTags: endpoint.dangerTags,
    };
  }

  /**
   * Build JSON schema for tool inputs
   */
  private static buildInputSchema(endpoint: ParsedEndpoint): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Add path parameters
    for (const param of endpoint.parameters) {
      if (param.in === 'path') {
        properties[param.name] = {
          type: this.mapOpenAPIType(param.schema?.type || 'string'),
          description: param.description || '',
        };
        if (param.required) {
          required.push(param.name);
        }
      }
    }

    // Add query parameters
    for (const param of endpoint.parameters) {
      if (param.in === 'query') {
        properties[param.name] = {
          type: this.mapOpenAPIType(param.schema?.type || 'string'),
          description: param.description || '',
        };
        if (param.required) {
          required.push(param.name);
        }
      }
    }

    // Add request body
    if (endpoint.requestBody) {
      const content = endpoint.requestBody.content || {};
      const jsonContent = content['application/json'];
      if (jsonContent?.schema) {
        const bodySchema = this.convertOpenAPISchemaToJSON(jsonContent.schema);
        properties.body = bodySchema;
        if (endpoint.requestBody.required) {
          required.push('body');
        }
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  /**
   * Convert OpenAPI schema to JSON schema
   */
  private static convertOpenAPISchemaToJSON(schema: any): Record<string, any> {
    if (!schema) return { type: 'object' };

    const result: Record<string, any> = {
      type: this.mapOpenAPIType(schema.type || 'object'),
    };

    if (schema.description) result.description = schema.description;
    if (schema.enum) result.enum = schema.enum;
    if (schema.default !== undefined) result.default = schema.default;
    if (schema.minimum !== undefined) result.minimum = schema.minimum;
    if (schema.maximum !== undefined) result.maximum = schema.maximum;

    if (schema.properties) {
      result.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        result.properties[key] = this.convertOpenAPISchemaToJSON(value as any);
      }
    }

    if (schema.items) {
      result.items = this.convertOpenAPISchemaToJSON(schema.items);
    }

    if (schema.required) {
      result.required = schema.required;
    }

    return result;
  }

  /**
   * Map OpenAPI type to JSON schema type
   */
  private static mapOpenAPIType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'integer': 'integer',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
    };
    return typeMap[type] || 'string';
  }

  /**
   * Sanitize operation ID to valid tool name
   */
  private static sanitizeToolName(operationId: string): string {
    return operationId
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .toLowerCase()
      .substring(0, 64);
  }

  /**
   * Extract base URL from OpenAPI spec
   */
  static extractBaseUrl(spec: OpenAPI.Document): string {
    const servers = spec.servers || [];
    if (servers.length > 0) {
      return servers[0].url || '';
    }
    return '';
  }

  /**
   * Calculate danger score for endpoint
   */
  static calculateDangerScore(endpoint: ParsedEndpoint): number {
    let score = 0;

    // Category scoring
    if (endpoint.category === 'DANGEROUS') score += 50;
    else if (endpoint.category === 'WRITE') score += 25;

    // Danger tags
    score += endpoint.dangerTags.length * 10;

    // Cap at 100
    return Math.min(score, 100);
  }
}
