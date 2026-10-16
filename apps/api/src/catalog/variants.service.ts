import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ProductVariant,
  CreateProductVariantRequest,
  UpdateProductVariantRequest,
  MatrixGenerateRequest,
  MatrixGenerateResponse,
  GeneratedVariantPreview,
} from '@stokrova/contracts';
import {
  normalizeSku,
  validateBarcode,
  assertUniqueVariantCoordinates,
  generateVariantMatrix,
  CatalogDomainError,
} from '@stokrova/domain';
import { TemplatesService } from './templates.service.js';

@Injectable()
export class VariantsService {
  private variantsStore = new DurableMap<ProductVariant>('product_variants');

  constructor(private readonly templatesService: TemplatesService) {}

  async createVariant(
    tenantId: string,
    req: CreateProductVariantRequest,
  ): Promise<ProductVariant> {
    // 1. Ensure template exists
    await this.templatesService.getTemplateById(tenantId, req.template_id);

    // 2. Normalize and check unique SKU
    let sku: string;
    try {
      sku = normalizeSku(req.sku);
    } catch (err: unknown) {
      if (err instanceof CatalogDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const existingSku = Array.from(this.variantsStore.values()).find(
      (v) => v.tenant_id === tenantId && v.sku === sku,
    );
    if (existingSku) {
      throw new ConflictException(`Product variant with SKU '${sku}' already exists.`);
    }

    // 3. Barcode validation & uniqueness
    let barcode: string | null = null;
    if (req.barcode) {
      const barcodeCheck = validateBarcode(req.barcode);
      if (!barcodeCheck.valid) {
        throw new BadRequestException(
          `Invalid barcode '${req.barcode}': ${barcodeCheck.error || 'Checksum or format failed'}`,
        );
      }
      barcode = req.barcode.trim();

      const existingBarcode = Array.from(this.variantsStore.values()).find(
        (v) => v.tenant_id === tenantId && v.barcode === barcode,
      );
      if (existingBarcode) {
        throw new ConflictException(`Product variant with barcode '${barcode}' already exists.`);
      }
    }

    // 4. Attribute coordinate uniqueness within template
    const templateVariants = Array.from(this.variantsStore.values()).filter(
      (v) => v.tenant_id === tenantId && v.template_id === req.template_id,
    );

    try {
      assertUniqueVariantCoordinates(templateVariants, req.attributes);
    } catch (err: unknown) {
      if (err instanceof CatalogDomainError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const variant: ProductVariant = {
      id: `var_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      template_id: req.template_id,
      sku,
      barcode,
      cost_price_minor: req.cost_price_minor,
      selling_price_minor: req.selling_price_minor,
      attributes: req.attributes,
      weight_grams: req.weight_grams ?? null,
      volume_cm3: req.volume_cm3 ?? null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    this.variantsStore.set(variant.id, variant);
    return variant;
  }

  async getVariants(
    tenantId: string,
    templateId?: string,
  ): Promise<ProductVariant[]> {
    return Array.from(this.variantsStore.values()).filter((v) => {
      if (v.tenant_id !== tenantId) return false;
      if (templateId && v.template_id !== templateId) return false;
      return true;
    });
  }

  async getVariantById(tenantId: string, id: string): Promise<ProductVariant> {
    const variant = this.variantsStore.get(id);
    if (!variant || variant.tenant_id !== tenantId) {
      throw new NotFoundException(`Product variant with ID '${id}' not found.`);
    }
    return variant;
  }

  async updateVariant(
    tenantId: string,
    id: string,
    req: UpdateProductVariantRequest,
  ): Promise<ProductVariant> {
    const variant = await this.getVariantById(tenantId, id);

    if (req.sku !== undefined) {
      const sku = normalizeSku(req.sku);
      if (sku !== variant.sku) {
        const existing = Array.from(this.variantsStore.values()).find(
          (v) => v.tenant_id === tenantId && v.sku === sku && v.id !== id,
        );
        if (existing) {
          throw new ConflictException(`SKU '${sku}' already in use.`);
        }
        variant.sku = sku;
      }
    }

    if (req.barcode !== undefined) {
      if (req.barcode !== null) {
        const check = validateBarcode(req.barcode);
        if (!check.valid) {
          throw new BadRequestException(`Invalid barcode: ${check.error}`);
        }
        const existing = Array.from(this.variantsStore.values()).find(
          (v) => v.tenant_id === tenantId && v.barcode === req.barcode && v.id !== id,
        );
        if (existing) {
          throw new ConflictException(`Barcode '${req.barcode}' already in use.`);
        }
      }
      variant.barcode = req.barcode;
    }

    if (req.cost_price_minor !== undefined) {
      variant.cost_price_minor = req.cost_price_minor;
    }

    if (req.selling_price_minor !== undefined) {
      variant.selling_price_minor = req.selling_price_minor;
    }

    if (req.weight_grams !== undefined) {
      variant.weight_grams = req.weight_grams;
    }

    if (req.volume_cm3 !== undefined) {
      variant.volume_cm3 = req.volume_cm3;
    }

    if (req.status !== undefined) {
      variant.status = req.status;
    }

    const img = (req as { image_url?: string | null }).image_url;
    if (img !== undefined) variant.image_url = img;
    variant.updated_at = new Date().toISOString();
    this.variantsStore.set(variant.id, variant);
    return variant;
  }

  async generateMatrix(
    tenantId: string,
    req: MatrixGenerateRequest,
  ): Promise<MatrixGenerateResponse> {
    const template = await this.templatesService.getTemplateById(
      tenantId,
      req.template_id,
    );

    const priceAdjustments = req.price_adjustments?.map((adj) => ({
      attribute_code: adj.attribute_code,
      value_code: adj.value_code,
      delta_cost_minor: adj.delta_cost_minor ? BigInt(adj.delta_cost_minor) : undefined,
      delta_selling_minor: adj.delta_selling_minor
        ? BigInt(adj.delta_selling_minor)
        : undefined,
    }));

    try {
      const generated = generateVariantMatrix({
        template_code: template.code,
        dimensions: req.dimensions,
        base_cost_price_minor: BigInt(req.base_cost_price_minor),
        base_selling_price_minor: BigInt(req.base_selling_price_minor),
        price_adjustments: priceAdjustments,
      });

      const previews: GeneratedVariantPreview[] = generated.map((g) => ({
        sku: g.sku,
        attributes: g.attributes,
        cost_price_minor: g.cost_price_minor.toString(),
        selling_price_minor: g.selling_price_minor.toString(),
      }));

      return {
        template_id: req.template_id,
        generated_count: previews.length,
        variants: previews,
      };
    } catch (err: unknown) {
      if (err instanceof CatalogDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async lookupByBarcodeOrSku(
    tenantId: string,
    query: string,
  ): Promise<ProductVariant | null> {
    const trimmed = query.trim().toUpperCase();
    const found = Array.from(this.variantsStore.values()).find(
      (v) =>
        v.tenant_id === tenantId &&
        (v.sku.toUpperCase() === trimmed ||
          (v.barcode && v.barcode.toUpperCase() === trimmed)),
    );
    return found || null;
  }

  clearStore(): void {
    this.variantsStore.clear();
  }
}
