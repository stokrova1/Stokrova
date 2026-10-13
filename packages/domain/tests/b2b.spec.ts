import { describe, it, expect } from 'vitest';
import {
  calculateCreditExposure,
  evaluateRequisitionApprovalRequired,
  assertValidRequisitionTransition,
  resolveB2bUnitPrice,
  parseCxmlPunchoutSetupRequest,
  generateCxmlPunchoutOrderMessage,
  B2bDomainError,
} from '../src/b2b.js';

describe('Enterprise B2B Customer Portal & Credit Limit Domain Engine (Phase 16)', () => {
  // ==========================================================================
  // 1. Real-Time Credit Limit Underwriting & Exposure Engine
  // ==========================================================================
  describe('calculateCreditExposure', () => {
    it('evaluates active credit account with available headroom', () => {
      // Limit $100k, Unpaid $30k, Pending $15k -> Total $45k, Avail $55k
      const result = calculateCreditExposure(
        '10000000',
        '3000000',
        '1500000',
        10, // Overdue 10 days
        30, // Grace period 30 days
      );

      expect(result.status).toBe('ACTIVE');
      expect(result.total_exposure_minor).toBe('4500000');
      expect(result.available_credit_minor).toBe('5500000');
      expect(result.is_over_limit).toBe(false);
      expect(result.is_overdue_hold).toBe(false);
    });

    it('triggers CREDIT_HOLD when exposure exceeds authorized credit line', () => {
      // Limit $50k, Exposure $55k
      const result = calculateCreditExposure('5000000', '4000000', '1500000');

      expect(result.status).toBe('CREDIT_HOLD');
      expect(result.is_over_limit).toBe(true);
      expect(result.available_credit_minor).toBe('0');
      expect(result.total_exposure_minor).toBe('5500000');
    });

    it('triggers CREDIT_HOLD when invoices exceed grace period terms', () => {
      // Limit $100k, Exposure $20k, but overdue 45 days (grace 30 days)
      const result = calculateCreditExposure('10000000', '2000000', '0', 45, 30);

      expect(result.status).toBe('CREDIT_HOLD');
      expect(result.is_overdue_hold).toBe(true);
      expect(result.is_over_limit).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Requisition Approval State Machine
  // ==========================================================================
  describe('Requisition Approval & Purchasing Thresholds', () => {
    it('auto-approves requisitions within user purchasing authority limit', () => {
      // Order $500, User limit $1,000 -> Auto approved
      const result = evaluateRequisitionApprovalRequired('50000', '100000');
      expect(result.requires_approval).toBe(false);
      expect(result.status).toBe('APPROVED');
    });

    it('routes requisition to PENDING_APPROVAL when exceeding spending authority', () => {
      // Order $1,500, User limit $1,000 -> Pending approval
      const result = evaluateRequisitionApprovalRequired('150000', '100000');
      expect(result.requires_approval).toBe(true);
      expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('allows valid state machine transitions', () => {
      expect(() => assertValidRequisitionTransition('DRAFT', 'PENDING_APPROVAL')).not.toThrow();
      expect(() => assertValidRequisitionTransition('PENDING_APPROVAL', 'APPROVED')).not.toThrow();
      expect(() => assertValidRequisitionTransition('APPROVED', 'CONVERTED_TO_ORDER')).not.toThrow();
      expect(() => assertValidRequisitionTransition('APPROVED', 'APPROVED')).not.toThrow(); // Idempotent
    });

    it('rejects invalid state machine transitions', () => {
      expect(() => assertValidRequisitionTransition('DRAFT', 'CONVERTED_TO_ORDER')).toThrowError(
        B2bDomainError,
      );
      expect(() => assertValidRequisitionTransition('CONVERTED_TO_ORDER', 'DRAFT')).toThrowError(
        B2bDomainError,
      );
    });
  });

  // ==========================================================================
  // 3. Hierarchical Contract Pricing & Volume Breaks Matrix
  // ==========================================================================
  describe('resolveB2bUnitPrice', () => {
    const listPrice = '10000'; // $100.00

    it('prioritizes negotiated contract price over catalog list price and tiers', () => {
      const result = resolveB2bUnitPrice({
        sku: 'SKU-LAPTOP-X1',
        quantity: 50,
        catalogListPriceMinor: listPrice,
        contractPriceMinor: '7500', // $75.00
        volumeBreaks: [{ min_quantity: 10, discount_bp: 1500 }],
      });

      expect(result.applied_rule).toBe('CONTRACT_PRICE');
      expect(result.unit_price_minor).toBe('7500');
      expect(result.total_line_minor).toBe('375000'); // $75 * 50 = $3,750
      expect(result.discount_amount_minor).toBe('2500');
      expect(result.effective_discount_bp).toBe(2500); // 25.00%
    });

    it('applies volume tiered discount when quantity threshold is met', () => {
      const volumeBreaks = [
        { min_quantity: 10, discount_bp: 1000 }, // 10%
        { min_quantity: 25, discount_bp: 2000 }, // 20%
        { min_quantity: 50, discount_bp: 3000 }, // 30%
      ];

      const result = resolveB2bUnitPrice({
        sku: 'SKU-OFFICE-CHAIR',
        quantity: 30, // Qualifies for tier 2 (25 units -> 20%)
        catalogListPriceMinor: listPrice,
        volumeBreaks,
      });

      expect(result.applied_rule).toBe('VOLUME_TIER');
      expect(result.unit_price_minor).toBe('8000'); // $80.00
      expect(result.total_line_minor).toBe('240000'); // $80 * 30 = $2,400
      expect(result.effective_discount_bp).toBe(2000);
    });

    it('applies customer group discount when no contract price or tier applies', () => {
      const result = resolveB2bUnitPrice({
        sku: 'SKU-PAPER-REAMS',
        quantity: 2,
        catalogListPriceMinor: listPrice,
        groupDiscountBp: 1500, // 15% wholesale discount
      });

      expect(result.applied_rule).toBe('CUSTOMER_GROUP');
      expect(result.unit_price_minor).toBe('8500');
      expect(result.total_line_minor).toBe('17000');
    });

    it('falls back to default catalog list price when no special terms apply', () => {
      const result = resolveB2bUnitPrice({
        sku: 'SKU-BASIC-MOUSE',
        quantity: 1,
        catalogListPriceMinor: listPrice,
      });

      expect(result.applied_rule).toBe('CATALOG_LIST');
      expect(result.unit_price_minor).toBe('10000');
      expect(result.total_line_minor).toBe('10000');
      expect(result.discount_amount_minor).toBe('0');
    });
  });

  // ==========================================================================
  // 4. PunchOut cXML Protocol Parser & POSR Serializer
  // ==========================================================================
  describe('cXML PunchOut Protocol Parser & Serializer', () => {
    const sampleSetupRequestXml = `
<?xml version="1.0" encoding="UTF-8"?>
<cXML payloadID="req-12345" timestamp="2026-10-11T20:00:00Z">
  <Header>
    <From><Identity>CORP_BUYER_INC</Identity></From>
    <To><Identity>STOKROVA_SUPPLIER</Identity></To>
    <Sender>
      <Identity>PUNCHOUT_GATEWAY</Identity>
      <SharedSecret>SECRET_KEY_999</SharedSecret>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>COOKIE_SESSION_ABC123</BuyerCookie>
      <BrowserFormPost>
        <URL>https://buyer-procurement.com/cxml/cart_return</URL>
      </BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>
    `;

    it('parses inbound cXML PunchOutSetupRequest headers and buyer cookie', () => {
      const parsed = parseCxmlPunchoutSetupRequest(sampleSetupRequestXml);

      expect(parsed.buyer_cookie).toBe('COOKIE_SESSION_ABC123');
      expect(parsed.from_identity).toBe('CORP_BUYER_INC');
      expect(parsed.to_identity).toBe('STOKROVA_SUPPLIER');
      expect(parsed.shared_secret).toBe('SECRET_KEY_999');
      expect(parsed.browser_form_post_url).toBe('https://buyer-procurement.com/cxml/cart_return');
    });

    it('generates compliant outbound cXML PunchOutOrderMessage (POSR)', () => {
      const posrXml = generateCxmlPunchoutOrderMessage({
        buyer_cookie: 'COOKIE_SESSION_ABC123',
        currency: 'USD',
        total_amount_minor: '250000', // $2,500.00
        items: [
          {
            line_number: 1,
            sku: 'SKU-DESK-PRO',
            description: 'Standing Desk Pro 60-inch',
            quantity: 5,
            unit_price_minor: '50000', // $500.00
            uom: 'EA',
          },
        ],
      });

      expect(posrXml).toContain('<PunchOutOrderMessage>');
      expect(posrXml).toContain('<BuyerCookie>COOKIE_SESSION_ABC123</BuyerCookie>');
      expect(posrXml).toContain('<Money currency="USD">2500.00</Money>');
      expect(posrXml).toContain('<SupplierPartID>SKU-DESK-PRO</SupplierPartID>');
      expect(posrXml).toContain('<Money currency="USD">500.00</Money>');
      expect(posrXml).toContain('<UnitOfMeasure>EA</UnitOfMeasure>');
    });
  });
});
