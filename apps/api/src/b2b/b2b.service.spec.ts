import { describe, it, expect, beforeEach } from 'vitest';
import { B2bCommerceService } from './b2b-commerce.service.js';
import { B2bPunchoutService } from './b2b-punchout.service.js';

describe('B2B Customer Portal & Credit Limit API Services (Phase 16)', () => {
  let b2bService: B2bCommerceService;
  let punchoutService: B2bPunchoutService;
  const tenantId = 'tenant-b2b-test';

  beforeEach(() => {
    b2bService = new B2bCommerceService();
    punchoutService = new B2bPunchoutService();
  });

  describe('B2bCommerceService', () => {
    it('should create organization and auto-initialize credit account', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Apex Industrial Corp',
        org_type: 'CORPORATE_HOLDING',
        credit_limit_minor: '10000000', // $100,000.00
        payment_terms_days: 60,
        currency: 'USD',
      });

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Apex Industrial Corp');
      expect(org.credit_limit_minor).toBe('10000000');

      const creditAccount = await b2bService.getCreditAccount(tenantId, org.id);
      expect(creditAccount.organization_id).toBe(org.id);
      expect(creditAccount.credit_limit_minor).toBe('10000000');
      expect(creditAccount.available_credit_minor).toBe('10000000');
      expect(creditAccount.status).toBe('ACTIVE');
    });

    it('should update credit limit and check exposure', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Delta Subsidiary LLC',
        credit_limit_minor: '5000000', // $50,000
      });

      // Update credit limit to $80,000
      const updatedCred = await b2bService.updateCreditLimit(tenantId, org.id, {
        credit_limit_minor: '8000000',
      });
      expect(updatedCred.credit_limit_minor).toBe('8000000');

      // Check exposure with $30,000 unpaid invoices and $10,000 pending orders
      const exposure = await b2bService.checkCreditExposure(tenantId, {
        organization_id: org.id,
        unpaid_invoices_minor: '3000000',
        pending_orders_minor: '1000000',
      });

      expect(exposure.credit_limit_minor).toBe('8000000');
      expect(exposure.total_exposure_minor).toBe('4000000');
      expect(exposure.available_credit_minor).toBe('4000000');
      expect(exposure.is_over_limit).toBe(false);
      expect(exposure.status).toBe('ACTIVE');

      // Verify cached credit account is refreshed
      const cached = await b2bService.getCreditAccount(tenantId, org.id);
      expect(cached.used_exposure_minor).toBe('4000000');
      expect(cached.available_credit_minor).toBe('4000000');
    });

    it('should place account on CREDIT_HOLD when overdue days exceeds grace period', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Delinquent Client GmbH',
        credit_limit_minor: '5000000',
      });

      const exposure = await b2bService.checkCreditExposure(tenantId, {
        organization_id: org.id,
        unpaid_invoices_minor: '1000000',
        pending_orders_minor: '0',
        overdue_days: 45,
        grace_period_days: 30,
      });

      expect(exposure.is_overdue_hold).toBe(true);
      expect(exposure.status).toBe('CREDIT_HOLD');
      expect(exposure.available_credit_minor).toBe('0');
    });

    it('should manage contract prices and evaluate tiered pricing', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Wholesale Partner Inc',
      });

      const priceItem = await b2bService.setContractPrice(tenantId, org.id, {
        sku: 'VALVE-A1',
        custom_price_minor: '7500',
        currency: 'USD',
      });
      expect(priceItem.custom_price_minor).toBe('7500');

      const prices = await b2bService.listContractPrices(tenantId, org.id);
      expect(prices.length).toBe(1);

      // Evaluate price with contract price override
      const resolved = await b2bService.evaluatePrice(tenantId, {
        sku: 'VALVE-A1',
        quantity: 5,
        catalog_list_price_minor: '10000',
        contract_price_minor: '7500',
      });

      expect(resolved.applied_rule).toBe('CONTRACT_PRICE');
      expect(resolved.unit_price_minor).toBe('7500');
      expect(resolved.total_line_minor).toBe('37500');
    });

    it('should create and process purchase requisitions with approval threshold', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Procurement Corp',
      });

      // 1. Requisition under self-approval limit -> Auto-approved
      const autoApproved = await b2bService.createRequisition(tenantId, {
        organization_id: org.id,
        requester_user_id: 'buyer-junior',
        items: [
          {
            sku: 'BOLT-1',
            item_name: 'Industrial Bolt Pack',
            quantity: 2,
            unit_price_minor: '1000',
            total_minor: '2000',
          },
        ],
        requester_approval_limit_minor: '5000',
      });
      expect(autoApproved.status).toBe('APPROVED');

      // 2. Requisition exceeding limit -> PENDING_APPROVAL
      const pending = await b2bService.createRequisition(tenantId, {
        organization_id: org.id,
        requester_user_id: 'buyer-junior',
        items: [
          {
            sku: 'GENERATOR-500',
            item_name: 'Emergency Backup Generator',
            quantity: 1,
            unit_price_minor: '500000',
            total_minor: '500000',
          },
        ],
        requester_approval_limit_minor: '5000',
      });
      expect(pending.status).toBe('PENDING_APPROVAL');

      // 3. Manager approves
      const approved = await b2bService.approveRequisition(tenantId, pending.id, {
        approver_user_id: 'manager-alice',
        notes: 'Approved under Q4 capital budget.',
      });
      expect(approved.status).toBe('APPROVED');
      expect(approved.approver_user_id).toBe('manager-alice');
    });

    it('should reject requisition with reason', async () => {
      const org = await b2bService.createOrganization(tenantId, {
        name: 'Procurement Corp 2',
      });

      const pending = await b2bService.createRequisition(tenantId, {
        organization_id: org.id,
        requester_user_id: 'buyer-bob',
        items: [
          {
            sku: 'LUXURY-CHAIR',
            item_name: 'Executive Chair',
            quantity: 1,
            unit_price_minor: '150000',
            total_minor: '150000',
          },
        ],
        requester_approval_limit_minor: '10000',
      });

      const rejected = await b2bService.rejectRequisition(tenantId, pending.id, {
        approver_user_id: 'director-bob',
        rejection_reason: 'Budget frozen for ergonomic seating.',
      });

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.approval_notes).toBe('Budget frozen for ergonomic seating.');
    });
  });

  describe('B2bPunchoutService', () => {
    const validCxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.040/cXML.dtd">
<cXML version="1.2.040" payloadID="12345@procurement.customer.com" timestamp="2026-10-11T12:00:00Z">
  <Header>
    <From><Credential domain="NetworkID"><Identity>CUSTOMER-ID</Identity></Credential></From>
    <To><Credential domain="NetworkID"><Identity>STOKROVA-SUPPLIER</Identity></Credential></To>
    <Sender>
      <Credential domain="NetworkID"><Identity>CUSTOMER-GATEWAY</Identity><SharedSecret>SECRET123</SharedSecret></Credential>
      <UserAgent>SAP Ariba Procurement 2026</UserAgent>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>COOKIE-XYZ-789</BuyerCookie>
      <BrowserFormPost>
        <URL>https://buyer.procurement.com/cxml/punchout-return</URL>
      </BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>`;

    it('should handle PunchOut setup request and initialize session', async () => {
      const result = await punchoutService.handlePunchoutSetupXml(
        tenantId,
        'org-b2b-buyer',
        validCxml,
        'SECRET123',
      );

      expect(result.sessionId).toBeDefined();
      expect(result.buyerCookie).toBe('COOKIE-XYZ-789');
      expect(result.startUrl).toContain(result.sessionId);

      const session = await punchoutService.getSession(tenantId, result.sessionId);
      expect(session.buyerCookie).toBe('COOKIE-XYZ-789');
      expect(session.status).toBe('ACTIVE');
    });

    it('should complete cart checkout and return cXML OrderMessage', async () => {
      const setup = await punchoutService.handlePunchoutSetupXml(
        tenantId,
        'org-b2b-buyer',
        validCxml,
      );

      const checkout = await punchoutService.checkoutPunchoutCart(
        tenantId,
        setup.sessionId,
        {
          buyer_cookie: 'COOKIE-XYZ-789',
          currency: 'USD',
          total_amount_minor: '15000',
          items: [
            {
              line_number: 1,
              sku: 'WRENCH-PRO',
              description: 'Heavy duty wrench',
              quantity: 2,
              unit_price_minor: '7500',
              uom: 'EA',
            },
          ],
        },
      );

      expect(checkout.browserFormPostUrl).toBe(
        'https://buyer.procurement.com/cxml/punchout-return',
      );
      expect(checkout.cxmlMessage).toContain('PunchOutOrderMessage');
      expect(checkout.cxmlMessage).toContain('WRENCH-PRO');
      expect(checkout.cxmlMessage).toContain('150.00');

      const finishedSession = await punchoutService.getSession(
        tenantId,
        setup.sessionId,
      );
      expect(finishedSession.status).toBe('CHECKED_OUT');
    });
  });
});
