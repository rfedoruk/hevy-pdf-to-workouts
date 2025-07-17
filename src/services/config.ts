import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export interface Config {
  hevyApiKey?: string;
  claudeApiKey?: string;
}

const CONFIG_DIR = join(homedir(), '.hevy-importer');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private config: Config = {};

  constructor() {
    this.ensureConfigDir();
    this.loadConfig();
  }

  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  private loadConfig(): void {
    if (existsSync(CONFIG_FILE)) {
      try {
        const configData = readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(configData);
      } catch (error) {
        console.warn('Failed to load config file, using defaults');
        this.config = {};
      }
    }
  }

  public saveConfig(): void {
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  public getHevyApiKey(): string | undefined {
    return this.config.hevyApiKey;
  }

  public setHevyApiKey(key: string): void {
    this.config.hevyApiKey = key;
  }

  public getClaudeApiKey(): string | undefined {
    return this.config.claudeApiKey;
  }

  public setClaudeApiKey(key: string): void {
    this.config.claudeApiKey = key;
  }

  public hasRequiredKeys(): boolean {
    return Boolean(this.config.hevyApiKey && this.config.claudeApiKey);
  }

  public validateHevyApiKey(key: string): boolean {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  }

  public validateClaudeApiKey(key: string): boolean {
    // Claude API key starts with sk-ant-
    return key.startsWith('sk-ant-') && key.length > 20;
  }
}