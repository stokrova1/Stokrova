import { Injectable, Inject, Optional } from '@nestjs/common';
import type { DatabaseClient, DatabaseTransaction } from '@stokrova/database';
import { DATABASE_CLIENT } from './database.tokens.js';

@Injectable()
export class TransactionManager {
  constructor(
    @Optional()
    @Inject(DATABASE_CLIENT)
    private readonly db?: DatabaseClient,
  ) {}

  /**
   * Executes a business operation atomically inside a PostgreSQL transaction.
   * If any step fails, Drizzle issues an automatic ROLLBACK.
   */
  async execute<T>(
    operation: (tx: DatabaseTransaction | null) => Promise<T>,
  ): Promise<T> {
    if (this.db && typeof this.db.transaction === 'function') {
      return this.db.transaction(async (tx) => {
        return operation(tx);
      });
    }

    // In unit-test / decoupled environments without a live DB connection,
    // execute the operation callback directly with null tx.
    return operation(null);
  }
}
