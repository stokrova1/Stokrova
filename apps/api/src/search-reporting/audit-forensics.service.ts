import { Injectable } from '@nestjs/common';
import type {
  AuditChainBlock,
  AuditChainVerificationResult,
} from '@stokrova/contracts';
import {
  computeAuditChainHash,
  maskSensitiveAuditFields,
  sha256,
  verifyAuditChainIntegrity,
} from '@stokrova/domain';

@Injectable()
export class AuditForensicsService {
  private readonly tenantChains = new Map<string, AuditChainBlock[]>();

  /**
   * Append an immutable, hash-linked block to the tenant's audit chain.
   */
  async appendAuditBlock(
    tenantId: string,
    actorId: string,
    action: string,
    resource: string,
    resourceId: string,
    rawPayload: Record<string, unknown>
  ): Promise<AuditChainBlock> {
    let chain = this.tenantChains.get(tenantId);
    if (!chain) {
      chain = [];
      this.tenantChains.set(tenantId, chain);
    }

    const index = chain.length;
    const timestamp = new Date().toISOString();
    const maskedPayload = maskSensitiveAuditFields(rawPayload);
    const payloadHash = sha256(JSON.stringify(maskedPayload));

    const genesisHash = '0'.repeat(64);
    const previousHash = index === 0 ? genesisHash : chain[index - 1]!.current_hash;

    const blockData = {
      index,
      timestamp,
      tenant_id: tenantId,
      actor_id: actorId,
      action,
      resource,
      resource_id: resourceId,
      payload_hash: payloadHash,
    };

    const currentHash = computeAuditChainHash(previousHash, blockData);

    const block: AuditChainBlock = {
      ...blockData,
      previous_hash: previousHash,
      current_hash: currentHash,
    };

    chain.push(block);
    return block;
  }

  /**
   * Cryptographically verify the integrity of the tenant's entire audit chain.
   */
  async verifyAuditChain(tenantId: string): Promise<AuditChainVerificationResult> {
    const chain = this.tenantChains.get(tenantId) ?? [];
    return verifyAuditChainIntegrity(chain);
  }

  /**
   * Retrieve all audit blocks for a tenant.
   */
  async getAuditBlocks(tenantId: string): Promise<AuditChainBlock[]> {
    return this.tenantChains.get(tenantId) ?? [];
  }
}
