# @tachles/starter

Official CLI tool for installing Tachles templates.

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

# With specific version
npx @tachles/starter <template-id>@1.2.0

# Skip interactive prompts (use defaults)
npx @tachles/starter <template-id> -y
```

### Options

- `-y` - Skip prompts and use default values
- `--template-help` - Display template information without installing

## What It Does

1. Fetches template configuration from Tachles platform
2. Prompts for setup options
3. Installs required packages
4. Runs initialization commands
5. Configures environment variables

## Requirements

- Node.js 18 or higher
- npm, yarn, or pnpm

## License

MIT

