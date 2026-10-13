import { describe, it, expect } from 'vitest';
import { CreateTenantRequestSchema } from '../src/tenancy.js';

describe('Tenancy Validation', () => {
  it('validates a correct tenant creation request', () => {
    const valid = {
      name: 'Lagos Supermarket',
      slug: 'lagos-supermarket',
      owner_email: 'owner@lagossupermarket.com',
      owner_full_name: 'Babajide Sanwo',
      default_currency: 'ngn',
    };

    const result = CreateTenantRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_currency).toBe('NGN');
    }
  });

  it('rejects an invalid slug format with uppercase or spaces', () => {
    const invalid = {
      name: 'Lagos Supermarket',
      slug: 'Lagos Supermarket!',
      owner_email: 'owner@lagossupermarket.com',
      owner_full_name: 'Babajide Sanwo',
    };

    const result = CreateTenantRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email formats', () => {
    const invalid = {
      name: 'Lagos Supermarket',
      slug: 'lagos-supermarket',
      owner_email: 'not-an-email',
      owner_full_name: 'Babajide Sanwo',
    };

    const result = CreateTenantRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
