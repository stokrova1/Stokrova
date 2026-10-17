import { describe, it, expect } from 'vitest';
import { isBusinessDirectoryUser } from './directory-users';

describe('Business account directories', () => {
  it('never lists platform founders while preserving owners and staff', () => {
    const rows = [
      { id: 'founder', role: 'PLATFORM_SUPER_ADMIN' },
      { id: 'founder-two', role: 'PLATFORM_FOUNDER' },
      { id: 'owner', role: 'tenant_admin' },
      { id: 'cashier', role: 'CASHIER' },
    ];
    expect(rows.filter(isBusinessDirectoryUser).map(row => row.id)).toEqual(['owner', 'cashier']);
  });
});