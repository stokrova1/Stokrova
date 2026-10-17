import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import * as schema from '@stokrova/database';
const { getTableColumns } = schema;
import { TransactionManager } from './transaction.manager.js';

type Row = Record<string, unknown>;
type Persister = {
  upsert(table: string, value: unknown): void;
  remove(table: string, value: unknown): void;
};

const registry: DurableMap<any>[] = [];
let persister: Persister | null = null;

/**
 * A Map that writes every change through to its defined database table.
 * Services keep using it exactly like a Map (fast in-memory working set); when no database is
 * connected the persister is never bound, so tests and local runs behave as before.
 */
export class DurableMap<V> extends Map<string, V> {
  constructor(readonly tableName: string, entries?: Iterable<readonly [string, V]>) {
    super();
    if (entries) for (const [k, v] of entries) super.set(k, v);
    registry.push(this);
  }

  override set(key: string, value: V): this {
    super.set(key, value);
    persister?.upsert(this.tableName, value);
    return this;
  }

  override delete(key: string): boolean {
    const value = super.get(key);
    const removed = super.delete(key);
    if (removed && value !== undefined) persister?.remove(this.tableName, value);
    return removed;
  }

  /** Loads a row without writing it back (used on startup). */
  hydrate(key: string, value: V): void {
    super.set(key, value);
  }
}

const toDb = (value: unknown, dataType: string): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (dataType === 'date' && typeof value === 'string') return new Date(value);
  if (typeof value === 'bigint') return dataType === 'bigint' ? value : value.toString();
  return value;
};

const fromDb = (value: unknown): unknown => (value instanceof Date ? value.toISOString() : value);

/** Tables reloaded at startup even when DURABLE_HYDRATE is off (flat rows, no nested parts). */
export const ALWAYS_HYDRATE: ReadonlySet<string> = new Set(['pos_sync_transactions', 'tenant_subscriptions', 'saas_invoices', 'plan_change_history', 'fiscal_receipt_chains', 'stock_count_sessions', 'alert_settings', 'daily_work_sessions']);

/** Binds every DurableMap to the database when DATABASE_URL is configured. */
@Injectable()
export class DurableStore implements OnApplicationBootstrap {
  private readonly logger = new Logger(DurableStore.name);
  private readonly disabled = new Set<string>();

  constructor(@Optional() private readonly tx?: TransactionManager) {}

  private table(name: string): any {
    const t = (schema as Record<string, unknown>)[name];
    return t && typeof t === 'object' ? t : null;
  }

  /** Picks only the fields the table defines, so in-memory extras (nested lines, caches) are ignored. */
  toRow(name: string, value: unknown): Row | null {
    const t = this.table(name);
    if (!t || !value || typeof value !== 'object') return null;
    const row: Row = {};
    for (const [key, col] of Object.entries(getTableColumns(t)) as [string, any][]) {
      const v = toDb((value as Row)[key], col.dataType);
      if (v !== undefined) row[key] = v;
    }
    return 'id' in row ? row : null;
  }

  private run(name: string, value: unknown, op: (tx: any, t: any, row: Row) => Promise<unknown>): void {
    if (this.disabled.has(name)) return;
    const t = this.table(name);
    const row = this.toRow(name, value);
    if (!t || !row || !this.tx) return;
    const tenantId = typeof row['tenant_id'] === 'string' ? row['tenant_id'] : undefined;
    void this.tx
      .execute(async (tx) => { if (tx) await op(tx, t, row); }, tenantId ? { tenantId } : { isPlatformAdmin: true })
      .catch((e: Error) => this.logger.error(`Could not save ${name} ${String(row['id'])}: ${e.message}`));
  }

  onApplicationBootstrap(): Promise<void> {
    if (!this.tx || !process.env['DATABASE_URL']) return Promise.resolve();
    persister = {
      upsert: (name, value) =>
        this.run(name, value, (tx, t, row) => {
          const { id: _id, ...rest } = row;
          return tx.insert(t).values(row).onConflictDoUpdate({ target: t.id, set: rest });
        }),
      remove: (name, value) =>
        this.run(name, value, (tx, t, row) => tx.delete(t).where(schema.sql`${t.id} = ${row['id']}`)),
    };
    // Startup reload is opt-in: some records carry nested in-memory parts (e.g. lines) not stored in their row.
    // Flat records that must survive restarts (e.g. the till's "already counted" list) always reload.
    return this.hydrateAll(process.env['DURABLE_HYDRATE'] === 'true' ? undefined : ALWAYS_HYDRATE);
  }

  /** Reloads saved records into each Map keyed by id so data survives restarts. */
  private async hydrateAll(only?: ReadonlySet<string>): Promise<void> {
    const byTable = new Map<string, DurableMap<any>[]>();
    for (const m of registry) if (!only || only.has(m.tableName)) byTable.set(m.tableName, [...(byTable.get(m.tableName) ?? []), m]);
    for (const [name, maps] of byTable) {
      const t = this.table(name);
      if (!t) continue;
      try {
        const rows: Row[] = await this.tx!.execute(
          async (tx) => (tx ? (tx as any).select().from(t) : []),
          { isPlatformAdmin: true },
        );
        for (const r of rows) {
          const v = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, fromDb(x)]));
          for (const m of maps) m.hydrate(String(r['id']), v);
        }
      } catch (e) {
        this.disabled.add(name);
        this.logger.warn(`Table ${name} is not available yet (${(e as Error).message}); keeping it in memory.`);
      }
    }
  }
}
