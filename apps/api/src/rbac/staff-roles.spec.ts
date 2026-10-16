import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { SystemRoleTemplates, StandardPermissions as P } from '@stokrova/domain';

describe('staff roles', () => {
  it('a branch manager cannot invite someone as business owner', async () => {
    const s = new RbacService();
    const owner = (await s.getRoleTemplates()).find((r) => r.code === 'BUSINESS_OWNER')!;
    vi.spyOn(s, 'getUserActiveAssignments').mockResolvedValue([{ role_code: 'BRANCH_MANAGER', permissions: SystemRoleTemplates.BRANCH_MANAGER.permissions, scope: {} } as any]);
    await expect(s.inviteStaff('ten_1', 'usr_mgr', { role_id: owner.id, email: 'a@b.co', full_name: 'A B' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('cashiers can ring up sales at the till', () => {
    expect(SystemRoleTemplates.CASHIER.permissions).toContain(P.POS_CHECKOUT);
  });
  it('branch managers can create quotations and invoices', () => {
    expect(SystemRoleTemplates.BRANCH_MANAGER.permissions).toEqual(expect.arrayContaining([P.QUOTATIONS_CREATE, P.INVOICES_CREATE]));
  });
  it('register management uses the real permission code', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(new URL('../pos/pos.controller.ts', import.meta.url), 'utf8')).not.toContain("'registers:manage'");
  });
});
