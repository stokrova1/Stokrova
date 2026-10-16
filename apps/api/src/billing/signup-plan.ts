import type { SubscriptionTier } from '@stokrova/contracts';

/** Plan chosen on the website's sign-up form -> billing plan saved on the new business. */
const SIGNUP_PLANS: Record<string, SubscriptionTier> = {
  starter: 'RETAIL_STARTER',
  growth: 'WHOLESALE_GROWTH',
  enterprise: 'ENTERPRISE_LOGISTICS',
};

export function signupPlanTier(choice: string | undefined | null): SubscriptionTier {
  return (choice && SIGNUP_PLANS[choice.toLowerCase()]) || 'RETAIL_STARTER'; // no choice -> Starter (there is no free plan)
}
