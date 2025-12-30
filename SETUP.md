# Quick Setup Guide

## ✅ Project Structure Created

Your CLI tool is ready! Here's what was built:

```
starter-npm/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── constants.ts             # API configuration
│   ├── api/
│   │   ├── client.ts           # API client
│   │   └── types.ts            # Type definitions
│   ├── commands/
│   │   └── install.ts          # Install command (with --help support)
│   ├── recipe/
│   │   ├── executor.ts         # Recipe execution logic
│   │   └── prompter.ts         # Interactive prompts
│   └── utils/
│       ├── auth.ts             # Authentication
│       ├── logger.ts           # Logging utilities
│       └── package-manager.ts  # Package manager detection
├── bin/
│   └── tachles.js              # CLI executable
├── dist/                        # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Available Commands

### 1. Install a template
```bash
npx @tachles/starter <package-name>

# Example:
npx @tachles/starter nextjs-prisma-shadcn
```

### 2. Get template help/information
```bash
npx @tachles/starter <package-name> --template-help

# Example:
npx @tachles/starter nextjs-prisma-shadcn --template-help
```

### 3. Install with defaults (skip prompts)
```bash
npx @tachles/starter <package-name> -y

# Example:
npx @tachles/starter nextjs-prisma-shadcn -y
```

### 4. Force refresh from database (bypass Redis cache)
```bash
npx @tachles/starter <package-name> --force-refresh

# Example:
npx @tachles/starter nextjs-prisma-shadcn --force-refresh
```

### 5. Show cache details (verbose mode)
```bash
npx @tachles/starter <package-name> --verbose

# Example:
npx @tachles/starter nextjs-prisma-shadcn --verbose
```

### 6. Install specific version
```bash
npx @tachles/starter <package-name> --version 1.2.0

# Example:
npx @tachles/starter nextjs-prisma-shadcn --version 1.2.0
```

### 7. Combine options
```bash
# Install specific version with verbose output
npx @tachles/starter nextjs-prisma-shadcn --version 1.2.0 --verbose

# Force refresh and use defaults
npx @tachles/starter nextjs-prisma-shadcn --force-refresh -y
```

## 🧪 Testing Locally

### Link the package locally:
```bash
npm link
```

### Test the commands:
```bash
# Show version
tachles --version

# Show help
tachles --help

# Try installing a template (will fail if API isn't set up yet)
tachles my-template-id

# Get template help
tachles my-template-id --help

# Use with defaults
tachles my-template-id -y
```

## 🚀 Next Steps

### 1. Configure API URL
Update the API URL in [src/constants.ts](src/constants.ts):
```typescript
export const API_BASE_URL = 'https://your-actual-api.vercel.app';
```

Or set environment variable:
```bash
export TACHLES_API_URL=https://your-actual-api.vercel.app
```

### 2. Update Package Info
Edit [package.json](package.json):
- Update `repository.url`
- Update `homepage`
- Update `bugs.url`

### 3. Test with Real API
Once your Tachles API is deployed:
```bash
# Test fetching a real template
tachles <your-template-id> --help

# Test installation
tachles <your-template-id>
```

### 4. Publish to npm
When ready to publish:
```bash
# Login to npm
npm login

# Publish
npm publish --access public
```

## 📝 What Each Command Does

### `npx @tachles/starter <package-name>`
1. Fetches template recipe from your API (uses Redis cache)
2. Shows interactive prompts for customization
3. Installs packages based on selections
4. Runs setup commands
5. Reports installation statistics

### `npx @tachles/starter <package-name> --template-help`
1. Fetches template metadata from your API
2. Displays:
   - Template name and description
   - Configuration options available
   - Default values
   - Usage examples
3. Exits without installing

### `--force-refresh` Flag
Forces the API to:
1. Bypass Redis cache
2. Query database directly
3. Update cache with fresh data
4. Use when testing template updates

### `--verbose` Flag
Shows detailed information:
- Cache status (HIT/MISS/STALE)
- Cache source (redis/database)
- Cache key used
- Cache age and TTL
- API response headers

### `--version` Flag
- Specifies exact template version to install
- Uses separate cache key for each version
- Ensures version consistency

## 🔧 API Integration

Your CLI expects these API endpoints:

### GET `/api/cli/templates/{id}`
Returns template data (with Redis caching):

**Request Headers:**
```
Authorization: Bearer <token>
User-Agent: @tachles/starter-cli/1.0.0
Cache-Control: no-cache (with --force-refresh)
X-Force-Refresh: true (with --force-refresh)
```

**Query Parameters:**
- `version` (optional): Specific version to fetch

**Response:**
```json
{
  "success": true,
  "data": {
    "templateId": "nextjs-prisma-shadcn",
    "version": "1.0.0",
    "metadata": {
      "name": "Next.js + Prisma + shadcn/ui",
      "description": "Full-stack template...",
      "author": "Your Name",
      "homepage": "https://..."
    },
    "recipe": {
      "engine": "^0.1.0",
      "variables": [...]
    }
  }
}
```

**Response Headers (for caching):**
```
X-Cache-Status: HIT | MISS | STALE | ERROR
X-Cache-Source: redis | database | cache
X-Cache-Key: template:{id}:v{version}
X-Cache-Age: 1234 (seconds)
X-Cache-TTL: 2366 (seconds)
```

**Cache Flow:**
1. API receives request
2. Checks Redis cache first
3. If HIT: Return cached data (fast!)
4. If MISS: Query database → Cache in Redis → Return
5. If force-refresh: Skip cache → Query database → Update cache

See [API-INTEGRATION.md](API-INTEGRATION.md) for complete implementation details.
See [CACHE-REFERENCE.md](CACHE-REFERENCE.md) for cache system quick reference.
```

### POST `/api/cli/installations`
Reports installation statistics:
```json
{
  "templateId": "nextjs-prisma-shadcn",
  "templateVersion": "1.0.0",
  "projectId": "sha256_hash",
  "selections": {
    "useTypeScript": true,
    "database": "postgresql"
  }
}
```

## 🐛 Troubleshooting

### Build errors
```bash
npm run build
```

### Test without publishing
```bash
npm link
tachles <template-id>
```

### Unlink when done testing
```bash
npm unlink -g @tachles/starter
```

## 📦 Dependencies Installed

Core:
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Loading spinners
- `axios` - HTTP client
- `zod` - Schema validation
- `execa` - Execute commands
- `conf` - Config storage
- `update-notifier` - Update notifications

## ✨ Features Implemented

✅ Install templates with `npx @tachles/starter <package-name>`
✅ Show template help with `--template-help` flag
✅ Interactive prompts for customization
✅ Skip prompts with `-y` flag
✅ **Redis cache support with status tracking**
✅ **Force cache refresh with `--force-refresh`**
✅ **Verbose mode with `--verbose` for cache details**
✅ **Version-specific installation with `--version`**
✅ Package manager detection (npm/yarn/pnpm)
✅ Execute custom commands
✅ Environment variable setup guidance
✅ Installation statistics reporting
✅ Error handling with helpful messages
✅ Authentication support (for private templates)
✅ Update notifications
✅ **Cache status indicators (⚡ HIT, 💾 MISS, 📡 Other)**

## 🎉 Ready to Use!

Your CLI tool is fully functional. Test it locally with `npm link`, then publish to npm when ready!
