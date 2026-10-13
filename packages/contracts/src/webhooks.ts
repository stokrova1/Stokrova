/**
 * ============================================================================
 * STOKROVA — Enterprise Webhook Engine, Dead-Letter Queue & Notification Bus Contracts
 * Phase 19: Webhooks, Outbox Event Bus & Multi-Channel Notification Engine
 *
 * Benchmark: Stripe Webhooks, GitHub Webhooks, Svix Webhook Gateway,
 * AWS EventBridge, Twilio SendGrid Notification Dispatch
 * ============================================================================
 */

import type {
  WebhookEventType,
} from './integrations.js';

export interface WebhookDeadLetter {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_type: WebhookEventType;
  payload_json: string;
  total_attempts: number;
  last_error: string;
  replayed_at?: string | null;
  created_at: string;
}

export interface ReplayDeadLetterRequest {
  dead_letter_ids?: string[];
  subscription_id?: string;
}

export interface RotateWebhookSecretRequest {
  subscription_id: string;
  custom_secret?: string;
}

export interface TestWebhookSubscriptionRequest {
  subscription_id: string;
  event_type?: WebhookEventType;
}

export interface CircuitBreakerState {
  is_open: boolean;
  consecutive_failures: number;
  tripped_at?: string | null;
  cool_off_ends_at?: string | null;
}

export interface WebhookSignatureVerificationResult {
  is_valid: boolean;
  reason?: string;
  timestamp?: number;
}
