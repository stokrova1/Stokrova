import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createWorkSession,
  closeWorkSession,
  dayKey,
  type DailyWorkSession,
  type StaffWorkEvent,
} from '@stokrova/domain';
import { DurableMap } from '../infrastructure/database/durable-map.js';

export interface StartSessionDto {
  business_role?: string;
  warehouse_id?: string | null;
  started_at?: string;
  idempotency_key?: string;
  offline_origin?: boolean;
}

export interface EndSessionDto {
  session_id?: string;
  ended_at?: string;
}

export interface SyncSessionDto {
  session: Partial<DailyWorkSession> & {
    id?: string;
    started_at: string;
    session_date?: string;
    idempotency_key?: string;
    business_role?: string;
  };
  events?: Partial<StaffWorkEvent>[];
}

@Injectable()
export class WorkSessionsService {
  private readonly sessions = new DurableMap<DailyWorkSession>('daily_work_sessions');
  private readonly events = new DurableMap<StaffWorkEvent>('staff_work_events');

  async start(tenantId: string, userId: string, dto: StartSessionDto = {}): Promise<DailyWorkSession> {
    const now = new Date();
    const startedAt = dto.started_at && !isNaN(Date.parse(dto.started_at)) ? dto.started_at : now.toISOString();
    const sessionDate = dayKey(startedAt, 60);

    // Idempotency: If idempotency_key supplied and already recorded, return existing
    if (dto.idempotency_key) {
      const match = [...this.sessions.values()].find(
        (s) => s.tenant_id === tenantId && s.idempotency_key === dto.idempotency_key,
      );
      if (match) return match;
    }

    // Check if user already has an active session for this date
    const active = [...this.sessions.values()].find(
      (s) => s.tenant_id === tenantId && s.user_id === userId && s.session_date === sessionDate && s.status === 'ACTIVE',
    );
    if (active) return active;

    const id = `dws_${randomUUID().replace(/-/g, '')}`;
    const session = createWorkSession(
      id,
      {
        tenant_id: tenantId,
        user_id: userId,
        business_role: dto.business_role || 'OPERATOR',
        warehouse_id: dto.warehouse_id ?? null,
        started_at: startedAt,
        idempotency_key: dto.idempotency_key || `sess_${userId}_${sessionDate}_${id}`,
        offline_origin: Boolean(dto.offline_origin),
      },
      now,
    );

    this.sessions.set(session.id, session);
    return session;
  }

  async end(tenantId: string, userId: string, dto: EndSessionDto = {}): Promise<DailyWorkSession> {
    let target: DailyWorkSession | undefined;

    if (dto.session_id) {
      target = this.sessions.get(dto.session_id);
      if (!target || target.tenant_id !== tenantId || target.user_id !== userId) {
        throw new NotFoundException(`Work session ${dto.session_id} not found.`);
      }
    } else {
      // Find latest active session for this user
      target = [...this.sessions.values()]
        .filter((s) => s.tenant_id === tenantId && s.user_id === userId && s.status === 'ACTIVE')
        .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    }

    if (!target) {
      throw new NotFoundException('No active work session found to end.');
    }

    if (target.status === 'CLOSED') {
      return target;
    }

    // Collect events performed by this worker during this session
    const sessionStart = target.started_at;
    const endedAt = dto.ended_at && !isNaN(Date.parse(dto.ended_at)) ? dto.ended_at : new Date().toISOString();

    const workerEvents = [...this.events.values()].filter(
      (e) =>
        e.tenant_id === tenantId &&
        e.user_id === userId &&
        e.occurred_at >= sessionStart &&
        e.occurred_at <= endedAt,
    );

    const closed = closeWorkSession(target, workerEvents, endedAt);
    this.sessions.set(closed.id, closed);
    return closed;
  }

  getCurrent(tenantId: string, userId: string): DailyWorkSession | null {
    const active = [...this.sessions.values()]
      .filter((s) => s.tenant_id === tenantId && s.user_id === userId && s.status === 'ACTIVE')
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    return active || null;
  }

  getById(tenantId: string, id: string): DailyWorkSession {
    const s = this.sessions.get(id);
    if (!s || s.tenant_id !== tenantId) {
      throw new NotFoundException(`Session ${id} not found.`);
    }
    return s;
  }

  listHistory(tenantId: string, userId?: string, date?: string): DailyWorkSession[] {
    return [...this.sessions.values()]
      .filter((s) => {
        if (s.tenant_id !== tenantId) return false;
        if (userId && s.user_id !== userId) return false;
        if (date && s.session_date !== date) return false;
        return true;
      })
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  getSessionEvents(tenantId: string, sessionId: string): StaffWorkEvent[] {
    const session = this.getById(tenantId, sessionId);
    const end = session.ended_at || new Date().toISOString();

    return [...this.events.values()]
      .filter(
        (e) =>
          e.tenant_id === tenantId &&
          e.user_id === session.user_id &&
          e.occurred_at >= session.started_at &&
          e.occurred_at <= end,
      )
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }

  async syncOffline(tenantId: string, userId: string, dto: SyncSessionDto): Promise<DailyWorkSession> {
    const payload = dto.session;
    const idempotencyKey = payload.idempotency_key || `offline_${payload.id || randomUUID()}`;

    // Idempotent deduplication
    const existing = [...this.sessions.values()].find(
      (s) => s.tenant_id === tenantId && s.idempotency_key === idempotencyKey,
    );
    if (existing) return existing;

    const id = payload.id || `dws_${randomUUID().replace(/-/g, '')}`;
    const session = createWorkSession(
      id,
      {
        tenant_id: tenantId,
        user_id: userId,
        business_role: payload.business_role || 'OPERATOR',
        warehouse_id: payload.warehouse_id ?? null,
        started_at: payload.started_at,
        idempotency_key: idempotencyKey,
        offline_origin: true,
      },
      new Date(),
    );

    if (payload.status === 'CLOSED' && payload.ended_at) {
      session.status = 'CLOSED';
      session.ended_at = payload.ended_at;
      session.duration_seconds = Math.max(
        0,
        Math.floor((new Date(payload.ended_at).getTime() - new Date(payload.started_at).getTime()) / 1000),
      );
    }
    session.synced_at = new Date().toISOString();

    this.sessions.set(session.id, session);
    return session;
  }
}
