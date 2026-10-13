import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Brand,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '@stokrova/contracts';
import { generateSlug } from '@stokrova/domain';

@Injectable()
export class BrandsService {
  private brandsStore = new Map<string, Brand>();

  async createBrand(tenantId: string, req: CreateBrandRequest): Promise<Brand> {
    const code = req.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = Array.from(this.brandsStore.values()).find(
      (b) => b.tenant_id === tenantId && b.code === code,
    );
    if (existing) {
      throw new ConflictException(`Brand with code '${code}' already exists.`);
    }

    const slug = generateSlug(req.name);
    const now = new Date().toISOString();

    const brand: Brand = {
      id: `brd_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      code,
      name: req.name.trim(),
      slug,
      description: req.description?.trim() || null,
      origin_country: req.origin_country ? req.origin_country.trim().toUpperCase() : null,
      logo_url: req.logo_url?.trim() || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.brandsStore.set(brand.id, brand);
    return brand;
  }

  async getBrands(tenantId: string, activeOnly?: boolean): Promise<Brand[]> {
    return Array.from(this.brandsStore.values()).filter((b) => {
      if (b.tenant_id !== tenantId) return false;
      if (activeOnly && !b.is_active) return false;
      return true;
    });
  }

  async getBrandById(tenantId: string, id: string): Promise<Brand> {
    const brand = this.brandsStore.get(id);
    if (!brand || brand.tenant_id !== tenantId) {
      throw new NotFoundException(`Brand with ID '${id}' not found.`);
    }
    return brand;
  }

  async updateBrand(
    tenantId: string,
    id: string,
    req: UpdateBrandRequest,
  ): Promise<Brand> {
    const brand = await this.getBrandById(tenantId, id);

    if (req.name !== undefined) {
      brand.name = req.name.trim();
      brand.slug = generateSlug(brand.name);
    }

    if (req.description !== undefined) {
      brand.description = req.description ? req.description.trim() : null;
    }

    if (req.origin_country !== undefined) {
      brand.origin_country = req.origin_country ? req.origin_country.trim().toUpperCase() : null;
    }

    if (req.logo_url !== undefined) {
      brand.logo_url = req.logo_url ? req.logo_url.trim() : null;
    }

    if (req.is_active !== undefined) {
      brand.is_active = req.is_active;
    }

    brand.updated_at = new Date().toISOString();
    this.brandsStore.set(brand.id, brand);
    return brand;
  }

  clearStore(): void {
    this.brandsStore.clear();
  }
}
