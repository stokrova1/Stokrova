import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InboundWebhookReceipt,
  InboundWebhookPayload,
} from '@stokrova/contracts';
import { InboundWebhookPayloadSchema } from '@stokrova/validation';
import {
  verifyWebhookSignature,
  isWithinReplayWindow,
  computeSha256Hash,
} from '@stokrova/domain';

export interface IngestWebhookResult {
  receipt: InboundWebhookReceipt;
  was_processed: boolean;
  is_duplicate: boolean;
  message: string;
}

@Injectable()
export class InboundWebhookGatewayService {
  private readonly logger = new Logger(InboundWebhookGatewayService.name);
  private readonly receipts = new DurableMap<InboundWebhookReceipt>('inbound_webhook_receipts');
  private readonly dedupIndex = new Set<string>(); // tenantId:provider:eventId

  async ingestWebhook(
    tenantId: string,
    payload: InboundWebhookPayload,
    sharedSecret?: string,
  ): Promise<IngestWebhookResult> {
    // 1. Schema Validation
    const parsed = InboundWebhookPayloadSchema.parse(payload);

    // 2. Payload size limit (Max 1MB)
    const payloadStr = JSON.stringify(parsed.payload);
    if (payloadStr.length > 1024 * 1024) {
      throw new BadRequestException('Payload exceeds maximum permitted size of 1MB.');
    }

    // 3. Signature Validation if secret is configured
    if (sharedSecret && parsed.signature) {
      const sigRes = verifyWebhookSignature(
        sharedSecret,
        parsed.signature,
        payloadStr,
        300,
        parsed.timestamp,
      );
      if (!sigRes.isValid) {
        throw new UnauthorizedException(
          `Webhook signature verification failed: ${sigRes.reason ?? 'Invalid signature'}`,
        );
      }
    }

    // 4. Replay Window Verification
    if (parsed.timestamp) {
      const withinWindow = isWithinReplayWindow(parsed.timestamp);
      if (!withinWindow) {
        throw new UnauthorizedException(
          'Webhook timestamp is outside acceptable replay window (300 seconds).',
        );
      }
    }

    // 5. Deduplication check by (tenant_id, provider, provider_event_id)
    const dedupKey = `${tenantId}:${parsed.provider}:${parsed.provider_event_id}`;
    const payloadHash = computeSha256Hash(payloadStr);
    const now = new Date().toISOString();

    if (this.dedupIndex.has(dedupKey)) {
      // Find existing receipt
      const existing = Array.from(this.receipts.values()).find(
        (r) =>
          r.tenant_id === tenantId &&
          r.provider === parsed.provider &&
          r.provider_event_id === parsed.provider_event_id,
      );

      this.logger.log(
        `Idempotent skip: Webhook ${parsed.provider}:${parsed.provider_event_id} already received for tenant ${tenantId}`,
      );

      return {
        receipt: existing ?? {
          id: `rcpt_dup_${randomUUID()}`,
          tenant_id: tenantId,
          provider: parsed.provider,
          provider_event_id: parsed.provider_event_id,
          event_type: parsed.event_type,
          payload_hash: payloadHash,
          status: 'DUPLICATE_IGNORED',
          received_at: now,
          processed_at: now,
          error_message: null,
        },
        was_processed: false,
        is_duplicate: true,
        message: 'Duplicate event received and safely ignored.',
      };
    }

    // 6. Record New Receipt
    const receiptId = `rcpt_${randomUUID()}`;
    const receipt: InboundWebhookReceipt = {
      id: receiptId,
      tenant_id: tenantId,
      provider: parsed.provider,
      provider_event_id: parsed.provider_event_id,
      event_type: parsed.event_type,
      payload_hash: payloadHash,
      status: 'PROCESSED',
      received_at: now,
      processed_at: now,
      error_message: null,
    };

    this.receipts.set(receiptId, receipt);
    this.dedupIndex.add(dedupKey);

    return {
      receipt,
      was_processed: true,
      is_duplicate: false,
      message: 'Inbound webhook verified and accepted for domain processing.',
    };
  }

  async listReceipts(
    tenantId: string,
    provider?: string,
  ): Promise<InboundWebhookReceipt[]> {
    return Array.from(this.receipts.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (provider && r.provider !== provider) return false;
      return true;
    });
  }
}
