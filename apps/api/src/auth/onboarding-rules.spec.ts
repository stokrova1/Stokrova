import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const owner = { id: 'user-1', email: 'owner@realshop.com', full_name: 'Ada Owner' };
const form = { name: 'Real Shop Ltd', slug: 'real-shop', owner_full_name: 'Ada Owner', default_currency: 'NGN' };

describe('company sign-up rules', () => {
  it('the company owner is always the signed-in account, even when the form omits or fakes the email', async () => {
    let received: any;
    const controller = new AuthController({ completeOnboarding: async (_u: any, dto: any) => (received = dto) } as any);
    await controller.completeOnboarding(owner as any, { ...form, owner_email: 'attacker@evil.com' });
    expect(received.owner_email).toBe('owner@realshop.com');
    await controller.completeOnboarding(owner as any, form);
    expect(received.owner_email).toBe('owner@realshop.com');
  });

  it('one account cannot register a second company through sign-up', async () => {
    const service = new AuthService({} as any, undefined as any);
    (service as any).getSession = async () => ({ onboarding_status: 'COMPLETED', active_tenant: { id: 'ten_1', slug: 'first-shop' } });
    await expect(service.completeOnboarding(owner as any, { ...form, owner_email: owner.email } as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
