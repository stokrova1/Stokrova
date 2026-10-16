import { DurableMap } from '../infrastructure/database/durable-map.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  IntegrationCredential,
  StoreIntegrationCredentialRequest,
} from '@stokrova/contracts';
import { StoreIntegrationCredentialSchema } from '@stokrova/validation';
import { computeSha256Hash, maskSecret } from '@stokrova/domain';

@Injectable()
export class CredentialReferenceService {
  private readonly credentials = new DurableMap<IntegrationCredential>('integration_credentials');

  async storeCredential(
    tenantId: string,
    instanceId: string,
    req: StoreIntegrationCredentialRequest,
  ): Promise<IntegrationCredential> {
    const parsed = StoreIntegrationCredentialSchema.parse(req);
    const now = new Date().toISOString();
    const id = `cred_${randomUUID()}`;

    const secretHash = computeSha256Hash(parsed.secret);
    const maskedSecret = maskSecret(parsed.secret, 6, 4);

    const credential: IntegrationCredential = {
      id,
      tenant_id: tenantId,
      integration_instance_id: instanceId,
      name: parsed.name.trim(),
      masked_secret: maskedSecret,
      secret_hash: secretHash,
      expires_at: parsed.expires_at ?? null,
      last_rotated_at: now,
      created_at: now,
    };

    this.credentials.set(id, credential);
    return credential;
  }

  async rotateCredential(
    tenantId: string,
    credentialId: string,
    newSecret: string,
  ): Promise<IntegrationCredential> {
    const existing = await this.getCredentialById(tenantId, credentialId);
    const now = new Date().toISOString();

    existing.secret_hash = computeSha256Hash(newSecret);
    existing.masked_secret = maskSecret(newSecret, 6, 4);
    existing.last_rotated_at = now;

    return existing;
  }

  async getCredentialById(
    tenantId: string,
    credentialId: string,
  ): Promise<IntegrationCredential> {
    const cred = this.credentials.get(credentialId);
    if (!cred || cred.tenant_id !== tenantId) {
      throw new NotFoundException(`Integration credential '${credentialId}' not found.`);
    }
    return cred;
  }

  async listCredentials(
    tenantId: string,
    instanceId?: string,
  ): Promise<IntegrationCredential[]> {
    return Array.from(this.credentials.values()).filter((c) => {
      if (c.tenant_id !== tenantId) return false;
      if (instanceId && c.integration_instance_id !== instanceId) return false;
      return true;
    });
  }
}
