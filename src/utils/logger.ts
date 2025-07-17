import chalk from 'chalk';
import ora from 'ora';

export class Logger {
  private spinner = ora();

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  log(message: string): void {
    console.log(message);
  }

  startSpinner(text: string): void {
    this.spinner.start(text);
  }

  updateSpinner(text: string): void {
    this.spinner.text = text;
  }

  succeedSpinner(text?: string): void {
    this.spinner.succeed(text);
  }

  failSpinner(text?: string): void {
    this.spinner.fail(text);
  }

  stopSpinner(): void {
    this.spinner.stop();
  }

  table(data: Record<string, any>[]): void {
    console.table(data);
  }

  divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  header(text: string): void {
    console.log();
    console.log(chalk.bold.cyan(text));
    this.divider();
  }

  subheader(text: string): void {
    console.log();
    console.log(chalk.bold(text));
  }
}

export const logger = new Logger();