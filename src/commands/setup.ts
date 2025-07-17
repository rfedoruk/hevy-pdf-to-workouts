import inquirer from 'inquirer';
import { ConfigManager } from '../services/config.js';
import { HevyApiClient } from '../services/hevy-api.js';
import { ClaudeApiClient } from '../services/claude-api.js';
import { logger } from '../utils/logger.js';

export async function setupCommand(): Promise<void> {
  const config = new ConfigManager();

  logger.header('🔧 Hevy Importer Setup');
  logger.info('Let\'s configure your API keys to get started.');
  logger.log('');

  // Get Hevy API key
  const { hevyApiKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'hevyApiKey',
      message: 'Enter your Hevy API key:',
      default: config.getHevyApiKey(),
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Hevy API key is required';
        }
        if (!config.validateHevyApiKey(input.trim())) {
          return 'Invalid Hevy API key format. Must be a valid UUID.';
        }
        return true;
      },
    },
  ]);

  // Test Hevy API connection
  logger.startSpinner('Testing Hevy API connection...');
  const hevyClient = new HevyApiClient(hevyApiKey.trim());
  const hevyConnected = await hevyClient.testConnection();

  if (!hevyConnected) {
    logger.failSpinner('Failed to connect to Hevy API');
    logger.error('Please check your API key and try again.');
    return;
  }
  logger.succeedSpinner('Hevy API connection successful');

  // Get Claude API key
  const { claudeApiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'claudeApiKey',
      message: 'Enter your Claude API key:',
      default: config.getClaudeApiKey(),
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Claude API key is required';
        }
        if (!config.validateClaudeApiKey(input.trim())) {
          return 'Invalid Claude API key format. Must start with sk-ant-';
        }
        return true;
      },
    },
  ]);

  // Test Claude API connection
  logger.startSpinner('Testing Claude API connection...');
  const claudeClient = new ClaudeApiClient(claudeApiKey.trim());
  const claudeConnected = await claudeClient.testConnection();

  if (!claudeConnected) {
    logger.failSpinner('Failed to connect to Claude API');
    logger.error('Please check your API key and try again.');
    return;
  }
  logger.succeedSpinner('Claude API connection successful');

  // Save configuration
  try {
    config.setHevyApiKey(hevyApiKey.trim());
    config.setClaudeApiKey(claudeApiKey.trim());
    config.saveConfig();

    logger.log('');
    logger.success('Configuration saved successfully!');
    logger.info('You can now use the import command to process workout PDFs.');
    logger.log('');
    logger.info('Next steps:');
    logger.log('  1. Run: hevy-importer preview <pdf-file>');
    logger.log('  2. Run: hevy-importer import <pdf-file>');
  } catch (error) {
    logger.error(`Failed to save configuration: ${error}`);
  }
}