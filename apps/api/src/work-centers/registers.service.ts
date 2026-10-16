import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  RegisterResponse,
  CreateRegisterRequest,
  UpdateRegisterRequest,
  RegisterSessionResponse,
  CashMovementResponse,
  OpenSessionRequest,
  CloseSessionRequest,
  RecordCashMovementRequest,
  SessionSummaryResponse,
  RegisterStatus,
  RegisterSessionStatus,
  CashMovementType,
} from '@stokrova/contracts';
import {
  calculateTillSummary,
  calculateTillVarianceMinor,
  assertSessionIsOpen,
  assertCanOpenSession,
  assertNonNegativeMinor,
  assertPositiveMinor,
  CashMovementTypes,
} from '@stokrova/domain';
import { BranchesService } from './branches.service.js';
import { WorkCentersService } from './work-centers.service.js';

export interface StoredRegister {
  id: string;
  tenant_id: string;
  branch_id: string;
  work_center_id: string | null;
  name: string;
  code: string;
  status: RegisterStatus;
  created_at: string;
}

export interface StoredRegisterSession {
  id: string;
  tenant_id: string;
  register_id: string;
  opened_by_user_id: string;
  closed_by_user_id: string | null;
  opening_float_minor: bigint;
  closing_expected_minor: bigint | null;
  closing_actual_minor: bigint | null;
  variance_minor: bigint | null;
  status: RegisterSessionStatus;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface StoredCashMovement {
  id: string;
  tenant_id: string;
  register_session_id: string;
  movement_type: CashMovementType;
  amount_minor: bigint;
  currency_code: string;
  source_type: string | null;
  source_id: string | null;
  reason: string | null;
  created_by_user_id: string;
  occurred_at: string;
}

@Injectable()
export class RegistersService {
  private registersStore = new DurableMap<StoredRegister>('registers');
  private sessionsStore = new DurableMap<StoredRegisterSession>('register_sessions');
  private movementsStore = new DurableMap<StoredCashMovement>('cash_movements');

  constructor(
    private readonly branchesService: BranchesService,
    private readonly workCentersService: WorkCentersService,
  ) {}

  async createRegister(
    tenantId: string,
    req: CreateRegisterRequest,
  ): Promise<RegisterResponse> {
    // 1. Verify branch exists
    await this.branchesService.getBranchById(tenantId, req.branch_id);

    // 2. Verify work center exists if provided
    if (req.work_center_id) {
      await this.workCentersService.getWorkCenterById(tenantId, req.work_center_id);
    }

    // 3. Enforce code uniqueness within branch
    const code = req.code.toUpperCase().trim();
    for (const r of this.registersStore.values()) {
      if (r.tenant_id === tenantId && r.branch_id === req.branch_id && r.code === code) {
        throw new ConflictException(
          `Register with code '${code}' already exists in this branch.`,
        );
      }
    }

    const id = `reg_${randomUUID().replace(/-/g, '')}`;
    const register: StoredRegister = {
      id,
      tenant_id: tenantId,
      branch_id: req.branch_id,
      work_center_id: req.work_center_id || null,
      name: req.name.trim(),
      code,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.registersStore.set(id, register);
    return register;
  }

  async getRegisters(
    tenantId: string,
    branchId?: string,
    workCenterId?: string,
  ): Promise<RegisterResponse[]> {
    return Array.from(this.registersStore.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (branchId && r.branch_id !== branchId) return false;
      if (workCenterId && r.work_center_id !== workCenterId) return false;
      return true;
    });
  }

  async getRegisterById(tenantId: string, id: string): Promise<RegisterResponse> {
    const register = this.registersStore.get(id);
    if (!register || register.tenant_id !== tenantId) {
      throw new NotFoundException(`Register with ID '${id}' not found.`);
    }
    return register;
  }

  async updateRegister(
    tenantId: string,
    id: string,
    req: UpdateRegisterRequest,
  ): Promise<RegisterResponse> {
    const register = await this.getRegisterById(tenantId, id);

    if (req.work_center_id) {
      await this.workCentersService.getWorkCenterById(tenantId, req.work_center_id);
    }

    const updated: StoredRegister = {
      ...register,
      name: req.name?.trim() || register.name,
      work_center_id:
        req.work_center_id !== undefined ? (req.work_center_id ?? null) : (register.work_center_id ?? null),
      status: req.status || register.status,
    };

    this.registersStore.set(id, updated);
    return updated;
  }

  async openSession(
    tenantId: string,
    userId: string,
    req: OpenSessionRequest,
  ): Promise<RegisterSessionResponse> {
    const register = await this.getRegisterById(tenantId, req.register_id);
    if (register.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot open session on register with status '${register.status}'.`,
      );
    }

    // Check if there is already an active OPEN session on this register
    const active = await this.getActiveSession(tenantId, req.register_id);
    try {
      assertCanOpenSession(Boolean(active));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Active session already exists.';
      throw new ConflictException(msg);
    }

    const openingFloatMinor = BigInt(req.opening_float_minor);
    try {
      assertNonNegativeMinor(openingFloatMinor, 'Opening float');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid opening float.';
      throw new BadRequestException(msg);
    }

    const now = new Date().toISOString();
    const sessionId = `ses_${randomUUID().replace(/-/g, '')}`;

    const session: StoredRegisterSession = {
      id: sessionId,
      tenant_id: tenantId,
      register_id: register.id,
      opened_by_user_id: userId,
      closed_by_user_id: null,
      opening_float_minor: openingFloatMinor,
      closing_expected_minor: null,
      closing_actual_minor: null,
      variance_minor: null,
      status: 'OPEN',
      opened_at: now,
      closed_at: null,
      notes: req.notes || null,
    };

    this.sessionsStore.set(sessionId, session);

    // Record initial cash movement for opening float
    const movementId = `mov_${randomUUID().replace(/-/g, '')}`;
    const initialMovement: StoredCashMovement = {
      id: movementId,
      tenant_id: tenantId,
      register_session_id: sessionId,
      movement_type: CashMovementTypes.OPENING_FLOAT,
      amount_minor: openingFloatMinor,
      currency_code: (req.currency_code || 'NGN').toUpperCase(),
      source_type: 'FLOAT_INITIALIZATION',
      source_id: null,
      reason: 'Register opening float',
      created_by_user_id: userId,
      occurred_at: now,
    };
    this.movementsStore.set(movementId, initialMovement);

    return this.toSessionResponse(session);
  }

  async getActiveSession(
    tenantId: string,
    registerId: string,
  ): Promise<RegisterSessionResponse | null> {
    for (const s of this.sessionsStore.values()) {
      if (s.tenant_id === tenantId && s.register_id === registerId && s.status === 'OPEN') {
        return this.toSessionResponse(s);
      }
    }
    return null;
  }

  async getSessionById(tenantId: string, sessionId: string): Promise<StoredRegisterSession> {
    const session = this.sessionsStore.get(sessionId);
    if (!session || session.tenant_id !== tenantId) {
      throw new NotFoundException(`Register session with ID '${sessionId}' not found.`);
    }
    return session;
  }

  async recordCashMovement(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: RecordCashMovementRequest,
  ): Promise<CashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);

    try {
      assertSessionIsOpen(session.status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Session is not open.';
      throw new ConflictException(msg);
    }

    const amountMinor = BigInt(req.amount_minor);
    try {
      assertPositiveMinor(amountMinor, 'Movement amount');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid movement amount.';
      throw new BadRequestException(msg);
    }

    const movementId = `mov_${randomUUID().replace(/-/g, '')}`;
    const movement: StoredCashMovement = {
      id: movementId,
      tenant_id: tenantId,
      register_session_id: sessionId,
      movement_type: req.movement_type,
      amount_minor: amountMinor,
      currency_code: (req.currency_code || 'NGN').toUpperCase(),
      source_type: req.source_type || null,
      source_id: req.source_id || null,
      reason: req.reason || null,
      created_by_user_id: userId,
      occurred_at: new Date().toISOString(),
    };

    this.movementsStore.set(movementId, movement);
    return this.toMovementResponse(movement);
  }

  async getSessionSummary(
    tenantId: string,
    sessionId: string,
  ): Promise<SessionSummaryResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    const sessionMovements = Array.from(this.movementsStore.values()).filter(
      (m) => m.tenant_id === tenantId && m.register_session_id === sessionId,
    );

    const summary = calculateTillSummary(session.opening_float_minor, sessionMovements);

    return {
      session: this.toSessionResponse(session),
      total_cash_sales_minor: summary.total_cash_sales_minor.toString(),
      total_cash_refunds_minor: summary.total_cash_refunds_minor.toString(),
      total_cash_in_minor: summary.total_cash_in_minor.toString(),
      total_cash_out_minor: summary.total_cash_out_minor.toString(),
      expected_closing_minor: summary.expected_closing_minor.toString(),
      movements: sessionMovements.map(this.toMovementResponse),
    };
  }

  async closeSession(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: CloseSessionRequest,
  ): Promise<RegisterSessionResponse> {
    const session = await this.getSessionById(tenantId, sessionId);

    if (session.status !== 'OPEN') {
      throw new ConflictException(
        `Cannot close session with status '${session.status}'. Session must be OPEN.`,
      );
    }

    const actualCountMinor = BigInt(req.closing_actual_minor);
    try {
      assertNonNegativeMinor(actualCountMinor, 'Closing actual count');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid closing count.';
      throw new BadRequestException(msg);
    }

    const sessionMovements = Array.from(this.movementsStore.values()).filter(
      (m) => m.tenant_id === tenantId && m.register_session_id === sessionId,
    );

    const summary = calculateTillSummary(session.opening_float_minor, sessionMovements);
    const varianceMinor = calculateTillVarianceMinor(
      actualCountMinor,
      summary.expected_closing_minor,
    );

    const updated: StoredRegisterSession = {
      ...session,
      closed_by_user_id: userId,
      closing_expected_minor: summary.expected_closing_minor,
      closing_actual_minor: actualCountMinor,
      variance_minor: varianceMinor,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      notes: req.notes ? `${session.notes || ''} [Closing note: ${req.notes}]`.trim() : session.notes,
    };

    this.sessionsStore.set(sessionId, updated);
    return this.toSessionResponse(updated);
  }

  private toSessionResponse(s: StoredRegisterSession): RegisterSessionResponse {
    return {
      id: s.id,
      tenant_id: s.tenant_id,
      register_id: s.register_id,
      opened_by_user_id: s.opened_by_user_id,
      closed_by_user_id: s.closed_by_user_id,
      opening_float_minor: s.opening_float_minor.toString(),
      closing_expected_minor: s.closing_expected_minor !== null ? s.closing_expected_minor.toString() : null,
      closing_actual_minor: s.closing_actual_minor !== null ? s.closing_actual_minor.toString() : null,
      variance_minor: s.variance_minor !== null ? s.variance_minor.toString() : null,
      status: s.status,
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      notes: s.notes,
    };
  }

  private toMovementResponse(m: StoredCashMovement): CashMovementResponse {
    return {
      id: m.id,
      tenant_id: m.tenant_id,
      register_session_id: m.register_session_id,
      movement_type: m.movement_type,
      amount_minor: m.amount_minor.toString(),
      currency_code: m.currency_code,
      source_type: m.source_type,
      source_id: m.source_id,
      reason: m.reason,
      created_by_user_id: m.created_by_user_id,
      occurred_at: m.occurred_at,
    };
  }

  clearStore(): void {
    this.registersStore.clear();
    this.sessionsStore.clear();
    this.movementsStore.clear();
  }
}
