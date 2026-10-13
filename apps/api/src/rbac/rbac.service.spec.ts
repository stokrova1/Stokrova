import { describe, it, expect, beforeEach } from 'vitest';
import { RbacService } from './rbac.service.js';
import { StandardPermissions } from '@stokrova/domain';

describe('RbacService', () => {
  let service: RbacService;
  const tenantId = 'ten_test_01';

  beforeEach(() => {
    service = new RbacService();
    service.clearStore();
  });

  it('pre-seeds system role templates upon initialization', async () => {
    const templates = await service.getRoleTemplates();
    expect(templates.length).toBeGreaterThan(5);

    const codes = templates.map((t) => t.code);
    expect(codes).toContain('BUSINESS_OWNER');
    expect(codes).toContain('BRANCH_MANAGER');
    expect(codes).toContain('CASHIER');
    expect(codes).toContain('WAREHOUSE_PICKER');
    expect(codes).toContain('WAREHOUSE_CHECKER');
  });

  it('allows tenants to create custom roles with chosen permissions', async () => {
    const customRole = await service.createCustomRole(tenantId, {
      name: 'Senior Fulfillment Lead',
      code: 'FULFILLMENT_LEAD',
      description: 'Coordinates picking and verification',
      permission_codes: [
        StandardPermissions.INVENTORY_VIEW,
        StandardPermissions.INVENTORY_PICK,
        StandardPermissions.INVENTORY_VERIFY,
      ],
    });

    expect(customRole.id).toBeDefined();
    expect(customRole.code).toBe('FULFILLMENT_LEAD');
    expect(customRole.tenant_id).toBe(tenantId);
    expect(customRole.is_system_template).toBe(false);
    expect(customRole.permissions.length).toBe(3);

    const allRoles = await service.getRolesForTenant(tenantId);
    expect(allRoles.some((r) => r.code === 'FULFILLMENT_LEAD')).toBe(true);
  });

  it('rejects duplicate custom role codes within the same tenant', async () => {
    await service.createCustomRole(tenantId, {
      name: 'Dispatcher',
      code: 'DISPATCHER',
      permission_codes: [StandardPermissions.INVENTORY_VIEW],
    });

    await expect(
      service.createCustomRole(tenantId, {
        name: 'Another Dispatcher',
        code: 'DISPATCHER',
        permission_codes: [StandardPermissions.INVENTORY_VIEW],
      }),
    ).rejects.toThrowError(/already exists/);
  });

  it('assigns roles with specific location and register scopes', async () => {
    const roles = await service.getRoleTemplates();
    const cashierRole = roles.find((r) => r.code === 'CASHIER')!;

    const assignment = await service.assignRole(tenantId, {
      user_id: 'usr_fatima',
      role_id: cashierRole.id,
      scope: {
        branch_id: 'branch_lagos',
        register_id: 'reg_pos_02',
      },
    });

    expect(assignment.id).toBeDefined();
    expect(assignment.user_id).toBe('usr_fatima');
    expect(assignment.role_code).toBe('CASHIER');
    expect(assignment.scope.branch_id).toBe('branch_lagos');
    expect(assignment.scope.register_id).toBe('reg_pos_02');

    const activeAssignments = await service.getUserActiveAssignments(tenantId, 'usr_fatima');
    expect(activeAssignments.length).toBe(1);
    expect(activeAssignments[0]?.scope.register_id).toBe('reg_pos_02');
  });
});
