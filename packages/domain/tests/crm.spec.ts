import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizePhone,
  normalizeTaxId,
  scoreCustomerDuplicateMatch,
  validateCustomerMergeInvariants,
  evaluateDynamicSegmentRules,
  filterSuppressedRecipients,
  validateAutomationGraph,
  calculatePipelineExpectedValue,
  calculateFunnelConversionRates,
  calculateWinLossRate,
  type CrmSegmentRuleGroup,
  type CrmAutomationActionStep,
} from '../src/crm.js';

describe('Phase 22 CRM Domain Engine — Invariants & Algorithms', () => {
  describe('1. Normalization & Duplicate Detection', () => {
    it('normalizes email addresses correctly', () => {
      expect(normalizeEmail('  Alice@Example.COM  ')).toBe('alice@example.com');
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
    });

    it('normalizes phone numbers to digits only', () => {
      expect(normalizePhone('+1 (555) 123-4567')).toBe('15551234567');
      expect(normalizePhone('123')).toBeNull(); // Less than 7 digits
      expect(normalizePhone(null)).toBeNull();
    });

    it('normalizes tax IDs to uppercase alphanumeric', () => {
      expect(normalizeTaxId('us-98-7654321 ')).toBe('US987654321');
      expect(normalizeTaxId('')).toBeNull();
      expect(normalizeTaxId(null)).toBeNull();
    });

    it('scores exact email match with 10000 basis points', () => {
      const cand = { email: 'john@acme.com', display_name: 'John Doe' };
      const exist = { email: 'JOHN@ACME.COM', display_name: 'Different Name' };
      const res = scoreCustomerDuplicateMatch(cand, exist);
      expect(res.score_bp).toBe(10000);
      expect(res.match_reasons).toContain('EMAIL_EXACT_MATCH');
    });

    it('scores exact tax ID match with 10000 basis points', () => {
      const cand = { tax_id: 'VAT-12345', display_name: 'Acme Corp' };
      const exist = { tax_id: 'vat 12345', display_name: 'Acme' };
      const res = scoreCustomerDuplicateMatch(cand, exist);
      expect(res.score_bp).toBe(10000);
      expect(res.match_reasons).toContain('TAX_ID_EXACT_MATCH');
    });

    it('scores exact phone match with 9000 basis points', () => {
      const cand = { phone: '+1-800-555-0199', display_name: 'Acme Logistics' };
      const exist = { phone: '+1 (800) 555-0199', display_name: 'Acme Group' };
      const res = scoreCustomerDuplicateMatch(cand, exist);
      expect(res.score_bp).toBe(9000);
      expect(res.match_reasons).toContain('PHONE_EXACT_MATCH');
    });

    it('scores legal name match with 7500 basis points', () => {
      const cand = { legal_name: 'Apex Industries LLC' };
      const exist = { legal_name: 'apex industries llc' };
      const res = scoreCustomerDuplicateMatch(cand, exist);
      expect(res.score_bp).toBe(7500);
      expect(res.match_reasons).toContain('LEGAL_NAME_EXACT_MATCH');
    });

    it('returns score 0 when no attributes match', () => {
      const cand = { email: 'alice@domain.com', phone: '1112223333' };
      const exist = { email: 'bob@domain.com', phone: '9998887777' };
      const res = scoreCustomerDuplicateMatch(cand, exist);
      expect(res.score_bp).toBe(0);
      expect(res.match_reasons).toHaveLength(0);
    });
  });

  describe('2. Customer Merging Invariants', () => {
    it('throws when merging a customer into itself', () => {
      expect(() =>
        validateCustomerMergeInvariants(
          { id: 'c1', tenant_id: 't1', status: 'ACTIVE' },
          { id: 'c1', tenant_id: 't1', status: 'ACTIVE' },
        ),
      ).toThrow('Cannot merge a customer into itself');
    });

    it('throws on cross-tenant merge attempt', () => {
      expect(() =>
        validateCustomerMergeInvariants(
          { id: 'c1', tenant_id: 't1', status: 'ACTIVE' },
          { id: 'c2', tenant_id: 't2', status: 'ACTIVE' },
        ),
      ).toThrow('Cross-tenant customer merge is strictly prohibited');
    });

    it('throws if merged customer is already in MERGED status', () => {
      expect(() =>
        validateCustomerMergeInvariants(
          { id: 'c1', tenant_id: 't1', status: 'ACTIVE' },
          { id: 'c2', tenant_id: 't1', status: 'MERGED' },
        ),
      ).toThrow('Target customer has already been merged into another record');
    });

    it('throws if surviving customer is already in MERGED status', () => {
      expect(() =>
        validateCustomerMergeInvariants(
          { id: 'c1', tenant_id: 't1', status: 'MERGED' },
          { id: 'c2', tenant_id: 't1', status: 'ACTIVE' },
        ),
      ).toThrow('Cannot merge into a customer that has already been merged');
    });

    it('passes for two valid active records within the same tenant', () => {
      expect(() =>
        validateCustomerMergeInvariants(
          { id: 'c1', tenant_id: 't1', status: 'ACTIVE' },
          { id: 'c2', tenant_id: 't1', status: 'ACTIVE' },
        ),
      ).not.toThrow();
    });
  });

  describe('3. Dynamic Segment Rule Evaluation', () => {
    const customer = {
      country: 'US',
      city: 'Chicago',
      tier: 'PLATINUM',
      total_spent_minor: 1500000n, // $15,000
      order_count: 12,
    };

    it('evaluates simple EQUALS and NOT_EQUALS rules', () => {
      const ruleGroup: CrmSegmentRuleGroup = {
        combinator: 'AND',
        rules: [
          { field: 'country', operator: 'EQUALS', value: 'US' },
          { field: 'city', operator: 'NOT_EQUALS', value: 'Dallas' },
        ],
      };
      expect(evaluateDynamicSegmentRules(customer, ruleGroup)).toBe(true);
    });

    it('evaluates BigInt numerical comparisons for monetary amounts', () => {
      const ruleGroup: CrmSegmentRuleGroup = {
        combinator: 'AND',
        rules: [
          { field: 'total_spent_minor', operator: 'GREATER_THAN', value: '1000000' },
          { field: 'order_count', operator: 'LESS_THAN', value: 20 },
        ],
      };
      expect(evaluateDynamicSegmentRules(customer, ruleGroup)).toBe(true);
    });

    it('evaluates IN and NOT_IN operators', () => {
      const ruleGroup: CrmSegmentRuleGroup = {
        combinator: 'AND',
        rules: [
          { field: 'tier', operator: 'IN', value: ['GOLD', 'PLATINUM'] },
          { field: 'country', operator: 'NOT_IN', value: ['CA', 'UK'] },
        ],
      };
      expect(evaluateDynamicSegmentRules(customer, ruleGroup)).toBe(true);
    });

    it('evaluates nested OR and AND combinators', () => {
      const ruleGroup: CrmSegmentRuleGroup = {
        combinator: 'OR',
        rules: [
          { field: 'country', operator: 'EQUALS', value: 'FR' },
          {
            combinator: 'AND',
            rules: [
              { field: 'city', operator: 'EQUALS', value: 'Chicago' },
              { field: 'tier', operator: 'EQUALS', value: 'PLATINUM' },
            ],
          },
        ],
      };
      expect(evaluateDynamicSegmentRules(customer, ruleGroup)).toBe(true);
    });

    it('returns true when rule group is empty', () => {
      expect(evaluateDynamicSegmentRules(customer, { combinator: 'AND', rules: [] })).toBe(true);
    });
  });

  describe('4. Suppression & Consent Filtering', () => {
    it('filters out recipients on the global suppression list', () => {
      const recipients = [
        { customer_id: 'cust_1', recipient_address: 'allowed@acme.com', channel: 'EMAIL' },
        { customer_id: 'cust_2', recipient_address: 'blocked@spam.com', channel: 'EMAIL' },
      ];
      const consents = [
        { customer_id: 'cust_1', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_IN' },
        { customer_id: 'cust_2', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_IN' },
      ];
      const suppressionSet = new Set(['blocked@spam.com']);

      const res = filterSuppressedRecipients(recipients, consents, suppressionSet, 'EMAIL', 'MARKETING');
      expect(res.allowed).toHaveLength(1);
      expect(res.allowed[0]?.customer_id).toBe('cust_1');
      expect(res.suppressed).toHaveLength(1);
      expect(res.suppressed[0]?.reason).toBe('GLOBAL_SUPPRESSION_LIST');
    });

    it('blocks marketing messages when consent is missing or opted out', () => {
      const recipients = [
        { customer_id: 'c_optin', recipient_address: 'optin@domain.com', channel: 'EMAIL' },
        { customer_id: 'c_optout', recipient_address: 'optout@domain.com', channel: 'EMAIL' },
        { customer_id: 'c_noconsent', recipient_address: 'noconsent@domain.com', channel: 'EMAIL' },
      ];
      const consents = [
        { customer_id: 'c_optin', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_IN' },
        { customer_id: 'c_optout', purpose: 'MARKETING', channel: 'EMAIL', status: 'OPTED_OUT' },
      ];
      const suppressionSet = new Set<string>();

      const res = filterSuppressedRecipients(recipients, consents, suppressionSet, 'EMAIL', 'MARKETING');
      expect(res.allowed.map((r) => r.customer_id)).toEqual(['c_optin']);
      expect(res.suppressed).toHaveLength(2);
      expect(res.suppressed.find((s) => s.recipient.customer_id === 'c_optout')?.reason).toBe('CONSENT_OPTED_OUT');
      expect(res.suppressed.find((s) => s.recipient.customer_id === 'c_noconsent')?.reason).toBe('NO_CONSENT_RECORD');
    });
  });

  describe('5. Automation Workflow Graph Validation', () => {
    it('validates a valid action sequence', () => {
      const actions: CrmAutomationActionStep[] = [
        { step_id: 's1', action_type: 'SEND_MESSAGE', params: { channel: 'EMAIL' } },
        { step_id: 's2', action_type: 'CREATE_TASK', params: { priority: 'HIGH' } },
      ];
      expect(() => validateAutomationGraph(actions)).not.toThrow();
    });

    it('throws if actions array is empty', () => {
      expect(() => validateAutomationGraph([])).toThrow('must have at least one action step');
    });

    it('throws if actions exceed 10 steps', () => {
      const actions: CrmAutomationActionStep[] = Array.from({ length: 11 }, (_, i) => ({
        step_id: `s_${i}`,
        action_type: 'RECORD_ACTIVITY',
        params: {},
      }));
      expect(() => validateAutomationGraph(actions)).toThrow('limit exceeded: maximum 10 steps');
    });

    it('throws if duplicate step_id exists', () => {
      const actions: CrmAutomationActionStep[] = [
        { step_id: 'step_dup', action_type: 'SEND_MESSAGE', params: {} },
        { step_id: 'step_dup', action_type: 'CREATE_TASK', params: {} },
      ];
      expect(() => validateAutomationGraph(actions)).toThrow('Duplicate step_id detected');
    });

    it('throws on unsupported action_type', () => {
      const actions: CrmAutomationActionStep[] = [
        { step_id: 's1', action_type: 'EXECUTE_ARBITRARY_SCRIPT', params: {} },
      ];
      expect(() => validateAutomationGraph(actions)).toThrow('Invalid action_type');
    });
  });

  describe('6. Commercial Pipeline Metrics & Conversion Engine', () => {
    it('calculates weighted expected pipeline value in integer arithmetic', () => {
      // 50,000.00 USD at 70% probability (7000 bp)
      const expected = calculatePipelineExpectedValue(5000000n, 7000);
      expect(expected).toBe(3500000n); // 35,000.00 USD
    });

    it('calculates stage-to-stage funnel conversion rates', () => {
      const stages = [
        { stage_code: 'LEAD', stage_name: 'Lead', count: 100 },
        { stage_code: 'DISCOVERY', stage_name: 'Discovery', count: 60 },
        { stage_code: 'PROPOSAL', stage_name: 'Proposal', count: 30 },
        { stage_code: 'WON', stage_name: 'Closed Won', count: 15 },
      ];
      const res = calculateFunnelConversionRates(stages);
      expect(res[0]?.conversion_rate_to_next_bp).toBe(6000); // 60/100 = 60%
      expect(res[1]?.conversion_rate_to_next_bp).toBe(5000); // 30/60 = 50%
      expect(res[2]?.conversion_rate_to_next_bp).toBe(5000); // 15/30 = 50%
      expect(res[3]?.conversion_rate_to_next_bp).toBe(10000); // Final stage
    });

    it('calculates win/loss rates accurately in basis points', () => {
      const res = calculateWinLossRate(30, 10);
      expect(res.win_rate_bp).toBe(7500); // 75%
      expect(res.loss_rate_bp).toBe(2500); // 25%
    });

    it('handles zero total deals gracefully', () => {
      const res = calculateWinLossRate(0, 0);
      expect(res.win_rate_bp).toBe(0);
      expect(res.loss_rate_bp).toBe(0);
    });
  });
});
