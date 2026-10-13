import { describe, it, expect } from 'vitest';
import {
  StandardPermissions,
  SystemRoleTemplates,
  evaluatePermissionScope,
} from '../src/rbac.js';

describe('Scoped RBAC Domain Engine', () => {
  it('provides comprehensive system role templates', () => {
    expect(SystemRoleTemplates['BUSINESS_OWNER']?.permissions).toContain(
      StandardPermissions.SALES_ORDER_CREATE,
    );
    expect(SystemRoleTemplates['CASHIER']?.permissions).toContain(
      StandardPermissions.PAYMENTS_COLLECT,
    );
    expect(SystemRoleTemplates['WAREHOUSE_PICKER']?.permissions).toContain(
      StandardPermissions.INVENTORY_PICK,
    );
    expect(SystemRoleTemplates['WAREHOUSE_CHECKER']?.permissions).toContain(
      StandardPermissions.INVENTORY_VERIFY,
    );
  });

  it('permits global tenant-level assignments across any branch', () => {
    const assignments = [
      {
        role_code: 'BUSINESS_OWNER',
        permissions: ['*'],
        scope: {}, // global
      },
    ];

    const result = evaluatePermissionScope(
      assignments,
      StandardPermissions.SALES_ORDER_CREATE,
      { branch_id: 'branch_lagos' },
    );
    expect(result).toBe(true);
  });

  it('restricts branch-scoped roles to their specific branch', () => {
    const assignments = [
      {
        role_code: 'BRANCH_MANAGER',
        permissions: [StandardPermissions.SALES_DISCOUNT_APPLY],
        scope: { branch_id: 'branch_lagos' },
      },
    ];

    // Allowed in Lagos
    expect(
      evaluatePermissionScope(assignments, StandardPermissions.SALES_DISCOUNT_APPLY, {
        branch_id: 'branch_lagos',
      }),
    ).toBe(true);

    // Denied in Abuja
    expect(
      evaluatePermissionScope(assignments, StandardPermissions.SALES_DISCOUNT_APPLY, {
        branch_id: 'branch_abuja',
      }),
    ).toBe(false);
  });

  it('correctly evaluates users holding multiple scoped roles simultaneously', () => {
    // User is Manager in Lagos, but only Cashier in Abuja
    const multiRoleUser = [
      {
        role_code: 'BRANCH_MANAGER',
        permissions: [StandardPermissions.SALES_DISCOUNT_APPLY, StandardPermissions.STAFF_MANAGE],
        scope: { branch_id: 'branch_lagos' },
      },
      {
        role_code: 'CASHIER',
        permissions: [StandardPermissions.PAYMENTS_COLLECT],
        scope: { branch_id: 'branch_abuja', register_id: 'reg_01' },
      },
    ];

    // Manager authority in Lagos
    expect(
      evaluatePermissionScope(multiRoleUser, StandardPermissions.STAFF_MANAGE, {
        branch_id: 'branch_lagos',
      }),
    ).toBe(true);

    // Cashier cannot manage staff in Abuja
    expect(
      evaluatePermissionScope(multiRoleUser, StandardPermissions.STAFF_MANAGE, {
        branch_id: 'branch_abuja',
      }),
    ).toBe(false);

    // Cashier CAN collect payment on Abuja Register 01
    expect(
      evaluatePermissionScope(multiRoleUser, StandardPermissions.PAYMENTS_COLLECT, {
        branch_id: 'branch_abuja',
        register_id: 'reg_01',
      }),
    ).toBe(true);

    // Cashier CANNOT collect payment on Abuja Register 02
    expect(
      evaluatePermissionScope(multiRoleUser, StandardPermissions.PAYMENTS_COLLECT, {
        branch_id: 'branch_abuja',
        register_id: 'reg_02',
      }),
    ).toBe(false);
  });
});
