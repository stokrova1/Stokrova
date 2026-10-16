import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PosRegisterConfig,
  CreatePosRegisterConfigRequest,
  UpdatePosRegisterConfigRequest,
  PosSessionResponse,
  OpenPosSessionRequest,
  ClosePosSessionRequest,
  ReconcilePosSessionRequest,
  PosCashMovementResponse,
  RecordPosCashInRequest,
  RecordPosCashOutRequest,
  RecordPosCashDropRequest,
  PosSessionSummaryResponse,
  PosSessionStatus,
  PosCashMovementType,
  TillVarianceCategory,
  CashDenominationCount,
} from '@stokrova/contracts';
import {
  PosDomainError,
  PosSessionInvalidStateTransitionError,
  PosSessionAlreadyActiveError,
  SupervisorOverrideRequiredError,
  PosSessionStatuses,
  calculatePosTillSummary,
  assertSufficientDrawerCash,
  verifyDenominationsTally,
  evaluateTillVariance,
  evaluateSupervisorOverrideRequirement,
  canTransitionPosSessionStatus,
  type DomainPosCashMovement,
} from '@stokrova/domain';
import { BranchesService } from '../work-centers/branches.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { PricingService } from '../pricing/pricing.service.js';

export interface StoredPosRegisterConfig {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  code: string;
  warehouse_id: string;
  default_price_list_id: string | null;
  blind_closing_enabled: boolean;
  max_cash_limit_minor: bigint;
  max_allowed_variance_minor: bigint;
  receipt_header: string | null;
  receipt_footer: string | null;
  open_cash_drawer_on_sale: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoredPosSession {
  id: string;
  tenant_id: string;
  branch_id: string;
  register_id: string;
  cashier_user_id: string;
  closed_by_user_id: string | null;
  status: PosSessionStatus;
  opening_float_minor: bigint;
  opening_denominations: CashDenominationCount[] | null;
  closing_expected_minor: bigint | null;
  closing_actual_minor: bigint | null;
  closing_denominations: CashDenominationCount[] | null;
  variance_minor: bigint | null;
  variance_category: TillVarianceCategory | null;
  supervisor_user_id: string | null;
  supervisor_override_reason: string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  reconciled_at: string | null;
}

export interface StoredPosCashMovement {
  id: string;
  tenant_id: string;
  session_id: string;
  movement_type: PosCashMovementType;
  amount_minor: bigint;
  currency_code: string;
  drawer_balance_after_minor: bigint;
  source_type: string | null;
  source_id: string | null;
  reason: string | null;
  safe_drop_envelope: string | null;
  authorized_by_user_id: string | null;
  performed_by_user_id: string;
  created_at: string;
}

@Injectable()
export class PosService {
  private registersStore = new DurableMap<StoredPosRegisterConfig>('registers');
  private sessionsStore = new DurableMap<StoredPosSession>('pos_sessions');
  private movementsStore = new DurableMap<StoredPosCashMovement>('pos_cash_movements');

  constructor(
    private readonly branchesService: BranchesService,
    private readonly warehousesService: WarehousesService,
    private readonly pricingService?: PricingService,
  ) {}

  // ----------------------------------------------------
  // Register Configuration Management
  // ----------------------------------------------------

  async createRegisterConfig(
    tenantId: string,
    req: CreatePosRegisterConfigRequest,
  ): Promise<PosRegisterConfig> {
    await this.branchesService.getBranchById(tenantId, req.branch_id);
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    if (req.default_price_list_id && this.pricingService) {
      await this.pricingService.getPriceListById(tenantId, req.default_price_list_id);
    }

    const code = req.code.trim().toUpperCase();
    for (const r of this.registersStore.values()) {
      if (r.tenant_id === tenantId && r.code === code) {
        throw new ConflictException(
          `POS register with code '${code}' already exists for this tenant.`,
        );
      }
    }

    const now = new Date().toISOString();
    const id = `posreg_${randomUUID().replace(/-/g, '')}`;
    const register: StoredPosRegisterConfig = {
      id,
      tenant_id: tenantId,
      branch_id: req.branch_id,
      name: req.name.trim(),
      code,
      warehouse_id: req.warehouse_id,
      default_price_list_id: req.default_price_list_id || null,
      blind_closing_enabled: req.blind_closing_enabled ?? true,
      max_cash_limit_minor: BigInt(req.max_cash_limit_minor ?? '1000000'),
      max_allowed_variance_minor: BigInt(req.max_allowed_variance_minor ?? '1000'),
      receipt_header: req.receipt_header || null,
      receipt_footer: req.receipt_footer || null,
      open_cash_drawer_on_sale: req.open_cash_drawer_on_sale ?? true,
      created_at: now,
      updated_at: now,
    };

    this.registersStore.set(id, register);
    return this.toRegisterConfigResponse(register);
  }

  async getRegisterConfigs(
    tenantId: string,
    branchId?: string,
  ): Promise<PosRegisterConfig[]> {
    return Array.from(this.registersStore.values())
      .filter((r) => r.tenant_id === tenantId && (!branchId || r.branch_id === branchId))
      .map((r) => this.toRegisterConfigResponse(r));
  }

  async getRegisterConfigById(
    tenantId: string,
    id: string,
  ): Promise<PosRegisterConfig> {
    const reg = this.registersStore.get(id);
    if (!reg || reg.tenant_id !== tenantId) {
      throw new NotFoundException(`POS register config with ID '${id}' not found.`);
    }
    return this.toRegisterConfigResponse(reg);
  }

  async updateRegisterConfig(
    tenantId: string,
    id: string,
    req: UpdatePosRegisterConfigRequest,
  ): Promise<PosRegisterConfig> {
    const reg = this.registersStore.get(id);
    if (!reg || reg.tenant_id !== tenantId) {
      throw new NotFoundException(`POS register config with ID '${id}' not found.`);
    }

    if (req.warehouse_id) {
      await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);
    }
    if (req.default_price_list_id && this.pricingService) {
      await this.pricingService.getPriceListById(tenantId, req.default_price_list_id);
    }

    const updated: StoredPosRegisterConfig = {
      ...reg,
      name: req.name ? req.name.trim() : reg.name,
      warehouse_id: req.warehouse_id ?? reg.warehouse_id,
      default_price_list_id:
        req.default_price_list_id !== undefined
          ? (req.default_price_list_id || null)
          : reg.default_price_list_id,
      blind_closing_enabled: req.blind_closing_enabled ?? reg.blind_closing_enabled,
      max_cash_limit_minor:
        req.max_cash_limit_minor !== undefined
          ? BigInt(req.max_cash_limit_minor)
          : reg.max_cash_limit_minor,
      max_allowed_variance_minor:
        req.max_allowed_variance_minor !== undefined
          ? BigInt(req.max_allowed_variance_minor)
          : reg.max_allowed_variance_minor,
      receipt_header:
        req.receipt_header !== undefined ? req.receipt_header : reg.receipt_header,
      receipt_footer:
        req.receipt_footer !== undefined ? req.receipt_footer : reg.receipt_footer,
      open_cash_drawer_on_sale:
        req.open_cash_drawer_on_sale ?? reg.open_cash_drawer_on_sale,
      updated_at: new Date().toISOString(),
    };

    this.registersStore.set(id, updated);
    return this.toRegisterConfigResponse(updated);
  }

  // ----------------------------------------------------
  // Session Lifecycle Management
  // ----------------------------------------------------

  async openSession(
    tenantId: string,
    cashierUserId: string,
    req: OpenPosSessionRequest,
  ): Promise<PosSessionResponse> {
    const register = await this.getRegisterConfigById(tenantId, req.register_id);

    // Rule 18/26: Register cannot have concurrent active/opening sessions
    const active = await this.getActiveSession(tenantId, req.register_id);
    if (active) {
      throw new ConflictException(
        new PosSessionAlreadyActiveError(register.code).message,
      );
    }

    const openingFloatMinor = BigInt(req.opening_float_minor);
    if (openingFloatMinor < 0n) {
      throw new BadRequestException('Opening float amount cannot be negative.');
    }

    // Denominations tally verification
    if (req.denominations && req.denominations.length > 0) {
      try {
        verifyDenominationsTally(
          req.denominations.map((d) => ({
            denomination_minor: BigInt(d.denomination_minor),
            count: d.count,
          })),
          openingFloatMinor,
        );
      } catch (err: unknown) {
        if (err instanceof PosDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const now = new Date().toISOString();
    const sessionId = `posses_${randomUUID().replace(/-/g, '')}`;

    const session: StoredPosSession = {
      id: sessionId,
      tenant_id: tenantId,
      branch_id: register.branch_id,
      register_id: register.id,
      cashier_user_id: cashierUserId,
      closed_by_user_id: null,
      status: 'OPEN',
      opening_float_minor: openingFloatMinor,
      opening_denominations: req.denominations || null,
      closing_expected_minor: null,
      closing_actual_minor: null,
      closing_denominations: null,
      variance_minor: null,
      variance_category: null,
      supervisor_user_id: null,
      supervisor_override_reason: null,
      notes: req.notes || null,
      opened_at: now,
      closed_at: null,
      reconciled_at: null,
    };

    this.sessionsStore.set(sessionId, session);

    // Record initial cash movement for opening float
    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const initialMovement: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'OPENING_FLOAT',
      amount_minor: openingFloatMinor,
      currency_code: (req.currency_code || 'USD').toUpperCase(),
      drawer_balance_after_minor: openingFloatMinor,
      source_type: 'FLOAT_INITIALIZATION',
      source_id: null,
      reason: 'Opening float declaration',
      safe_drop_envelope: null,
      authorized_by_user_id: null,
      performed_by_user_id: cashierUserId,
      created_at: now,
    };

    this.movementsStore.set(movId, initialMovement);
    return this.toSessionResponse(session);
  }

  async getActiveSession(
    tenantId: string,
    registerId: string,
  ): Promise<PosSessionResponse | null> {
    for (const s of this.sessionsStore.values()) {
      if (
        s.tenant_id === tenantId &&
        s.register_id === registerId &&
        (s.status === 'OPEN' || s.status === 'SUSPENDED' || s.status === 'CLOSING')
      ) {
        return this.toSessionResponse(s);
      }
    }
    return null;
  }

  async getSessionById(tenantId: string, sessionId: string): Promise<StoredPosSession> {
    const s = this.sessionsStore.get(sessionId);
    if (!s || s.tenant_id !== tenantId) {
      throw new NotFoundException(`POS session with ID '${sessionId}' not found.`);
    }
    return s;
  }

  async suspendSession(
    tenantId: string,
    sessionId: string,
    _userId: string,
  ): Promise<PosSessionResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (!canTransitionPosSessionStatus(session.status, PosSessionStatuses.SUSPENDED)) {
      throw new ConflictException(
        new PosSessionInvalidStateTransitionError(session.status, PosSessionStatuses.SUSPENDED).message,
      );
    }

    session.status = 'SUSPENDED';
    this.sessionsStore.set(sessionId, session);
    return this.toSessionResponse(session);
  }

  async resumeSession(
    tenantId: string,
    sessionId: string,
    _userId: string,
  ): Promise<PosSessionResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (!canTransitionPosSessionStatus(session.status, PosSessionStatuses.OPEN)) {
      throw new ConflictException(
        new PosSessionInvalidStateTransitionError(session.status, PosSessionStatuses.OPEN).message,
      );
    }

    session.status = 'OPEN';
    this.sessionsStore.set(sessionId, session);
    return this.toSessionResponse(session);
  }

  // ----------------------------------------------------
  // Cash Movements Management
  // ----------------------------------------------------

  async recordCashIn(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: RecordPosCashInRequest,
  ): Promise<PosCashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (session.status !== 'OPEN') {
      throw new ConflictException(`Cannot record cash in on session with status '${session.status}'. Must be OPEN.`);
    }

    const amountMinor = BigInt(req.amount_minor);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Cash in amount must be strictly positive.');
    }

    const summary = this.computeSessionCashSummary(tenantId, session);
    const balanceAfter = summary.current_drawer_balance_minor + amountMinor;

    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const mov: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'CASH_IN',
      amount_minor: amountMinor,
      currency_code: (req.currency_code || 'USD').toUpperCase(),
      drawer_balance_after_minor: balanceAfter,
      source_type: 'MANUAL_CASH_IN',
      source_id: null,
      reason: req.reason.trim(),
      safe_drop_envelope: null,
      authorized_by_user_id: null,
      performed_by_user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.movementsStore.set(movId, mov);
    return this.toCashMovementResponse(mov);
  }

  async recordCashOut(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: RecordPosCashOutRequest,
  ): Promise<PosCashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (session.status !== 'OPEN') {
      throw new ConflictException(`Cannot record cash out on session with status '${session.status}'. Must be OPEN.`);
    }

    const amountMinor = BigInt(req.amount_minor);
    const summary = this.computeSessionCashSummary(tenantId, session);

    // Enforce underflow invariant: Cannot withdraw more than present in till
    try {
      assertSufficientDrawerCash(summary.current_drawer_balance_minor, amountMinor, 'Cash Out');
    } catch (err: unknown) {
      if (err instanceof PosDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const balanceAfter = summary.current_drawer_balance_minor - amountMinor;

    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const mov: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'CASH_OUT',
      amount_minor: amountMinor,
      currency_code: (req.currency_code || 'USD').toUpperCase(),
      drawer_balance_after_minor: balanceAfter,
      source_type: 'PETTY_CASH_EXPENSE',
      source_id: null,
      reason: req.reason.trim(),
      safe_drop_envelope: null,
      authorized_by_user_id: req.authorized_by_user_id || null,
      performed_by_user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.movementsStore.set(movId, mov);
    return this.toCashMovementResponse(mov);
  }

  async recordCashDrop(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: RecordPosCashDropRequest,
  ): Promise<PosCashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (session.status !== 'OPEN') {
      throw new ConflictException(`Cannot record cash drop on session with status '${session.status}'. Must be OPEN.`);
    }

    const amountMinor = BigInt(req.amount_minor);
    const summary = this.computeSessionCashSummary(tenantId, session);

    // Enforce underflow invariant: Cannot drop more than present in drawer
    try {
      assertSufficientDrawerCash(summary.current_drawer_balance_minor, amountMinor, 'Cash Drop');
    } catch (err: unknown) {
      if (err instanceof PosDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const balanceAfter = summary.current_drawer_balance_minor - amountMinor;

    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const mov: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'CASH_DROP',
      amount_minor: amountMinor,
      currency_code: (req.currency_code || 'USD').toUpperCase(),
      drawer_balance_after_minor: balanceAfter,
      source_type: 'SAFE_SKIM',
      source_id: null,
      reason: req.reason?.trim() || 'Safe drop skim',
      safe_drop_envelope: req.safe_drop_envelope.trim(),
      authorized_by_user_id: req.authorized_by_user_id || null,
      performed_by_user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.movementsStore.set(movId, mov);
    return this.toCashMovementResponse(mov);
  }

  async recordSaleCashMovement(
    tenantId: string,
    sessionId: string,
    userId: string,
    amountMinor: bigint,
    saleOrderId: string,
  ): Promise<PosCashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    const summary = this.computeSessionCashSummary(tenantId, session);
    const balanceAfter = summary.current_drawer_balance_minor + amountMinor;

    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const mov: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'CASH_SALE',
      amount_minor: amountMinor,
      currency_code: 'USD',
      drawer_balance_after_minor: balanceAfter,
      source_type: 'POS_ORDER',
      source_id: saleOrderId,
      reason: `Cash tender for order ${saleOrderId}`,
      safe_drop_envelope: null,
      authorized_by_user_id: null,
      performed_by_user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.movementsStore.set(movId, mov);
    return this.toCashMovementResponse(mov);
  }

  async recordRefundCashMovement(
    tenantId: string,
    sessionId: string,
    userId: string,
    amountMinor: bigint,
    returnOrderId: string,
  ): Promise<PosCashMovementResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    const summary = this.computeSessionCashSummary(tenantId, session);

    try {
      assertSufficientDrawerCash(summary.current_drawer_balance_minor, amountMinor, 'Cash Refund');
    } catch (err: unknown) {
      if (err instanceof PosDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const balanceAfter = summary.current_drawer_balance_minor - amountMinor;

    const movId = `posmov_${randomUUID().replace(/-/g, '')}`;
    const mov: StoredPosCashMovement = {
      id: movId,
      tenant_id: tenantId,
      session_id: sessionId,
      movement_type: 'CASH_REFUND',
      amount_minor: amountMinor,
      currency_code: 'USD',
      drawer_balance_after_minor: balanceAfter,
      source_type: 'POS_RETURN',
      source_id: returnOrderId,
      reason: `Cash refund for order ${returnOrderId}`,
      safe_drop_envelope: null,
      authorized_by_user_id: null,
      performed_by_user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.movementsStore.set(movId, mov);
    return this.toCashMovementResponse(mov);
  }

  // ----------------------------------------------------
  // Session Closing & Reconciliation
  // ----------------------------------------------------

  async closeSession(
    tenantId: string,
    sessionId: string,
    userId: string,
    req: ClosePosSessionRequest,
  ): Promise<PosSessionResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (session.status !== 'OPEN' && session.status !== 'CLOSING') {
      throw new ConflictException(
        `Cannot close POS session with status '${session.status}'. Must be OPEN or CLOSING.`,
      );
    }

    const actualCountMinor = BigInt(req.closing_actual_minor);
    if (actualCountMinor < 0n) {
      throw new BadRequestException('Closing actual count cannot be negative.');
    }

    // Denominations check
    if (req.denominations && req.denominations.length > 0) {
      try {
        verifyDenominationsTally(
          req.denominations.map((d) => ({
            denomination_minor: BigInt(d.denomination_minor),
            count: d.count,
          })),
          actualCountMinor,
        );
      } catch (err: unknown) {
        if (err instanceof PosDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const summary = this.computeSessionCashSummary(tenantId, session);
    const varianceResult = evaluateTillVariance(
      actualCountMinor,
      summary.expected_closing_minor,
    );

    // Retrieve register config for threshold
    const register = this.registersStore.get(session.register_id);
    const maxAllowedVariance = register
      ? register.max_allowed_variance_minor
      : 1000n;

    // Supervisor override check
    try {
      evaluateSupervisorOverrideRequirement(
        varianceResult.variance_minor,
        maxAllowedVariance,
        Boolean(req.supervisor_user_id),
      );
    } catch (err: unknown) {
      if (err instanceof SupervisorOverrideRequiredError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    session.status = 'CLOSED';
    session.closed_by_user_id = userId;
    session.closing_expected_minor = summary.expected_closing_minor;
    session.closing_actual_minor = actualCountMinor;
    session.closing_denominations = req.denominations || null;
    session.variance_minor = varianceResult.variance_minor;
    session.variance_category = varianceResult.variance_category;
    session.supervisor_user_id = req.supervisor_user_id || null;
    session.supervisor_override_reason = req.supervisor_override_reason || null;
    session.closed_at = new Date().toISOString();
    session.notes = req.notes ? `${session.notes || ''} [Close: ${req.notes}]`.trim() : session.notes;

    this.sessionsStore.set(sessionId, session);
    return this.toSessionResponse(session);
  }

  async reconcileSession(
    tenantId: string,
    sessionId: string,
    req: ReconcilePosSessionRequest,
  ): Promise<PosSessionResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    if (!canTransitionPosSessionStatus(session.status, PosSessionStatuses.RECONCILED)) {
      throw new ConflictException(
        new PosSessionInvalidStateTransitionError(session.status, PosSessionStatuses.RECONCILED).message,
      );
    }

    session.status = 'RECONCILED';
    session.supervisor_user_id = req.supervisor_user_id;
    session.reconciled_at = new Date().toISOString();
    session.notes = req.notes
      ? `${session.notes || ''} [Reconcile: ${req.notes}]`.trim()
      : session.notes;

    this.sessionsStore.set(sessionId, session);
    return this.toSessionResponse(session);
  }

  async getSessionSummary(
    tenantId: string,
    sessionId: string,
  ): Promise<PosSessionSummaryResponse> {
    const session = await this.getSessionById(tenantId, sessionId);
    const summary = this.computeSessionCashSummary(tenantId, session);

    const movements = Array.from(this.movementsStore.values())
      .filter((m) => m.tenant_id === tenantId && m.session_id === sessionId)
      .map((m) => this.toCashMovementResponse(m));

    const reg = this.registersStore.get(session.register_id);
    const maxLimit = reg ? reg.max_cash_limit_minor : 1000000n;
    const exceedsLimit = summary.current_drawer_balance_minor > maxLimit;

    return {
      session: this.toSessionResponse(session),
      current_drawer_balance_minor: summary.current_drawer_balance_minor.toString(),
      total_cash_sales_minor: summary.total_cash_sales_minor.toString(),
      total_cash_refunds_minor: summary.total_cash_refunds_minor.toString(),
      total_cash_in_minor: summary.total_cash_in_minor.toString(),
      total_cash_out_minor: summary.total_cash_out_minor.toString(),
      total_cash_drops_minor: summary.total_cash_drops_minor.toString(),
      expected_closing_minor: summary.expected_closing_minor.toString(),
      exceeds_max_cash_limit: exceedsLimit,
      movements,
    };
  }

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  private computeSessionCashSummary(tenantId: string, session: StoredPosSession) {
    const movements: DomainPosCashMovement[] = Array.from(this.movementsStore.values())
      .filter((m) => m.tenant_id === tenantId && m.session_id === session.id)
      .map((m) => ({
        movement_type: m.movement_type,
        amount_minor: m.amount_minor,
      }));

    return calculatePosTillSummary(session.opening_float_minor, movements);
  }

  private toRegisterConfigResponse(r: StoredPosRegisterConfig): PosRegisterConfig {
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      branch_id: r.branch_id,
      name: r.name,
      code: r.code,
      warehouse_id: r.warehouse_id,
      default_price_list_id: r.default_price_list_id,
      blind_closing_enabled: r.blind_closing_enabled,
      max_cash_limit_minor: r.max_cash_limit_minor.toString(),
      max_allowed_variance_minor: r.max_allowed_variance_minor.toString(),
      receipt_header: r.receipt_header,
      receipt_footer: r.receipt_footer,
      open_cash_drawer_on_sale: r.open_cash_drawer_on_sale,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private toSessionResponse(s: StoredPosSession): PosSessionResponse {
    return {
      id: s.id,
      tenant_id: s.tenant_id,
      branch_id: s.branch_id,
      register_id: s.register_id,
      cashier_user_id: s.cashier_user_id,
      closed_by_user_id: s.closed_by_user_id,
      status: s.status,
      opening_float_minor: s.opening_float_minor.toString(),
      opening_denominations: s.opening_denominations,
      closing_expected_minor:
        s.closing_expected_minor !== null ? s.closing_expected_minor.toString() : null,
      closing_actual_minor:
        s.closing_actual_minor !== null ? s.closing_actual_minor.toString() : null,
      closing_denominations: s.closing_denominations,
      variance_minor: s.variance_minor !== null ? s.variance_minor.toString() : null,
      variance_category: s.variance_category,
      supervisor_user_id: s.supervisor_user_id,
      supervisor_override_reason: s.supervisor_override_reason,
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      reconciled_at: s.reconciled_at,
      notes: s.notes,
    };
  }

  private toCashMovementResponse(m: StoredPosCashMovement): PosCashMovementResponse {
    return {
      id: m.id,
      tenant_id: m.tenant_id,
      session_id: m.session_id,
      movement_type: m.movement_type,
      amount_minor: m.amount_minor.toString(),
      currency_code: m.currency_code,
      drawer_balance_after_minor: m.drawer_balance_after_minor.toString(),
      source_type: m.source_type,
      source_id: m.source_id,
      reason: m.reason,
      safe_drop_envelope: m.safe_drop_envelope,
      authorized_by_user_id: m.authorized_by_user_id,
      performed_by_user_id: m.performed_by_user_id,
      created_at: m.created_at,
    };
  }

  clearStore(): void {
    this.registersStore.clear();
    this.sessionsStore.clear();
    this.movementsStore.clear();
  }
}
