import { describe, it, expect, beforeEach } from 'vitest';
import { WorkSessionsService } from './work-sessions.service.js';

describe('WorkSessionsService', () => {
  let service: WorkSessionsService;

  beforeEach(() => {
    service = new WorkSessionsService();
  });

  it('starts a new work session and retrieves it as current', async () => {
    const session = await service.start('ten_1', 'usr_1', {
      business_role: 'CASHIER',
      started_at: '2026-10-17T08:00:00Z',
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe('ACTIVE');
    expect(session.business_role).toBe('CASHIER');

    const current = service.getCurrent('ten_1', 'usr_1');
    expect(current).not.toBeNull();
    expect(current?.id).toBe(session.id);
  });

  it('idempotently returns the existing active session if start is retried', async () => {
    const s1 = await service.start('ten_1', 'usr_1', {
      business_role: 'CASHIER',
      started_at: '2026-10-17T08:00:00Z',
    });

    const s2 = await service.start('ten_1', 'usr_1', {
      business_role: 'CASHIER',
      started_at: '2026-10-17T08:05:00Z',
    });

    expect(s1.id).toBe(s2.id);
  });

  it('concludes an active session and computes duration', async () => {
    const s = await service.start('ten_1', 'usr_1', {
      business_role: 'SALES',
      started_at: '2026-10-17T08:00:00Z',
    });

    const ended = await service.end('ten_1', 'usr_1', {
      session_id: s.id,
      ended_at: '2026-10-17T16:00:00Z',
    });

    expect(ended.status).toBe('CLOSED');
    expect(ended.ended_at).toBe('2026-10-17T16:00:00.000Z');
    expect(ended.duration_seconds).toBe(28800); // 8 hours

    const current = service.getCurrent('ten_1', 'usr_1');
    expect(current).toBeNull();
  });

  it('lists historical sessions filtered by calendar date', async () => {
    await service.start('ten_1', 'usr_1', {
      business_role: 'CASHIER',
      started_at: '2026-10-16T08:00:00Z',
    });
    await service.end('ten_1', 'usr_1', { ended_at: '2026-10-16T17:00:00Z' });

    await service.start('ten_1', 'usr_1', {
      business_role: 'CASHIER',
      started_at: '2026-10-17T08:00:00Z',
    });

    const yesterdayList = service.listHistory('ten_1', 'usr_1', '2026-10-16');
    expect(yesterdayList.length).toBe(1);
    expect(yesterdayList[0]!.session_date).toBe('2026-10-16');

    const allList = service.listHistory('ten_1', 'usr_1');
    expect(allList.length).toBe(2);
  });

  it('ingests offline sessions idempotently', async () => {
    const offlinePayload = {
      id: 'dws_offline_test_99',
      started_at: '2026-10-17T07:30:00Z',
      ended_at: '2026-10-17T15:30:00Z',
      status: 'CLOSED' as const,
      business_role: 'INVENTORY',
      idempotency_key: 'offline_idem_key_123',
    };

    const synced = await service.syncOffline('ten_1', 'usr_2', { session: offlinePayload });
    expect(synced.id).toBe('dws_offline_test_99');
    expect(synced.status).toBe('CLOSED');
    expect(synced.offline_origin).toBe(true);
    expect(synced.duration_seconds).toBe(28800);

    // Retry with same idempotency key returns exact same record
    const retry = await service.syncOffline('ten_1', 'usr_2', { session: offlinePayload });
    expect(retry.id).toBe(synced.id);
  });
});
