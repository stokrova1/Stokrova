import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type {
  DeveloperApiKey,
  CreateDeveloperApiKeyRequest,
  CreateDeveloperApiKeyResponse,
} from '@stokrova/contracts';
import { CreateDeveloperApiKeySchema } from '@stokrova/validation';
import { computeSha256Hash, maskSecret } from '@stokrova/domain';

@Injectable()
export class DeveloperPlatformService {
  private readonly keys = new Map<string, DeveloperApiKey>();
  private readonly keyHashIndex = new Map<string, string>(); // key_hash -> key_id
  private readonly requestCounts = new Map<string, { count: number; windowStart: number }>();

  async createApiKey(
    tenantId: string,
    req: CreateDeveloperApiKeyRequest,
  ): Promise<CreateDeveloperApiKeyResponse> {
    const parsed = CreateDeveloperApiKeySchema.parse(req);
    const now = new Date();

    const id = `key_${randomUUID()}`;
    const rawSecretBytes = randomBytes(24).toString('hex');
    const rawApiKey = `ak_live_${rawSecretBytes}`;

    const keyPrefix = rawApiKey.slice(0, 12);
    const maskedKey = maskSecret(rawApiKey, 10, 4);
    const keyHash = computeSha256Hash(rawApiKey);

    let expiresAt: string | null = null;
    if (parsed.expires_in_days) {
      const expDate = new Date(now.getTime() + parsed.expires_in_days * 86400 * 1000);
      expiresAt = expDate.toISOString();
    }

    const apiKey: DeveloperApiKey = {
      id,
      tenant_id: tenantId,
      name: parsed.name.trim(),
      key_prefix: keyPrefix,
      masked_key: maskedKey,
      key_hash: keyHash,
      scopes: parsed.scopes,
      rate_limit_per_minute: parsed.rate_limit_per_minute ?? 60,
      expires_at: expiresAt,
      is_active: true,
      last_used_at: null,
      revoked_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.keys.set(id, apiKey);
    this.keyHashIndex.set(keyHash, id);

    return {
      apiKey,
      raw_api_key: rawApiKey, // Returned ONLY ONCE upon creation
    };
  }

  async verifyApiKey(rawApiKey: string): Promise<DeveloperApiKey> {
    if (!rawApiKey || typeof rawApiKey !== 'string') {
      throw new UnauthorizedException('Missing or invalid API key.');
    }

    const hash = computeSha256Hash(rawApiKey.trim());
    const keyId = this.keyHashIndex.get(hash);
    if (!keyId) {
      throw new UnauthorizedException('API key is invalid or unrecognized.');
    }

    const key = this.keys.get(keyId);
    if (!key || !key.is_active || key.revoked_at) {
      throw new UnauthorizedException('API key has been revoked or deactivated.');
    }

    if (key.expires_at) {
      const expTime = new Date(key.expires_at).getTime();
      if (Date.now() > expTime) {
        throw new UnauthorizedException('API key has expired.');
      }
    }

    // Rate limiting check
    this.checkRateLimit(key);

    key.last_used_at = new Date().toISOString();
    return key;
  }

  async revokeApiKey(tenantId: string, keyId: string): Promise<DeveloperApiKey> {
    const key = await this.getKeyById(tenantId, keyId);
    key.is_active = false;
    key.revoked_at = new Date().toISOString();
    key.updated_at = key.revoked_at;
    return key;
  }

  async rotateApiKey(
    tenantId: string,
    keyId: string,
  ): Promise<CreateDeveloperApiKeyResponse> {
    const existing = await this.getKeyById(tenantId, keyId);
    await this.revokeApiKey(tenantId, keyId);

    return this.createApiKey(tenantId, {
      name: `${existing.name} (Rotated)`,
      scopes: existing.scopes,
      rate_limit_per_minute: existing.rate_limit_per_minute,
    });
  }

  async listApiKeys(tenantId: string): Promise<DeveloperApiKey[]> {
    return Array.from(this.keys.values()).filter((k) => k.tenant_id === tenantId);
  }

  async getKeyById(tenantId: string, keyId: string): Promise<DeveloperApiKey> {
    const key = this.keys.get(keyId);
    if (!key || key.tenant_id !== tenantId) {
      throw new NotFoundException(`Developer API key '${keyId}' not found.`);
    }
    return key;
  }

  private checkRateLimit(key: DeveloperApiKey): void {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const current = this.requestCounts.get(key.id);

    if (!current || now - current.windowStart > windowMs) {
      this.requestCounts.set(key.id, { count: 1, windowStart: now });
      return;
    }

    if (current.count >= key.rate_limit_per_minute) {
      throw new BadRequestException(
        `Rate limit exceeded: ${key.rate_limit_per_minute} requests per minute limit reached for this API key.`,
      );
    }

    current.count += 1;
  }
}
