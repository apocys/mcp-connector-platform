# Taurus HQ API Analysis

## API Documentation Format

**Platform:** Readme.com  
**Base URL:** `https://api.t-dx.com/api/rest/v1`  
**Documentation:** `https://docs.taurushq.com/prime/reference/`

## Example Endpoint: Get Balances

**Method:** GET  
**Path:** `/balances`  
**Full URL:** `https://api.t-dx.com/api/rest/v1/balances`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `subAccountIds` | array of strings | Yes | - | A list of sub-account unique identifiers to filter the balances |
| `sort` | string | No | `created_at-asc` | Optionally sort the results |
| `limit` | string | No | `20` | Optionally limit the number of results (between 1 and 500) |
| `query` | array of strings | No | - | Optionally filter the results |
| `cursor` | string | No | - | Optionally provide a cursor to paginate over pages of results |

### Response Codes

- **200** - A successful response
- **400** - Bad Request
- **401** - Unauthenticated
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error
- **503** - Service Unavailable
- **Default** - An unexpected error response

### Authentication

Header-based authentication (details to be extracted from other pages)

## Readme.com Format Characteristics

1. **No OpenAPI Spec Available** - Readme.com docs don't always provide OpenAPI/Swagger export
2. **Structured HTML** - Documentation is rendered as structured HTML
3. **Interactive Try It** - Has interactive API testing built-in
4. **Code Examples** - Provides cURL, Node, Ruby, PHP, Python examples
5. **Navigation Structure** - Left sidebar with all endpoints organized by category

## Challenge

Readme.com documentation doesn't provide a machine-readable OpenAPI spec by default. We need to either:

1. **Scrape the documentation** - Extract endpoint info from HTML
2. **Manual OpenAPI creation** - Create OpenAPI spec manually from docs
3. **Check for OpenAPI export** - Some Readme.com sites have `/openapi.json` or similar

## Next Steps

1. Check if Taurus provides an OpenAPI spec endpoint
2. Create a Readme.com scraper utility
3. Build a demo OpenAPI spec for Taurus API manually
4. Test with the MCP Connector Platform
