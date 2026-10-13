import { describe, expect, it } from 'vitest';
import {
  computeAuditChainHash,
  generateCsvExportString,
  generateJsonlExportString,
  maskSensitiveAuditFields,
  rankAndFilterSearchResults,
  sha256,
  verifyAuditChainIntegrity,
  computeSoundex,
  computeLevenshteinDistance,
  generateTrigrams,
  computeTrigramSimilarity,
  computeMerkleRoot,
  pseudonymizePersonalData,
  evaluateSegregationOfDuties,
  type DomainAuditChainBlock,
  type DomainSearchIndexEntry,
} from '../src/search-reporting.js';

describe('Phase 13: Search, Audit Forensics & Enterprise Reporting Domain Engine', () => {
  describe('Phase 13A: Pure SHA-256 Engine', () => {
    it('should compute standard NIST SHA-256 digest for empty string', () => {
      const digest = sha256('');
      expect(digest).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('should compute standard SHA-256 digest for "hello world"', () => {
      const digest = sha256('hello world');
      expect(digest).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      );
    });
  });

  describe('Phase 13B: Tamper-Evident Audit Forensics Chain', () => {
    it('should verify a valid cryptographic audit chain of blocks', () => {
      const genesis = '0'.repeat(64);

      const block0Data = {
        index: 0,
        timestamp: '2026-10-11T12:00:00Z',
        tenant_id: 'ten-1',
        actor_id: 'usr-1',
        action: 'ORDER_CREATED',
        resource: 'orders',
        resource_id: 'ord-100',
        payload_hash: sha256('payload-0'),
      };
      const hash0 = computeAuditChainHash(genesis, block0Data);
      const block0: DomainAuditChainBlock = {
        ...block0Data,
        previous_hash: genesis,
        current_hash: hash0,
      };

      const block1Data = {
        index: 1,
        timestamp: '2026-10-11T12:05:00Z',
        tenant_id: 'ten-1',
        actor_id: 'usr-1',
        action: 'PAYMENT_RECEIVED',
        resource: 'payments',
        resource_id: 'pay-200',
        payload_hash: sha256('payload-1'),
      };
      const hash1 = computeAuditChainHash(hash0, block1Data);
      const block1: DomainAuditChainBlock = {
        ...block1Data,
        previous_hash: hash0,
        current_hash: hash1,
      };

      const result = verifyAuditChainIntegrity([block0, block1], genesis);
      expect(result.is_valid).toBe(true);
      expect(result.total_blocks_verified).toBe(2);
      expect(result.broken_block_index).toBeNull();
    });

    it('should detect when an intermediate audit block has been tampered with', () => {
      const genesis = '0'.repeat(64);
      const block0Data = {
        index: 0,
        timestamp: '2026-10-11T12:00:00Z',
        tenant_id: 'ten-1',
        actor_id: 'usr-1',
        action: 'ORDER_CREATED',
        resource: 'orders',
        resource_id: 'ord-100',
        payload_hash: sha256('payload-0'),
      };
      const hash0 = computeAuditChainHash(genesis, block0Data);
      const block0: DomainAuditChainBlock = {
        ...block0Data,
        previous_hash: genesis,
        current_hash: hash0,
      };

      // Tampered block 1 (altered action but old hash)
      const tamperedBlock1: DomainAuditChainBlock = {
        index: 1,
        timestamp: '2026-10-11T12:05:00Z',
        tenant_id: 'ten-1',
        actor_id: 'usr-1',
        action: 'UNAUTHORIZED_ALTERATION',
        resource: 'payments',
        resource_id: 'pay-200',
        payload_hash: sha256('payload-1'),
        previous_hash: hash0,
        current_hash: 'bad-hash-f5298c',
      };

      const result = verifyAuditChainIntegrity([block0, tamperedBlock1], genesis);
      expect(result.is_valid).toBe(false);
      expect(result.broken_block_index).toBe(1);
      expect(result.error_reason).toContain('tampered data detected');
    });

    it('should mask sensitive credential and payment card fields recursively', () => {
      const raw = {
        actor: 'admin',
        password: 'SuperSecretPassword123!',
        api_key: 'sk_live_9381029381',
        card_number: '4111111111111234',
        cvv: '123',
        nested: {
          token: 'jwt-bearer-token',
          public_notes: 'Legitimate business transaction',
        },
      };

      const masked = maskSensitiveAuditFields(raw);
      expect(masked.password).toBe('[REDACTED]');
      expect(masked.api_key).toBe('[REDACTED]');
      expect(masked.cvv).toBe('[REDACTED]');
      expect(masked.card_number).toBe('****-****-****-1234');
      expect((masked.nested as Record<string, unknown>).token).toBe('[REDACTED]');
      expect((masked.nested as Record<string, unknown>).public_notes).toBe(
        'Legitimate business transaction'
      );
    });
  });

  describe('Phase 13C: Multi-Entity Search Ranking', () => {
    const entries: DomainSearchIndexEntry[] = [
      {
        id: '1',
        entity_type: 'PRODUCT',
        entity_id: 'prod-1',
        primary_text: 'Samsung Galaxy S24 Ultra',
        secondary_text: 'Flagship Android smartphone 512GB',
        barcode: '8806091234567',
        sku: 'SAM-S24-ULTRA',
      },
      {
        id: '2',
        entity_type: 'SALES_ORDER',
        entity_id: 'ord-1',
        primary_text: 'Order #SO-2026-0042',
        reference_number: 'SO-2026-0042',
      },
      {
        id: '3',
        entity_type: 'CUSTOMER',
        entity_id: 'cust-1',
        primary_text: 'Samsung Electronics Nigeria',
        secondary_text: 'Commercial Accounts Distributor',
      },
    ];

    it('should assign exact match highest score for barcode or SKU', () => {
      const results = rankAndFilterSearchResults(entries, '8806091234567');
      expect(results).toHaveLength(1);
      expect(results[0]?.entity_id).toBe('prod-1');
      expect(results[0]?.match_type).toBe('EXACT_MATCH');
      expect(results[0]?.rank_score).toBe(1000);
    });

    it('should assign exact match for order reference number', () => {
      const results = rankAndFilterSearchResults(entries, 'SO-2026-0042');
      expect(results).toHaveLength(1);
      expect(results[0]?.entity_type).toBe('SALES_ORDER');
      expect(results[0]?.rank_score).toBe(1000);
    });

    it('should filter by entity type when specified', () => {
      const results = rankAndFilterSearchResults(entries, 'Samsung', 'CUSTOMER');
      expect(results).toHaveLength(1);
      expect(results[0]?.entity_type).toBe('CUSTOMER');
      expect(results[0]?.entity_id).toBe('cust-1');
    });
  });

  describe('Phase 13D: Data Export Serializers', () => {
    it('should generate RFC 4180 compliant CSV stream chunk', () => {
      const headers = ['id', 'name', 'notes'];
      const rows = [
        { id: '1', name: 'Product A', notes: 'Simple text' },
        { id: '2', name: 'Product B', notes: 'Contains, comma and "quotes"' },
      ];

      const csv = generateCsvExportString(headers, rows);
      expect(csv).toContain('id,name,notes\n');
      expect(csv).toContain('1,Product A,Simple text\n');
      expect(csv).toContain('2,Product B,"Contains, comma and ""quotes"""\n');
    });

    it('should generate valid JSONL stream string', () => {
      const rows = [
        { id: '1', status: 'PAID' },
        { id: '2', status: 'PENDING' },
      ];
      const jsonl = generateJsonlExportString(rows);
      const lines = jsonl.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]!)).toEqual({ id: '1', status: 'PAID' });
    });
  });

  describe('Phase 21A: Phonetic & Fuzzy Search Algorithms', () => {
    it('computes Soundex encodings correctly across phonetically equivalent variations', () => {
      expect(computeSoundex('Smith')).toBe('S530');
      expect(computeSoundex('Smythe')).toBe('S530');
      expect(computeSoundex('Robert')).toBe('R163');
      expect(computeSoundex('Rupert')).toBe('R163');
      expect(computeSoundex('')).toBe('0000');
    });

    it('computes Levenshtein distance accurately', () => {
      expect(computeLevenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(computeLevenshteinDistance('iPhone', 'iPhone')).toBe(0);
      expect(computeLevenshteinDistance('MacBook', 'MacBok')).toBe(1);
    });

    it('computes trigram sets and Dice similarity', () => {
      const trigrams = generateTrigrams('Apple');
      expect(trigrams.size).toBeGreaterThan(0);

      const simExact = computeTrigramSimilarity('MacBook Pro', 'MacBook Pro');
      expect(simExact).toBe(10000);

      const simFuzzy = computeTrigramSimilarity('MacBook Pro', 'MacBok Pro');
      expect(simFuzzy).toBeGreaterThan(5000);

      const simDisjoint = computeTrigramSimilarity('abc', 'xyz');
      expect(simDisjoint).toBe(0);
    });

    it('surfaces fuzzy matches in global search results when exact/prefix/substring do not hit', () => {
      const entries: DomainSearchIndexEntry[] = [
        {
          id: '1',
          entity_type: 'PRODUCT',
          entity_id: 'prod-mac',
          primary_text: 'MacBook Pro 16',
          sku: 'MBP-16',
        },
      ];

      // Typo "MacBok" should match via fuzzy match
      const results = rankAndFilterSearchResults(entries, 'MacBok');
      expect(results).toHaveLength(1);
      expect(results[0]?.entity_id).toBe('prod-mac');
      expect(results[0]?.match_type).toBe('FUZZY_MATCH');
      expect(results[0]?.rank_score).toBe(400);
    });
  });

  describe('Phase 21B: RFC 6962 Merkle Tree Ledger Engine', () => {
    it('computes deterministic RFC 6962 Merkle tree root', () => {
      const emptyRoot = computeMerkleRoot([]);
      expect(emptyRoot).toBe('0'.repeat(64));

      const singleLeaf = sha256('tx-1');
      const rootSingle = computeMerkleRoot([singleLeaf]);
      expect(rootSingle).toBe(sha256(`00${singleLeaf}`));

      const h1 = sha256('tx-1');
      const h2 = sha256('tx-2');
      const h3 = sha256('tx-3');
      const rootMulti = computeMerkleRoot([h1, h2, h3]);
      expect(rootMulti).toHaveLength(64);
      expect(rootMulti).not.toBe(emptyRoot);
    });
  });

  describe('Phase 21C: Regulatory Compliance (GDPR Article 17 & SOX 404)', () => {
    it('pseudonymizes PII fields while preserving financial ledger invariants (Rule 11)', () => {
      const customerRecord = {
        customer_id: 'cust-991',
        customer_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0199',
        total_lifetime_spend_minor: 500000,
        currency: 'USD',
        orders_count: 14,
      };

      const piiFields = ['customer_name', 'email', 'phone'];
      const salt = 'tenant-gdpr-salt-key';

      const pseudonymized = pseudonymizePersonalData(customerRecord, piiFields, salt);

      // PII fields replaced with salted hashes
      expect(pseudonymized.customer_name).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(pseudonymized.email).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);
      expect(pseudonymized.phone).toMatch(/^\[PSEUDONYMIZED_[0-9a-f]{16}\]$/);

      // Financial history and IDs preserved intact (Golden Rule 11)
      expect(pseudonymized.customer_id).toBe('cust-991');
      expect(pseudonymized.total_lifetime_spend_minor).toBe(500000);
      expect(pseudonymized.currency).toBe('USD');
      expect(pseudonymized.orders_count).toBe(14);
    });

    it('enforces Segregation of Duties (SoD) under SOX 404 financial change controls', () => {
      const sodRules = [
        {
          id: 'sod-1',
          name: 'Purchase Order Creation and Approval',
          action_a: 'purchase_order.create',
          action_b: 'purchase_order.approve',
        },
        {
          id: 'sod-2',
          name: 'Payment Creation and Settlement',
          action_a: 'payment.create',
          action_b: 'payment.settle',
        },
      ];

      // User created the PO -> cannot approve it!
      const evaluation1 = evaluateSegregationOfDuties(
        'usr-buyer',
        ['purchase_order.create'],
        'purchase_order.approve',
        sodRules
      );
      expect(evaluation1.allowed).toBe(false);
      expect(evaluation1.violation_reason).toContain('Segregation of duties violation');

      // Different user approving -> allowed
      const evaluation2 = evaluateSegregationOfDuties(
        'usr-supervisor',
        ['inventory.view'],
        'purchase_order.approve',
        sodRules
      );
      expect(evaluation2.allowed).toBe(true);
      expect(evaluation2.conflicting_actions).toHaveLength(0);
    });
  });
});

