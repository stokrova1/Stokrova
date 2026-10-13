import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CrmCommunicationChannel } from '@stokrova/contracts';

export interface SendMessageParams {
  channel: CrmCommunicationChannel;
  recipient_address: string;
  subject?: string | null;
  body: string;
  operation_id: string;
  tenant_id: string;
}

export interface SendMessageResult {
  success: boolean;
  provider_message_id?: string;
  error_message?: string;
  is_timeout?: boolean;
}

export interface CommunicationAdapter {
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}

@Injectable()
export class MockCommunicationAdapter implements CommunicationAdapter {
  private readonly logger = new Logger(MockCommunicationAdapter.name);

  // In-memory record of dispatched messages for verification
  public readonly sentMessages: (SendMessageParams & {
    provider_message_id: string;
    sent_at: string;
  })[] = [];

  // Configurable failure simulation for testing timeout and provider error recovery
  public simulateTimeout = false;
  public simulateNetworkError = false;

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    if (this.simulateTimeout) {
      this.logger.warn(`Simulating provider timeout for operation ${params.operation_id}`);
      return {
        success: false,
        error_message: 'PROVIDER_TIMEOUT: Gateway did not respond within timeout window',
        is_timeout: true,
      };
    }

    if (this.simulateNetworkError) {
      this.logger.warn(`Simulating provider network error for operation ${params.operation_id}`);
      return {
        success: false,
        error_message: 'PROVIDER_NETWORK_ERROR: Connection refused by upstream gateway',
        is_timeout: false,
      };
    }

    const providerMessageId = `prov_msg_${randomUUID()}`;
    this.sentMessages.push({
      ...params,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
    });

    return {
      success: true,
      provider_message_id: providerMessageId,
    };
  }

  reset(): void {
    this.sentMessages.length = 0;
    this.simulateTimeout = false;
    this.simulateNetworkError = false;
  }
}
