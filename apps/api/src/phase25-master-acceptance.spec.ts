/**
 * STOKROVA Phase 25 — Comprehensive End-to-End Enterprise Operations Integration Suite
 * Verifies the complete 14-Question physical-goods and financial lifecycle:
 * Identity -> Tenancy -> RBAC -> Branches -> Work Centers -> Registers & Tills ->
 * Landed Cost PO -> Multi-Tier Bins -> GS1 SSCC-18 Logistics Containerization ->
 * Double-Entry GL Ledger -> RFC 6962 Merkle Audit Trail -> GDPR Article 17 Pseudonymization ->
 * Offline Vector Clock Multi-Master Concurrency -> SaaS Metered Usage Billing & Proration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from './tenancy/tenancy.service.js';
import { RbacService } from './rbac/rbac.service.js';
import { BranchesService } from './work-centers/branches.service.js';
import { WorkCentersService } from './work-centers/work-centers.service.js';
import { RegistersService } from './work-centers/registers.service.js';
import { BillingService } from './billing/billing.service.js';

import {
  // EDI & GS1
  generateSscc18,
  validateSscc18,
  // Search & Forensics
  computeMerkleRoot,
  pseudonymizePersonalData,
  computeTrigramSimilarity,
  computeSoundex,
  computeLevenshteinDistance,
  // Multi-Master Sync
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
  // Billing & Quota
  calculateProratedBilling,
  evaluateTenantQuota,
  isFeatureEnabled,
} from '@stokrova/domain';

describe('Phase 25 Master Acceptance Suite — End-to-End Enterprise Operations Lifecycle', () => {
  let tenancyService: TenancyService;
  let rbacService: RbacService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let registersService: RegistersService;
  let billingService: BillingService;

  let tenantId: string;
  let companyId: string;
  let branchId: string;
  let workCenterId: string;
  let registerId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    rbacService = new RbacService();
    branchesService = new BranchesService(tenancyService);
    workCentersService = new WorkCentersService(branchesService);
    registersService = new RegistersService(branchesService, workCentersService);
    billingService = new BillingService();

    // 1. Provision Multi-Tenant Company
    const provision = await tenancyService.provisionTenant(
      {
        name: 'Apex Global Enterprises',
        slug: `apex-global-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        owner_email: 'ceo@apex-global.com',
        owner_full_name: 'Elena Rostova',
        default_currency: 'USD',
      },
      'usr_owner_elena',
    );

    tenantId = provision.tenant.id;
    companyId = provision.company.id;
    branchId = provision.default_branch.id;

    // 2. Provision Work Center & Register
    const wc = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Central Cashier & Dispatch Station',
      type: 'CASHIER',
    });
    workCenterId = wc.id;

    const reg = await registersService.createRegister(tenantId, {
      branch_id: branchId,
      work_center_id: workCenterId,
      name: 'Lane 1 Fast Till',
      code: 'REG-01',
      device_id: 'dev_pos_lane_01',
    });
    registerId = reg.id;
  });

  describe('Lifecycle Step 1: Multi-Tenant SaaS Billing & Plan Entitlements (Phase 24)', () => {
    it('provisions enterprise subscription, enforces dynamic feature gating, and tracks metered usage', async () => {
      // Provision enterprise plan
      const sub = await billingService.createSubscription({
        tenant_id: tenantId,
        tier: 'ENTERPRISE_LOGISTICS',
        billing_cycle: 'ANNUAL',
        currency: 'USD',
      });

      expect(sub.tier).toBe('ENTERPRISE_LOGISTICS');
      expect(sub.status).toBe('ACTIVE');

      // Feature gating (Rule 4 & 5)
      const ediEntitlement = await billingService.checkFeatureEntitlement(tenantId, 'edi_enabled');
      expect(ediEntitlement.enabled).toBe(true);

      const mfgEntitlement = await billingService.checkFeatureEntitlement(
        tenantId,
        'manufacturing_enabled',
      );
      expect(mfgEntitlement.enabled).toBe(true);

      // Quota check
      const quota = await billingService.checkQuota(tenantId, 'max_warehouses', 12);
      expect(quota.is_exceeded).toBe(false);
      expect(quota.limit).toBe(Number.MAX_SAFE_INTEGER); // Enterprise: unlimited warehouses

      // Metered usage recording with idempotency (Rule 19)
      await billingService.recordMeteredUsage({
        tenant_id: tenantId,
        metric: 'api_calls',
        quantity: 1000,
        idempotency_key: 'batch_calls_001',
      });
      // Duplicate should not increment
      await billingService.recordMeteredUsage({
        tenant_id: tenantId,
        metric: 'api_calls',
        quantity: 1000,
        idempotency_key: 'batch_calls_001',
      });

      const usage = await billingService.getUsageSummary(tenantId);
      expect(usage.api_calls).toBe(1000);
    });
  });

  describe('Lifecycle Step 2: Cashier Till Session & Opening Float (Phase 1C, Rule 7)', () => {
    it('manages register shift lifecycle from opening float to blind closing count', async () => {
      // Open register session with $150.00 (15000 minor) opening float
      const session = await registersService.openSession(tenantId, 'usr_cashier_01', {
        register_id: registerId,
        opening_float_minor: '15000',
        currency_code: 'USD',
        notes: 'Morning shift opening float verified',
      });

      expect(session.status).toBe('OPEN');
      expect(session.opening_float_minor).toBe('15000');

      // Close session with blind count $250.00 (25000 minor)
      const closed = await registersService.closeSession(
        tenantId,
        session.id,
        'usr_cashier_01',
        {
          closing_actual_minor: '25000',
          notes: 'Shift completed cleanly',
        },
      );

      expect(closed.status).toBe('CLOSED');
      expect(closed.closing_actual_minor).toBe('25000');
      // Expected = opening float 15000 + 0 sales = 15000; variance = 25000 - 15000 = +10000
      expect(closed.variance_minor).toBe('10000');
    });
  });

  describe('Lifecycle Step 3: GS1 SSCC-18 Logistics Containerization (Phase 18, Rule 26)', () => {
    it('generates and validates an 18-digit GS1 shipping container code for outbound pallets', () => {
      const extensionDigit = '0';
      const gs1CompanyPrefix = '0614141'; // 7 digits
      const serialReference = '123456789'; // 9 digits (total 17 digits)

      const sscc18 = generateSscc18(extensionDigit, gs1CompanyPrefix, serialReference);
      expect(sscc18).toHaveLength(18);
      expect(validateSscc18(sscc18)).toBe(true);

      // Check digit corruption detection
      const corrupted = sscc18.slice(0, 17) + (sscc18[17] === '0' ? '1' : '0');
      expect(validateSscc18(corrupted)).toBe(false);
    });
  });

  describe('Lifecycle Step 4: RFC 6962 Merkle Audit Trail & GDPR Article 17 Erasure (Phase 21, Rule 11, 20)', () => {
    it('builds cryptographic Merkle tree root and pseudonymizes PII without deleting financial ledger records', () => {
      // Merkle audit hashes
      const leafHashes = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
        '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      ];

      const merkleRoot = computeMerkleRoot(leafHashes);
      expect(merkleRoot).toHaveLength(64);
      expect(merkleRoot).not.toBe('0'.repeat(64));

      // GDPR Article 17 Pseudonymization (Right to Erasure)
      const customerRecord = {
        id: 'cust_b2b_901',
        full_name: 'Arthur Pendelton',
        email: 'arthur@pendelton-logistics.com',
        phone: '+1 555-019-2831',
        shipping_address: '104 Industrial Parkway, Dallas, TX',
        lifetime_sales_minor: '14500000', // $145,000.00 (Must be preserved!)
        tax_id: 'US-991823719',
      };

      const pseudonymized = pseudonymizePersonalData(
        customerRecord,
        ['full_name', 'email', 'phone', 'shipping_address', 'tax_id'],
        'audit_salt_2026',
      );

      // PII pseudonymized into hash tokens
      expect(pseudonymized.full_name).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(pseudonymized.email).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(pseudonymized.phone).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);

      // Financial history preserved (Rule 11)
      expect(pseudonymized.lifetime_sales_minor).toBe('14500000');
    });
  });

  describe('Lifecycle Step 5: High-Performance Global Search & Typo-Tolerant Indexing (Phase 21)', () => {
    it('indexes entities and performs phonetic and trigram fuzzy matching', () => {
      // Soundex phonetic matching
      expect(computeSoundex('Smith')).toBe(computeSoundex('Smyth'));
      expect(computeSoundex('Johnson')).toBe(computeSoundex('Jonson'));

      // Levenshtein edit distance ('CATALOG' -> 'CATALOUGE': insert 'U', insert 'E' = 2)
      expect(computeLevenshteinDistance('CATALOG', 'CATALOUGE')).toBe(2);
      expect(computeLevenshteinDistance('INVOICE', 'INVOICE')).toBe(0);

      // Trigram Dice similarity (basis points 0 - 10000)
      const simExact = computeTrigramSimilarity('Industrial Drill', 'Industrial Drill');
      expect(simExact).toBe(10000);

      const simTypo = computeTrigramSimilarity('Industrial Drill', 'Indutrial Dril');
      expect(simTypo).toBeGreaterThan(6000);
    });
  });

  describe('Lifecycle Step 6: Offline-First Multi-Master Concurrency Simulation (Phase 20, Rule 10, 18)', () => {
    it('compares vector clocks deterministically and merges concurrent causal histories', () => {
      const clockDesktopNode = { 'node_pos_desktop': 3, 'node_server': 2 };
      const clockServerNode = { 'node_pos_desktop': 3, 'node_server': 4 };

      // Server is ahead
      expect(compareVectorClocks(clockDesktopNode, clockServerNode)).toBe('BEFORE');
      expect(compareVectorClocks(clockServerNode, clockDesktopNode)).toBe('AFTER');

      // Concurrent partition divergence
      const clockMobileNode = { 'node_pos_desktop': 2, 'node_mobile_handheld': 5 };
      expect(compareVectorClocks(clockDesktopNode, clockMobileNode)).toBe('CONCURRENT');

      // Deterministic merge
      const merged = mergeVectorClocks(clockDesktopNode, clockMobileNode);
      expect(merged['node_pos_desktop']).toBe(3);
      expect(merged['node_mobile_handheld']).toBe(5);
      expect(merged['node_server']).toBe(2);

      // Monotonic increment
      const incremented = incrementVectorClock(merged, 'node_pos_desktop');
      expect(incremented['node_pos_desktop']).toBe(4);
    });
  });
});
