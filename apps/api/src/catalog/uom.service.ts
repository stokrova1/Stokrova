import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  UnitOfMeasure,
  UnitConversion,
  CreateUomRequest,
  CreateUnitConversionRequest,
  ConvertQuantityRequest,
  ConvertQuantityResponse,
  UnitCategory,
} from '@stokrova/contracts';
import {
  convertQuantity,
  CatalogDomainError,
  assertValidConversionFactors,
} from '@stokrova/domain';

@Injectable()
export class UomService {
  private uomsStore = new DurableMap<UnitOfMeasure>('units_of_measure');
  private conversionsStore = new DurableMap<UnitConversion>('unit_conversions');

  async createUom(tenantId: string, req: CreateUomRequest): Promise<UnitOfMeasure> {
    const code = req.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = Array.from(this.uomsStore.values()).find(
      (u) => u.tenant_id === tenantId && u.code === code,
    );
    if (existing) {
      throw new ConflictException(`Unit of measure with code '${code}' already exists.`);
    }

    // If marked as base unit, ensure only one base unit per category in tenant
    const isBase = Boolean(req.is_base_unit);
    if (isBase) {
      const existingBase = Array.from(this.uomsStore.values()).find(
        (u) => u.tenant_id === tenantId && u.category === req.category && u.is_base_unit,
      );
      if (existingBase) {
        throw new ConflictException(
          `A base unit (${existingBase.code}) already exists for category '${req.category}'.`,
        );
      }
    }

    const now = new Date().toISOString();
    const uom: UnitOfMeasure = {
      id: `uom_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      category: req.category,
      is_base_unit: isBase,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.uomsStore.set(uom.id, uom);
    return uom;
  }

  async getUoms(tenantId: string, category?: UnitCategory): Promise<UnitOfMeasure[]> {
    return Array.from(this.uomsStore.values()).filter(
      (u) => u.tenant_id === tenantId && (!category || u.category === category),
    );
  }

  async getUomById(tenantId: string, id: string): Promise<UnitOfMeasure> {
    const uom = this.uomsStore.get(id);
    if (!uom || uom.tenant_id !== tenantId) {
      throw new NotFoundException(`Unit of measure with ID '${id}' not found.`);
    }
    return uom;
  }

  async createConversion(
    tenantId: string,
    req: CreateUnitConversionRequest,
  ): Promise<UnitConversion> {
    const fromUom = await this.getUomById(tenantId, req.from_uom_id);
    const toUom = await this.getUomById(tenantId, req.to_uom_id);

    if (fromUom.id === toUom.id) {
      throw new BadRequestException('Cannot create conversion between identical unit of measure.');
    }

    if (fromUom.category !== toUom.category) {
      throw new BadRequestException(
        `Cannot convert between incompatible categories: '${fromUom.category}' and '${toUom.category}'.`,
      );
    }

    const multiplier = req.multiplier;
    const divisor = req.divisor ?? 1;

    try {
      assertValidConversionFactors(multiplier, divisor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid conversion factors.';
      throw new BadRequestException(msg);
    }

    // Check if conversion already exists
    const existing = Array.from(this.conversionsStore.values()).find(
      (c) =>
        c.tenant_id === tenantId &&
        c.from_uom_id === req.from_uom_id &&
        c.to_uom_id === req.to_uom_id,
    );
    if (existing) {
      throw new ConflictException(
        `Conversion from ${fromUom.code} to ${toUom.code} already exists.`,
      );
    }

    const now = new Date().toISOString();
    const conversion: UnitConversion = {
      id: `uom_conv_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      from_uom_id: req.from_uom_id,
      to_uom_id: req.to_uom_id,
      multiplier,
      divisor,
      created_at: now,
    };

    this.conversionsStore.set(conversion.id, conversion);
    return conversion;
  }

  async getConversions(tenantId: string, uomId?: string): Promise<UnitConversion[]> {
    return Array.from(this.conversionsStore.values()).filter((c) => {
      if (c.tenant_id !== tenantId) return false;
      if (uomId) {
        return c.from_uom_id === uomId || c.to_uom_id === uomId;
      }
      return true;
    });
  }

  async convertQuantity(
    tenantId: string,
    req: ConvertQuantityRequest,
  ): Promise<ConvertQuantityResponse> {
    const fromUom = await this.getUomById(tenantId, req.from_uom_id);
    const toUom = await this.getUomById(tenantId, req.to_uom_id);

    const tenantConversions = Array.from(this.conversionsStore.values()).filter(
      (c) => c.tenant_id === tenantId,
    );

    try {
      const result = convertQuantity({
        quantity: req.quantity,
        from_uom: fromUom,
        to_uom: toUom,
        conversions: tenantConversions,
      });

      return {
        source_quantity: req.quantity,
        target_quantity: result.target_quantity,
        from_uom_code: fromUom.code,
        to_uom_code: toUom.code,
        effective_factor: result.effective_factor,
      };
    } catch (err: unknown) {
      if (err instanceof CatalogDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  clearStore(): void {
    this.uomsStore.clear();
    this.conversionsStore.clear();
  }
}
