#!/usr/bin/env node
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { installTemplate } from './commands/install';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Check for updates
updateNotifier({ pkg: packageJson }).notify();

// Parse command line arguments
const args = process.argv.slice(2);

// Handle --version flag
if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version);
  process.exit(0);
}

// Handle --help flag (no template specified)
if ((args.includes('--help') || args.includes('-h')) && args.length === 1) {
  console.log(chalk.blue('\n@tachles/starter - CLI tool for installing Tachles templates\n'));
  console.log(chalk.bold('Usage:'));
  console.log(chalk.dim('  npx @tachles/starter <template-id>[@version] [options]\n'));
  console.log(chalk.bold('Examples:'));
  console.log(chalk.dim('  npx @tachles/starter nextjs-prisma-shadcn'));
  console.log(chalk.dim('  npx @tachles/starter nextjs-prisma-shadcn@1.2.0'));
  console.log(chalk.dim('  npx @tachles/starter my-template -y'));
  console.log(chalk.dim('  npx @tachles/starter my-template --verbose\n'));
  console.log(chalk.bold('Options:'));
  console.log(chalk.dim('  -y, --yes            Skip all prompts and use defaults'));
  console.log(chalk.dim('  --force-refresh      Force refresh from database (bypass cache)'));
  console.log(chalk.dim('  --verbose            Show detailed cache and API information'));
  console.log(chalk.dim('  --template-help      Display help information for the template'));
  console.log(chalk.dim('  -h, --help           Display this help message'));
  console.log(chalk.dim('  -v, --version        Display version number\n'));
  process.exit(0);
}

// Extract template ID (first non-flag argument)
const templateArg = args.find(arg => !arg.startsWith('-'));

if (!templateArg) {
  console.error(chalk.red('\n❌ Error: Template ID is required\n'));
  console.log(chalk.blue('Usage: npx @tachles/starter <template-id>[@version] [options]\n'));
  console.log(chalk.dim('Example: npx @tachles/starter nextjs-prisma-shadcn'));
  console.log(chalk.dim('Example: npx @tachles/starter nextjs-prisma-shadcn@1.2.0\n'));
  console.log(chalk.dim('Run "npx @tachles/starter --help" for more information\n'));
  process.exit(1);
}

// Parse options
const options = {
  yes: args.includes('-y') || args.includes('--yes'),
  forceRefresh: args.includes('--force-refresh'),
  verbose: args.includes('--verbose'),
  templateHelp: args.includes('--template-help'),
};

// Run installation
installTemplate(templateArg, options).catch((error: Error) => {
  console.error(chalk.red(`\n❌ ${error.message}\n`));
  process.exit(1);
});
