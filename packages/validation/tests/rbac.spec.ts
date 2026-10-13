import { describe, it, expect } from 'vitest';
import {
  CreateCustomRoleRequestSchema,
  AssignRoleRequestSchema,
} from '../src/rbac.js';

describe('RBAC Validation', () => {
  it('validates a valid custom role creation payload', () => {
    const valid = {
      name: 'Senior Warehouse Dispatcher',
      code: 'SENIOR_DISPATCHER',
      description: 'Handles dispatch signoffs',
      permission_codes: ['inventory.view', 'inventory.transfer'],
    };

    const result = CreateCustomRoleRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a custom role missing permission codes', () => {
    const invalid = {
      name: 'Empty Role',
      code: 'EMPTY_ROLE',
      permission_codes: [],
    };

    const result = CreateCustomRoleRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates a scoped role assignment payload', () => {
    const valid = {
      user_id: 'usr_john',
      role_id: 'role_cashier',
      scope: {
        branch_id: 'branch_lagos',
        register_id: 'reg_01',
      },
    };

    const result = AssignRoleRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
