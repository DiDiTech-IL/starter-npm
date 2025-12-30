# API Integration Guide for Redis Caching

This document explains how the CLI tool interacts with your backend API and the expected Redis caching behavior.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Tool                                  │
│  - Sends cache control headers                                  │
│  - Reads cache status from response headers                     │
│  - Logs cache information (when --verbose)                      │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTP Request
             │ Headers: Cache-Control, X-Force-Refresh, etc.
             │
┌────────────▼────────────────────────────────────────────────────┐
│                     Your API Endpoint                            │
│              /api/cli/templates/{templateId}                     │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── Check Request Headers
             │    - Cache-Control: no-cache?
             │    - X-Force-Refresh: true?
             │    - version parameter?
             │
             ├─── Try Redis Cache First
             │    ┌─────────────────────────────────────────┐
             │    │           Redis Cache                    │
             │    │  Key: template:{id}:v{version}          │
             │    │  TTL: 3600 seconds (1 hour)             │
             │    │  Value: JSON template data              │
             │    └─────────────────────────────────────────┘
             │           │
             │           ├─ HIT  → Return cached data
             │           │          Set headers: X-Cache-Status: HIT
             │           │
             │           └─ MISS → Query Database
             │
             └─── Query Database (on cache miss)
                  ┌─────────────────────────────────────────┐
                  │         PostgreSQL/MySQL                 │
                  │  - Fetch latest template version        │
                  │  - Get template recipe & metadata       │
                  └─────────────────────────────────────────┘
                         │
                         ├─ Cache result in Redis
                         │  Set key: template:{id}:v{version}
                         │  Set TTL: 3600 seconds
                         │  Set headers: X-Cache-Status: MISS
                         │
                         └─ Return to CLI
```

## API Endpoint Specification

### GET `/api/cli/templates/{templateId}`

Fetch a template recipe from cache (Redis) or database.

#### Request

**URL Parameters:**
- `templateId` (required): Template identifier (e.g., "nextjs-prisma-shadcn")

**Query Parameters:**
- `version` (optional): Specific version to fetch (default: latest)
  - Example: `?version=1.2.0`
  - If omitted, fetch the latest version

**Request Headers:**
- `Authorization` (optional): `Bearer {jwt_token}` for private templates
- `User-Agent`: `@tachles/starter-cli/1.0.0`
- `Cache-Control` (optional): `no-cache` to bypass Redis cache
- `X-Force-Refresh` (optional): `true` to force database query and refresh cache

#### Response

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
      "author": "Your Name",
      "homepage": "https://example.com"
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

**Response Headers (Required for Logging):**

```
X-Cache-Status: HIT | MISS | STALE | ERROR
  - HIT: Data served from Redis cache
  - MISS: Data fetched from database and cached
  - STALE: Cached data expired, refetched from database
  - ERROR: Cache error, fell back to database

X-Cache-Source: redis | database | cache
  - redis: Served directly from Redis
  - database: Queried from database (and cached)
  - cache: Generic cache source

X-Cache-Key: template:nextjs-prisma-shadcn:v1.2.0
  - The Redis key used for this template

X-Cache-Age: 1234
  - Age of cached data in seconds

X-Cache-TTL: 2366
  - Time-to-live remaining in seconds

X-RateLimit-Remaining: 1000
  - Optional: Remaining API requests
```

**Error Responses:**

```json
// 404 Not Found - Template doesn't exist
{
  "success": false,
  "error": "Template not found",
  "code": "TEMPLATE_NOT_FOUND"
}

// 401 Unauthorized - Private template, auth required
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}

// 500 Internal Server Error - Redis/DB error
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Redis Caching Strategy

### Cache Key Format

```
template:{templateId}:v{version}
```

**Examples:**
- `template:nextjs-prisma-shadcn:vlatest` (latest version)
- `template:nextjs-prisma-shadcn:v1.2.0` (specific version)
- `template:express-api:v2.0.5`

### Cache Flow Implementation (Pseudo-code)

```typescript
// Your API endpoint handler
export async function GET(request: Request, { params }: { params: { templateId: string } }) {
  const { templateId } = params;
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || 'latest';
  
  // Check for force refresh headers
  const forceRefresh = 
    request.headers.get('Cache-Control') === 'no-cache' ||
    request.headers.get('X-Force-Refresh') === 'true';

  // Generate cache key
  const cacheKey = `template:${templateId}:v${version}`;
  
  // Try Redis first (unless force refresh)
  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const cacheAge = await redis.ttl(cacheKey);
      
      return Response.json(JSON.parse(cached), {
        headers: {
          'X-Cache-Status': 'HIT',
          'X-Cache-Source': 'redis',
          'X-Cache-Key': cacheKey,
          'X-Cache-Age': cacheAge.toString(),
          'X-Cache-TTL': (3600 - cacheAge).toString(),
        },
      });
    }
  }

  // Cache MISS or force refresh - query database
  const template = await db.templates.findUnique({
    where: { 
      id: templateId,
      version: version === 'latest' ? undefined : version,
      isDeleted: false, // Soft delete support
    },
    orderBy: version === 'latest' ? { version: 'desc' } : undefined,
  });

  if (!template) {
    return Response.json(
      { success: false, error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Format response
  const response = {
    success: true,
    data: {
      templateId: template.id,
      version: template.version,
      metadata: {
        name: template.name,
        description: template.description,
        author: template.author,
        homepage: template.homepage,
      },
      recipe: template.recipe,
    },
  };

  // Cache in Redis (TTL: 1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(response));

  return Response.json(response, {
    headers: {
      'X-Cache-Status': forceRefresh ? 'STALE' : 'MISS',
      'X-Cache-Source': 'database',
      'X-Cache-Key': cacheKey,
      'X-Cache-Age': '0',
      'X-Cache-TTL': '3600',
    },
  });
}
```

### Cache Invalidation

When a template is updated in your dashboard:

```typescript
// After updating template in database
async function invalidateTemplateCache(templateId: string, version: string) {
  // Delete specific version cache
  await redis.del(`template:${templateId}:v${version}`);
  
  // If this was the latest version, delete the latest cache too
  const isLatest = await db.templates.findFirst({
    where: { id: templateId },
    orderBy: { version: 'desc' },
  });
  
  if (isLatest.version === version) {
    await redis.del(`template:${templateId}:vlatest`);
  }
  
  console.log(`Cache invalidated for template:${templateId}:v${version}`);
}
```

### Bulk Cache Warming (Optional)

Pre-populate Redis with popular templates:

```typescript
async function warmCache() {
  const popularTemplates = await db.templates.findMany({
    where: { isPopular: true },
    orderBy: { downloads: 'desc' },
    take: 50,
  });

  for (const template of popularTemplates) {
    const cacheKey = `template:${template.id}:v${template.version}`;
    const data = {
      success: true,
      data: {
        templateId: template.id,
        version: template.version,
        metadata: { /* ... */ },
        recipe: template.recipe,
      },
    };
    
    await redis.setex(cacheKey, 3600, JSON.stringify(data));
    console.log(`Warmed cache: ${cacheKey}`);
  }
}
```

## CLI Usage with Cache Control

### Normal Usage (Uses Cache)
```bash
npx @tachles/starter nextjs-prisma-shadcn
# Server responds with X-Cache-Status: HIT (if cached)
```

### Force Refresh (Bypass Cache)
```bash
npx @tachles/starter nextjs-prisma-shadcn --force-refresh
# Server fetches from DB and updates cache
# Server responds with X-Cache-Status: MISS or STALE
```

### Verbose Logging (See Cache Details)
```bash
npx @tachles/starter nextjs-prisma-shadcn --verbose
# Shows detailed cache information:
# ✅ Cache: HIT from redis
#    Key: template:nextjs-prisma-shadcn:vlatest
#    Age: 1234s
```

### Specific Version
```bash
npx @tachles/starter nextjs-prisma-shadcn --version 1.2.0
# Fetches specific version, uses separate cache key
```

## Logging & Monitoring

### CLI-Side Logging

The CLI logs cache information when `--verbose` flag is used:

```
⚡ Fetched template: nextjs-prisma-shadcn (v1.2.0) [Cache: HIT]
✅ Cache: HIT from redis
   Key: template:nextjs-prisma-shadcn:v1.2.0
   Age: 450s
```

### API-Side Logging

Your API should log:

```typescript
// Cache HIT
console.log({
  event: 'cache_hit',
  templateId,
  version,
  cacheKey,
  cacheAge,
  timestamp: new Date().toISOString(),
});

// Cache MISS
console.log({
  event: 'cache_miss',
  templateId,
  version,
  cacheKey,
  dbQueryTime: queryDuration,
  timestamp: new Date().toISOString(),
});

// Force Refresh
console.log({
  event: 'cache_refresh_forced',
  templateId,
  version,
  cacheKey,
  userAgent: request.headers.get('User-Agent'),
  timestamp: new Date().toISOString(),
});
```

## Testing Cache Behavior

### Test Script for Your API

```bash
#!/bin/bash

TEMPLATE_ID="nextjs-prisma-shadcn"
API_URL="https://your-app.vercel.app"

echo "1. First request (should be MISS - populate cache)"
curl -i "$API_URL/api/cli/templates/$TEMPLATE_ID"

echo ""
echo "2. Second request (should be HIT - from cache)"
curl -i "$API_URL/api/cli/templates/$TEMPLATE_ID"

echo ""
echo "3. Force refresh (should be STALE - update cache)"
curl -i -H "X-Force-Refresh: true" "$API_URL/api/cli/templates/$TEMPLATE_ID"

echo ""
echo "4. Specific version (separate cache)"
curl -i "$API_URL/api/cli/templates/$TEMPLATE_ID?version=1.0.0"
```

### Expected Header Responses

**First Request (MISS):**
```
X-Cache-Status: MISS
X-Cache-Source: database
X-Cache-Key: template:nextjs-prisma-shadcn:vlatest
X-Cache-Age: 0
X-Cache-TTL: 3600
```

**Second Request (HIT):**
```
X-Cache-Status: HIT
X-Cache-Source: redis
X-Cache-Key: template:nextjs-prisma-shadcn:vlatest
X-Cache-Age: 45
X-Cache-TTL: 3555
```

**Force Refresh (STALE):**
```
X-Cache-Status: STALE
X-Cache-Source: database
X-Cache-Key: template:nextjs-prisma-shadcn:vlatest
X-Cache-Age: 0
X-Cache-TTL: 3600
```

## Performance Recommendations

1. **Cache TTL**: 1 hour (3600 seconds) for stable templates
2. **Popular Templates**: Pre-warm cache on deployment
3. **Version Caching**: Cache each version separately
4. **Latest Version**: Update `vlatest` cache when new version published
5. **Rate Limiting**: Protect API with rate limits (e.g., 100 req/min per IP)
6. **CDN**: Consider Cloudflare/Vercel Edge caching for static template data

## Redis Configuration

### Recommended Redis Settings

```redis
# redis.conf or Redis Cloud settings

# Max memory for cache (adjust based on template sizes)
maxmemory 256mb

# Eviction policy (remove least recently used when memory full)
maxmemory-policy allkeys-lru

# Persistence (optional - cache can be rebuilt)
save ""  # Disable RDB snapshots for pure cache
appendonly no  # Disable AOF for pure cache
```

### Redis Connection in Your API

```typescript
import { Redis } from '@upstash/redis';

// Use environment variables
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export default redis;
```

## Summary Checklist

### CLI Tool (Already Implemented) ✅
- [x] Sends `Cache-Control` and `X-Force-Refresh` headers
- [x] Reads cache status from response headers
- [x] Logs cache information with `--verbose`
- [x] Supports `--force-refresh` flag
- [x] Supports `--version` parameter

### API Implementation (Your Backend)
- [ ] Implement Redis cache check before database query
- [ ] Return proper `X-Cache-*` headers in responses
- [ ] Handle `X-Force-Refresh` header to bypass cache
- [ ] Support `version` query parameter
- [ ] Implement cache invalidation on template updates
- [ ] Add logging for cache hits/misses
- [ ] Set appropriate TTL (3600 seconds recommended)
- [ ] Handle edge cases (Redis down, invalid cache data)

### Monitoring & Logging
- [ ] Log all cache hits/misses
- [ ] Track cache hit ratio
- [ ] Monitor Redis memory usage
- [ ] Alert on cache failures
- [ ] Dashboard for cache performance metrics
