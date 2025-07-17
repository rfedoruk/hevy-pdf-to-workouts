import inquirer from 'inquirer';
import { ConfigManager } from '../services/config.js';
import { HevyApiClient } from '../services/hevy-api.js';
import { AiriaApiClient } from '../services/airia-api.js';
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

  // Get Airia API key
  const { airiaApiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'airiaApiKey',
      message: 'Enter your Airia API key:',
      default: config.getAiriaApiKey(),
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Airia API key is required';
        }
        if (!config.validateAiriaApiKey(input.trim())) {
          return 'Invalid Airia API key format.';
        }
        return true;
      },
    },
  ]);

  // Get Airia Pipeline ID first, then test connection
  const { airiaPipelineId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'airiaPipelineId',
      message: 'Enter your Airia Pipeline ID for workout processing:',
      default: config.getAiriaPipelineId(),
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Airia Pipeline ID is required';
        }
        return true;
      },
    },
  ]);

  // Test Airia API connection
  logger.startSpinner('Testing Airia API connection...');
  const airiaClient = new AiriaApiClient(airiaApiKey.trim(), airiaPipelineId.trim());
  const airiaConnected = await airiaClient.testConnection();

  if (!airiaConnected) {
    logger.failSpinner('Failed to connect to Airia API');
    logger.error('Please check your API key and try again.');
    return;
  }
  logger.succeedSpinner('Airia API connection successful');

  // Save configuration
  try {
    config.setHevyApiKey(hevyApiKey.trim());
    config.setAiriaApiKey(airiaApiKey.trim());
    config.setAiriaPipelineId(airiaPipelineId.trim());
    config.saveConfig();

    logger.log('');
    logger.success('Configuration saved successfully!');
    logger.info('You can now use the import command to process workout Excel files.');
    logger.log('');
    logger.info('Next steps:');
    logger.log('  1. Run: hevy-importer preview <excel-file>');
    logger.log('  2. Run: hevy-importer import <excel-file>');
  } catch (error) {
    logger.error(`Failed to save configuration: ${error}`);
  }
}