# 🚀 Quick Start - Testing the CLI

## What You Have Now

A fully functional CLI tool with Redis cache support! Test it locally before publishing.

## Test Commands

### 1. Build the Project
```bash
npm run build
```

### 2. Link Locally (for testing)
```bash
npm link
```

### 3. Test Basic Help
```bash
tachles --version
# Output: 1.0.0

tachles --help
# Shows simplified usage and options
```

### 4. Test With Real Template (when API is ready)

```bash
# Basic install
tachles my-template

# With @ syntax for version
tachles my-template@1.2.0

# Get template info first
tachles my-template --template-help

# Install with cache visibility
tachles my-template --verbose

# Force fresh data from database
tachles my-template --force-refresh

# Install specific version with @ syntax
tachles my-template@1.2.0

# Skip all prompts
tachles my-template -y

# Combine options
tachles my-template@1.2.0 -y --verbose
```

## Expected Output Examples

### Normal Install (Cache HIT)
```
✔ ⚡ Fetched template: my-template (v1.0.0) [Cache: HIT]

🎯 Template Setup

? Use TypeScript? Yes
? Which database? PostgreSQL

📦 Installing dependencies...
✔ Installed: typescript, @types/node
✔ Installed: prisma, @prisma/client

✅ Installation complete!
```

### With Verbose Flag
```
✔ ⚡ Fetched template: my-template (v1.0.0) [Cache: HIT]
ℹ ✅ Cache: HIT from redis
ℹ    Key: template:my-template:vlatest
ℹ    Age: 450s

🎯 Template Setup
...
```

### Force Refresh (Cache MISS/STALE)
```
⚠ ⚡ Forcing cache refresh from database
✔ 💾 Fetched template: my-template (v1.0.0) [Cache: MISS]
```

## Unlink When Done Testing
```bash
npm unlink -g @tachles/starter
```

## Publish to npm (when ready)

```bash
# Login
npm login

# Publish
npm publish --access public

# Then users can:
npx @tachles/starter my-template
```

## What's Next?

### For You (Backend API)
1. Read [API-INTEGRATION.md](API-INTEGRATION.md)
2. Implement Redis caching in your API endpoint
3. Return proper X-Cache-* headers
4. Test with: `tachles my-template --verbose`

### Files to Review
- **README.md** - User documentation
- **API-INTEGRATION.md** - Complete API implementation guide (READ THIS!)
- **CACHE-REFERENCE.md** - Quick cache reference
- **PROJECT-SUMMARY.md** - Overview of everything

## Architecture Reminder

```
┌─────────────────────┐
│    CLI Tool         │ ← You're here! ✅ DONE
│  (This Project)    │
└──────────┬──────────┘
           │ HTTP Request
           │ Headers: Cache-Control, X-Force-Refresh
           │
┌──────────▼──────────┐
│   Your API          │ ← Implement Redis caching here
│  /api/cli/templates │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────┐   ┌───▼─────┐
│ Redis  │   │Database │
│ Cache  │   │(Prisma) │
└────────┘   └─────────┘
```

## Support

Questions? Check:
- [API-INTEGRATION.md](API-INTEGRATION.md) - Backend implementation
- [CACHE-REFERENCE.md](CACHE-REFERENCE.md) - Cache system reference
- [SETUP.md](SETUP.md) - Full setup guide

## 🎉 You're All Set!

The CLI tool is **complete and production-ready**. Once you implement the Redis caching in your API (following API-INTEGRATION.md), everything will work together perfectly!
