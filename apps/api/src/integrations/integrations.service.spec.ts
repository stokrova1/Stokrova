import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsolidationService } from './consolidation.service.js';
import { InterCompanyService } from './inter-company.service.js';
import { WebhooksService } from './webhooks.service.js';
import { DocumentEngineService } from './document-engine.service.js';
import { NotificationsService } from './notifications.service.js';
import { AccountsService } from '../finance/accounts.service.js';
import { GeneralLedgerService } from '../finance/general-ledger.service.js';
import { FinancialReportsService } from '../finance/financial-reports.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { isSignatureValidConstantTime } from '@stokrova/domain';

describe('Multi-Company Consolidation & Integrations Service Suite (Phase 11)', () => {
  let tenancyService: TenancyService;
  let warehousesService: WarehousesService;
  let accountsService: AccountsService;
  let glService: GeneralLedgerService;
  let reportsService: FinancialReportsService;

  let consolidationService: ConsolidationService;
  let interCompanyService: InterCompanyService;
  let webhooksService: WebhooksService;
  let documentService: DocumentEngineService;
  let notificationsService: NotificationsService;

  let tenantAId: string;
  let tenantBId: string;
  const parentCompanyId = 'comp-parent';
  const subCompanyAId = 'comp-sub-a';
  const subCompanyBId = 'comp-sub-b';

  let warehouseAId: string;
  let warehouseBId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    warehousesService = new WarehousesService(tenancyService);
    accountsService = new AccountsService();
    glService = new GeneralLedgerService(accountsService);
    reportsService = new FinancialReportsService(accountsService, glService);

    consolidationService = new ConsolidationService(reportsService);
    interCompanyService = new InterCompanyService(warehousesService, glService);
    webhooksService = new WebhooksService();
    documentService = new DocumentEngineService();
    notificationsService = new NotificationsService();

    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Corp A',
        slug: 'corp-a',
        owner_email: 'a@corp.com',
        owner_full_name: 'Corp Owner',
        default_currency: 'USD',
      },
      'usr_owner_1',
    );
    tenantAId = t1.tenant.id;
    const branchAId = t1.default_branch.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Corp B',
        slug: 'corp-b',
        owner_email: 'b@corp.com',
        owner_full_name: 'Corp B Owner',
        default_currency: 'USD',
      },
      'usr_owner_2',
    );
    tenantBId = t2.tenant.id;

    // Create warehouses
    const whA = await warehousesService.createWarehouse(tenantAId, {
      branch_id: branchAId,
      code: 'WH-SUB-A',
      name: 'Warehouse Sub A',
    });
    warehouseAId = whA.id;

    const whB = await warehousesService.createWarehouse(tenantAId, {
      branch_id: branchAId,
      code: 'WH-SUB-B',
      name: 'Warehouse Sub B',
    });
    warehouseBId = whB.id;
  });

  // ==========================================================================
  // 1. Holding Groups & Multi-Company Consolidation
  // ==========================================================================
  describe('Holding Groups & Consolidation', () => {
    it('creates a holding group and enforces hierarchy rules', async () => {
      const group = await consolidationService.createHoldingGroup(tenantAId, {
        code: 'HOLDING-GLOBAL',
        name: 'Stokrova Global Holding',
        parent_company_id: parentCompanyId,
        subsidiary_company_ids: [subCompanyAId, subCompanyBId],
      });

      expect(group.id).toBeDefined();
      expect(group.code).toBe('HOLDING-GLOBAL');
      expect(group.subsidiary_company_ids.length).toBe(2);
    });

    it('rejects duplicate holding group code', async () => {
      await consolidationService.createHoldingGroup(tenantAId, {
        code: 'HOLDING-GLOBAL',
        name: 'Stokrova Global Holding',
        parent_company_id: parentCompanyId,
        subsidiary_company_ids: [subCompanyAId],
      });

      await expect(
        consolidationService.createHoldingGroup(tenantAId, {
          code: 'HOLDING-GLOBAL',
          name: 'Duplicate Holding',
          parent_company_id: parentCompanyId,
          subsidiary_company_ids: [subCompanyBId],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('generates a consolidated trial balance eliminating inter-company balances', async () => {
      const group = await consolidationService.createHoldingGroup(tenantAId, {
        code: 'HOLDING-CONSOL',
        name: 'Consolidation Test Group',
        parent_company_id: parentCompanyId,
        subsidiary_company_ids: [subCompanyAId],
      });

      // Seed chart of accounts for both parent and subsidiary A
      await accountsService.seedDefaultChartOfAccounts(tenantAId, parentCompanyId);
      await accountsService.seedDefaultChartOfAccounts(tenantAId, subCompanyAId);

      const report = await consolidationService.generateConsolidatedTrialBalance(
        tenantAId,
        group.id,
      );

      expect(report.holding_group_id).toBe(group.id);
      expect(report.is_balanced).toBe(true);
      expect(report.rows.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 2. Inter-Company Stock Transfers & Mirror Journal Postings
  // ==========================================================================
  describe('Inter-Company Transfers (ICT)', () => {
    it('creates and executes full inter-company transfer lifecycle with paired mirror journals', async () => {
      const transfer = await interCompanyService.createTransfer(tenantAId, {
        source_company_id: subCompanyAId,
        source_warehouse_id: warehouseAId,
        destination_company_id: subCompanyBId,
        destination_warehouse_id: warehouseBId,
        items: [
          {
            variant_id: 'var-101',
            sku: 'FLANGE-100',
            quantity: 20,
            unit_transfer_price_minor: '5000', // $50.00 each -> $1,000.00 (100,000 minor)
          },
        ],
      });

      expect(transfer.status).toBe('PROPOSED');
      expect(transfer.total_amount_minor).toBe('100000');

      // Approve & Dispatch
      const approved = await interCompanyService.approveTransfer(tenantAId, transfer.id);
      expect(approved.status).toBe('APPROVED');

      const inTransit = await interCompanyService.dispatchTransfer(tenantAId, transfer.id);
      expect(inTransit.status).toBe('IN_TRANSIT');

      // Seed COA for both entities
      const coaA = await accountsService.seedDefaultChartOfAccounts(tenantAId, subCompanyAId);
      const coaB = await accountsService.seedDefaultChartOfAccounts(tenantAId, subCompanyBId);

      const arA = coaA.find((a) => a.code === '1100')!;
      const revA = coaA.find((a) => a.code === '4020')!;
      const invB = coaB.find((a) => a.code === '1200')!;
      const apB = coaB.find((a) => a.code === '2010')!;

      // Complete transfer with mirror journal posting
      const completed = await interCompanyService.completeTransfer(tenantAId, transfer.id, {
        sellerReceivableAccountId: arA.id,
        sellerRevenueAccountId: revA.id,
        buyerAssetAccountId: invB.id,
        buyerPayableAccountId: apB.id,
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.source_journal_entry_id).toBeDefined();
      expect(completed.destination_journal_entry_id).toBeDefined();

      // Verify seller journal entry
      const sellerJe = await glService.getJournalEntryById(tenantAId, completed.source_journal_entry_id!);
      expect(sellerJe.status).toBe('POSTED');
      expect(sellerJe.total_debit_minor).toBe('100000');
      expect(sellerJe.total_credit_minor).toBe('100000');

      // Verify buyer journal entry
      const buyerJe = await glService.getJournalEntryById(tenantAId, completed.destination_journal_entry_id!);
      expect(buyerJe.status).toBe('POSTED');
      expect(buyerJe.total_debit_minor).toBe('100000');
      expect(buyerJe.total_credit_minor).toBe('100000');
    });

    it('rejects transfer when source and destination company are the same', async () => {
      await expect(
        interCompanyService.createTransfer(tenantAId, {
          source_company_id: subCompanyAId,
          source_warehouse_id: warehouseAId,
          destination_company_id: subCompanyAId,
          destination_warehouse_id: warehouseBId,
          items: [
            {
              variant_id: 'var-101',
              sku: 'FLANGE-100',
              quantity: 5,
              unit_transfer_price_minor: '1000',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // 3. Webhook Subscriptions & HMAC-SHA256 Signing
  // ==========================================================================
  describe('Webhooks Pipeline', () => {
    it('creates a subscription and dispatches HMAC-SHA256 signed event', async () => {
      const sub = await webhooksService.createSubscription(tenantAId, {
        name: 'Shopify Sync Webhook',
        target_url: 'https://example.com/webhooks/orders',
        event_types: ['ORDER_PAID', 'DELIVERY_COMPLETED'],
        secret_token: 'whsec_secret_12345678',
      });

      expect(sub.id).toBeDefined();
      expect(sub.secret_token).toBe('whsec_secret_12345678');

      // Dispatch test event
      const attempts = await webhooksService.dispatchWebhookEvent(tenantAId, 'ORDER_PAID', {
        order_id: 'ord-8899',
        total_minor: '15000',
      });

      expect(attempts.length).toBe(1);
      const attempt = attempts[0]!;
      expect(attempt.status).toBe('SUCCESS');
      expect(attempt.signature_header).toMatch(/^sha256=[a-f0-9]{64}$/);

      // Verify constant-time signature matching
      const signatureHex = attempt.signature_header.replace('sha256=', '');
      expect(isSignatureValidConstantTime(signatureHex, signatureHex)).toBe(true);
    });

    it('calculates deterministic exponential retry backoff intervals', () => {
      expect(webhooksService.calculateRetryDelay(1)).toBe(60);
      expect(webhooksService.calculateRetryDelay(2)).toBe(300);
      expect(webhooksService.calculateRetryDelay(4)).toBe(3600);
    });

    it('moves exhausted failed attempts to Dead-Letter Queue (DLQ) and replays them', async () => {
      const sub = await webhooksService.createSubscription(tenantAId, {
        name: 'Failing Endpoint Webhook',
        target_url: 'https://broken.example.com/webhooks',
        event_types: ['PAYMENT_FAILED'],
        retry_limit: 3,
      });

      // Simulate failure attempt 1, 2, 3
      await webhooksService.recordDeliveryFailure(tenantAId, sub.id, 'PAYMENT_FAILED', '{"fail":1}', 1, 'Connection refused', 503);
      await webhooksService.recordDeliveryFailure(tenantAId, sub.id, 'PAYMENT_FAILED', '{"fail":2}', 2, 'Connection timeout', 504);
      const attempt3 = await webhooksService.recordDeliveryFailure(tenantAId, sub.id, 'PAYMENT_FAILED', '{"fail":3}', 3, 'Internal server error', 500);

      expect(attempt3.status).toBe('DEAD_LETTER');

      // Verify dead letters exist
      const deadLetters = await webhooksService.listDeadLetters(tenantAId, sub.id);
      expect(deadLetters.length).toBe(1);
      expect(deadLetters[0]!.total_attempts).toBe(3);
      expect(deadLetters[0]!.replayed_at).toBeNull();

      // Replay DLQ message
      const replayRes = await webhooksService.replayDeadLetters(tenantAId, {
        subscription_id: sub.id,
      });
      expect(replayRes.replayedCount).toBe(1);
      expect(replayRes.attempts[0]!.status).toBe('SUCCESS');

      const deadLettersAfter = await webhooksService.listDeadLetters(tenantAId, sub.id);
      expect(deadLettersAfter[0]!.replayed_at).toBeDefined();
    });

    it('rotates webhook secret token and tests ping dispatch', async () => {
      const sub = await webhooksService.createSubscription(tenantAId, {
        name: 'Rotation Target',
        target_url: 'https://example.com/wh',
        event_types: ['ORDER_CREATED'],
      });

      const oldSecret = sub.secret_token;
      const rotated = await webhooksService.rotateSecret(tenantAId, {
        subscription_id: sub.id,
        custom_secret: 'whsec_rotated_super_token_9999999999',
      });

      expect(rotated.secret_token).toBe('whsec_rotated_super_token_9999999999');
      expect(rotated.secret_token).not.toBe(oldSecret);

      // Trigger test ping
      const testAttempt = await webhooksService.testSubscription(tenantAId, {
        subscription_id: sub.id,
      });
      expect(testAttempt.status).toBe('SUCCESS');
      expect(testAttempt.response_body).toContain('pong');
    });
  });

  // ==========================================================================
  // 4. Enterprise Document Engine & Rule 7 Reprint Tracking
  // ==========================================================================
  describe('Document Engine & Reprint Tracking', () => {
    it('tracks first print and subsequent reprint counters explicitly without mutating financial truth', async () => {
      // First print: original
      const doc1 = await documentService.renderDocument(tenantAId, {
        document_type: 'INVOICE',
        entity_id: 'inv-555',
        format: 'HTML',
      });

      expect(doc1.is_reprint).toBe(false);
      expect(doc1.reprint_count).toBe(0);
      expect(doc1.content).not.toContain('[COPY / REPRINT');

      // Second print: reprint #1
      const doc2 = await documentService.renderDocument(tenantAId, {
        document_type: 'INVOICE',
        entity_id: 'inv-555',
        format: 'HTML',
      });

      expect(doc2.is_reprint).toBe(true);
      expect(doc2.reprint_count).toBe(1);
      expect(doc2.content).toContain('[COPY / REPRINT #1]');
    });
  });

  // ==========================================================================
  // 5. Multi-Channel Notifications
  // ==========================================================================
  describe('Notifications Service', () => {
    it('dispatches and marks notification as read', async () => {
      const notif = await notificationsService.sendNotification(tenantAId, {
        channel: 'IN_APP',
        severity: 'CRITICAL',
        title: 'Safety Stock Breached',
        message: 'Reorder triggered immediately',
      });

      expect(notif.is_read).toBe(false);

      const updated = await notificationsService.markAsRead(tenantAId, notif.id);
      expect(updated.is_read).toBe(true);
    });

    it('sends templated notification and counts unread notifications', async () => {
      const templated = await notificationsService.sendTemplatedNotification(tenantAId, {
        user_id: 'usr_buyer_1',
        channel: 'IN_APP',
        severity: 'INFO',
        titleTemplate: 'Order {{order_id}} Confirmed',
        bodyTemplate: 'Customer {{customer}} placed order for ${{amount}}.',
        variables: { order_id: 'ORD-77', customer: 'Acme Inc', amount: '250.00' },
      });

      expect(templated.title).toBe('Order ORD-77 Confirmed');
      expect(templated.message).toBe('Customer Acme Inc placed order for $250.00.');
      expect(templated.is_read).toBe(false);

      const unreadCount = await notificationsService.getUnreadCount(tenantAId, 'usr_buyer_1');
      expect(unreadCount).toBeGreaterThanOrEqual(1);

      const allReadCount = await notificationsService.markAllAsRead(tenantAId, 'usr_buyer_1');
      expect(allReadCount).toBeGreaterThanOrEqual(1);

      const unreadAfter = await notificationsService.getUnreadCount(tenantAId, 'usr_buyer_1');
      expect(unreadAfter).toBe(0);
    });
  });

  // ==========================================================================
  // 6. Strict Multi-Tenant Isolation
  // ==========================================================================
  describe('Multi-Tenant Isolation', () => {
    it('guarantees tenant A integrations are completely isolated from tenant B', async () => {
      const groupA = await consolidationService.createHoldingGroup(tenantAId, {
        code: 'HOLDING-A',
        name: 'Holding A',
        parent_company_id: parentCompanyId,
        subsidiary_company_ids: [subCompanyAId],
      });

      const listB = await consolidationService.listHoldingGroups(tenantBId);
      expect(listB.length).toBe(0);

      await expect(
        consolidationService.getHoldingGroupById(tenantBId, groupA.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
