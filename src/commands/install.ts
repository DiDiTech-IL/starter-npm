import chalk from 'chalk';
import ora from 'ora';
import { createHash } from 'crypto';
import { TachlesAPIClient } from '../api/client.js';
import { RecipePrompter } from '../recipe/prompter.js';
import { RecipeExecutor } from '../recipe/executor.js';
import { Variable } from '../api/types.js';

interface InstallOptions {
  yes?: boolean;
  forceRefresh?: boolean;
  verbose?: boolean;
  templateHelp?: boolean;
}

export async function installTemplate(templateArg: string, options: InstallOptions) {
  // Parse template@version syntax
  const { templateId, version } = parseTemplateArg(templateArg);

  const spinner = ora('Fetching template...').start();

  try {
    const api = new TachlesAPIClient(undefined, options.verbose);
    
    // Fetch template with options
    const response = await api.fetchTemplate(templateId, {
      version,
      forceRefresh: options.forceRefresh,
    });
    
    // Show cache information
    if (response.cacheInfo) {
      const cacheStatus = response.cacheInfo.status;
      const cacheIcon = cacheStatus === 'HIT' ? '⚡' : cacheStatus === 'MISS' ? '💾' : '📡';
      const versionStr = response.data.version ? `(v${response.data.version})` : '';
      spinner.succeed(
        `${cacheIcon} Fetched template: ${templateId} ${versionStr} [Cache: ${cacheStatus}]`
      );
    } else {
      const versionStr = response.data.version ? `(v${response.data.version})` : '';
      spinner.succeed(`Fetched template: ${templateId} ${versionStr}`);
    }

    const recipe = response.data.recipe;
    const metadata = response.data.metadata;

    // If --template-help flag is provided, show template information
    if (options.templateHelp) {
      displayTemplateHelp(templateId, response.data.version, metadata, recipe.variables);
      return;
    }

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
    
    // Show next steps
    if (recipe.envKeys && recipe.envKeys.length > 0) {
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.dim('1. Configure your environment variables in .env'));
      console.log(chalk.dim('2. Start your development server'));
      console.log();
    }

  } catch (error: any) {
    spinner.fail('Installation failed');
    
    if (error.response?.status === 404) {
      console.error(chalk.red(`\\n❌ Template "${templateId}" not found\\n`));
      console.log(chalk.dim('Visit https://your-app.vercel.app/templates to browse available templates\\n'));
    } else if (error.response?.status === 401) {
      console.error(chalk.red('\\n❌ Authentication required for this template\\n'));
      console.log(chalk.dim('Run: npx @tachles/starter login\\n'));
    } else {
      console.error(chalk.red(`\\n❌ ${error.message}\\n`));
    }
    
    throw error;
  }
}

/**
 * Parse template argument to extract template ID and version
 * Supports: "template-name" or "template-name@1.2.0"
 */
function parseTemplateArg(templateArg: string): { templateId: string; version?: string } {
  const atIndex = templateArg.lastIndexOf('@');
  
  // No @ symbol, just template ID
  if (atIndex === -1) {
    return { templateId: templateArg };
  }
  
  // Has @ symbol - split into template ID and version
  const templateId = templateArg.substring(0, atIndex);
  const version = templateArg.substring(atIndex + 1);
  
  // Validate version format (basic check)
  if (!version || version.trim() === '') {
    return { templateId: templateArg }; // Treat as no version
  }
  
  return { templateId, version };
}

function getDefaultSelections(variables: Variable[]): Record<string, string | boolean> {
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

function displayTemplateHelp(
  templateId: string,
  version: string,
  metadata: any,
  variables: Variable[]
) {
  console.log(chalk.blue(`\\n📦 Template: ${templateId}`));
  console.log(chalk.dim(`Version: ${version}\\n`));

  if (metadata) {
    if (metadata.name) {
      console.log(chalk.bold(metadata.name));
    }
    if (metadata.description) {
      console.log(chalk.dim(metadata.description));
      console.log();
    }
    if (metadata.author) {
      console.log(chalk.dim(`Author: ${metadata.author}`));
    }
    if (metadata.homepage) {
      console.log(chalk.dim(`Homepage: ${metadata.homepage}`));
    }
    console.log();
  }

  console.log(chalk.blue('Configuration Options:\\n'));
  
  for (const variable of variables) {
    if (variable.type === 'confirm') {
      console.log(chalk.bold(`  ${variable.label}`));
      console.log(chalk.dim(`    Type: Yes/No`));
      console.log(chalk.dim(`    Default: ${variable.defaultValue ? 'Yes' : 'No'}`));
      console.log();
    } else if (variable.type === 'select') {
      console.log(chalk.bold(`  ${variable.label}`));
      console.log(chalk.dim(`    Type: Select one`));
      console.log(chalk.dim(`    Options:`));
      variable.options.forEach((opt) => {
        const isDefault = opt.value === variable.defaultValue ? ' (default)' : '';
        console.log(chalk.dim(`      - ${opt.label}${isDefault}`));
      });
      console.log();
    }
  }

  console.log(chalk.blue('Usage:\\n'));
  console.log(chalk.dim(`  npx @tachles/starter ${templateId}`));
  console.log(chalk.dim(`  npx @tachles/starter ${templateId}@${version}`));
  console.log(chalk.dim(`  npx @tachles/starter ${templateId} -y  # Use defaults`));
  console.log(chalk.dim(`  npx @tachles/starter ${templateId} --verbose  # Show cache info`));
  console.log();
}
