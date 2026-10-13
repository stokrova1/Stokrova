import { z } from 'zod';
import { WebhookEventTypeSchema } from './integrations.js';

export const ReplayDeadLetterSchema = z.object({
  dead_letter_ids: z.array(z.string().min(1)).optional(),
  subscription_id: z.string().min(1).optional(),
});

export const RotateWebhookSecretSchema = z.object({
  subscription_id: z.string().min(1, 'Subscription ID is required'),
  custom_secret: z.string().trim().min(16).max(128).optional(),
});

export const TestWebhookSubscriptionSchema = z.object({
  subscription_id: z.string().min(1, 'Subscription ID is required'),
  event_type: WebhookEventTypeSchema.default('ORDER_CREATED'),
});

export const NotificationTemplateSchema = z.object({
  template: z.string().trim().min(1, 'Template cannot be empty'),
  variables: z.record(z.union([z.string(), z.number()])),
});
