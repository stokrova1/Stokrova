import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AccountingPostingRule,
  CreatePostingRuleRequest,
  UpdatePostingRuleRequest,
} from '@stokrova/contracts';
import {
  CreatePostingRuleSchema,
  UpdatePostingRuleSchema,
} from '@stokrova/validation';
import {
  assertValidPostingRule,
  FinanceDomainError,
} from '@stokrova/domain';

@Injectable()
export class PostingRulesService {
  private readonly rules = new Map<string, AccountingPostingRule>();

  async createPostingRule(
    tenantId: string,
    req: CreatePostingRuleRequest,
  ): Promise<AccountingPostingRule> {
    const parsed = CreatePostingRuleSchema.parse(req);

    try {
      assertValidPostingRule(
        parsed.rule_code,
        parsed.debit_account_code,
        parsed.credit_account_code,
      );
    } catch (err: unknown) {
      if (err instanceof FinanceDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const eventType = parsed.event_type.trim().toUpperCase();
    const ruleCode = parsed.rule_code.trim().toUpperCase();

    const existing = Array.from(this.rules.values()).find(
      (r) =>
        r.tenant_id === tenantId &&
        r.company_id === parsed.company_id &&
        r.event_type === eventType &&
        r.rule_code === ruleCode,
    );
    if (existing) {
      throw new ConflictException(
        `Posting rule '${ruleCode}' already exists for event '${eventType}' in company '${parsed.company_id}'.`,
      );
    }

    const now = new Date().toISOString();
    const rule: AccountingPostingRule = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: parsed.company_id,
      book_id: parsed.book_id,
      event_type: eventType,
      rule_code: ruleCode,
      description: parsed.description ?? null,
      debit_account_code: parsed.debit_account_code.trim().toUpperCase(),
      credit_account_code: parsed.credit_account_code.trim().toUpperCase(),
      is_active: true,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  async updatePostingRule(
    tenantId: string,
    ruleId: string,
    req: UpdatePostingRuleRequest,
  ): Promise<AccountingPostingRule> {
    const parsed = UpdatePostingRuleSchema.parse(req);
    const rule = this.rules.get(ruleId);
    if (!rule || rule.tenant_id !== tenantId) {
      throw new NotFoundException(`Posting rule '${ruleId}' not found.`);
    }

    if (parsed.debit_account_code !== undefined) {
      rule.debit_account_code = parsed.debit_account_code.trim().toUpperCase();
    }
    if (parsed.credit_account_code !== undefined) {
      rule.credit_account_code = parsed.credit_account_code.trim().toUpperCase();
    }
    if (parsed.description !== undefined) {
      rule.description = parsed.description;
    }
    if (parsed.is_active !== undefined) {
      rule.is_active = parsed.is_active;
    }

    rule.version += 1;
    rule.updated_at = new Date().toISOString();
    return rule;
  }

  async getPostingRule(
    tenantId: string,
    companyId: string,
    eventType: string,
    ruleCode = 'DEFAULT',
  ): Promise<AccountingPostingRule | null> {
    const et = eventType.trim().toUpperCase();
    const rc = ruleCode.trim().toUpperCase();

    return (
      Array.from(this.rules.values()).find(
        (r) =>
          r.tenant_id === tenantId &&
          r.company_id === companyId &&
          r.event_type === et &&
          r.rule_code === rc &&
          r.is_active,
      ) ?? null
    );
  }

  async listPostingRules(
    tenantId: string,
    companyId?: string,
    eventType?: string,
  ): Promise<AccountingPostingRule[]> {
    return Array.from(this.rules.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (companyId && r.company_id !== companyId) return false;
      if (eventType && r.event_type !== eventType.toUpperCase()) return false;
      return true;
    });
  }

  async seedDefaultPostingRules(
    tenantId: string,
    companyId: string,
    bookId: string,
  ): Promise<AccountingPostingRule[]> {
    const defaults = [
      { event_type: 'SALES_INVOICE', rule_code: 'DEFAULT', debit_account_code: '1100', credit_account_code: '4010', description: 'Customer Invoice: Dr AR (1100), Cr Sales Revenue (4010)' },
      { event_type: 'CUSTOMER_PAYMENT', rule_code: 'DEFAULT', debit_account_code: '1020', credit_account_code: '1100', description: 'Customer Payment: Dr Bank (1020), Cr AR (1100)' },
      { event_type: 'CUSTOMER_CREDIT_NOTE', rule_code: 'DEFAULT', debit_account_code: '4030', credit_account_code: '1100', description: 'Customer Credit Note: Dr Sales Returns (4030), Cr AR (1100)' },
      { event_type: 'CUSTOMER_REFUND', rule_code: 'DEFAULT', debit_account_code: '1100', credit_account_code: '1020', description: 'Customer Refund: Dr AR (1100), Cr Bank (1020)' },
      { event_type: 'GRN_RECEIPT', rule_code: 'DEFAULT', debit_account_code: '1200', credit_account_code: '2020', description: 'Goods Receipt: Dr Inventory (1200), Cr GRNI Clearing (2020)' },
      { event_type: 'SUPPLIER_INVOICE', rule_code: 'DEFAULT', debit_account_code: '2020', credit_account_code: '2010', description: 'Supplier Invoice: Dr GRNI Clearing (2020), Cr AP (2010)' },
      { event_type: 'SUPPLIER_PAYMENT', rule_code: 'DEFAULT', debit_account_code: '2010', credit_account_code: '1020', description: 'Supplier Payment: Dr AP (2010), Cr Bank (1020)' },
      { event_type: 'SUPPLIER_CREDIT_NOTE', rule_code: 'DEFAULT', debit_account_code: '2010', credit_account_code: '1200', description: 'Supplier Credit: Dr AP (2010), Cr Inventory (1200)' },
      { event_type: 'SALES_DISPATCH_COGS', rule_code: 'DEFAULT', debit_account_code: '5010', credit_account_code: '1200', description: 'COGS Dispatch: Dr COGS (5010), Cr Inventory (1200)' },
      { event_type: 'LANDED_COST_CAPITALIZATION', rule_code: 'DEFAULT', debit_account_code: '1200', credit_account_code: '2020', description: 'Landed Cost: Dr Inventory (1200), Cr Clearing (2020)' },
      { event_type: 'MANUFACTURING_WIP_CONSUMPTION', rule_code: 'DEFAULT', debit_account_code: '1400', credit_account_code: '1200', description: 'WIP Consumption: Dr WIP (1400), Cr Raw Inventory (1200)' },
      { event_type: 'MANUFACTURING_FG_RECEIPT', rule_code: 'DEFAULT', debit_account_code: '1200', credit_account_code: '1400', description: 'FG Receipt: Dr FG Inventory (1200), Cr WIP (1400)' },
      { event_type: 'MANUFACTURING_SCRAP', rule_code: 'DEFAULT', debit_account_code: '5020', credit_account_code: '1400', description: 'Scrap: Dr Scrap Expense (5020), Cr WIP (1400)' },
      { event_type: 'INVENTORY_LOSS', rule_code: 'DEFAULT', debit_account_code: '5020', credit_account_code: '1200', description: 'Inventory Loss: Dr Scrap Expense (5020), Cr Inventory (1200)' },
      { event_type: 'CASH_VARIANCE_SHORTAGE', rule_code: 'DEFAULT', debit_account_code: '5040', credit_account_code: '1010', description: 'Till Shortage: Dr Cash Variance Expense (5040), Cr Cash (1010)' },
      { event_type: 'CASH_VARIANCE_OVERAGE', rule_code: 'DEFAULT', debit_account_code: '1010', credit_account_code: '4040', description: 'Till Overage: Dr Cash (1010), Cr Over/Short Revenue (4040)' },
    ];

    const seeded: AccountingPostingRule[] = [];
    for (const def of defaults) {
      const existing = await this.getPostingRule(tenantId, companyId, def.event_type, def.rule_code);
      if (!existing) {
        seeded.push(
          await this.createPostingRule(tenantId, {
            company_id: companyId,
            book_id: bookId,
            event_type: def.event_type,
            rule_code: def.rule_code,
            debit_account_code: def.debit_account_code,
            credit_account_code: def.credit_account_code,
            description: def.description,
          }),
        );
      } else {
        seeded.push(existing);
      }
    }

    return seeded;
  }
}
