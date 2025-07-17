#!/usr/bin/env node

import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { importCommand } from './commands/import.js';
import { previewCommand } from './commands/preview.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('hevy-importer')
  .description('Import workout plans from PDFs into Hevy')
  .version('1.0.0');

program
  .command('setup')
  .description('Configure API keys for Hevy and Claude')
  .action(async () => {
    try {
      await setupCommand();
    } catch (error) {
      logger.error(`Setup failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('import')
  .description('Import a workout plan PDF into Hevy')
  .argument('<pdf-file>', 'Path to the workout plan PDF file')
  .action(async (pdfFile: string) => {
    try {
      await importCommand(pdfFile);
    } catch (error) {
      logger.error(`Import failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('preview')
  .description('Preview what would be imported from a PDF without actually importing')
  .argument('<pdf-file>', 'Path to the workout plan PDF file')
  .action(async (pdfFile: string) => {
    try {
      await previewCommand(pdfFile);
    } catch (error) {
      logger.error(`Preview failed: ${error}`);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();