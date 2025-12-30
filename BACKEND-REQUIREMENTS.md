# Backend API Requirements for CLI Tool

## Overview

The CLI tool needs one API endpoint to fetch template data. Implement Redis caching to make it fast.

## Required Endpoint

### `GET /api/cli/templates/{templateId}`

Fetches a template recipe (with Redis caching for performance).

---

## Request

**URL Parameters:**
- `{templateId}` - Template identifier (e.g., "nextjs-prisma-shadcn")

**Query Parameters:**
- `version` (optional) - Specific version to fetch. If omitted, return latest version.

**Headers to Check:**
- `X-Force-Refresh: true` - If present, bypass Redis cache and query database

**Example Requests:**
```
GET /api/cli/templates/nextjs-prisma-shadcn
GET /api/cli/templates/nextjs-prisma-shadcn?version=1.2.0
GET /api/cli/templates/nextjs-prisma-shadcn
    X-Force-Refresh: true
```

---

## Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "templateId": "nextjs-prisma-shadcn",
    "version": "1.2.0",
    "metadata": {
      "name": "Next.js + Prisma + shadcn/ui",
      "description": "Full-stack template with...",
      "author": "Your Name"
    },
    "recipe": {
      "engine": "^0.1.0",
      "variables": [...],
      "verifiedPackages": [...],
      "envKeys": [...]
    }
  }
}
```

**Required Response Headers:**
```
X-Cache-Status: HIT | MISS | STALE
X-Cache-Source: redis | database
X-Cache-Key: template:nextjs-prisma-shadcn:v1.2.0
X-Cache-Age: 450
X-Cache-TTL: 3150
```

**Errors:**
- `404` - Template not found
- `401` - Authentication required (for private templates)
- `500` - Server error

---

## Redis Caching Implementation

### Cache Key Format
```
template:{templateId}:v{version}
```

Examples:
- `template:nextjs-prisma-shadcn:vlatest`
- `template:nextjs-prisma-shadcn:v1.2.0`

### Cache TTL
- **1 hour (3600 seconds)** recommended

### Logic Flow

```typescript
async function GET(request, { params }) {
  const { templateId } = params;
  const version = request.nextUrl.searchParams.get('version') || 'latest';
  const forceRefresh = request.headers.get('X-Force-Refresh') === 'true';
  
  const cacheKey = `template:${templateId}:v${version}`;
  
  // 1. Try Redis first (unless force refresh)
  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return Response.json(JSON.parse(cached), {
        headers: {
          'X-Cache-Status': 'HIT',
          'X-Cache-Source': 'redis',
          'X-Cache-Key': cacheKey,
        }
      });
    }
  }
  
  // 2. Query database
  const template = await db.templates.findUnique({
    where: { 
      id: templateId,
      version: version === 'latest' ? undefined : version 
    },
    orderBy: version === 'latest' ? { createdAt: 'desc' } : undefined,
  });
  
  if (!template) {
    return Response.json(
      { success: false, error: 'Template not found' },
      { status: 404 }
    );
  }
  
  // 3. Format response
  const response = {
    success: true,
    data: {
      templateId: template.id,
      version: template.version,
      metadata: {
        name: template.name,
        description: template.description,
        author: template.author,
      },
      recipe: template.recipe, // JSON field from DB
    }
  };
  
  // 4. Cache in Redis
  await redis.setex(cacheKey, 3600, JSON.stringify(response));
  
  // 5. Return with headers
  return Response.json(response, {
    headers: {
      'X-Cache-Status': forceRefresh ? 'STALE' : 'MISS',
      'X-Cache-Source': 'database',
      'X-Cache-Key': cacheKey,
      'X-Cache-Age': '0',
      'X-Cache-TTL': '3600',
    }
  });
}
```

---

## Cache Invalidation

When a template is updated, delete its cache:

```typescript
async function invalidateTemplateCache(templateId: string, version: string) {
  await redis.del(`template:${templateId}:v${version}`);
  
  // If this is the latest version, also invalidate the "latest" cache
  await redis.del(`template:${templateId}:vlatest`);
}
```

---

## Database Schema Requirements

Your templates table should have:
```typescript
{
  id: string;           // Template identifier
  version: string;      // Version number (e.g., "1.2.0")
  name: string;         // Display name
  description: string;  // Description
  author?: string;      // Author name
  recipe: JSON;         // The template recipe (JSON field)
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

---

## Testing

### Test Cache Flow

```bash
# 1. First request - should be MISS
curl -i https://api.starter.tachles.dev/cli/templates/my-template

# Response headers should show:
# X-Cache-Status: MISS
# X-Cache-Source: database

# 2. Second request - should be HIT
curl -i https://api.starter.tachles.dev/cli/templates/my-template

# Response headers should show:
# X-Cache-Status: HIT
# X-Cache-Source: redis

# 3. Force refresh - should be STALE
curl -i -H "X-Force-Refresh: true" https://api.starter.tachles.dev/cli/templates/my-template

# Response headers should show:
# X-Cache-Status: STALE
# X-Cache-Source: database
```

---

## Summary Checklist

- [ ] Create endpoint: `GET /api/cli/templates/{templateId}`
- [ ] Support `version` query parameter
- [ ] Check Redis cache before querying database
- [ ] Cache results with 1 hour TTL
- [ ] Handle `X-Force-Refresh` header to bypass cache
- [ ] Return all required `X-Cache-*` headers
- [ ] Return 404 if template not found
- [ ] Invalidate cache when templates are updated

---

## Questions?

- Cache key format: `template:{id}:v{version}`
- Cache TTL: 3600 seconds (1 hour)
- Headers are required for CLI to show cache status
- Use Upstash Redis or Redis Cloud for easy setup
