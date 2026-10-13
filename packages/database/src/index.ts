import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export * from './schema/index.js';
export * from './seed.js';

export type DatabaseSchema = typeof schema;
export type DatabaseClient = ReturnType<typeof drizzle<DatabaseSchema>>;
export type DatabaseTransaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];

export function createDatabaseClient(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export async function withTransaction<T>(
  db: DatabaseClient,
  operation: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    return operation(tx);
  });
}
