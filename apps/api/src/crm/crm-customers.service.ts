import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CrmAccountRelationship,
  CreateCrmAccountRelationshipRequest,
  CrmAccountHierarchyNode,
  CrmContact,
  CreateCrmContactRequest,
  UpdateCrmContactRequest,
  CrmDuplicateCandidate,
  CrmCustomerMergeRequest,
  CrmCustomerMergeResponse,
} from '@stokrova/contracts';
import {
  CreateCrmAccountRelationshipSchema,
  CreateCrmContactSchema,
  UpdateCrmContactSchema,
  CrmCustomerMergeSchema,
} from '@stokrova/validation';
import {
  scoreCustomerDuplicateMatch,
  validateCustomerMergeInvariants,
} from '@stokrova/domain';
import { CustomersService } from '../customers/customers.service.js';

export interface StoredCustomerMerge {
  id: string;
  tenant_id: string;
  surviving_customer_id: string;
  merged_customer_id: string;
  merged_by: string;
  reason: string;
  audit_evidence_json: Record<string, any>;
  merged_at: string;
}

@Injectable()
export class CrmCustomersService {
  private readonly relationships = new DurableMap<CrmAccountRelationship>('crm_account_relationships');
  private readonly contacts = new DurableMap<CrmContact>('crm_contacts');
  private readonly customerMerges = new DurableMap<StoredCustomerMerge>('crm_customer_merges');

  constructor(
    private readonly customersService: CustomersService,
  ) {}

  // ==========================================
  // 1. Account Relationships & Hierarchies
  // ==========================================

  async createRelationship(
    tenantId: string,
    req: CreateCrmAccountRelationshipRequest,
  ): Promise<CrmAccountRelationship> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmAccountRelationshipSchema.parse(req);

    if (parsed.parent_customer_id === parsed.child_customer_id) {
      throw new BadRequestException('A customer cannot have a relationship with itself');
    }

    // Verify both customers exist in this tenant
    const parent = await this.customersService.getCustomerById(tenantId, parsed.parent_customer_id);
    const child = await this.customersService.getCustomerById(tenantId, parsed.child_customer_id);
    if (!parent || !child) {
      throw new NotFoundException('Parent or child customer not found');
    }

    // Prevent duplicate relationship
    for (const rel of this.relationships.values()) {
      if (
        rel.tenant_id === tenantId &&
        rel.parent_customer_id === parsed.parent_customer_id &&
        rel.child_customer_id === parsed.child_customer_id
      ) {
        throw new ConflictException('Relationship between these accounts already exists');
      }
    }

    const now = new Date().toISOString();
    const relationship: CrmAccountRelationship = {
      id: `rel_${randomUUID()}`,
      tenant_id: tenantId,
      parent_customer_id: parsed.parent_customer_id,
      child_customer_id: parsed.child_customer_id,
      relationship_type: parsed.relationship_type,
      notes: parsed.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.relationships.set(relationship.id, relationship);
    return relationship;
  }

  async listRelationships(
    tenantId: string,
    customerId: string,
  ): Promise<CrmAccountRelationship[]> {
    return Array.from(this.relationships.values()).filter(
      (rel) =>
        rel.tenant_id === tenantId &&
        (rel.parent_customer_id === customerId || rel.child_customer_id === customerId),
    );
  }

  async getAccountHierarchy(
    tenantId: string,
    rootCustomerId: string,
  ): Promise<CrmAccountHierarchyNode> {
    const rootCustomer = await this.customersService.getCustomerById(tenantId, rootCustomerId);
    if (!rootCustomer) {
      throw new NotFoundException(`Customer ${rootCustomerId} not found`);
    }

    const buildNode = async (
      customerId: string,
      visited: Set<string>,
    ): Promise<CrmAccountHierarchyNode> => {
      const cust = await this.customersService.getCustomerById(tenantId, customerId);
      if (visited.has(customerId)) {
        return {
          customer_id: customerId,
          customer_code: cust?.customer_code ?? 'UNKNOWN',
          display_name: cust?.display_name ?? 'UNKNOWN',
          children: [],
        };
      }
      visited.add(customerId);

      const childRels = Array.from(this.relationships.values()).filter(
        (r) => r.tenant_id === tenantId && r.parent_customer_id === customerId,
      );

      const children: CrmAccountHierarchyNode[] = [];
      for (const rel of childRels) {
        const childNode = await buildNode(rel.child_customer_id, new Set(visited));
        childNode.relationship_type = rel.relationship_type;
        children.push(childNode);
      }

      return {
        customer_id: customerId,
        customer_code: cust?.customer_code ?? 'UNKNOWN',
        display_name: cust?.display_name ?? 'UNKNOWN',
        children,
      };
    };

    return buildNode(rootCustomerId, new Set());
  }

  // ==========================================
  // 2. Contacts Management
  // ==========================================

  async createContact(
    tenantId: string,
    req: CreateCrmContactRequest,
  ): Promise<CrmContact> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateCrmContactSchema.parse(req);

    // Verify customer exists
    const customer = await this.customersService.getCustomerById(tenantId, parsed.customer_id);
    if (!customer) {
      throw new NotFoundException(`Customer ${parsed.customer_id} not found`);
    }

    // If marked as primary, unmark existing primary contacts for this customer
    if (parsed.is_primary) {
      for (const c of this.contacts.values()) {
        if (c.tenant_id === tenantId && c.customer_id === parsed.customer_id && c.is_primary) {
          c.is_primary = false;
          c.updated_at = new Date().toISOString();
        }
      }
    }

    const now = new Date().toISOString();
    const contact: CrmContact = {
      id: `cnt_${randomUUID()}`,
      tenant_id: tenantId,
      customer_id: parsed.customer_id,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      role_title: parsed.role_title ?? null,
      department: parsed.department ?? null,
      is_primary: parsed.is_primary ?? false,
      is_active: true,
      notes: parsed.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.contacts.set(contact.id, contact);
    return contact;
  }

  async updateContact(
    tenantId: string,
    contactId: string,
    req: UpdateCrmContactRequest,
  ): Promise<CrmContact> {
    const contact = this.contacts.get(contactId);
    if (!contact || contact.tenant_id !== tenantId) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const parsed = UpdateCrmContactSchema.parse(req);

    if (parsed.is_primary) {
      for (const c of this.contacts.values()) {
        if (
          c.tenant_id === tenantId &&
          c.customer_id === contact.customer_id &&
          c.id !== contactId &&
          c.is_primary
        ) {
          c.is_primary = false;
        }
      }
    }

    if (parsed.first_name !== undefined) contact.first_name = parsed.first_name;
    if (parsed.last_name !== undefined) contact.last_name = parsed.last_name;
    if (parsed.email !== undefined) contact.email = parsed.email;
    if (parsed.phone !== undefined) contact.phone = parsed.phone;
    if (parsed.role_title !== undefined) contact.role_title = parsed.role_title;
    if (parsed.department !== undefined) contact.department = parsed.department;
    if (parsed.is_primary !== undefined) contact.is_primary = parsed.is_primary;
    if (parsed.is_active !== undefined) contact.is_active = parsed.is_active;
    if (parsed.notes !== undefined) contact.notes = parsed.notes;
    contact.updated_at = new Date().toISOString();

    return contact;
  }

  async listContacts(tenantId: string, customerId?: string): Promise<CrmContact[]> {
    return Array.from(this.contacts.values()).filter(
      (c) => c.tenant_id === tenantId && (!customerId || c.customer_id === customerId),
    );
  }

  async getContact(tenantId: string, contactId: string): Promise<CrmContact> {
    const contact = this.contacts.get(contactId);
    if (!contact || contact.tenant_id !== tenantId) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }
    return contact;
  }

  // ==========================================
  // 3. Duplicate Detection Scoring
  // ==========================================

  async findDuplicateCandidates(
    tenantId: string,
    customerId: string,
  ): Promise<CrmDuplicateCandidate[]> {
    const target = await this.customersService.getCustomerById(tenantId, customerId);
    if (!target) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const allCustomers = await this.customersService.listCustomers(tenantId);
    const candidates: CrmDuplicateCandidate[] = [];

    for (const cust of allCustomers) {
      if (cust.id === customerId) continue;

      const result = scoreCustomerDuplicateMatch(
        {
          id: target.id,
          display_name: target.display_name,
          legal_name: target.legal_name,
          email: target.email,
          phone: target.phone,
          tax_id: target.tax_id,
        },
        {
          id: cust.id,
          display_name: cust.display_name,
          legal_name: cust.legal_name,
          email: cust.email,
          phone: cust.phone,
          tax_id: cust.tax_id,
        },
      );

      // Duplicate match threshold: score >= 8500 basis points (85.00%)
      if (result.score_bp >= 8500) {
        candidates.push({
          customer_id: cust.id,
          customer_code: cust.customer_code,
          display_name: cust.display_name,
          email: cust.email,
          phone: cust.phone,
          tax_id: cust.tax_id,
          confidence_score_bp: result.score_bp,
          match_reasons: result.match_reasons,
        });
      }
    }

    return candidates.sort((a, b) => b.confidence_score_bp - a.confidence_score_bp);
  }

  // ==========================================
  // 4. Authorized Non-Destructive Customer Merging
  // ==========================================

  async mergeCustomers(
    tenantId: string,
    req: CrmCustomerMergeRequest,
    mergedBy: string,
  ): Promise<CrmCustomerMergeResponse> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CrmCustomerMergeSchema.parse(req);

    const surviving = await this.customersService.getCustomerById(tenantId, parsed.surviving_customer_id);
    if (!surviving) {
      throw new NotFoundException(`Surviving customer ${parsed.surviving_customer_id} not found`);
    }

    const targetToMerge = await this.customersService.getCustomerById(tenantId, parsed.merged_customer_id);
    if (!targetToMerge) {
      throw new NotFoundException(`Target customer to merge ${parsed.merged_customer_id} not found`);
    }

    // Enforce pure domain invariants
    validateCustomerMergeInvariants(
      { id: surviving.id, tenant_id: surviving.tenant_id, status: surviving.status },
      { id: targetToMerge.id, tenant_id: targetToMerge.tenant_id, status: targetToMerge.status },
    );

    // 1. Re-parent contacts to surviving customer
    let reparentedContacts = 0;
    for (const contact of this.contacts.values()) {
      if (contact.tenant_id === tenantId && contact.customer_id === targetToMerge.id) {
        contact.customer_id = surviving.id;
        contact.updated_at = new Date().toISOString();
        reparentedContacts++;
      }
    }

    // 2. Re-parent account relationships
    for (const rel of this.relationships.values()) {
      if (rel.tenant_id === tenantId) {
        if (rel.parent_customer_id === targetToMerge.id) {
          rel.parent_customer_id = surviving.id;
          rel.updated_at = new Date().toISOString();
        }
        if (rel.child_customer_id === targetToMerge.id) {
          rel.child_customer_id = surviving.id;
          rel.updated_at = new Date().toISOString();
        }
      }
    }

    // 3. Mark the merged customer as inactive/merged in CustomersService
    await this.customersService.updateCustomer(tenantId, targetToMerge.id, {
      status: 'INACTIVE',
      notes: `[MERGED into ${surviving.customer_code} (${surviving.id})] ${targetToMerge.notes ?? ''}`.trim(),
    });

    const now = new Date().toISOString();
    const mergeAudit: StoredCustomerMerge = {
      id: `mrg_${randomUUID()}`,
      tenant_id: tenantId,
      surviving_customer_id: surviving.id,
      merged_customer_id: targetToMerge.id,
      merged_by: mergedBy,
      reason: parsed.reason,
      audit_evidence_json: {
        surviving_code: surviving.customer_code,
        merged_code: targetToMerge.customer_code,
        merged_at: now,
        reparented_contacts: reparentedContacts,
      },
      merged_at: now,
    };
    this.customerMerges.set(mergeAudit.id, mergeAudit);

    return {
      surviving_customer_id: surviving.id,
      merged_customer_id: targetToMerge.id,
      merged_by: mergedBy,
      merged_at: now,
      reparented_contacts_count: reparentedContacts,
      reparented_opportunities_count: 0,
      reparented_activities_count: 0,
      reparented_tasks_count: 0,
    };
  }

  async getCustomerMerges(tenantId: string): Promise<StoredCustomerMerge[]> {
    return Array.from(this.customerMerges.values()).filter((m) => m.tenant_id === tenantId);
  }
}
