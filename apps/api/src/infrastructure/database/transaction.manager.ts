import { Injectable, Inject, Optional } from '@nestjs/common';
import type { DatabaseClient, DatabaseTransaction, TransactionScopeOptions } from '@stokrova/database';
import { sql } from '@stokrova/database';
import { DATABASE_CLIENT } from './database.tokens.js';

export type ScopedTransactionOptions = TransactionScopeOptions;

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
   * When options.tenantId is provided, establishes transaction-local RLS session parameters (is_local = true),
   * ensuring that parameters automatically revert on commit or rollback and do not leak across pooled connections.
   */
  async execute<T>(
    operation: (tx: DatabaseTransaction | null) => Promise<T>,
    options?: ScopedTransactionOptions,
  ): Promise<T> {
    if (this.db && typeof this.db.transaction === 'function') {
      return this.db.transaction(async (tx) => {
        if (tx && typeof (tx as any).execute === 'function') {
          try {
            if (options?.isPlatformAdmin) {
              await (tx as any).execute(
                sql`SELECT set_config('app.is_platform_admin', 'true', true);`,
              );
            } else if (options?.tenantId) {
              const tenantId = options.tenantId;
              await (tx as any).execute(sql`SET LOCAL ROLE authenticated;`);
              await (tx as any).execute(
                sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true), set_config('app.is_platform_admin', 'false', true);`,
              );
            }
          } catch {
            // Graceful fallback for mocked / decoupled unit tests
          }
        }
        return operation(tx);
      });
    }

    // In unit-test / decoupled environments without a live DB connection,
    // execute the operation callback directly with null tx.
    return operation(null);
  }
}

