import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierResponse,
  ListSuppliersResponse,
  SupplierProductMapping,
  CreateSupplierProductMappingRequest,
  UpdateSupplierProductMappingRequest,
  SupplierProductMappingResponse,
  ListSupplierProductMappingsResponse,
  SupplierPerformanceMetrics,
  SupplierStatus,
} from '@stokrova/contracts';
import {
  normalizeSupplierCode,
  assertEligibleSupplierStatus,
  calculateSupplierDeliveryScore,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';

@Injectable()
export class SuppliersService {
  private suppliersStore = new Map<string, Supplier>();
  private mappingsStore = new Map<string, SupplierProductMapping>();

  constructor(private readonly variantsService: VariantsService) {}

  // --------------------------------------------------------------------------
  // Supplier Management
  // --------------------------------------------------------------------------

  async createSupplier(
    tenantId: string,
    req: CreateSupplierRequest,
  ): Promise<SupplierResponse> {
    const code = normalizeSupplierCode(req.code);

    const existing = Array.from(this.suppliersStore.values()).find(
      (s) => s.tenant_id === tenantId && s.code === code,
    );
    if (existing) {
      throw new ConflictException(`Supplier with code '${code}' already exists.`);
    }

    const now = new Date().toISOString();
    const id = `sup_${randomUUID().replace(/-/g, '')}`;

    const supplier: Supplier = {
      id,
      tenant_id: tenantId,
      name: req.name.trim(),
      code,
      tax_id: req.tax_id ?? null,
      currency_code: (req.currency_code ?? 'USD').toUpperCase(),
      payment_terms: req.payment_terms ?? 'NET_30',
      lead_time_days: req.lead_time_days ?? 7,
      status: 'ACTIVE',
      email: req.email ?? null,
      phone: req.phone ?? null,
      website: req.website ?? null,
      billing_address: req.billing_address ?? null,
      shipping_address: req.shipping_address ?? null,
      notes: req.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.suppliersStore.set(id, supplier);
    return { supplier: { ...supplier } };
  }

  async getSupplierById(tenantId: string, id: string): Promise<SupplierResponse> {
    const supplier = this.suppliersStore.get(id);
    if (!supplier || supplier.tenant_id !== tenantId) {
      throw new NotFoundException(`Supplier with ID '${id}' not found.`);
    }
    return { supplier: { ...supplier } };
  }

  async listSuppliers(
    tenantId: string,
    filters?: { status?: SupplierStatus },
  ): Promise<ListSuppliersResponse> {
    const suppliers = Array.from(this.suppliersStore.values())
      .filter((s) => {
        if (s.tenant_id !== tenantId) return false;
        if (filters?.status && s.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { suppliers: suppliers.map((s) => ({ ...s })) };
  }

  async updateSupplier(
    tenantId: string,
    id: string,
    req: UpdateSupplierRequest,
  ): Promise<SupplierResponse> {
    const supplier = this.suppliersStore.get(id);
    if (!supplier || supplier.tenant_id !== tenantId) {
      throw new NotFoundException(`Supplier with ID '${id}' not found.`);
    }

    const updated: Supplier = {
      ...supplier,
      name: req.name ? req.name.trim() : supplier.name,
      tax_id: req.tax_id !== undefined ? req.tax_id : supplier.tax_id,
      currency_code: req.currency_code
        ? req.currency_code.toUpperCase()
        : supplier.currency_code,
      payment_terms: req.payment_terms ?? supplier.payment_terms,
      lead_time_days:
        req.lead_time_days !== undefined
          ? req.lead_time_days
          : supplier.lead_time_days,
      status: req.status ?? supplier.status,
      email: req.email !== undefined ? req.email : supplier.email,
      phone: req.phone !== undefined ? req.phone : supplier.phone,
      website: req.website !== undefined ? req.website : supplier.website,
      billing_address:
        req.billing_address !== undefined
          ? req.billing_address
          : supplier.billing_address,
      shipping_address:
        req.shipping_address !== undefined
          ? req.shipping_address
          : supplier.shipping_address,
      notes: req.notes !== undefined ? req.notes : supplier.notes,
      updated_at: new Date().toISOString(),
    };

    this.suppliersStore.set(id, updated);
    return { supplier: { ...updated } };
  }

  // --------------------------------------------------------------------------
  // Supplier Product Mappings & Vendor Catalog
  // --------------------------------------------------------------------------

  async createSupplierProductMapping(
    tenantId: string,
    req: CreateSupplierProductMappingRequest,
  ): Promise<SupplierProductMappingResponse> {
    const { supplier } = await this.getSupplierById(tenantId, req.supplier_id);
    assertEligibleSupplierStatus(supplier.name, supplier.status);

    await this.variantsService.getVariantById(tenantId, req.variant_id);

    const existing = Array.from(this.mappingsStore.values()).find(
      (m) =>
        m.tenant_id === tenantId &&
        m.supplier_id === req.supplier_id &&
        m.variant_id === req.variant_id,
    );
    if (existing) {
      throw new ConflictException(
        `Supplier product mapping for supplier '${req.supplier_id}' and variant '${req.variant_id}' already exists.`,
      );
    }

    const unitCost = BigInt(req.unit_cost_minor);
    if (unitCost < 0n) {
      throw new BadRequestException('Unit cost cannot be negative.');
    }

    const now = new Date().toISOString();
    const id = `spm_${randomUUID().replace(/-/g, '')}`;

    const mapping: SupplierProductMapping = {
      id,
      tenant_id: tenantId,
      supplier_id: req.supplier_id,
      variant_id: req.variant_id,
      supplier_sku: req.supplier_sku.trim(),
      supplier_product_name: req.supplier_product_name ?? null,
      minimum_order_quantity: req.minimum_order_quantity ?? 1,
      order_increment_quantity: req.order_increment_quantity ?? 1,
      unit_cost_minor: unitCost.toString(),
      lead_time_days: req.lead_time_days ?? null,
      is_preferred: req.is_preferred ?? false,
      created_at: now,
      updated_at: now,
    };

    this.mappingsStore.set(id, mapping);
    return { mapping: { ...mapping } };
  }

  async getSupplierProductMappings(
    tenantId: string,
    supplierId?: string,
    variantId?: string,
  ): Promise<ListSupplierProductMappingsResponse> {
    const mappings = Array.from(this.mappingsStore.values()).filter((m) => {
      if (m.tenant_id !== tenantId) return false;
      if (supplierId && m.supplier_id !== supplierId) return false;
      if (variantId && m.variant_id !== variantId) return false;
      return true;
    });

    return { mappings: mappings.map((m) => ({ ...m })) };
  }

  async updateSupplierProductMapping(
    tenantId: string,
    mappingId: string,
    req: UpdateSupplierProductMappingRequest,
  ): Promise<SupplierProductMappingResponse> {
    const mapping = this.mappingsStore.get(mappingId);
    if (!mapping || mapping.tenant_id !== tenantId) {
      throw new NotFoundException(`Supplier product mapping '${mappingId}' not found.`);
    }

    const unitCost =
      req.unit_cost_minor !== undefined
        ? BigInt(req.unit_cost_minor).toString()
        : mapping.unit_cost_minor;

    const updated: SupplierProductMapping = {
      ...mapping,
      supplier_sku: req.supplier_sku ? req.supplier_sku.trim() : mapping.supplier_sku,
      supplier_product_name:
        req.supplier_product_name !== undefined
          ? req.supplier_product_name
          : mapping.supplier_product_name,
      minimum_order_quantity:
        req.minimum_order_quantity !== undefined
          ? req.minimum_order_quantity
          : mapping.minimum_order_quantity,
      order_increment_quantity:
        req.order_increment_quantity !== undefined
          ? req.order_increment_quantity
          : mapping.order_increment_quantity,
      unit_cost_minor: unitCost,
      lead_time_days:
        req.lead_time_days !== undefined
          ? req.lead_time_days
          : mapping.lead_time_days,
      is_preferred:
        req.is_preferred !== undefined ? req.is_preferred : mapping.is_preferred,
      updated_at: new Date().toISOString(),
    };

    this.mappingsStore.set(mappingId, updated);
    return { mapping: { ...updated } };
  }

  async getSupplierPerformance(
    tenantId: string,
    supplierId: string,
  ): Promise<SupplierPerformanceMetrics> {
    const { supplier } = await this.getSupplierById(tenantId, supplierId);

    // Compute metrics
    const score = calculateSupplierDeliveryScore(10, 10); // Baseline 10000

    return {
      supplier_id: supplier.id,
      total_orders_placed: 0,
      total_orders_received: 0,
      on_time_delivery_rate_basis_points: score,
      average_lead_time_days: supplier.lead_time_days,
    };
  }
}
