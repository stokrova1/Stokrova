import { createPublicKey, verify, type KeyObject } from 'node:crypto';

export interface JsonWebKeyItem {
  alg?: string;
  crv?: string;
  ext?: boolean;
  key_ops?: string[];
  kid?: string;
  kty: string;
  use?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export interface JwksResponse {
  keys: JsonWebKeyItem[];
}

// Known public key for the STOKROVA Supabase Project (vbtuccvxtgjhaywijmwa)
const KNOWN_PROJECT_KEYS: JsonWebKeyItem[] = [
  {
    alg: 'ES256',
    crv: 'P-256',
    ext: true,
    key_ops: ['verify'],
    kid: '39e66b5f-416f-447c-b0f4-be5b56d94ffd',
    kty: 'EC',
    use: 'sig',
    x: 'k1J-xQg7amaf9aRZVc4rCCzyijybNGsuxhhIp4-t-d8',
    y: 'jJP8vAfOgQGvE0bJPmkc2bN_vBTGBATZhZosj69zsvo',
  },
];

export class JwksVerifier {
  private static keyCache = new Map<string, { key: KeyObject; alg: string; expiresAt: number }>();
  private static cacheTtlMs = 60 * 60 * 1000; // 1 hour cache

  static {
    // Pre-populate with known project key
    for (const jwk of KNOWN_PROJECT_KEYS) {
      try {
        const pubKey = createPublicKey({ key: jwk as any, format: 'jwk' });
        const kid = jwk.kid || 'default';
        this.keyCache.set(kid, {
          key: pubKey,
          alg: jwk.alg || 'ES256',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
      } catch {
        // Ignore initialization error
      }
    }
  }

  /**
   * Resolves public key for a given Key ID (kid) or URL.
   */
  public static async getPublicKey(
    kid?: string,
    jwksUrl?: string,
  ): Promise<{ key: KeyObject; alg: string } | null> {
    const now = Date.now();
    if (kid && this.keyCache.has(kid)) {
      const entry = this.keyCache.get(kid)!;
      if (entry.expiresAt > now) {
        return entry;
      }
    }

    if (!jwksUrl) {
      // Return first cached key if available
      const first = Array.from(this.keyCache.values())[0];
      return first || null;
    }

    try {
      const res = await fetch(jwksUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return Array.from(this.keyCache.values())[0] || null;
      }

      const body = (await res.json()) as JwksResponse;
      if (!body.keys || !Array.isArray(body.keys)) {
        return Array.from(this.keyCache.values())[0] || null;
      }

      for (const jwk of body.keys) {
        const itemKid = jwk.kid || 'default';
        const pubKey = createPublicKey({ key: jwk as any, format: 'jwk' });
        this.keyCache.set(itemKid, {
          key: pubKey,
          alg: jwk.alg || 'ES256',
          expiresAt: now + this.cacheTtlMs,
        });
      }

      if (kid && this.keyCache.has(kid)) {
        return this.keyCache.get(kid)!;
      }

      return Array.from(this.keyCache.values())[0] || null;
    } catch {
      return Array.from(this.keyCache.values())[0] || null;
    }
  }

  /**
   * Verifies an asymmetric JWT signature (ES256 / RS256).
   */
  public static verifyAsymmetricSignature(
    signingInput: string,
    signatureB64Url: string,
    pubKey: KeyObject,
    alg: string,
  ): boolean {
    const sigBuf = Buffer.from(signatureB64Url, 'base64url');
    const dataBuf = Buffer.from(signingInput, 'utf8');

    if (alg === 'ES256') {
      return verify(
        'SHA256',
        dataBuf,
        { key: pubKey, dsaEncoding: 'ieee-p1363' },
        sigBuf,
      );
    }

    if (alg === 'RS256') {
      return verify('SHA256', dataBuf, pubKey, sigBuf);
    }

    return false;
  }
}
