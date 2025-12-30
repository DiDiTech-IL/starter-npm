import inquirer from 'inquirer';
import chalk from 'chalk';
import { Variable } from '../api/types.js';

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
