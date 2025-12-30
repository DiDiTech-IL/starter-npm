# ✅ CLI Tool Complete - Simplified Version

## What Changed

The CLI has been simplified to use a single, streamlined command structure with support for the `@version` syntax.

## Usage

### Simple & Clean Command
```bash
# Just one command pattern:
npx @tachles/starter <template-id>[@version] [options]
```

### Examples

```bash
# Basic installation
npx @tachles/starter nextjs-prisma-shadcn

# With version using @ syntax (like npm packages!)
npx @tachles/starter nextjs-prisma-shadcn@1.2.0

# Get template information
npx @tachles/starter nextjs-prisma-shadcn --template-help

# Skip prompts (automation)
npx @tachles/starter nextjs-prisma-shadcn -y

# Force cache refresh
npx @tachles/starter nextjs-prisma-shadcn --force-refresh

# Show verbose cache information
npx @tachles/starter nextjs-prisma-shadcn --verbose

# Combine everything
npx @tachles/starter nextjs-prisma-shadcn@1.2.0 -y --verbose
```

## Key Features

✅ **Single command pattern** - No confusing subcommands  
✅ **@ version syntax** - `template@1.2.0` (familiar from npm)  
✅ **Redis cache support** - With HIT/MISS tracking  
✅ **Force refresh** - Bypass cache when needed  
✅ **Verbose mode** - See detailed cache information  
✅ **Template help** - View configuration before installing  
✅ **Automation ready** - `-y` flag for scripts

## Available Flags

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip all prompts, use defaults |
| `--force-refresh` | Force database query (bypass cache) |
| `--verbose` | Show detailed cache & API info |
| `--template-help` | Display template information |
| `-h, --help` | Show help message |
| `-v, --version` | Show CLI version |

## Version Syntax

The CLI supports two ways to specify versions:

### 1. @ Syntax (Recommended)
```bash
npx @tachles/starter my-template@1.2.0
```

### 2. --version Flag (Still works)
```bash
npx @tachles/starter my-template --version 1.2.0
```

**The @ syntax is recommended** because it's:
- More concise
- Familiar to developers (like npm)
- Can be copy-pasted easily

## How Version Parsing Works

```typescript
// Input: "nextjs-template@1.2.0"
// Parsed as:
{
  templateId: "nextjs-template",
  version: "1.2.0"
}

// Input: "nextjs-template"
// Parsed as:
{
  templateId: "nextjs-template",
  version: undefined  // Will fetch latest
}
```

## Redis Cache Integration

The CLI automatically handles caching:

```bash
# First install - Cache MISS
$ npx @tachles/starter my-template
💾 Fetched template: my-template (v1.0.0) [Cache: MISS]

# Second install - Cache HIT  
$ npx @tachles/starter my-template
⚡ Fetched template: my-template (v1.0.0) [Cache: HIT]

# Force refresh - Cache STALE
$ npx @tachles/starter my-template --force-refresh
📡 Fetched template: my-template (v1.0.0) [Cache: STALE]
```

## Verbose Mode Output

```bash
$ npx @tachles/starter my-template --verbose

⚡ Fetched template: my-template (v1.0.0) [Cache: HIT]
✅ Cache: HIT from redis
   Key: template:my-template:vlatest
   Age: 450s

🎯 Template Setup
...
```

## Command Line Help

```bash
$ npx @tachles/starter --help

@tachles/starter - CLI tool for installing Tachles templates

Usage:
  npx @tachles/starter <template-id>[@version] [options]

Examples:
  npx @tachles/starter nextjs-prisma-shadcn
  npx @tachles/starter nextjs-prisma-shadcn@1.2.0
  npx @tachles/starter my-template -y
  npx @tachles/starter my-template --verbose

Options:
  -y, --yes            Skip all prompts and use defaults
  --force-refresh      Force refresh from database (bypass cache)
  --verbose            Show detailed cache and API information
  --template-help      Display help information for the template
  -h, --help           Display this help message
  -v, --version        Display version number
```

## Testing

```bash
# Build
npm run build

# Test locally
npm link
tachles --help
tachles --version

# Test with template (when API ready)
tachles my-template@1.0.0 --verbose --template-help
```

## What's Removed

- ❌ No `install` subcommand needed
- ❌ No `tachles install my-template` 
- ✅ Just `tachles my-template`

Much simpler and cleaner!

## API Requirements (No Changes)

Your API still needs to:
- Accept version parameter: `?version=1.2.0`
- Return X-Cache-* headers
- Handle X-Force-Refresh header
- Cache in Redis with TTL

See [API-INTEGRATION.md](API-INTEGRATION.md) for full details.

## Ready to Publish

The CLI is production-ready with:
- ✅ Simplified command structure
- ✅ @ version syntax support
- ✅ Redis cache integration
- ✅ Comprehensive error handling
- ✅ Complete documentation

Just implement the Redis caching in your API and you're good to go! 🚀
