import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CustomerResponse,
  CustomerGroupResponse,
  CustomerAddressResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateCustomerGroupRequest,
  CreateCustomerAddressRequest,
} from '@stokrova/contracts';
import {
  assertCustomerCreditLimitValid,
  assertCustomerCanTransact,
  CustomerDomainError,
} from '@stokrova/domain';
import { AuditService } from '../audit/audit.service.js';

export interface StoredCustomerGroup {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  default_discount_percent_bp: number;
  credit_limit_minor: bigint;
  payment_terms_days: number;
  created_at: string;
  updated_at: string;
}

export interface StoredCustomerAddress {
  id: string;
  tenant_id: string;
  customer_id: string;
  address_type: 'BILLING' | 'SHIPPING' | 'BOTH';
  is_default: boolean;
  street_line_1: string;
  street_line_2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface StoredCustomer {
  id: string;
  tenant_id: string;
  customer_code: string;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  customer_group_id: string | null;
  price_list_id: string | null;
  credit_limit_minor: bigint;
  outstanding_balance_minor: bigint;
  payment_terms: 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class CustomersService {
  private groupsStore = new DurableMap<StoredCustomerGroup>('customer_groups');
  private customersStore = new DurableMap<StoredCustomer>('customers');
  private addressesStore = new DurableMap<StoredCustomerAddress>('customer_addresses');

  constructor(private readonly auditService?: AuditService) {}

  // --------------------------------------------------------------------------
  // Customer Groups
  // --------------------------------------------------------------------------

  async createGroup(
    tenantId: string,
    req: CreateCustomerGroupRequest,
  ): Promise<CustomerGroupResponse> {
    const code = req.code.trim().toUpperCase();

    for (const g of this.groupsStore.values()) {
      if (g.tenant_id === tenantId && g.code === code) {
        throw new ConflictException(
          `Customer group with code '${code}' already exists for this tenant.`,
        );
      }
    }

    const now = new Date().toISOString();
    const id = `cg_${randomUUID().replace(/-/g, '')}`;

    const group: StoredCustomerGroup = {
      id,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      default_discount_percent_bp: req.default_discount_percent_bp ?? 0,
      credit_limit_minor: BigInt(req.credit_limit_minor ?? '0'),
      payment_terms_days: req.payment_terms_days ?? 0,
      created_at: now,
      updated_at: now,
    };

    this.groupsStore.set(id, group);
    return this.mapGroupToResponse(group);
  }

  async listGroups(tenantId: string): Promise<CustomerGroupResponse[]> {
    return Array.from(this.groupsStore.values())
      .filter((g) => g.tenant_id === tenantId)
      .map((g) => this.mapGroupToResponse(g));
  }

  async getGroupById(tenantId: string, id: string): Promise<CustomerGroupResponse> {
    const group = this.groupsStore.get(id);
    if (!group || group.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer group with ID '${id}' not found.`);
    }
    return this.mapGroupToResponse(group);
  }

  // --------------------------------------------------------------------------
  // Customers
  // --------------------------------------------------------------------------

  async createCustomer(
    tenantId: string,
    userId: string,
    req: CreateCustomerRequest,
  ): Promise<CustomerResponse> {
    const code = req.customer_code.trim().toUpperCase();

    for (const c of this.customersStore.values()) {
      if (c.tenant_id === tenantId && c.customer_code === code) {
        throw new ConflictException(
          `Customer with code '${code}' already exists for this tenant.`,
        );
      }
    }

    if (req.customer_group_id) {
      await this.getGroupById(tenantId, req.customer_group_id);
    }

    const now = new Date().toISOString();
    const customerId = `cust_${randomUUID().replace(/-/g, '')}`;

    const customer: StoredCustomer = {
      id: customerId,
      tenant_id: tenantId,
      customer_code: code,
      display_name: req.display_name.trim(),
      legal_name: req.legal_name?.trim() || null,
      email: req.email?.trim().toLowerCase() || null,
      phone: req.phone?.trim() || null,
      tax_id: req.tax_id?.trim() || null,
      customer_group_id: req.customer_group_id || null,
      price_list_id: req.price_list_id || null,
      credit_limit_minor: BigInt(req.credit_limit_minor ?? '0'),
      outstanding_balance_minor: 0n,
      payment_terms: req.payment_terms ?? 'IMMEDIATE',
      status: 'ACTIVE',
      notes: req.notes?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    this.customersStore.set(customerId, customer);

    // Create initial addresses if provided
    const addressResponses: CustomerAddressResponse[] = [];
    if (req.addresses && req.addresses.length > 0) {
      for (const addr of req.addresses) {
        const createdAddr = await this.addAddress(tenantId, customerId, addr);
        addressResponses.push(createdAddr);
      }
    }

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'CUSTOMER_CREATED',
        entity_type: 'CUSTOMER',
        entity_id: customerId,
        metadata: { customer_code: code, display_name: customer.display_name },
      });
    }

    return this.mapCustomerToResponse(customer, addressResponses);
  }

  async getCustomerById(
    tenantId: string,
    id: string,
  ): Promise<CustomerResponse> {
    const customer = this.customersStore.get(id);
    if (!customer || customer.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer with ID '${id}' not found.`);
    }

    const addresses = await this.getCustomerAddresses(tenantId, id);
    return this.mapCustomerToResponse(customer, addresses);
  }

  async listCustomers(
    tenantId: string,
    filters?: {
      search?: string;
      customer_group_id?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    },
  ): Promise<CustomerResponse[]> {
    const search = filters?.search?.trim().toLowerCase();

    return Array.from(this.customersStore.values())
      .filter((c) => {
        if (c.tenant_id !== tenantId) return false;
        if (filters?.customer_group_id && c.customer_group_id !== filters.customer_group_id) {
          return false;
        }
        if (filters?.status && c.status !== filters.status) {
          return false;
        }
        if (search) {
          const matchCode = c.customer_code.toLowerCase().includes(search);
          const matchName = c.display_name.toLowerCase().includes(search);
          const matchEmail = c.email?.toLowerCase().includes(search) ?? false;
          const matchPhone = c.phone?.toLowerCase().includes(search) ?? false;
          if (!matchCode && !matchName && !matchEmail && !matchPhone) return false;
        }
        return true;
      })
      .map((c) => this.mapCustomerToResponse(c));
  }

  async updateCustomer(
    tenantId: string,
    id: string,
    req: UpdateCustomerRequest,
  ): Promise<CustomerResponse> {
    const customer = this.customersStore.get(id);
    if (!customer || customer.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer with ID '${id}' not found.`);
    }

    if (req.customer_group_id) {
      await this.getGroupById(tenantId, req.customer_group_id);
    }

    const updated: StoredCustomer = {
      ...customer,
      display_name: req.display_name !== undefined ? req.display_name.trim() : customer.display_name,
      legal_name: req.legal_name !== undefined ? (req.legal_name ? req.legal_name.trim() : null) : customer.legal_name,
      email: req.email !== undefined ? (req.email ? req.email.trim().toLowerCase() : null) : customer.email,
      phone: req.phone !== undefined ? (req.phone ? req.phone.trim() : null) : customer.phone,
      tax_id: req.tax_id !== undefined ? (req.tax_id ? req.tax_id.trim() : null) : customer.tax_id,
      customer_group_id: req.customer_group_id !== undefined ? req.customer_group_id : customer.customer_group_id,
      price_list_id: req.price_list_id !== undefined ? req.price_list_id : customer.price_list_id,
      credit_limit_minor:
        req.credit_limit_minor !== undefined
          ? BigInt(req.credit_limit_minor)
          : customer.credit_limit_minor,
      payment_terms: req.payment_terms !== undefined ? req.payment_terms : customer.payment_terms,
      status: req.status !== undefined ? req.status : customer.status,
      notes: req.notes !== undefined ? (req.notes ? req.notes.trim() : null) : customer.notes,
      updated_at: new Date().toISOString(),
    };

    this.customersStore.set(id, updated);
    const addresses = await this.getCustomerAddresses(tenantId, id);
    return this.mapCustomerToResponse(updated, addresses);
  }

  // --------------------------------------------------------------------------
  // Addresses
  // --------------------------------------------------------------------------

  async addAddress(
    tenantId: string,
    customerId: string,
    req: CreateCustomerAddressRequest,
  ): Promise<CustomerAddressResponse> {
    const customer = this.customersStore.get(customerId);
    if (!customer || customer.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found.`);
    }

    // If marked as default, unset existing defaults for same type
    if (req.is_default) {
      for (const addr of this.addressesStore.values()) {
        if (
          addr.tenant_id === tenantId &&
          addr.customer_id === customerId &&
          (addr.address_type === req.address_type || req.address_type === 'BOTH')
        ) {
          addr.is_default = false;
        }
      }
    }

    const now = new Date().toISOString();
    const id = `caddr_${randomUUID().replace(/-/g, '')}`;

    const address: StoredCustomerAddress = {
      id,
      tenant_id: tenantId,
      customer_id: customerId,
      address_type: req.address_type ?? 'BOTH',
      is_default: req.is_default ?? false,
      street_line_1: req.street_line_1.trim(),
      street_line_2: req.street_line_2?.trim() || null,
      city: req.city.trim(),
      state_province: req.state_province?.trim() || null,
      postal_code: req.postal_code?.trim() || null,
      country_code: (req.country_code || 'US').trim().toUpperCase(),
      created_at: now,
      updated_at: now,
    };

    this.addressesStore.set(id, address);
    return this.mapAddressToResponse(address);
  }

  async getCustomerAddresses(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerAddressResponse[]> {
    return Array.from(this.addressesStore.values())
      .filter((a) => a.tenant_id === tenantId && a.customer_id === customerId)
      .map((a) => this.mapAddressToResponse(a));
  }

  // --------------------------------------------------------------------------
  // Credit Limit Validation & Balance Tracking
  // --------------------------------------------------------------------------

  async assertCreditOrderPermitted(
    tenantId: string,
    customerId: string,
    orderTotalMinor: bigint,
  ): Promise<void> {
    const customer = this.customersStore.get(customerId);
    if (!customer || customer.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found.`);
    }

    assertCustomerCanTransact(customer.customer_code, customer.status);

    try {
      assertCustomerCreditLimitValid(
        customer.customer_code,
        customer.outstanding_balance_minor,
        orderTotalMinor,
        customer.credit_limit_minor,
      );
    } catch (err) {
      if (err instanceof CustomerDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async adjustOutstandingBalance(
    tenantId: string,
    customerId: string,
    deltaMinor: bigint,
  ): Promise<CustomerResponse> {
    const customer = this.customersStore.get(customerId);
    if (!customer || customer.tenant_id !== tenantId) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found.`);
    }

    customer.outstanding_balance_minor += deltaMinor;
    if (customer.outstanding_balance_minor < 0n) {
      customer.outstanding_balance_minor = 0n;
    }
    customer.updated_at = new Date().toISOString();

    const addresses = await this.getCustomerAddresses(tenantId, customerId);
    return this.mapCustomerToResponse(customer, addresses);
  }

  // --------------------------------------------------------------------------
  // Response Mappers
  // --------------------------------------------------------------------------

  private mapGroupToResponse(g: StoredCustomerGroup): CustomerGroupResponse {
    return {
      id: g.id,
      tenant_id: g.tenant_id,
      code: g.code,
      name: g.name,
      default_discount_percent_bp: g.default_discount_percent_bp,
      credit_limit_minor: g.credit_limit_minor.toString(),
      payment_terms_days: g.payment_terms_days,
      created_at: g.created_at,
      updated_at: g.updated_at,
    };
  }

  private mapAddressToResponse(a: StoredCustomerAddress): CustomerAddressResponse {
    return {
      id: a.id,
      tenant_id: a.tenant_id,
      customer_id: a.customer_id,
      address_type: a.address_type,
      is_default: a.is_default,
      street_line_1: a.street_line_1,
      street_line_2: a.street_line_2,
      city: a.city,
      state_province: a.state_province,
      postal_code: a.postal_code,
      country_code: a.country_code,
      created_at: a.created_at,
      updated_at: a.updated_at,
    };
  }

  private mapCustomerToResponse(
    c: StoredCustomer,
    addresses?: CustomerAddressResponse[],
  ): CustomerResponse {
    return {
      id: c.id,
      tenant_id: c.tenant_id,
      customer_code: c.customer_code,
      display_name: c.display_name,
      legal_name: c.legal_name,
      email: c.email,
      phone: c.phone,
      tax_id: c.tax_id,
      customer_group_id: c.customer_group_id,
      price_list_id: c.price_list_id,
      credit_limit_minor: c.credit_limit_minor.toString(),
      outstanding_balance_minor: c.outstanding_balance_minor.toString(),
      payment_terms: c.payment_terms,
      status: c.status,
      notes: c.notes,
      addresses,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }

  clearStore(): void {
    this.groupsStore.clear();
    this.customersStore.clear();
    this.addressesStore.clear();
  }
}
