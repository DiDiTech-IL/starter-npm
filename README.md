# @tachles/starter

Official CLI tool for installing [Tachles](https://your-app.vercel.app) templates.

## Installation

```bash
# Use directly with npx (recommended)
npx @tachles/starter <template-id>

# Or install globally
npm install -g @tachles/starter
```

## Usage

### Install a Template

```bash
# Basic usage
npx @tachles/starter <template-id>

# With version
npx @tachles/starter <template-id>@1.2.0

# Examples
npx @tachles/starter nextjs-prisma-shadcn
npx @tachles/starter nextjs-prisma-shadcn@1.2.0
```

### Get Template Information

```bash
npx @tachles/starter <template-id> --template-help
```

This will display:
- Template name and description
- Available configuration options
- Default values
- Usage examples

### Skip Prompts (Use Defaults)

```bash
npx @tachles/starter <template-id> -y
```

### Advanced Options

#### Install Specific Version (@ syntax)
```bash
# Using @ syntax
npx @tachles/starter nextjs-prisma-shadcn@1.2.0

# Still works with --version flag  
npx @tachles/starter nextjs-prisma-shadcn --version 1.2.0
```

#### Force Refresh from Database (Bypass Cache)
```bash
npx @tachles/starter <template-id> --force-refresh
```

Use this when:
- You want the absolute latest version from the database
- Cache might be stale
- Testing template updates

#### Verbose Mode (Show Cache Information)
```bash
npx @tachles/starter <template-id> --verbose
```

Shows:
- Cache status (HIT/MISS)
- Cache source (redis/database)
- Cache age and TTL
- API response details

## Examples

```bash
# Install Next.js + Prisma + shadcn/ui template
npx @tachles/starter nextjs-prisma-shadcn

# Install specific version with @ syntax  
npx @tachles/starter nextjs-prisma-shadcn@1.2.0

# Get information about the template first
npx @tachles/starter nextjs-prisma-shadcn --template-help

# Install with default answers
npx @tachles/starter nextjs-prisma-shadcn -y

# Force refresh from database (bypass Redis cache)
npx @tachles/starter nextjs-prisma-shadcn --force-refresh

# Show detailed cache information
npx @tachles/starter nextjs-prisma-shadcn --verbose

# Combine options
npx @tachles/starter nextjs-prisma-shadcn@1.2.0 -y --verbose
```

# Combine options
npx @tachles/starter nextjs-prisma-shadcn -y --verbose --force-refresh
```

## What It Does

1. Fetches template recipe from Tachles platform
2. Asks setup questions interactively
3. Installs packages based on your answers
4. Runs commands (prisma init, etc.)
5. Sets up environment variables
6. Reports installation statistics

## Requirements

- Node.js 18 or higher
- npm, yarn, or pnpm

## Support

- Browse Templates: https://your-app.vercel.app/templates
- Documentation: https://your-app.vercel.app/docs
- Issues: https://github.com/your-org/tachles-cli/issues

## License

MIT
