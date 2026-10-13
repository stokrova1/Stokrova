// ============================================================================
// STOKROVA — Global Search, Audit Forensics & Reporting Domain Logic
// Benchmark: SAP S/4HANA Enterprise Search, Datadog Audit Trails, Stripe Reports
// Rule 22: Decoupled, runtime-agnostic pure TypeScript engine (zero node:crypto)
// ============================================================================

export type DomainSearchEntityType =
  | 'PRODUCT'
  | 'VARIANT'
  | 'SKU_BARCODE'
  | 'SALES_ORDER'
  | 'INVOICE'
  | 'CUSTOMER'
  | 'BATCH_SERIAL'
  | 'JOURNAL_ENTRY';

export type DomainSearchMatchRank =
  | 'EXACT_MATCH'
  | 'PREFIX_MATCH'
  | 'SUBSTRING_MATCH'
  | 'FUZZY_MATCH';

export interface DomainSearchIndexEntry {
  id: string;
  entity_type: DomainSearchEntityType;
  entity_id: string;
  primary_text: string;
  secondary_text?: string;
  barcode?: string;
  sku?: string;
  reference_number?: string;
  metadata?: Record<string, unknown>;
}

export interface DomainGlobalSearchResultItem {
  entity_type: DomainSearchEntityType;
  entity_id: string;
  title: string;
  subtitle?: string;
  rank_score: number;
  match_type: DomainSearchMatchRank;
  metadata?: Record<string, unknown>;
}

export interface DomainAuditChainBlock {
  index: number;
  timestamp: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  resource: string;
  resource_id: string;
  payload_hash: string;
  previous_hash: string;
  current_hash: string;
}

export interface DomainAuditChainVerificationResult {
  is_valid: boolean;
  total_blocks_verified: number;
  broken_block_index: number | null;
  error_reason: string | null;
}

// ============================================================================
// PURE TYPESCRIPT SHA-256 ENGINE (Runtime-agnostic, zero Node dependency)
// ============================================================================

const K256: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function ch(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function maj(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: number): number {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function sigma1(x: number): number {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function gamma0(x: number): number {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function gamma1(x: number): number {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

/**
 * Pure TypeScript SHA-256 implementation producing a lowercase 64-char hex string.
 */
export function sha256(message: string): string {
  // UTF-8 encode to bytes
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let code = message.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bitLength = bytes.length * 8;

  // Append '1' bit (0x80 byte)
  bytes.push(0x80);

  // Pad with zeroes until length in bytes = 56 mod 64
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  // Append original length as 64-bit big-endian integer
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLength >>> 24) & 0xff,
    (bitLength >>> 16) & 0xff,
    (bitLength >>> 8) & 0xff,
    bitLength & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] =
        ((bytes[idx]! << 24) |
          (bytes[idx + 1]! << 16) |
          (bytes[idx + 2]! << 8) |
          bytes[idx + 3]!) >>>
        0;
    }

    for (let i = 16; i < 64; i++) {
      const s0 = gamma0(w[i - 15]!);
      const s1 = gamma1(w[i - 2]!);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = sigma1(e);
      const chVal = ch(e, f, g);
      const temp1 = (h + s1 + chVal + K256[i]! + w[i]!) >>> 0;
      const s0 = sigma0(a);
      const majVal = maj(a, b, c);
      const temp2 = (s0 + majVal) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => ('00000000' + (n >>> 0).toString(16)).slice(-8);
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

// ============================================================================
// AUDIT CHAIN FORENSICS ENGINE
// ============================================================================

export function computeAuditChainHash(
  previousHash: string,
  block: {
    index: number;
    timestamp: string;
    tenant_id: string;
    actor_id: string;
    action: string;
    resource: string;
    resource_id: string;
    payload_hash: string;
  }
): string {
  const content = [
    previousHash,
    block.index.toString(),
    block.timestamp,
    block.tenant_id,
    block.actor_id,
    block.action,
    block.resource,
    block.resource_id,
    block.payload_hash,
  ].join('|');

  return sha256(content);
}

export function verifyAuditChainIntegrity(
  blocks: DomainAuditChainBlock[],
  genesisHash: string = '0'.repeat(64)
): DomainAuditChainVerificationResult {
  if (!blocks || blocks.length === 0) {
    return {
      is_valid: true,
      total_blocks_verified: 0,
      broken_block_index: null,
      error_reason: null,
    };
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;

    if (block.index !== i) {
      return {
        is_valid: false,
        total_blocks_verified: i,
        broken_block_index: i,
        error_reason: `Block sequence broken: expected index ${i}, got ${block.index}`,
      };
    }

    const expectedPrevHash = i === 0 ? genesisHash : blocks[i - 1]!.current_hash;
    if (block.previous_hash !== expectedPrevHash) {
      return {
        is_valid: false,
        total_blocks_verified: i,
        broken_block_index: i,
        error_reason: `Previous hash mismatch at index ${i}`,
      };
    }

    const calculatedHash = computeAuditChainHash(block.previous_hash, block);
    if (block.current_hash !== calculatedHash) {
      return {
        is_valid: false,
        total_blocks_verified: i,
        broken_block_index: i,
        error_reason: `Current hash mismatch at index ${i}: tampered data detected`,
      };
    }
  }

  return {
    is_valid: true,
    total_blocks_verified: blocks.length,
    broken_block_index: null,
    error_reason: null,
  };
}

// ============================================================================
// SENSITIVE FIELD MASKING
// ============================================================================

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'access_token',
  'refresh_token',
  'pin',
  'cvv',
  'cvc',
]);

export function maskSensitiveAuditFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (lowerKey.includes('card_number') || lowerKey.includes('pan')) {
      const str = String(value);
      result[key] = str.length > 4 ? `****-****-****-${str.slice(-4)}` : '****';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = maskSensitiveAuditFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// MULTI-ENTITY SEARCH RANKING & FILTERING
// ============================================================================

export function rankAndFilterSearchResults(
  entries: DomainSearchIndexEntry[],
  rawQuery: string,
  entityFilter?: DomainSearchEntityType
): DomainGlobalSearchResultItem[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [];
  }

  const results: DomainGlobalSearchResultItem[] = [];

  for (const entry of entries) {
    if (entityFilter && entry.entity_type !== entityFilter) {
      continue;
    }

    const primary = entry.primary_text.toLowerCase();
    const secondary = (entry.secondary_text ?? '').toLowerCase();
    const barcode = (entry.barcode ?? '').toLowerCase();
    const sku = (entry.sku ?? '').toLowerCase();
    const ref = (entry.reference_number ?? '').toLowerCase();

    let rank_score = 0;
    let match_type: DomainSearchMatchRank = 'SUBSTRING_MATCH';

    // 1. Exact match on Barcode, SKU, or Reference number -> 1000
    if (barcode === query || sku === query || ref === query) {
      rank_score = 1000;
      match_type = 'EXACT_MATCH';
    }
    // 2. Exact match on Primary Text -> 900
    else if (primary === query) {
      rank_score = 900;
      match_type = 'EXACT_MATCH';
    }
    // 3. Prefix match on SKU, Barcode, or Primary Text -> 700
    else if (
      sku.startsWith(query) ||
      barcode.startsWith(query) ||
      primary.startsWith(query)
    ) {
      rank_score = 700;
      match_type = 'PREFIX_MATCH';
    }
    // 4. Substring match on Primary text -> 500
    else if (primary.includes(query)) {
      rank_score = 500;
      match_type = 'SUBSTRING_MATCH';
    }
    // 5. Substring match on Secondary text -> 300
    else if (secondary.includes(query)) {
      rank_score = 300;
      match_type = 'SUBSTRING_MATCH';
    }
    // 6. Fuzzy match (Soundex, Levenshtein distance <= 2, or Trigram similarity >= 35%) -> 400
    else {
      const primaryWords: string[] = primary.split(/\s+/).filter(Boolean);
      const cleanQueryLetters = query.replace(/[^a-z]/g, '');
      const isWordFuzzyMatch = primaryWords.some((word: string) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
        return (
          (cleanWord.length >= 3 && cleanQueryLetters.length >= 3 && computeSoundex(cleanWord) === computeSoundex(cleanQueryLetters)) ||
          (word.length >= 4 && query.length >= 4 && computeLevenshteinDistance(word, query) <= 2) ||
          computeTrigramSimilarity(word, query) >= 4000
        );
      });

      if (
        isWordFuzzyMatch ||
        (cleanQueryLetters.length >= 3 && computeSoundex(primary) === computeSoundex(cleanQueryLetters)) ||
        (query.length >= 4 && computeLevenshteinDistance(primary, query) <= 2) ||
        computeTrigramSimilarity(primary, query) >= 3500
      ) {
        rank_score = 400;
        match_type = 'FUZZY_MATCH';
      }
    }

    if (rank_score > 0) {
      results.push({
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        title: entry.primary_text,
        subtitle: entry.secondary_text,
        rank_score,
        match_type,
        metadata: entry.metadata,
      });
    }
  }

  // Sort descending by score, tie-break alphabetical by title
  return results.sort((a, b) => {
    if (b.rank_score !== a.rank_score) {
      return b.rank_score - a.rank_score;
    }
    return a.title.localeCompare(b.title);
  });
}

// ============================================================================
// DATA EXPORT CHUNK SERIALIZERS
// ============================================================================

export function generateCsvExportString(
  headers: string[],
  rows: Record<string, unknown>[]
): string {
  if (headers.length === 0) {
    return '';
  }

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    const triggerChars = ['=', '+', '-', '@', '\t', '\r'];
    if (str.length > 0 && triggerChars.includes(str[0]!)) {
      return `'${str.replace(/"/g, '""')}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(',')
  );

  return [headerLine, ...rowLines].join('\n') + '\n';
}

export function generateJsonlExportString(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

// ============================================================================
// Phase 21: Phonetic & Fuzzy Search Matchers
// ============================================================================

export function computeSoundex(text: string): string {
  if (!text) return '0000';
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '0000';

  const firstLetter = clean[0]!;
  const mapping: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let soundex = firstLetter;
  let prevCode = mapping[firstLetter] ?? '0';

  for (let i = 1; i < clean.length; i++) {
    const char = clean[i]!;
    const code = mapping[char] ?? '0';
    if (code !== '0' && code !== prevCode) {
      soundex += code;
    }
    prevCode = code;
    if (soundex.length === 4) break;
  }

  return (soundex + '000').slice(0, 4);
}

export function computeLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }

  return dp[m]![n]!;
}

export function generateTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${text.toLowerCase().trim()}  `;
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

export function computeTrigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.toLowerCase() === b.toLowerCase()) return 10000;

  const triA = generateTrigrams(a);
  const triB = generateTrigrams(b);

  if (triA.size === 0 || triB.size === 0) return 0;

  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) {
      intersection++;
    }
  }

  const dice = (2 * intersection) / (triA.size + triB.size);
  return Math.round(dice * 10000);
}

// ============================================================================
// Phase 21: RFC 6962 Merkle Tree Engine (Rule 11 & 20)
// ============================================================================

export function computeMerkleRoot(hashes: string[]): string {
  if (!hashes || hashes.length === 0) {
    return '0'.repeat(64);
  }
  if (hashes.length === 1) {
    return sha256(`00${hashes[0]}`);
  }

  // Hash leaf nodes with 0x00 domain separation prefix
  let currentLevel = hashes.map((h) => sha256(`00${h}`));

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : left;
      nextLevel.push(sha256(`01${left}${right}`));
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0]!;
}

// ============================================================================
// Phase 21: GDPR Article 17 Pseudonymization & Compliance Controls
// ============================================================================

export function pseudonymizePersonalData(
  payload: Record<string, unknown>,
  piiFields: string[],
  salt: string
): Record<string, unknown> {
  const piiSet = new Set(piiFields.map((f) => f.toLowerCase()));
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (piiSet.has(key.toLowerCase()) && value !== null && value !== undefined) {
      const hashed = sha256(`${salt}:${String(value)}`).slice(0, 16);
      result[key] = `[PSEUDONYMIZED_${hashed}]`;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = pseudonymizePersonalData(value as Record<string, unknown>, piiFields, salt);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export interface DomainSodRule {
  id: string;
  name: string;
  action_a: string;
  action_b: string;
  description?: string;
}

export function evaluateSegregationOfDuties(
  actorId: string,
  performedActions: string[],
  requestedAction: string,
  rules: DomainSodRule[]
): {
  allowed: boolean;
  actor_id: string;
  requested_action: string;
  conflicting_actions: string[];
  violation_reason?: string;
} {
  const conflicting: string[] = [];

  for (const rule of rules) {
    if (rule.action_a === requestedAction && performedActions.includes(rule.action_b)) {
      conflicting.push(rule.action_b);
    } else if (rule.action_b === requestedAction && performedActions.includes(rule.action_a)) {
      conflicting.push(rule.action_a);
    }
  }

  if (conflicting.length > 0) {
    return {
      allowed: false,
      actor_id: actorId,
      requested_action: requestedAction,
      conflicting_actions: conflicting,
      violation_reason: `Segregation of duties violation: Actor '${actorId}' cannot execute '${requestedAction}' having already performed '${conflicting.join(', ')}'`,
    };
  }

  return {
    allowed: true,
    actor_id: actorId,
    requested_action: requestedAction,
    conflicting_actions: [],
  };
}

