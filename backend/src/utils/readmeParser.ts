import axios from 'axios';
import * as cheerio from 'cheerio';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Readme.com API Documentation Parser
 * 
 * This utility scrapes Readme.com documentation pages and converts them
 * to OpenAPI 3.0 specifications for use with the MCP Connector Platform.
 */

export interface ReadmeEndpoint {
  title: string;
  method: string;
  path: string;
  description: string;
  parameters: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'body';
    required: boolean;
    type: string;
    description: string;
    default?: any;
  }>;
  responses: Record<string, string>;
}

export class ReadmeParser {
  /**
   * Parse a Readme.com documentation page
   */
  static async parseReadmePage(url: string): Promise<ReadmeEndpoint> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract endpoint title
      const title = $('h1').first().text().trim();

      // Extract method and URL
      const methodBadge = $('.rm-Method').text().trim() || 'GET';
      const urlText = $('code').first().text().trim();
      const path = this.extractPath(urlText);

      // Extract description
      const description = $('p').first().text().trim();

      // Extract parameters
      const parameters = this.extractParameters($);

      // Extract responses
      const responses = this.extractResponses($);

      return {
        title,
        method: methodBadge.toUpperCase(),
        path,
        description,
        parameters,
        responses,
      };
    } catch (error) {
      throw new Error(`Failed to parse Readme page: ${(error as Error).message}`);
    }
  }

  /**
   * Extract path from full URL
   */
  private static extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // If not a full URL, assume it's already a path
      return url.startsWith('/') ? url : `/${url}`;
    }
  }

  /**
   * Extract parameters from Readme page
   */
  private static extractParameters($: cheerio.CheerioAPI): Array<any> {
    const parameters: Array<any> = [];

    // Look for parameter sections
    $('.rm-Param').each((_, elem) => {
      const name = $(elem).find('.rm-Param-name').text().trim();
      const type = $(elem).find('.rm-Param-type').text().trim();
      const required = $(elem).find('.rm-Param-required').length > 0;
      const description = $(elem).find('.rm-Param-description').text().trim();
      const defaultValue = $(elem).find('.rm-Param-default').text().trim();

      if (name) {
        parameters.push({
          name,
          in: 'query', // Default to query, can be refined
          required,
          type: this.normalizeType(type),
          description,
          ...(defaultValue && { default: defaultValue }),
        });
      }
    });

    return parameters;
  }

  /**
   * Extract response codes from Readme page
   */
  private static extractResponses($: cheerio.CheerioAPI): Record<string, string> {
    const responses: Record<string, string> = {};

    // Look for response sections
    $('.rm-Response').each((_, elem) => {
      const code = $(elem).find('.rm-Response-code').text().trim();
      const description = $(elem).find('.rm-Response-description').text().trim();

      if (code) {
        responses[code] = description;
      }
    });

    // Fallback: look for common response codes in text
    if (Object.keys(responses).length === 0) {
      const text = $('body').text();
      const commonCodes = ['200', '400', '401', '403', '404', '500', '503'];

      commonCodes.forEach(code => {
        if (text.includes(code)) {
          responses[code] = this.getDefaultResponseDescription(code);
        }
      });
    }

    return responses;
  }

  /**
   * Normalize type names to OpenAPI types
   */
  private static normalizeType(type: string): string {
    const lowerType = type.toLowerCase();

    if (lowerType.includes('string')) return 'string';
    if (lowerType.includes('number') || lowerType.includes('integer')) return 'integer';
    if (lowerType.includes('boolean') || lowerType.includes('bool')) return 'boolean';
    if (lowerType.includes('array')) return 'array';
    if (lowerType.includes('object')) return 'object';

    return 'string'; // Default
  }

  /**
   * Get default response description for common codes
   */
  private static getDefaultResponseDescription(code: string): string {
    const descriptions: Record<string, string> = {
      '200': 'Successful response',
      '201': 'Created',
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Forbidden',
      '404': 'Not Found',
      '500': 'Internal Server Error',
      '503': 'Service Unavailable',
    };

    return descriptions[code] || 'Response';
  }

  /**
   * Convert Readme endpoint to OpenAPI path item
   */
  static convertToOpenAPIPath(endpoint: ReadmeEndpoint): OpenAPIV3.PathItemObject {
    const operation: OpenAPIV3.OperationObject = {
      summary: endpoint.title,
      description: endpoint.description,
      parameters: endpoint.parameters.map(param => ({
        name: param.name,
        in: param.in as any,
        required: param.required,
        schema: {
          type: param.type as any,
          ...(param.default && { default: param.default }),
        },
        description: param.description,
      })),
      responses: {},
    };

    // Add responses
    Object.entries(endpoint.responses).forEach(([code, description]) => {
      operation.responses![code] = {
        description,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      };
    });

    return {
      [endpoint.method.toLowerCase()]: operation,
    } as OpenAPIV3.PathItemObject;
  }

  /**
   * Build complete OpenAPI spec from multiple Readme pages
   */
  static async buildOpenAPISpec(
    baseUrl: string,
    endpoints: ReadmeEndpoint[],
    info: OpenAPIV3.InfoObject
  ): Promise<OpenAPIV3.Document> {
    const paths: OpenAPIV3.PathsObject = {};

    endpoints.forEach(endpoint => {
      const pathItem = this.convertToOpenAPIPath(endpoint);
      paths[endpoint.path] = {
        ...paths[endpoint.path],
        ...pathItem,
      };
    });

    return {
      openapi: '3.0.3',
      info,
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      paths,
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
          },
        },
      },
      security: [
        {
          ApiKeyAuth: [],
        },
      ],
    } as OpenAPIV3.Document;
  }
}
