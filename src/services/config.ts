import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export interface Config {
  hevyApiKey?: string;
  airiaApiKey?: string;
  airiaPipelineId?: string;
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

  public getAiriaApiKey(): string | undefined {
    return this.config.airiaApiKey;
  }

  public setAiriaApiKey(key: string): void {
    this.config.airiaApiKey = key;
  }

  public getAiriaPipelineId(): string | undefined {
    return this.config.airiaPipelineId;
  }

  public setAiriaPipelineId(id: string): void {
    this.config.airiaPipelineId = id;
  }

  public hasRequiredKeys(): boolean {
    return Boolean(this.config.hevyApiKey && this.config.airiaApiKey && this.config.airiaPipelineId);
  }

  public validateHevyApiKey(key: string): boolean {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  }

  public validateAiriaApiKey(key: string): boolean {
    // Basic API key validation - adjust based on Airia's format
    return key.length > 10 && key.trim().length > 0;
  }
}