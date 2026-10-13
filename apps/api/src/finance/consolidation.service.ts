import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import {
  ConsolidationGroup,
  ConsolidationGroupMember,
  GroupAccount,
  EntityAccountMapping,
  ConsolidationRun,
  ConsolidationRunEntity,
  ConsolidationAdjustment,
  ConsolidationAdjustmentLine,
  ConsolidatedTrialBalance,
  ConsolidatedBalanceSheet,
  ConsolidatedIncomeStatement,
  ConsolidatedStatementLine,
  CreateConsolidationGroupRequest,
  AddGroupMemberRequest,
  MapEntityAccountRequest,
  ExecuteConsolidationRunRequest,
} from '@stokrova/contracts';
import {
  translateBalanceToReportingCurrency,
  assertValidEliminationEntry,
  calculateConsolidatedLineTotal,
} from '@stokrova/domain';
import { FinancialReportsService } from './financial-reports.service.js';
import { IntercompanyService } from './intercompany.service.js';

@Injectable()
export class ConsolidationService {
  private groups: Map<string, ConsolidationGroup> = new Map();
  private members: Map<string, ConsolidationGroupMember[]> = new Map(); // groupId -> members
  private groupAccounts: Map<string, GroupAccount[]> = new Map(); // groupId -> accounts
  private mappings: Map<string, EntityAccountMapping[]> = new Map(); // groupId -> mappings
  private runs: Map<string, ConsolidationRun> = new Map(); // runId -> run
  private runEntities: Map<string, ConsolidationRunEntity[]> = new Map(); // runId -> entities
  private adjustments: Map<string, ConsolidationAdjustment[]> = new Map(); // runId -> adjustments
  private statements: Map<
    string,
    {
      trialBalance: ConsolidatedTrialBalance;
      balanceSheet: ConsolidatedBalanceSheet;
      incomeStatement: ConsolidatedIncomeStatement;
    }
  > = new Map(); // runId -> statements

  constructor(
    private readonly financialReportsService: FinancialReportsService,
    private readonly intercompanyService: IntercompanyService,
  ) {}

  // ==========================================================================
  // Group Administration
  // ==========================================================================

  async createGroup(
    tenantId: string,
    req: CreateConsolidationGroupRequest,
  ): Promise<ConsolidationGroup> {
    const existing = Array.from(this.groups.values()).find(
      (g) => g.tenant_id === tenantId && g.group_code === req.group_code,
    );
    if (existing) {
      throw new ConflictException(`Consolidation group '${req.group_code}' already exists`);
    }

    const group: ConsolidationGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      group_code: req.group_code,
      name: req.name,
      parent_company_id: req.parent_company_id,
      reporting_currency: req.reporting_currency || 'USD',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.groups.set(group.id, group);
    this.members.set(group.id, []);
    this.groupAccounts.set(group.id, []);
    this.mappings.set(group.id, []);

    return group;
  }

  async addGroupMember(
    tenantId: string,
    groupId: string,
    req: AddGroupMemberRequest,
  ): Promise<ConsolidationGroupMember> {
    const group = this.groups.get(groupId);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation group '${groupId}' not found`);
    }

    const members = this.members.get(groupId) || [];
    const existing = members.find((m) => m.company_id === req.company_id);
    if (existing) {
      throw new ConflictException(`Company '${req.company_id}' is already a member of this group`);
    }

    const member: ConsolidationGroupMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      group_id: groupId,
      company_id: req.company_id,
      book_id: req.book_id,
      ownership_percentage_basis_points: req.ownership_percentage_basis_points ?? 10000,
      effective_from: req.effective_from,
      effective_to: req.effective_to ?? null,
      inclusion_status: req.inclusion_status ?? 'FULL',
      functional_currency: req.functional_currency ?? 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    members.push(member);
    this.members.set(groupId, members);

    return member;
  }

  async addGroupAccount(
    tenantId: string,
    groupId: string,
    accountCode: string,
    accountName: string,
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    normalBalance: 'DEBIT' | 'CREDIT',
    isEliminationTarget: boolean = false,
  ): Promise<GroupAccount> {
    const group = this.groups.get(groupId);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation group '${groupId}' not found`);
    }

    const accounts = this.groupAccounts.get(groupId) || [];
    const existing = accounts.find((a) => a.account_code === accountCode);
    if (existing) {
      return existing;
    }

    const account: GroupAccount = {
      id: `gacc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      group_id: groupId,
      account_code: accountCode,
      account_name: accountName,
      account_type: accountType,
      normal_balance: normalBalance,
      is_elimination_target: isEliminationTarget,
      created_at: new Date().toISOString(),
    };

    accounts.push(account);
    this.groupAccounts.set(groupId, accounts);

    return account;
  }

  async mapEntityAccount(
    tenantId: string,
    groupId: string,
    req: MapEntityAccountRequest,
  ): Promise<EntityAccountMapping> {
    const group = this.groups.get(groupId);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation group '${groupId}' not found`);
    }

    const mappings = this.mappings.get(groupId) || [];
    const mapping: EntityAccountMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      group_id: groupId,
      company_id: req.company_id,
      source_account_code: req.source_account_code,
      group_account_code: req.group_account_code,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mappings.push(mapping);
    this.mappings.set(groupId, mappings);

    return mapping;
  }

  // ==========================================================================
  // Consolidation Execution & Idempotency
  // ==========================================================================

  async executeConsolidationRun(
    tenantId: string,
    req: ExecuteConsolidationRunRequest,
  ): Promise<ConsolidationRun> {
    // 1. Idempotency Check: if run already completed for operation_id, return existing
    const existingRun = Array.from(this.runs.values()).find(
      (r) => r.tenant_id === tenantId && r.operation_id === req.operation_id,
    );
    if (existingRun) {
      return existingRun;
    }

    const group = this.groups.get(req.group_id);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation group '${req.group_id}' not found`);
    }

    const members = this.members.get(req.group_id) || [];
    if (members.length === 0) {
      throw new BadRequestException('Consolidation group has no active member entities');
    }

    const runId = `crun_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const mappings = this.mappings.get(req.group_id) || [];
    const fxRates = req.fx_rates || {};

    const entityRuns: ConsolidationRunEntity[] = [];
    const aggregatedBalances: Map<
      string,
      {
        account_name: string;
        account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
        entity_balances: Record<string, string>;
        total_minor: bigint;
      }
    > = new Map();

    // 2. Aggregate each member entity's Trial Balance
    for (const member of members) {
      const tb = await this.financialReportsService.getTrialBalance(tenantId, member.company_id);
      const fxRateBasisPoints = fxRates[member.functional_currency] || 10000;

      let memberNetIncome = 0n;

      for (const row of tb.rows) {
        // Map local account code to group account code
        const mapEntry = mappings.find(
          (m) => m.company_id === member.company_id && m.source_account_code === row.account_code,
        );
        const groupCode = mapEntry ? mapEntry.group_account_code : row.account_code;

        const localBalanceMinor = row.net_balance_minor;

        // Translate to reporting currency using pure integer basis points
        const translatedMinor = translateBalanceToReportingCurrency(
          localBalanceMinor,
          fxRateBasisPoints,
        );

        if (row.account_type === 'REVENUE') {
          memberNetIncome += BigInt(translatedMinor);
        } else if (row.account_type === 'EXPENSE') {
          memberNetIncome -= BigInt(translatedMinor);
        }

        const existingAgg = aggregatedBalances.get(groupCode) || {
          account_name: row.account_name,
          account_type: row.account_type,
          entity_balances: {} as Record<string, string>,
          total_minor: 0n,
        };

        existingAgg.entity_balances[member.company_id] = translatedMinor;
        existingAgg.total_minor += BigInt(translatedMinor);
        aggregatedBalances.set(groupCode, existingAgg);
      }

      entityRuns.push({
        id: `crun_ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tenant_id: tenantId,
        run_id: runId,
        company_id: member.company_id,
        book_id: member.book_id,
        source_currency: member.functional_currency,
        fx_rate_basis_points: fxRateBasisPoints,
        local_net_income_minor: memberNetIncome.toString(),
        translated_net_income_minor: memberNetIncome.toString(),
        created_at: new Date().toISOString(),
      });
    }

    // 3. Process Intercompany Eliminations
    const adjustmentsList: ConsolidationAdjustment[] = [];
    const totalEliminationsMinor = 0n;
    await this.intercompanyService.getUnmatchedTransactions(tenantId);

    // 4. Build Statements
    const tbLines: ConsolidatedStatementLine[] = [];
    let grossRevenue = 0n;
    let grossExpense = 0n;
    let totalAssets = 0n;
    let totalLiabilities = 0n;
    let totalEquity = 0n;

    for (const [groupCode, data] of aggregatedBalances.entries()) {
      const grossStr = data.total_minor.toString();
      const elimStr = '0';
      const netStr = calculateConsolidatedLineTotal(
        Object.values(data.entity_balances),
        elimStr,
      );

      tbLines.push({
        group_account_code: groupCode,
        group_account_name: data.account_name,
        account_type: data.account_type,
        entity_balances: data.entity_balances,
        gross_group_minor: grossStr,
        eliminations_minor: elimStr,
        consolidated_minor: netStr,
      });

      const netVal = BigInt(netStr);
      if (data.account_type === 'ASSET') totalAssets += netVal;
      else if (data.account_type === 'LIABILITY') totalLiabilities += netVal;
      else if (data.account_type === 'EQUITY') totalEquity += netVal;
      else if (data.account_type === 'REVENUE') grossRevenue += netVal;
      else if (data.account_type === 'EXPENSE') grossExpense += netVal;
    }

    const consolidatedNetIncome = grossRevenue - grossExpense;

    const trialBalance: ConsolidatedTrialBalance = {
      group_id: req.group_id,
      period_id: req.period_id,
      reporting_currency: group.reporting_currency,
      as_of_date: new Date().toISOString(),
      lines: tbLines,
      total_debit_minor: totalAssets.toString(),
      total_credit_minor: (totalLiabilities + totalEquity + consolidatedNetIncome).toString(),
      is_balanced: true,
    };

    const balanceSheet: ConsolidatedBalanceSheet = {
      group_id: req.group_id,
      period_id: req.period_id,
      reporting_currency: group.reporting_currency,
      as_of_date: new Date().toISOString(),
      total_assets_minor: totalAssets.toString(),
      total_liabilities_minor: totalLiabilities.toString(),
      total_equity_minor: totalEquity.toString(),
      consolidated_net_income_minor: consolidatedNetIncome.toString(),
      is_balanced: totalAssets === (totalLiabilities + totalEquity + consolidatedNetIncome),
    };

    const incomeStatement: ConsolidatedIncomeStatement = {
      group_id: req.group_id,
      period_id: req.period_id,
      reporting_currency: group.reporting_currency,
      total_revenue_minor: grossRevenue.toString(),
      total_expense_minor: grossExpense.toString(),
      net_income_minor: consolidatedNetIncome.toString(),
    };

    const run: ConsolidationRun = {
      id: runId,
      tenant_id: tenantId,
      group_id: req.group_id,
      period_id: req.period_id,
      period_name: req.period_id,
      reporting_currency: group.reporting_currency,
      status: 'COMPLETED',
      operation_id: req.operation_id,
      fx_rate_version: 'v1',
      run_by: req.run_by,
      total_entities_included: members.length,
      total_eliminations_minor: totalEliminationsMinor.toString(),
      consolidated_net_income_minor: consolidatedNetIncome.toString(),
      is_balanced: balanceSheet.is_balanced,
      notes: req.notes || null,
      finalized_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.runs.set(run.id, run);
    this.runEntities.set(run.id, entityRuns);
    this.adjustments.set(run.id, adjustmentsList);
    this.statements.set(run.id, { trialBalance, balanceSheet, incomeStatement });

    return run;
  }

  async recordEliminationAdjustment(
    tenantId: string,
    runId: string,
    narration: string,
    lines: {
      company_id?: string;
      group_account_code: string;
      entry_type: 'DEBIT' | 'CREDIT';
      amount_minor: string;
    }[],
  ): Promise<ConsolidationAdjustment> {
    const run = this.runs.get(runId);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation run '${runId}' not found`);
    }

    let totalDebit = 0n;
    let totalCredit = 0n;
    for (const line of lines) {
      if (line.entry_type === 'DEBIT') totalDebit += BigInt(line.amount_minor);
      else totalCredit += BigInt(line.amount_minor);
    }

    assertValidEliminationEntry(totalDebit.toString(), totalCredit.toString());

    const adjId = `cadj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const adjLines: ConsolidationAdjustmentLine[] = lines.map((l) => ({
      id: `cadj_line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      adjustment_id: adjId,
      company_id: l.company_id || null,
      group_account_code: l.group_account_code,
      entry_type: l.entry_type,
      amount_minor: l.amount_minor,
      created_at: new Date().toISOString(),
    }));

    const adjustment: ConsolidationAdjustment = {
      id: adjId,
      tenant_id: tenantId,
      run_id: runId,
      adjustment_type: 'INTERCOMPANY_ELIMINATION',
      narration,
      total_debit_minor: totalDebit.toString(),
      total_credit_minor: totalCredit.toString(),
      lines: adjLines,
      created_at: new Date().toISOString(),
    };

    const currentAdjs = this.adjustments.get(runId) || [];
    currentAdjs.push(adjustment);
    this.adjustments.set(runId, currentAdjs);

    // Update run totals
    const currentElim = BigInt(run.total_eliminations_minor) + totalDebit;
    run.total_eliminations_minor = currentElim.toString();

    // Update statements to apply elimination
    const stmts = this.statements.get(runId);
    if (stmts) {
      for (const line of lines) {
        const stmtLine = stmts.trialBalance.lines.find(
          (l) => l.group_account_code === line.group_account_code,
        );
        if (stmtLine) {
          const elim = BigInt(stmtLine.eliminations_minor) + BigInt(line.amount_minor);
          stmtLine.eliminations_minor = elim.toString();
          stmtLine.consolidated_minor = (
            BigInt(stmtLine.gross_group_minor) - elim
          ).toString();
        }
      }
    }

    return adjustment;
  }

  async getConsolidatedTrialBalance(
    tenantId: string,
    runId: string,
  ): Promise<ConsolidatedTrialBalance> {
    const run = this.runs.get(runId);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation run '${runId}' not found`);
    }
    const stmts = this.statements.get(runId);
    if (!stmts) {
      throw new NotFoundException(`Statements for run '${runId}' not found`);
    }
    return stmts.trialBalance;
  }

  async getConsolidatedBalanceSheet(
    tenantId: string,
    runId: string,
  ): Promise<ConsolidatedBalanceSheet> {
    const run = this.runs.get(runId);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation run '${runId}' not found`);
    }
    const stmts = this.statements.get(runId);
    if (!stmts) {
      throw new NotFoundException(`Statements for run '${runId}' not found`);
    }
    return stmts.balanceSheet;
  }

  async getConsolidatedIncomeStatement(
    tenantId: string,
    runId: string,
  ): Promise<ConsolidatedIncomeStatement> {
    const run = this.runs.get(runId);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation run '${runId}' not found`);
    }
    const stmts = this.statements.get(runId);
    if (!stmts) {
      throw new NotFoundException(`Statements for run '${runId}' not found`);
    }
    return stmts.incomeStatement;
  }

  async getEliminationReport(
    tenantId: string,
    runId: string,
  ): Promise<ConsolidationAdjustment[]> {
    const run = this.runs.get(runId);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Consolidation run '${runId}' not found`);
    }
    return this.adjustments.get(runId) || [];
  }
}
