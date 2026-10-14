import { Module, Global } from '@nestjs/common';
import { createDatabaseClient } from '@stokrova/database';
import { ApiConfigService } from '../../config/api-config.service.js';
import { DATABASE_CLIENT, DATABASE_POOL } from './database.tokens.js';
import { TransactionManager } from './transaction.manager.js';

const DB_CONNECTION_HOLDER = Symbol('DB_CONNECTION_HOLDER');

@Global()
@Module({
  providers: [
    {
      provide: DB_CONNECTION_HOLDER,
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => {
        try {
          return createDatabaseClient(configService.config.databaseUrl);
        } catch {
          return { db: null, pool: null };
        }
      },
    },
    {
      provide: DATABASE_CLIENT,
      inject: [DB_CONNECTION_HOLDER],
      useFactory: (holder: { db: any; pool: any }) => holder.db,
    },
    {
      provide: DATABASE_POOL,
      inject: [DB_CONNECTION_HOLDER],
      useFactory: (holder: { db: any; pool: any }) => holder.pool,
    },
    TransactionManager,
  ],
  exports: [DATABASE_CLIENT, DATABASE_POOL, TransactionManager],
})
export class DatabaseModule {}
