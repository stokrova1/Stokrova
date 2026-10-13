import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { SuppliersService } from './suppliers.service.js';
import { SupplierBlockedDomainError } from '@stokrova/domain';

describe('Suppliers & Vendor Management Engine (Phase 4A)', () => {
  let tenancyService: TenancyService;
  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let templatesService: TemplatesService;
  let variantsService: VariantsService;
  let suppliersService: SuppliersService;

  let tenant1Id: string;
  let tenant2Id: string;
  let variant1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);
    suppliersService = new SuppliersService(variantsService);

    // 1. Provision Tenants
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Procurement Corp 1',
        slug: 'procure-1',
        owner_email: 'owner1@procure.com',
        owner_full_name: 'Owner Procure 1',
        default_currency: 'USD',
      },
      'usr_owner1',
    );
    tenant1Id = t1.tenant.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Procurement Corp 2',
        slug: 'procure-2',
        owner_email: 'owner2@procure.com',
        owner_full_name: 'Owner Procure 2',
        default_currency: 'USD',
      },
      'usr_owner2',
    );
    tenant2Id = t2.tenant.id;

    // 2. Setup Variant in Tenant 1
    const uom = await uomService.createUom(tenant1Id, {
      name: 'Piece',
      code: 'PCS',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      name: 'Raw Materials',
      code: 'RAW',
    });
    const brand = await brandsService.createBrand(tenant1Id, {
      name: 'GlobalSteel',
      code: 'STEEL',
    });
    const tmpl = await templatesService.createTemplate(tenant1Id, {
      name: 'Steel Fastener M8',
      code: 'FAST-M8',
      type: 'STANDARD',
      category_id: cat.id,
      brand_id: brand.id,
      base_uom_id: uom.id,
    });
    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl.id,
      sku: 'FAST-M8-304',
      cost_price_minor: '50',
      selling_price_minor: '120',
      attributes: { material: 'SS304' },
    });
    variant1Id = v1.id;
  });

  describe('1. Supplier Lifecycle Management', () => {
    it('creates a supplier with normalized code and defaults', async () => {
      const res = await suppliersService.createSupplier(tenant1Id, {
        name: '  Acme Metals Global  ',
        code: '  acme-metals  ',
        email: 'sales@acmemetals.com',
        tax_id: 'US-TAX-998877',
      });

      expect(res.supplier.id).toBeDefined();
      expect(res.supplier.name).toBe('Acme Metals Global');
      expect(res.supplier.code).toBe('ACME-METALS');
      expect(res.supplier.status).toBe('ACTIVE');
      expect(res.supplier.payment_terms).toBe('NET_30');
      expect(res.supplier.currency_code).toBe('USD');
      expect(res.supplier.lead_time_days).toBe(7);
    });

    it('rejects duplicate supplier code within the same tenant', async () => {
      await suppliersService.createSupplier(tenant1Id, {
        name: 'Acme Metals 1',
        code: 'ACME',
      });

      await expect(
        suppliersService.createSupplier(tenant1Id, {
          name: 'Acme Metals Duplicate',
          code: 'acme',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows identical supplier codes across different tenants', async () => {
      const sup1 = await suppliersService.createSupplier(tenant1Id, {
        name: 'Acme Metals Tenant 1',
        code: 'ACME',
      });
      const sup2 = await suppliersService.createSupplier(tenant2Id, {
        name: 'Acme Metals Tenant 2',
        code: 'ACME',
      });

      expect(sup1.supplier.id).not.toBe(sup2.supplier.id);
      expect(sup1.supplier.tenant_id).toBe(tenant1Id);
      expect(sup2.supplier.tenant_id).toBe(tenant2Id);
    });

    it('updates supplier profile and status', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Beta Supply',
        code: 'BETA',
      });

      const updated = await suppliersService.updateSupplier(tenant1Id, supplier.id, {
        payment_terms: 'NET_60',
        lead_time_days: 14,
        status: 'BLOCKED',
      });

      expect(updated.supplier.payment_terms).toBe('NET_60');
      expect(updated.supplier.lead_time_days).toBe(14);
      expect(updated.supplier.status).toBe('BLOCKED');
    });
  });

  describe('2. Supplier Product Mappings & Vendor Catalog', () => {
    it('creates supplier product mapping with MOQ and unit cost', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Fastener Direct',
        code: 'FAST-DIR',
      });

      const res = await suppliersService.createSupplierProductMapping(tenant1Id, {
        supplier_id: supplier.id,
        variant_id: variant1Id,
        supplier_sku: 'VEND-BOLT-M8',
        supplier_product_name: 'M8 Stainless Hex Bolt',
        minimum_order_quantity: 100,
        order_increment_quantity: 50,
        unit_cost_minor: '45', // $0.45
        is_preferred: true,
      });

      expect(res.mapping.id).toBeDefined();
      expect(res.mapping.supplier_sku).toBe('VEND-BOLT-M8');
      expect(res.mapping.minimum_order_quantity).toBe(100);
      expect(res.mapping.order_increment_quantity).toBe(50);
      expect(res.mapping.unit_cost_minor).toBe('45');
      expect(res.mapping.is_preferred).toBe(true);
    });

    it('rejects duplicate mapping for the same supplier and variant', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Fastener Direct',
        code: 'FAST-DIR',
      });

      await suppliersService.createSupplierProductMapping(tenant1Id, {
        supplier_id: supplier.id,
        variant_id: variant1Id,
        supplier_sku: 'VEND-BOLT-M8',
        unit_cost_minor: '45',
      });

      await expect(
        suppliersService.createSupplierProductMapping(tenant1Id, {
          supplier_id: supplier.id,
          variant_id: variant1Id,
          supplier_sku: 'VEND-BOLT-M8-ALT',
          unit_cost_minor: '40',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('blocks mapping creation if supplier is BLOCKED (Domain Invariant)', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Blocked Vendor Inc',
        code: 'BLOCKED-VEN',
      });
      await suppliersService.updateSupplier(tenant1Id, supplier.id, { status: 'BLOCKED' });

      await expect(
        suppliersService.createSupplierProductMapping(tenant1Id, {
          supplier_id: supplier.id,
          variant_id: variant1Id,
          supplier_sku: 'SKU-01',
          unit_cost_minor: '100',
        }),
      ).rejects.toThrow(SupplierBlockedDomainError);
    });

    it('updates supplier product mapping attributes', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Vendor Omega',
        code: 'OMEGA',
      });
      const { mapping } = await suppliersService.createSupplierProductMapping(tenant1Id, {
        supplier_id: supplier.id,
        variant_id: variant1Id,
        supplier_sku: 'OMG-M8',
        unit_cost_minor: '50',
      });

      const updated = await suppliersService.updateSupplierProductMapping(tenant1Id, mapping.id, {
        unit_cost_minor: '42',
        minimum_order_quantity: 200,
        is_preferred: true,
      });

      expect(updated.mapping.unit_cost_minor).toBe('42');
      expect(updated.mapping.minimum_order_quantity).toBe(200);
      expect(updated.mapping.is_preferred).toBe(true);
    });
  });

  describe('3. Supplier Performance & Metrics', () => {
    it('retrieves baseline delivery performance for a supplier', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Top Supplier',
        code: 'TOP-SUP',
        lead_time_days: 10,
      });

      const metrics = await suppliersService.getSupplierPerformance(tenant1Id, supplier.id);
      expect(metrics.supplier_id).toBe(supplier.id);
      expect(metrics.on_time_delivery_rate_basis_points).toBe(10000); // 100.00%
      expect(metrics.average_lead_time_days).toBe(10);
    });
  });

  describe('4. Multi-Tenant Isolation', () => {
    it('prevents cross-tenant access to suppliers and product mappings', async () => {
      const { supplier } = await suppliersService.createSupplier(tenant1Id, {
        name: 'Tenant 1 Secret Supplier',
        code: 'T1-SECRET',
      });

      // Tenant 2 cannot access Tenant 1 supplier
      await expect(suppliersService.getSupplierById(tenant2Id, supplier.id)).rejects.toThrow(
        NotFoundException,
      );

      // Tenant 2 listing excludes Tenant 1 supplier
      const t2List = await suppliersService.listSuppliers(tenant2Id);
      expect(t2List.suppliers).toHaveLength(0);

      const t1List = await suppliersService.listSuppliers(tenant1Id);
      expect(t1List.suppliers).toHaveLength(1);
    });
  });
});
