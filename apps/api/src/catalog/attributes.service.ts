import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AttributeDimension,
  AttributeValue,
  CreateAttributeDimensionRequest,
  CreateAttributeValueRequest,
} from '@stokrova/contracts';

@Injectable()
export class AttributesService {
  private dimensionsStore = new DurableMap<AttributeDimension>('attribute_dimensions');
  private valuesStore = new DurableMap<AttributeValue>('attribute_values');

  async createDimension(
    tenantId: string,
    req: CreateAttributeDimensionRequest,
  ): Promise<AttributeDimension> {
    const code = req.code.trim().toUpperCase();

    const existing = Array.from(this.dimensionsStore.values()).find(
      (d) => d.tenant_id === tenantId && d.code === code,
    );
    if (existing) {
      throw new ConflictException(`Attribute dimension with code '${code}' already exists.`);
    }

    const now = new Date().toISOString();
    const dimension: AttributeDimension = {
      id: `dim_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      sort_order: req.sort_order ?? 0,
      created_at: now,
    };

    this.dimensionsStore.set(dimension.id, dimension);
    return dimension;
  }

  async getDimensions(tenantId: string): Promise<AttributeDimension[]> {
    return Array.from(this.dimensionsStore.values())
      .filter((d) => d.tenant_id === tenantId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async getDimensionById(tenantId: string, id: string): Promise<AttributeDimension> {
    const dimension = this.dimensionsStore.get(id);
    if (!dimension || dimension.tenant_id !== tenantId) {
      throw new NotFoundException(`Attribute dimension with ID '${id}' not found.`);
    }
    return dimension;
  }

  async createValue(
    tenantId: string,
    dimensionId: string,
    req: CreateAttributeValueRequest,
  ): Promise<AttributeValue> {
    // Ensure dimension exists in tenant
    await this.getDimensionById(tenantId, dimensionId);

    const code = req.code.trim().toUpperCase();

    const existing = Array.from(this.valuesStore.values()).find(
      (v) =>
        v.tenant_id === tenantId &&
        v.dimension_id === dimensionId &&
        v.code === code,
    );
    if (existing) {
      throw new ConflictException(
        `Attribute value with code '${code}' already exists for this dimension.`,
      );
    }

    const now = new Date().toISOString();
    const value: AttributeValue = {
      id: `val_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      dimension_id: dimensionId,
      code,
      name: req.name.trim(),
      hex_color: req.hex_color?.trim() || null,
      sort_order: req.sort_order ?? 0,
      created_at: now,
    };

    this.valuesStore.set(value.id, value);
    return value;
  }

  async getValues(tenantId: string, dimensionId: string): Promise<AttributeValue[]> {
    await this.getDimensionById(tenantId, dimensionId);

    return Array.from(this.valuesStore.values())
      .filter((v) => v.tenant_id === tenantId && v.dimension_id === dimensionId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  clearStore(): void {
    this.dimensionsStore.clear();
    this.valuesStore.clear();
  }
}
