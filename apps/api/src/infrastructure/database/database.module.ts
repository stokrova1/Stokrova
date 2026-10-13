import { Module, Global } from '@nestjs/common';
import { createDatabaseClient } from '@stokrova/database';
import { ApiConfigService } from '../../config/api-config.service.js';
import { DATABASE_CLIENT, DATABASE_POOL } from './database.tokens.js';
import { TransactionManager } from './transaction.manager.js';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => {
        try {
          const { db } = createDatabaseClient(configService.config.databaseUrl);
          return db;
        } catch {
          return null;
        }
      },
    },
    {
      provide: DATABASE_POOL,
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => {
        try {
          const { pool } = createDatabaseClient(configService.config.databaseUrl);
          return pool;
        } catch {
          return null;
        }
      },
    },
    TransactionManager,
  ],
  exports: [DATABASE_CLIENT, DATABASE_POOL, TransactionManager],
})
export class DatabaseModule {}
