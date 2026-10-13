export type CrmSegmentRuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'IN'
  | 'NOT_IN';

export interface CrmSegmentRule {
  field: string;
  operator: CrmSegmentRuleOperator;
  value: any;
}

export interface CrmSegmentRuleGroup {
  combinator: 'AND' | 'OR';
  rules: (CrmSegmentRule | CrmSegmentRuleGroup)[];
}

export interface CrmAutomationActionStep {
  step_id: string;
  action_type: string;
  params: Record<string, any>;
}

export interface CrmFunnelConversion {
  stage_code: string;
  stage_name: string;
  count: number;
  conversion_rate_to_next_bp: number;
}

export interface CustomerMatchInput {
  id?: string;
  display_name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
}

/**
 * Normalizes email address by trimming and lowercasing
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes phone number to digits only
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * Normalizes tax ID by stripping non-alphanumeric chars and uppercasing
 */
export function normalizeTaxId(taxId?: string | null): string | null {
  if (!taxId) return null;
  const normalized = taxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Evaluates duplicate match confidence score in basis points (0-10000)
 */
export function scoreCustomerDuplicateMatch(
  candidate: CustomerMatchInput,
  existing: CustomerMatchInput,
): { score_bp: number; match_reasons: string[] } {
  let highestScoreBp = 0;
  const reasons: string[] = [];

  const candEmail = normalizeEmail(candidate.email);
  const existEmail = normalizeEmail(existing.email);
  if (candEmail && existEmail && candEmail === existEmail) {
    highestScoreBp = Math.max(highestScoreBp, 10000);
    reasons.push('EMAIL_EXACT_MATCH');
  }

  const candTax = normalizeTaxId(candidate.tax_id);
  const existTax = normalizeTaxId(existing.tax_id);
  if (candTax && existTax && candTax === existTax) {
    highestScoreBp = Math.max(highestScoreBp, 10000);
    reasons.push('TAX_ID_EXACT_MATCH');
  }

  const candPhone = normalizePhone(candidate.phone);
  const existPhone = normalizePhone(existing.phone);
  if (candPhone && existPhone && candPhone === existPhone) {
    highestScoreBp = Math.max(highestScoreBp, 9000);
    reasons.push('PHONE_EXACT_MATCH');
  }

  const candLegal = candidate.legal_name?.trim().toLowerCase();
  const existLegal = existing.legal_name?.trim().toLowerCase();
  if (candLegal && existLegal && candLegal === existLegal && candLegal.length > 2) {
    highestScoreBp = Math.max(highestScoreBp, 7500);
    reasons.push('LEGAL_NAME_EXACT_MATCH');
  }

  const candName = candidate.display_name?.trim().toLowerCase();
  const existName = existing.display_name?.trim().toLowerCase();
  if (candName && existName && candName === existName && candName.length > 2) {
    if (!reasons.includes('LEGAL_NAME_EXACT_MATCH')) {
      highestScoreBp = Math.max(highestScoreBp, 7000);
      reasons.push('DISPLAY_NAME_EXACT_MATCH');
    }
  }

  return {
    score_bp: highestScoreBp,
    match_reasons: reasons,
  };
}

/**
 * Validates invariants for non-destructive customer merging
 */
export function validateCustomerMergeInvariants(
  survivingCustomer: { id: string; tenant_id: string; status: string },
  mergedCustomer: { id: string; tenant_id: string; status: string },
): void {
  if (survivingCustomer.id === mergedCustomer.id) {
    throw new Error('Cannot merge a customer into itself');
  }

  if (survivingCustomer.tenant_id !== mergedCustomer.tenant_id) {
    throw new Error('Cross-tenant customer merge is strictly prohibited');
  }

  if (mergedCustomer.status === 'MERGED') {
    throw new Error('Target customer has already been merged into another record');
  }

  if (survivingCustomer.status === 'MERGED') {
    throw new Error('Cannot merge into a customer that has already been merged');
  }
}

/**
 * Evaluates dynamic segment rules against a customer data record
 * Safe declarative parser with zero dynamic code execution (no eval / no SQL)
 */
export function evaluateDynamicSegmentRules(
  customer: Record<string, any>,
  ruleGroup: CrmSegmentRuleGroup,
): boolean {
  if (!ruleGroup || !Array.isArray(ruleGroup.rules) || ruleGroup.rules.length === 0) {
    return true;
  }

  const results: boolean[] = ruleGroup.rules.map((item: CrmSegmentRule | CrmSegmentRuleGroup) => {
    if ('combinator' in item && 'rules' in item) {
      return evaluateDynamicSegmentRules(customer, item as CrmSegmentRuleGroup);
    }

    const rule = item as CrmSegmentRule;
    const actual = customer[rule.field];
    const target = rule.value;

    switch (rule.operator) {
      case 'EQUALS':
        return actual === target;

      case 'NOT_EQUALS':
        return actual !== target;

      case 'CONTAINS':
        if (typeof actual === 'string' && typeof target === 'string') {
          return actual.toLowerCase().includes(target.toLowerCase());
        }
        return false;

      case 'GREATER_THAN': {
        if (actual === undefined || actual === null) return false;
        try {
          const actualBig = BigInt(actual);
          const targetBig = BigInt(target);
          return actualBig > targetBig;
        } catch {
          return Number(actual) > Number(target);
        }
      }

      case 'LESS_THAN': {
        if (actual === undefined || actual === null) return false;
        try {
          const actualBig = BigInt(actual);
          const targetBig = BigInt(target);
          return actualBig < targetBig;
        } catch {
          return Number(actual) < Number(target);
        }
      }

      case 'IN':
        return Array.isArray(target) && target.includes(actual);

      case 'NOT_IN':
        return Array.isArray(target) && !target.includes(actual);

      default:
        return false;
    }
  });

  if (ruleGroup.combinator === 'OR') {
    return results.some(Boolean);
  }

  return results.every(Boolean);
}

export interface RecipientInput {
  customer_id: string;
  recipient_address?: string;
  channel: string;
}

export interface ConsentRecordInput {
  customer_id: string;
  purpose: string;
  channel: string;
  status: string;
}

/**
 * Pre-dispatch suppression and consent filter.
 * Ensures marketing communications are never sent without explicit opt-in
 * and never sent to suppressed addresses.
 */
export function filterSuppressedRecipients<T extends RecipientInput>(
  recipients: T[],
  consentRecords: ConsentRecordInput[],
  suppressionIdentifiers: Set<string>,
  channel: string,
  purpose: string,
): { allowed: T[]; suppressed: { recipient: T; reason: string }[] } {
  const allowed: T[] = [];
  const suppressed: { recipient: T; reason: string }[] = [];

  const consentMap = new Map<string, string>();
  for (const c of consentRecords) {
    if (c.channel === channel && c.purpose === purpose) {
      consentMap.set(c.customer_id, c.status);
    }
  }

  for (const recipient of recipients) {
    // 1. Check global suppression list (case-insensitive for email)
    const addr = recipient.recipient_address?.trim().toLowerCase();
    if (addr && suppressionIdentifiers.has(addr)) {
      suppressed.push({ recipient, reason: 'GLOBAL_SUPPRESSION_LIST' });
      continue;
    }

    // 2. Consent check
    if (purpose === 'MARKETING') {
      const status = consentMap.get(recipient.customer_id);
      if (!status) {
        suppressed.push({ recipient, reason: 'NO_CONSENT_RECORD' });
        continue;
      }
      if (status !== 'OPTED_IN') {
        suppressed.push({ recipient, reason: 'CONSENT_OPTED_OUT' });
        continue;
      }
    }

    allowed.push(recipient);
  }

  return { allowed, suppressed };
}

/**
 * Validates automation execution graph structure and bounds
 */
export function validateAutomationGraph(actions: CrmAutomationActionStep[]): void {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('Automation workflow must have at least one action step');
  }

  if (actions.length > 10) {
    throw new Error('Automation step limit exceeded: maximum 10 steps allowed per workflow');
  }

  const seenStepIds = new Set<string>();
  const validActionTypes = [
    'SEND_MESSAGE',
    'CREATE_TASK',
    'UPDATE_TAG',
    'ASSIGN_OWNER',
    'RECORD_ACTIVITY',
  ];

  for (const step of actions) {
    if (!step.step_id || typeof step.step_id !== 'string') {
      throw new Error('Each automation step must have a valid string step_id');
    }

    if (seenStepIds.has(step.step_id)) {
      throw new Error(`Duplicate step_id detected: ${step.step_id}`);
    }
    seenStepIds.add(step.step_id);

    if (!validActionTypes.includes(step.action_type)) {
      throw new Error(`Invalid action_type: ${step.action_type}`);
    }
  }
}

/**
 * Calculates weighted expected pipeline value using integer arithmetic
 * Formula: floor((estimated_value_minor * probability_bp) / 10000)
 */
export function calculatePipelineExpectedValue(
  estimatedValueMinor: string | bigint,
  probabilityBp: number,
): bigint {
  const value = BigInt(estimatedValueMinor);
  const prob = BigInt(Math.max(0, Math.min(10000, probabilityBp)));
  return (value * prob) / 10000n;
}

/**
 * Calculates funnel conversion rates between consecutive pipeline stages
 */
export function calculateFunnelConversionRates(
  stages: { stage_code: string; stage_name: string; count: number }[],
): CrmFunnelConversion[] {
  return stages.map((stage, idx) => {
    let conversionRateToNextBp = 10000;
    if (idx < stages.length - 1) {
      const nextStage = stages[idx + 1];
      if (nextStage && stage.count > 0) {
        conversionRateToNextBp = Math.floor((nextStage.count * 10000) / stage.count);
      } else {
        conversionRateToNextBp = 0;
      }
    }
    return {
      stage_code: stage.stage_code,
      stage_name: stage.stage_name,
      count: stage.count,
      conversion_rate_to_next_bp: Math.min(10000, conversionRateToNextBp),
    };
  });
}

/**
 * Calculates win/loss rates in basis points
 */
export function calculateWinLossRate(
  wonCount: number,
  lostCount: number,
): { win_rate_bp: number; loss_rate_bp: number } {
  const total = wonCount + lostCount;
  if (total <= 0) {
    return { win_rate_bp: 0, loss_rate_bp: 0 };
  }
  const winRateBp = Math.floor((wonCount * 10000) / total);
  return {
    win_rate_bp: winRateBp,
    loss_rate_bp: 10000 - winRateBp,
  };
}
