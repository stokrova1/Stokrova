import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ProductTemplate,
  CreateProductTemplateRequest,
  UpdateProductTemplateRequest,
  ProductType,
} from '@stokrova/contracts';
import { UomService } from './uom.service.js';
import { CategoriesService } from './categories.service.js';
import { BrandsService } from './brands.service.js';

@Injectable()
export class TemplatesService {
  private templatesStore = new Map<string, ProductTemplate>();

  constructor(
    private readonly uomService: UomService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  async createTemplate(
    tenantId: string,
    req: CreateProductTemplateRequest,
  ): Promise<ProductTemplate> {
    const code = req.code.trim().toUpperCase();

    // Verify unique code per tenant
    const existing = Array.from(this.templatesStore.values()).find(
      (t) => t.tenant_id === tenantId && t.code === code,
    );
    if (existing) {
      throw new ConflictException(`Product template with code '${code}' already exists.`);
    }

    // Verify base UOM exists in tenant
    try {
      await this.uomService.getUomById(tenantId, req.base_uom_id);
    } catch {
      throw new BadRequestException(
        `Base unit of measure with ID '${req.base_uom_id}' does not exist.`,
      );
    }

    // Verify category if provided
    if (req.category_id) {
      try {
        await this.categoriesService.getCategoryById(tenantId, req.category_id);
      } catch {
        throw new BadRequestException(
          `Product category with ID '${req.category_id}' does not exist.`,
        );
      }
    }

    // Verify brand if provided
    if (req.brand_id) {
      try {
        await this.brandsService.getBrandById(tenantId, req.brand_id);
      } catch {
        throw new BadRequestException(`Brand with ID '${req.brand_id}' does not exist.`);
      }
    }

    const now = new Date().toISOString();
    const template: ProductTemplate = {
      id: `tmpl_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      type: req.type,
      category_id: req.category_id ?? null,
      brand_id: req.brand_id ?? null,
      base_uom_id: req.base_uom_id,
      tracking_policy: req.tracking_policy ?? 'NONE',
      is_expirable: req.is_expirable ?? false,
      tax_category_code: req.tax_category_code ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.templatesStore.set(template.id, template);
    return template;
  }

  async getTemplates(
    tenantId: string,
    type?: ProductType,
  ): Promise<ProductTemplate[]> {
    return Array.from(this.templatesStore.values()).filter(
      (t) => t.tenant_id === tenantId && (!type || t.type === type),
    );
  }

  async getTemplateById(tenantId: string, id: string): Promise<ProductTemplate> {
    const template = this.templatesStore.get(id);
    if (!template || template.tenant_id !== tenantId) {
      throw new NotFoundException(`Product template with ID '${id}' not found.`);
    }
    return template;
  }

  async updateTemplate(
    tenantId: string,
    id: string,
    req: UpdateProductTemplateRequest,
  ): Promise<ProductTemplate> {
    const template = await this.getTemplateById(tenantId, id);

    if (req.name !== undefined) {
      template.name = req.name.trim();
    }

    if (req.category_id !== undefined) {
      if (req.category_id !== null) {
        await this.categoriesService.getCategoryById(tenantId, req.category_id);
      }
      template.category_id = req.category_id;
    }

    if (req.brand_id !== undefined) {
      if (req.brand_id !== null) {
        await this.brandsService.getBrandById(tenantId, req.brand_id);
      }
      template.brand_id = req.brand_id;
    }

    if (req.tracking_policy !== undefined) {
      template.tracking_policy = req.tracking_policy;
    }

    if (req.is_expirable !== undefined) {
      template.is_expirable = req.is_expirable;
    }

    if (req.tax_category_code !== undefined) {
      template.tax_category_code = req.tax_category_code;
    }

    if (req.is_active !== undefined) {
      template.is_active = req.is_active;
    }

    template.updated_at = new Date().toISOString();
    this.templatesStore.set(template.id, template);
    return template;
  }

  clearStore(): void {
    this.templatesStore.clear();
  }
}
