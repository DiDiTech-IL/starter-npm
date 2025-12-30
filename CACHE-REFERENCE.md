# Redis Cache Quick Reference

## Overview

The CLI tool communicates with your API, which uses Redis for caching template data. This ensures fast response times and reduces database load.

## How It Works

```
User runs: npx @tachles/starter my-template
    ↓
CLI sends request to API with headers
    ↓
API checks Redis cache
    ├─ HIT  → Return cached data (fast!)
    └─ MISS → Query database → Cache result → Return data
```

## CLI Options for Cache Control

### Normal Usage (Uses Cache)
```bash
npx @tachles/starter nextjs-template
```
- Uses cached data if available
- Fastest response time

### Force Refresh (Bypass Cache)
```bash
npx @tachles/starter nextjs-template --force-refresh
```
- Fetches directly from database
- Updates cache with fresh data
- Use when you know template was just updated

### Verbose Mode (See Cache Details)
```bash
npx @tachles/starter nextjs-template --verbose
```
Shows:
```
✅ Cache: HIT from redis
   Key: template:nextjs-template:vlatest
   Age: 450s
```

### Specific Version
```bash
npx @tachles/starter nextjs-template --version 1.2.0
```
- Uses separate cache key for each version
- Ensures version consistency

## Request Headers Sent by CLI

```http
GET /api/cli/templates/nextjs-template HTTP/1.1
Host: your-app.vercel.app
User-Agent: @tachles/starter-cli/1.0.0
Authorization: Bearer <token>
Cache-Control: no-cache               # Only with --force-refresh
X-Force-Refresh: true                 # Only with --force-refresh
```

## Expected Response Headers from API

```http
HTTP/1.1 200 OK
X-Cache-Status: HIT                   # HIT, MISS, STALE, ERROR
X-Cache-Source: redis                 # redis, database, cache
X-Cache-Key: template:nextjs:vlatest  # Redis key used
X-Cache-Age: 450                      # Age in seconds
X-Cache-TTL: 3150                     # TTL remaining in seconds
```

## Cache Key Format

```
template:{templateId}:v{version}
```

Examples:
- `template:nextjs-prisma:vlatest`
- `template:nextjs-prisma:v1.2.0`
- `template:express-api:v2.0.5`

## Cache Statuses

| Status | Meaning | When It Happens |
|--------|---------|----------------|
| `HIT` | Data served from cache | Template found in Redis |
| `MISS` | Data fetched from DB | Template not in cache yet |
| `STALE` | Cache refreshed | `--force-refresh` used |
| `ERROR` | Cache error | Redis unavailable, fell back to DB |

## API Implementation Checklist

Your backend API should:

- [ ] Check Redis before querying database
- [ ] Cache results with 1 hour TTL
- [ ] Return `X-Cache-Status` header
- [ ] Return `X-Cache-Source` header
- [ ] Return `X-Cache-Key` header
- [ ] Return `X-Cache-Age` header
- [ ] Return `X-Cache-TTL` header
- [ ] Handle `X-Force-Refresh` header
- [ ] Support `version` query parameter
- [ ] Invalidate cache on template updates
- [ ] Log cache hits/misses

## Testing Your API

### Test Cache Flow

```bash
# 1. First request - should be MISS
curl -i https://your-app.vercel.app/api/cli/templates/my-template

# 2. Second request - should be HIT
curl -i https://your-app.vercel.app/api/cli/templates/my-template

# 3. Force refresh - should be STALE
curl -i -H "X-Force-Refresh: true" \
  https://your-app.vercel.app/api/cli/templates/my-template
```

### Check Headers

Look for:
```
< X-Cache-Status: HIT
< X-Cache-Source: redis
< X-Cache-Key: template:my-template:vlatest
< X-Cache-Age: 120
< X-Cache-TTL: 3480
```

## Monitoring & Debugging

### CLI Verbose Output

```bash
npx @tachles/starter my-template --verbose
```

Output:
```
⚡ Fetching template...
✅ Cache: HIT from redis
   Key: template:my-template:vlatest
   Age: 450s
⚡ Fetched template: my-template (v1.2.0) [Cache: HIT]
```

### Common Issues

#### Cache always shows MISS
- Redis not connected properly
- Cache keys not being set correctly
- TTL too short

#### Cache shows ERROR
- Redis service down
- Connection timeout
- Authentication issues

#### Stale data being served
- Cache not being invalidated on updates
- TTL too long
- Not using `--force-refresh` after updates

## Performance Metrics

### Expected Response Times

| Scenario | Expected Time | Notes |
|----------|---------------|-------|
| Cache HIT | 50-100ms | Served from Redis |
| Cache MISS | 200-500ms | Database query + cache set |
| Force Refresh | 200-500ms | Always queries database |

### Cache Hit Ratio

Target: **>80% cache hit ratio**

Monitor with:
```typescript
// In your API
const hitRatio = (cacheHits / totalRequests) * 100;
console.log(`Cache hit ratio: ${hitRatio}%`);
```

## Redis Commands for Debugging

```bash
# Connect to Redis CLI
redis-cli

# List all template cache keys
KEYS template:*

# Check specific template cache
GET template:nextjs-prisma:vlatest

# Check TTL
TTL template:nextjs-prisma:vlatest

# Delete specific cache
DEL template:nextjs-prisma:vlatest

# Delete all template caches
KEYS template:* | xargs redis-cli DEL

# Monitor cache activity in real-time
MONITOR
```

## Example API Implementation

See [API-INTEGRATION.md](API-INTEGRATION.md) for complete implementation with:
- Redis cache check logic
- Database fallback
- Cache invalidation
- Header generation
- Logging examples

## Summary

✅ CLI sends proper cache control headers
✅ API checks Redis first, then database
✅ Cache hits return in <100ms
✅ Cache misses populate Redis automatically
✅ `--force-refresh` bypasses cache
✅ `--verbose` shows cache details
✅ Each version cached separately
✅ 1 hour TTL recommended
