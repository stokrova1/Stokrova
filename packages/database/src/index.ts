import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema/index.js';

export { sql, getTableColumns } from 'drizzle-orm';
export * from './schema/index.js';
export * from './seed.js';

export type DatabaseSchema = typeof schema;
export type DatabaseClient = ReturnType<typeof drizzle<DatabaseSchema>>;
export type DatabaseTransaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];

export interface TransactionScopeOptions {
  tenantId?: string;
  isPlatformAdmin?: boolean;
}

export function createDatabaseClient(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export async function withTransaction<T>(
  db: DatabaseClient,
  operation: (tx: DatabaseTransaction) => Promise<T>,
  options?: TransactionScopeOptions,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (typeof (tx as any).execute === 'function') {
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
    }
    return operation(tx);
  });
}

