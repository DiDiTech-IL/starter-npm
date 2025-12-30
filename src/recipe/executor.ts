import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { Recipe, Variable, Operations, Package, EnvVariable, Command } from '../api/types.js';
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

  private async executeOperations(operations: Operations) {
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

  private async installPackages(packages: Package[]) {
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

  private async setupEnvVariables(envVars: EnvVariable[]) {
    console.log(chalk.yellow('\n⚙️  Environment Variables Setup\n'));
    
    for (const envVar of envVars) {
      console.log(chalk.dim(`${envVar.key}: ${envVar.description}`));
    }

    console.log(chalk.dim('\nPlease add these variables to your .env file manually.\n'));
  }

  private async runCommands(commands: Command[]) {
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
