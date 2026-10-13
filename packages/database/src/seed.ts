import type { DatabaseClient } from './index.js';
import {
  tenants,
  companies,
  branches,
  users,
  user_profiles,
  roles,
  permissions,
  role_permissions,
  role_assignments,
  memberships,
} from './schema/index.js';

export interface SeedOptions {
  cleanFirst?: boolean;
}

export const SEED_CONSTANTS = {
  TENANT_ID: 'ten_seed_dev_01',
  TENANT_NAME: 'Stokrova Demo Enterprise',
  TENANT_SLUG: 'stokrova-demo',
  COMPANY_ID: 'cmp_seed_dev_01',
  COMPANY_NAME: 'Stokrova Demo Ltd',
  CURRENCY: 'NGN',
  BRANCH_ID: 'brn_seed_dev_01',
  BRANCH_NAME: 'Lagos Central Branch',
  BRANCH_CODE: 'LAG-01',
  ADMIN_USER_ID: 'usr_seed_admin_01',
  ADMIN_EMAIL: 'admin@stokrova.demo',
  STAFF_USER_ID: 'usr_seed_staff_01',
  STAFF_EMAIL: 'staff@stokrova.demo',
};

export const CORE_PERMISSIONS = [
  { id: 'perm_sales_create', code: 'sales.order.create', module: 'sales', description: 'Create sales orders' },
  { id: 'perm_sales_view', code: 'sales.order.view', module: 'sales', description: 'View sales orders' },
  { id: 'perm_sales_discount', code: 'sales.discount.apply', module: 'sales', description: 'Apply custom discounts' },
  { id: 'perm_inventory_view', code: 'inventory.view', module: 'inventory', description: 'View stock levels' },
  { id: 'perm_inventory_adjust', code: 'inventory.adjust', module: 'inventory', description: 'Perform manual stock adjustments' },
  { id: 'perm_payments_collect', code: 'payments.collect', module: 'payments', description: 'Collect and record customer payments' },
  { id: 'perm_payments_refund', code: 'payments.refund', module: 'payments', description: 'Process payment refunds' },
  { id: 'perm_register_open_close', code: 'registers.open_close', module: 'pos', description: 'Open and close cash registers' },
  { id: 'perm_approvals_manage', code: 'approvals.manage', module: 'admin', description: 'Approve or reject escalation requests' },
  { id: 'perm_roles_manage', code: 'roles.manage', module: 'admin', description: 'Manage dynamic roles and permissions' },
  { id: 'perm_audit_view', code: 'audit.view', module: 'audit', description: 'Inspect system and tenant audit trails' },
];

export async function seedDatabase(db: DatabaseClient, _options: SeedOptions = {}): Promise<void> {
  // 1. Seed Permissions
  for (const perm of CORE_PERMISSIONS) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoNothing();
  }

  // 2. Seed Tenant
  await db
    .insert(tenants)
    .values({
      id: SEED_CONSTANTS.TENANT_ID,
      name: SEED_CONSTANTS.TENANT_NAME,
      slug: SEED_CONSTANTS.TENANT_SLUG,
      status: 'ACTIVE',
    })
    .onConflictDoNothing();

  // 3. Seed Company
  await db
    .insert(companies)
    .values({
      id: SEED_CONSTANTS.COMPANY_ID,
      tenant_id: SEED_CONSTANTS.TENANT_ID,
      name: SEED_CONSTANTS.COMPANY_NAME,
      currency_code: SEED_CONSTANTS.CURRENCY,
    })
    .onConflictDoNothing();

  // 4. Seed Branch
  await db
    .insert(branches)
    .values({
      id: SEED_CONSTANTS.BRANCH_ID,
      tenant_id: SEED_CONSTANTS.TENANT_ID,
      company_id: SEED_CONSTANTS.COMPANY_ID,
      name: SEED_CONSTANTS.BRANCH_NAME,
      code: SEED_CONSTANTS.BRANCH_CODE,
    })
    .onConflictDoNothing();

  // 5. Seed System Roles
  const adminRoleId = 'role_template_tenant_admin';
  const managerRoleId = 'role_template_branch_manager';
  const cashierRoleId = 'role_template_cashier';

  await db
    .insert(roles)
    .values([
      {
        id: adminRoleId,
        tenant_id: SEED_CONSTANTS.TENANT_ID,
        name: 'Tenant Administrator',
        code: 'TENANT_ADMIN',
        description: 'Complete administrative authority within tenant scope',
        is_system_template: true,
      },
      {
        id: managerRoleId,
        tenant_id: SEED_CONSTANTS.TENANT_ID,
        name: 'Branch Manager',
        code: 'BRANCH_MANAGER',
        description: 'Operational manager for a specific physical branch',
        is_system_template: true,
      },
      {
        id: cashierRoleId,
        tenant_id: SEED_CONSTANTS.TENANT_ID,
        name: 'Cashier',
        code: 'CASHIER',
        description: 'Operates point-of-sale registers and collects payments',
        is_system_template: true,
      },
    ])
    .onConflictDoNothing();

  // 6. Link Permissions to Tenant Admin
  for (const perm of CORE_PERMISSIONS) {
    await db
      .insert(role_permissions)
      .values({
        id: `rp_${adminRoleId}_${perm.id}`,
        role_id: adminRoleId,
        permission_id: perm.id,
      })
      .onConflictDoNothing();
  }

  // 7. Seed Admin User & Profile
  await db
    .insert(users)
    .values({
      id: SEED_CONSTANTS.ADMIN_USER_ID,
      tenant_id: SEED_CONSTANTS.TENANT_ID,
      email: SEED_CONSTANTS.ADMIN_EMAIL,
      password_hash: '$argon2id$v=19$m=65536,t=3,p=4$dev_seed_hash_placeholder',
      full_name: 'Stokrova System Administrator',
      role: 'tenant_admin',
      is_active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(user_profiles)
    .values({
      id: `uprof_${SEED_CONSTANTS.ADMIN_USER_ID}`,
      user_id: SEED_CONSTANTS.ADMIN_USER_ID,
      display_name: 'SysAdmin',
      phone_number: '+2348000000001',
      locale: 'en',
      timezone: 'Africa/Lagos',
    })
    .onConflictDoNothing();

  // 8. Seed Membership
  await db
    .insert(memberships)
    .values({
      id: `mem_seed_${SEED_CONSTANTS.ADMIN_USER_ID}`,
      tenant_id: SEED_CONSTANTS.TENANT_ID,
      user_id: SEED_CONSTANTS.ADMIN_USER_ID,
      status: 'ACTIVE',
    })
    .onConflictDoNothing();

  // 9. Assign Tenant Admin Role
  await db
    .insert(role_assignments)
    .values({
      id: `ra_seed_${SEED_CONSTANTS.ADMIN_USER_ID}`,
      tenant_id: SEED_CONSTANTS.TENANT_ID,
      user_id: SEED_CONSTANTS.ADMIN_USER_ID,
      role_id: adminRoleId,
      company_id: SEED_CONSTANTS.COMPANY_ID,
    })
    .onConflictDoNothing();
}
