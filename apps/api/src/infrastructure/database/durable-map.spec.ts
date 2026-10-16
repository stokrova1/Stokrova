import { describe, expect, it } from 'vitest';
import { DurableMap, DurableStore } from './durable-map.js';

describe('DurableMap write-through', () => {
  it('saves only defined columns and keeps in-memory extras out of the row', () => {
    const store = new DurableStore();
    const row = store.toRow('crm_leads', { id: 'lead-1', tenant_id: 't1', not_a_column: [1, 2] });
    expect(row).toMatchObject({ id: 'lead-1', tenant_id: 't1' });
    expect(row).not.toHaveProperty('not_a_column');
  });

  it('upserts every set() into its table when a database is connected', async () => {
    const calls: string[] = [];
    const fakeTx = {
      insert: () => ({ values: (v: any) => ({ onConflictDoUpdate: async () => { calls.push(`upsert:${v.id}`); } }) }),
      delete: () => ({ where: async () => { calls.push('delete'); } }),
    };
    const tm = { execute: async (op: any) => op(fakeTx) } as any;
    process.env['DATABASE_URL'] = 'postgres://test';
    await new DurableStore(tm).onApplicationBootstrap();
    const leads = new DurableMap<any>('crm_leads');
    leads.set('lead-2', { id: 'lead-2', tenant_id: 't1' });
    leads.delete('lead-2');
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual(['upsert:lead-2', 'delete']);
    delete process.env['DATABASE_URL'];
  });
});
