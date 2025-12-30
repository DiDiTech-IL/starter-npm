# Tachles CLI Package Development Guide

This guide explains how to create the companion CLI npm package (`@tachles/starter`) that connects to your Tachles Starter platform and executes templates.

## Overview

The CLI package allows users to install templates created in your dashboard. It:
- Fetches template recipes from your API by template ID
- Asks users setup questions interactively
- Installs packages based on their answers
- Runs commands with different package managers (npm, yarn, pnpm, npx, custom)
- Reports installation statistics back to your platform
- Supports authentication for private templates

**Core Usage:**
```bash
npx @tachles/starter <template-id>

# Example:
npx @tachles/starter nextjs-prisma-shadcn
```

## Architecture

```
┌─────────────────────────────────────┐
│   Tachles Dashboard (Next.js App)  │
│   - Template Builder                │
│   - Version Management              │
│   - Statistics Dashboard            │
└─────────────┬───────────────────────┘
              │
              │ REST API
              │
┌─────────────▼───────────────────────┐
│      API Endpoints                  │
│  - GET /api/cli/templates/{id}      │
│  - POST /api/cli/installations      │
└─────────────┬───────────────────────┘
              │
              │ Fetch & Report
              │
┌─────────────▼───────────────────────┐
│     Tachles CLI (npm package)       │
│  - Fetch template recipes           │
│  - Interactive prompts              │
│  - Execute installation steps       │
│  - Report back statistics           │
└─────────────────────────────────────┘
```

## Project Setup

### 1. Create New Project

```bash
mkdir tachles-cli
cd tachles-cli
npm init -y
```

### 2. Package.json Configuration

```json
{
  "name": "@tachles/starter",
  "version": "1.0.0",
  "description": "CLI tool for installing Tachles templates",
  "main": "dist/index.js",
  "bin": {
    "tachles": "./bin/tachles.js"
  },
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build",
    "test": "jest"
  },
  "keywords": ["cli", "template", "starter", "setup", "tachles", "scaffolding"],
  "author": "Tachles",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/tachles-cli"
  },
  "homepage": "https://your-app.vercel.app",
  "bugs": {
    "url": "https://github.com/your-org/tachles-cli/issues"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^10.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "axios": "^1.7.0",
    "zod": "^4.2.1",
    "execa": "^9.0.0",
    "conf": "^13.0.0",
    "update-notifier": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/inquirer": "^9.0.0",
    "typescript": "^5.7.0",
    "jest": "^29.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3. TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Project Structure

```
tachles-cli/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── commands/
│   │   ├── install.ts          # Install command handler
│   │   ├── login.ts            # Authentication
│   │   └── list.ts             # List available templates
│   ├── api/
│   │   ├── client.ts           # API client
│   │   └── types.ts            # API response types
│   ├── recipe/
│   │   ├── schema.ts           # Recipe schema (copy from dashboard)
│   │   ├── executor.ts         # Execute recipe steps
│   │   └── prompter.ts         # Interactive prompts
│   ├── utils/
│   │   ├── auth.ts             # Auth token management
│   │   ├── config.ts           # CLI config storage
│   │   ├── logger.ts           # Logging utilities
│   │   └── package-manager.ts # Detect & execute package managers
│   └── constants.ts            # API URL and constants
├── bin/
│   └── tachles.js              # CLI executable
├── package.json
├── tsconfig.json
└── README.md
```

## Core Implementation

### 1. API Client (`src/api/client.ts`)

```typescript
import axios, { AxiosInstance } from 'axios';
import { getAuthToken } from '../utils/auth.js';

export class TachlesAPIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.TACHLES_API_URL || 'https://your-app.vercel.app';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async fetchTemplate(templateId: string) {
    const response = await this.client.get(`/api/cli/templates/${templateId}`);
    return response.data;
  }

  async reportInstallation(data: {
    templateId: string;
    templateVersion: string;
    projectId: string;
    originUrl?: string;
    selections: Record<string, string | boolean>;
  }) {
    const response = await this.client.post('/api/cli/installations', data);
    return response.data;
  }
}
```

### 2. Recipe Schema (`src/recipe/schema.ts`)

Copy the exact schema from your dashboard:

```typescript
// Copy from: c:\dev\didi-tech\tachles-starter\lib\recipes\schema.ts
// This ensures type compatibility between dashboard and CLI

import { z } from 'zod';

export const WhenConditionSchema: z.ZodType<WhenCondition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('always') }),
    z.object({
      type: z.literal('varEquals'),
      key: z.string(),
      value: z.union([z.string(), z.boolean()]),
    }),
    z.object({
      type: z.literal('and'),
      items: z.array(WhenConditionSchema),
    }),
    z.object({
      type: z.literal('or'),
      items: z.array(WhenConditionSchema),
    }),
  ])
);

export type WhenCondition =
  | { type: 'always' }
  | { type: 'varEquals'; key: string; value: string | boolean }
  | { type: 'and'; items: WhenCondition[] }
  | { type: 'or'; items: WhenCondition[] };

export const VariableSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('confirm'),
    key: z.string(),
    label: z.string(),
    defaultValue: z.boolean().optional(),
    onTrue: z.object({
      packages: z.array(z.object({
        name: z.string(),
        version: z.string(),
      })).optional(),
      envVariables: z.array(z.object({
        key: z.string(),
        description: z.string(),
        required: z.boolean().default(true),
      })).optional(),
      commands: z.array(z.object({
        runner: z.enum(['npx', 'npm', 'yarn', 'pnpm', 'custom']).optional().default('npx'),
        packageName: z.string(),
        commandArgs: z.string(),
        customCommand: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
    }).optional(),
    onFalse: z.object({
      packages: z.array(z.object({
        name: z.string(),
        version: z.string(),
      })).optional(),
      envVariables: z.array(z.object({
        key: z.string(),
        description: z.string(),
        required: z.boolean().default(true),
      })).optional(),
      commands: z.array(z.object({
        runner: z.enum(['npx', 'npm', 'yarn', 'pnpm', 'custom']).optional().default('npx'),
        packageName: z.string(),
        commandArgs: z.string(),
        customCommand: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
    }).optional(),
  }),
  z.object({
    type: z.literal('select'),
    key: z.string(),
    label: z.string(),
    options: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        operations: z.object({
          packages: z.array(z.object({
            name: z.string(),
            version: z.string(),
          })).optional(),
          envVariables: z.array(z.object({
            key: z.string(),
            description: z.string(),
            required: z.boolean().default(true),
          })).optional(),
          commands: z.array(z.object({
            runner: z.enum(['npx', 'npm', 'yarn', 'pnpm', 'custom']).optional().default('npx'),
            packageName: z.string(),
            commandArgs: z.string(),
            customCommand: z.string().optional(),
            description: z.string().optional(),
          })).optional(),
        }).optional(),
      })
    ),
    defaultValue: z.string().optional(),
  }),
]);

export type Variable = z.infer<typeof VariableSchema>;

export const RecipeSchema = z.object({
  engine: z.string(),
  variables: z.array(VariableSchema),
  steps: z.array(z.any()).optional(),
  installationGroups: z.array(z.any()).optional(),
  verifiedPackages: z.array(z.string()).optional(),
  envKeys: z.array(z.object({
    key: z.string(),
    description: z.string(),
  })).optional(),
});

export type Recipe = z.infer<typeof RecipeSchema>;
```

### 3. Interactive Prompter (`src/recipe/prompter.ts`)

```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Variable } from './schema.js';

export class RecipePrompter {
  private selections: Record<string, string | boolean> = {};

  async prompt(variables: Variable[]): Promise<Record<string, string | boolean>> {
    console.log(chalk.blue('\n🎯 Template Setup\n'));

    for (const variable of variables) {
      if (variable.type === 'confirm') {
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'value',
            message: variable.label,
            default: variable.defaultValue ?? true,
          },
        ]);
        this.selections[variable.key] = answer.value;
      } else if (variable.type === 'select') {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'value',
            message: variable.label,
            choices: variable.options.map((opt) => ({
              name: opt.label,
              value: opt.value,
            })),
            default: variable.defaultValue,
          },
        ]);
        this.selections[variable.key] = answer.value;
      }
    }

    return this.selections;
  }

  getSelections(): Record<string, string | boolean> {
    return this.selections;
  }
}
```

### 4. Recipe Executor (`src/recipe/executor.ts`)

```typescript
import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { Recipe, Variable } from './schema.js';
import { detectPackageManager } from '../utils/package-manager.js';

export class RecipeExecutor {
  private selections: Record<string, string | boolean>;
  private skipYes: boolean;

  constructor(selections: Record<string, string | boolean>, skipYes = false) {
    this.selections = selections;
    this.skipYes = skipYes;
  }

  async execute(recipe: Recipe) {
    console.log(chalk.blue('\n📦 Installing dependencies...\n'));

    for (const variable of recipe.variables) {
      if (variable.type === 'confirm') {
        const answer = this.selections[variable.key] as boolean;
        const operations = answer ? variable.onTrue : variable.onFalse;

        if (operations) {
          await this.executeOperations(operations);
        }
      } else if (variable.type === 'select') {
        const answer = this.selections[variable.key] as string;
        const option = variable.options.find((opt) => opt.value === answer);

        if (option?.operations) {
          await this.executeOperations(option.operations);
        }
      }
    }

    console.log(chalk.green('\n✅ Installation complete!\n'));
  }

  private async executeOperations(operations: any) {
    // Install packages
    if (operations.packages && operations.packages.length > 0) {
      await this.installPackages(operations.packages);
    }

    // Set env variables
    if (operations.envVariables && operations.envVariables.length > 0) {
      await this.setupEnvVariables(operations.envVariables);
    }

    // Run commands
    if (operations.commands && operations.commands.length > 0) {
      await this.runCommands(operations.commands);
    }
  }

  private async installPackages(packages: Array<{ name: string; version: string }>) {
    const pm = detectPackageManager();
    const spinner = ora('Installing packages...').start();

    try {
      const packageStrings = packages.map((pkg) =>
        pkg.version === 'latest' ? pkg.name : `${pkg.name}@${pkg.version}`
      );

      const installCmd = pm === 'npm' ? 'install' : 'add';
      await execa(pm, [installCmd, ...packageStrings], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      spinner.succeed(`Installed: ${packageStrings.join(', ')}`);
    } catch (error) {
      spinner.fail('Package installation failed');
      throw error;
    }
  }

  private async setupEnvVariables(envVars: Array<{ key: string; description: string; required: boolean }>) {
    console.log(chalk.yellow('\n⚙️  Environment Variables Setup\n'));
    
    for (const envVar of envVars) {
      console.log(chalk.dim(`${envVar.key}: ${envVar.description}`));
    }

    console.log(chalk.dim('\nPlease add these variables to your .env file manually.\n'));
  }

  private async runCommands(commands: Array<{
    runner: 'npx' | 'npm' | 'yarn' | 'pnpm' | 'custom';
    packageName: string;
    commandArgs: string;
    customCommand?: string;
    description?: string;
  }>) {
    for (const cmd of commands) {
      const spinner = ora(cmd.description || 'Running command...').start();

      try {
        if (cmd.runner === 'custom' && cmd.customCommand) {
          // Execute custom shell command
          await execa(cmd.customCommand, {
            shell: true,
            stdio: this.skipYes ? 'pipe' : 'inherit',
            cwd: process.cwd(),
          });
        } else {
          // Execute package manager command
          const runner = cmd.runner || 'npx';
          const fullCommand = `${cmd.packageName} ${cmd.commandArgs}`.trim();
          const args = fullCommand.split(' ');

          await execa(runner, args, {
            stdio: this.skipYes ? 'pipe' : 'inherit',
            cwd: process.cwd(),
          });
        }

        spinner.succeed(cmd.description || 'Command completed');
      } catch (error) {
        spinner.fail('Command failed');
        
        // Ask user if they want to continue
        if (!this.skipYes) {
          const inquirer = (await import('inquirer')).default;
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Continue with remaining steps?',
              default: true,
            },
          ]);

          if (!answer.continue) {
            throw new Error('Installation aborted by user');
          }
        }
      }
    }
  }
}
```

### 5. Package Manager Detection (`src/utils/package-manager.ts`)

```typescript
import fs from 'fs';
import path from 'path';

export function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
  const cwd = process.cwd();

  // Check for lockfiles
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  
  // Default to npm
  return 'npm';
}
```

### 6. Auth Management (`src/utils/auth.ts`)

```typescript
import Conf from 'conf';

const config = new Conf({ projectName: 'tachles-cli' });

export function setAuthToken(token: string) {
  config.set('authToken', token);
}

export function getAuthToken(): string | undefined {
  return config.get('authToken') as string | undefined;
}

export function clearAuthToken() {
  config.delete('authToken');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
```

### 7. Install Command (`src/commands/install.ts`)

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createHash } from 'crypto';
import { TachlesAPIClient } from '../api/client.js';
import { RecipePrompter } from '../recipe/prompter.js';
import { RecipeExecutor } from '../recipe/executor.js';

export function createInstallCommand() {
  const command = new Command('install')
    .alias('i')
    .description('Install a Tachles template')
    .argument('[template-id]', 'Template ID to install (e.g., nextjs-prisma-shadcn). If not provided, shows interactive menu.')
    .option('-y, --yes', 'Skip all prompts and use defaults')
    .action(async (templateId: string | undefined, options) => {
      const spinner = ora('Fetching template...').start();

      try {
        const api = new TachlesAPIClient();
        
        // Fetch template
        const response = await api.fetchTemplate(templateId);
        spinner.succeed(`Fetched template: ${templateId} (v${response.data.version})`);

        const recipe = response.data.recipe;

        // Prompt user for selections
        const prompter = new RecipePrompter();
        const selections = options.yes
          ? getDefaultSelections(recipe.variables)
          : await prompter.prompt(recipe.variables);

        // Execute recipe
        const executor = new RecipeExecutor(selections, options.yes);
        await executor.execute(recipe);

        // Report installation
        const projectId = createHash('sha256')
          .update(process.cwd())
          .digest('hex');

        await api.reportInstallation({
          templateId,
          templateVersion: response.data.version,
          projectId,
          selections,
        });

        console.log(chalk.green('\\n✨ Template installed successfully!\\n'));
      } catch (error: any) {
        spinner.fail('Installation failed');
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });

  return command;
}

function getDefaultSelections(variables: any[]): Record<string, string | boolean> {
  const selections: Record<string, string | boolean> = {};
  
  for (const variable of variables) {
    if (variable.type === 'confirm') {
      selections[variable.key] = variable.defaultValue ?? true;
    } else if (variable.type === 'select') {
      selections[variable.key] = variable.defaultValue || variable.options[0].value;
    }
  }
  
  return selections;
}
```

### 8. Main Entry (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInstallCommand } from './commands/install.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Check for updates
updateNotifier({ pkg: packageJson }).notify();

// Create CLI
const program = new Command();

program
  .name('tachles')
  .description('CLI tool for installing Tachles templates')
  .version(packageJson.version);

// Add install as default command
const installCmd = createInstallCommand();
program.addCommand(installCmd, { isDefault: true });

// Parse arguments
program.parse();
```

### 9. CLI Executable (`bin/tachles.js`)

```javascript
#!/usr/bin/env node
import '../dist/index.js';
```

## Environment Configuration

### For Development

Create `.env` file in CLI project:

```env
TACHLES_API_URL=http://localhost:3000
```

### For Production

Users can set environment variables:

```bash
export TACHLES_API_URL=https://your-app.vercel.app
```

Or hardcode in `src/constants.ts`:

```typescript
export const API_BASE_URL = process.env.TACHLES_API_URL || 'https://your-app.vercel.app';
```

## Authentication Setup

For private templates, implement Clerk JWT authentication:

### 1. Login Command (`src/commands/login.ts`)

```typescript
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { setAuthToken } from '../utils/auth.js';

export function createLoginCommand() {
  const command = new Command('login')
    .description('Authenticate with Tachles platform')
    .action(async () => {
      console.log(chalk.blue('\\n🔐 Login to Tachles\\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'token',
          message: 'Enter your API token:',
          validate: (input) => input.length > 0 || 'Token is required',
        },
      ]);

      setAuthToken(answers.token);
      console.log(chalk.green('\\n✅ Successfully logged in!\\n'));
    });

  return command;
}
```

### 2. Token Generation in Dashboard

Add API token generation to your dashboard:

```typescript
// In dashboard: app/api/user/generate-token/route.ts
import { requireAuth } from '@/lib/auth';
import { generateToken } from '@clerk/backend';

export async function POST() {
  const { userId } = await requireAuth();
  
  // Generate JWT token with Clerk
  const token = await generateToken({
    userId,
    expiresInSeconds: 60 * 60 * 24 * 365, // 1 year
  });
  
  return NextResponse.json({ token });
}
```

## Testing

### Unit Tests Example (`src/__tests__/recipe-executor.test.ts`)

```typescript
import { RecipeExecutor } from '../recipe/executor';

describe('RecipeExecutor', () => {
  it('should execute confirm variable operations', async () => {
    const selections = { useTypeScript: true };
    const executor = new RecipeExecutor(selections, true);
    
    const recipe = {
      engine: '^0.1.0',
      variables: [
        {
          type: 'confirm',
          key: 'useTypeScript',
          label: 'Use TypeScript?',
          onTrue: {
            packages: [{ name: 'typescript', version: 'latest' }],
          },
        },
      ],
    };

    await expect(executor.execute(recipe)).resolves.not.toThrow();
  });
});
```

## Publishing to npm

### 1. Build the Package

```bash
npm run build
```

### 2. Test Locally

```bash
npm link
tachles install my-template
```

### 3. Publish

```bash
npm login
npm publish --access public
```

### 4. Verify Package

Test the published package:

```bash
npx @tachles/starter nextjs-prisma-shadcn
```

### 5. Update Your Dashboard

Add installation instructions to your dashboard templates page:

```bash
# Use directly with npx (recommended)
npx @tachles/starter <template-id>

# Example:
npx @tachles/starter nextjs-prisma-shadcn

# Or install globally
npm install -g @tachles/starter
tachles nextjs-prisma-shadcn

# With options (skip prompts)
npx @tachles/starter nextjs-prisma-shadcn -y
```

## Integration Checklist

- [ ] Dashboard API endpoints are deployed and accessible
- [ ] Redis cache is configured and working
- [ ] Rate limiting is properly configured
- [ ] Clerk authentication is set up for private templates
- [ ] Database schema includes all soft-delete fields
- [ ] Version statistics tracking is enabled
- [ ] CLI package is built and tested
- [ ] Error handling covers all API failure cases
- [ ] CLI respects `-y` flag for automation
- [ ] Installation reporting works correctly
- [ ] Package manager detection works
- [ ] Custom commands execute properly
- [ ] Environment variable setup guides users
- [ ] CLI update notifications are enabled

## API Endpoints Reference

Your dashboard exposes these endpoints:

### GET `/api/cli/templates/{id}`

**Query Parameters:**
- None

**Response:**
```json
{
  "success": true,
  "data": {
    "templateId": "nextjs-prisma-template",
    "version": "1.0.0",
    "recipe": {
      "engine": "^0.1.0",
      "variables": [...]
    }
  }
}
```

**Headers:**
- `X-Cache`: HIT or MISS
- `X-RateLimit-Remaining`: Number

### POST `/api/cli/installations`

**Authentication:** Required (Bearer token)

**Body:**
```json
{
  "templateId": "nextjs-prisma-template",
  "templateVersion": "1.0.0",
  "projectId": "sha256_hash_of_path",
  "originUrl": "https://github.com/user/repo",
  "selections": {
    "useTypeScript": true,
    "database": "postgresql"
  }Quick Start Guide

### Step-by-Step Setup

1. **Create Project Directory**

```bash
mkdir tachles-cli
cd tachles-cli
npm init -y
```

2. **Install Dependencies**

```bash
# Production dependencies
npm install commander inquirer@10.0.0 chalk@5.3.0 ora@8.0.0 axios zod execa@9.0.0 conf@13.0.0 update-notifier@7.0.0

# Development dependencies
npm install -D typescript@5.7.0 @types/node@22.0.0 @types/inquirer@9.0.0 jest@29.0.0
```

3. **Set Up TypeScript**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. **Update package.json**

```json
{
  "name": "@tachles/starter",
  "version": "1.0.0",
  "description": "CLI tool for installing Tachles templates",
  "main": "dist/index.js",
  "bin": {
    "tachles": "./bin/tachles.js"
  },
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["cli", "template", "starter", "tachles"],
  "author": "Tachles",
  "license": "MIT"
}
```

5. **Copy Files from Guide Above**

Create the directory structure and copy all the implementation files from the sections above:
- `src/index.ts`
- `src/commands/install.ts`
- `src/api/client.ts`
- `src/recipe/schema.ts` (copy from dashboard)
- `src/recipe/executor.ts`
- `src/recipe/prompter.ts`
- `src/utils/auth.ts`
- `src/utils/package-manager.ts`
- `bin/tachles.js`

6. **Build**

```bash
npm run build
```

7. **Test Locally**

```bash
npm link
tachles nextjs-prisma-shadcn
```

8. **Publish to npm**

```bash
# Login to npm
npm login

# Publish (first time)
npm publish --access public

# Update version and publish
npm version patch
npm publish
```

## Publishing Checklist

Before publishing to npm:

- [ ] All TypeScript files compile without errors
- [ ] `package.json` has correct name: `@tachles/starter`
- [ ] Version number is correct
- [ ] Repository URL is set
- [ ] Homepage URL points to your dashboard
- [ ] Keywords include relevant terms
- [ ] README.md explains installation and usage
- [ ] LICENSE file is included
- [ ] `.npmignore` excludes source files (only ship `dist/`)
- [ ] Test with `npm pack` to verify package contents
- [ ] Test locally with `npm link`
- [ ] Verify with a real template installation
- [ ] Dashboard API is deployed and accessible

## .npmignore

Create `.npmignore`:
```
src/
tsconfig.json
*.ts
!*.d.ts
node_modules/
.env
.git
.DS_Store
```

## README for CLI Package

Create `README.md` for the CLI package:

```markdown
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
# With npx
npx @tachles/starter <template-id>

# Or if installed globally
tachles <template-id>
```

### Skip Prompts (Use Defaults)

```bash
npx @tachles/starter <template-id> -y
```

### Login (for Private Templates)

```bash
npx @tachles/starter login
```

### Browse Templates

Visit [Tachles Dashboard](https://your-app.vercel.app/templates) to find template IDs.

## Examples

```bash
# Install Next.js + Prisma + shadcn/ui template
npx @tachles/starter nextjs-prisma-shadcn

# Install with default answers
npx @tachles/starter nextjs-prisma-shadcn -y

# Install a different template
npx @tachles/starter express-typescript-api
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
```

## Next Steps

1. **Create CLI Repository**: Set up new repository with the structure above
2. **Copy Recipe Schema**: Ensure schema matches dashboard exactly (copy from `lib/recipes/schema.ts`)
3. **Implement Core Features**: Start with install command
4. **Add Authentication**: Implement login for private templates
5. **Test Thoroughly**: Test with various templates and scenarios
6. **Publish Beta**: Release as `1.0.0-beta.1` for testing
7. **Gather Feedback**: Iterate based on user feedback
8. **Production Release**: Publish stable `1.0.0` to npm
9. **Update Dashboard**: Add installation instructions with `@tachles/starter`

## Example Installation Flow

What users will experience:

```bash
$ npx @tachles/starter nextjs-prisma-shadcn

🎯 Template Setup: Next.js + Prisma + shadcn/ui

? What is your project name? my-awesome-app
? Which database provider? PostgreSQL
? Include authentication? Yes
? Which auth provider? Clerk

📦 Installing dependencies...

✓ Installed: typescript, @types/node, @types/react
✓ Installed: prisma, @prisma/client
✓ Installed: @clerk/nextjs
✓ Running: npx prisma init
✓ Running: npx shadcn-ui@latest init -y
✓ Created .env.example

✅ Template installed successfully!

Next steps:
1. cd my-awesome-app
2. Copy .env.example to .env and fill in values
3. Run: npm run dev

Documentation: https://your-app.vercel.app/templates/nextjs-prisma-shadcn
```
  },
  "message": "Installation recorded successfully"
}
```

## Next Steps

1. **Create CLI Repository**: Set up new repository with the structure above
2. **Copy Recipe Schema**: Ensure schema matches dashboard exactly
3. **Implement Core Features**: Start with install command
4. **Add Authentication**: Implement login for private templates
5. **Test Thoroughly**: Test with various templates and scenarios
6. **Publish Beta**: Release as beta version for testing
7. **Gather Feedback**: Iterate based on user feedback
8. **Production Release**: Publish stable version to npm

## Support

For questions or issues:
- Dashboard: https://your-app.vercel.app
- CLI Issues: https://github.com/your-org/tachles-cli/issues
- Documentation: https://your-app.vercel.app/docs
