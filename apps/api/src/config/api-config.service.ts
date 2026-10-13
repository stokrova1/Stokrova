import { Injectable, OnModuleInit } from '@nestjs/common';
import { validateConfig, sanitizeConfig } from '@stokrova/config';
import type { AppConfig } from '@stokrova/config';

@Injectable()
export class ApiConfigService implements OnModuleInit {
  private _config!: AppConfig;

  onModuleInit() {
    this._config = validateConfig(process.env);
  }

  get config(): AppConfig {
    if (!this._config) {
      this._config = validateConfig(process.env);
    }
    return this._config;
  }

  get isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  getSanitizedConfig(): Record<string, unknown> {
    return sanitizeConfig(this.config);
  }
}
