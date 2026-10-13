import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ProductCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryNode,
} from '@stokrova/contracts';
import {
  calculateMaterializedCategoryPath,
  validateCategoryAcyclicity,
  generateSlug,
  CatalogDomainError,
} from '@stokrova/domain';

@Injectable()
export class CategoriesService {
  private categoriesStore = new Map<string, ProductCategory>();

  async createCategory(
    tenantId: string,
    req: CreateCategoryRequest,
  ): Promise<ProductCategory> {
    const code = req.code.trim().toUpperCase();

    // Check unique code per tenant
    const existing = Array.from(this.categoriesStore.values()).find(
      (c) => c.tenant_id === tenantId && c.code === code,
    );
    if (existing) {
      throw new ConflictException(`Category with code '${code}' already exists.`);
    }

    let parentPath: string | null = null;
    let parentId: string | null = null;

    if (req.parent_id) {
      const parent = await this.getCategoryById(tenantId, req.parent_id);
      parentPath = parent.materialized_path;
      parentId = parent.id;
    }

    let materializedPath: string;
    try {
      materializedPath = calculateMaterializedCategoryPath(parentPath, code);
    } catch (err: unknown) {
      if (err instanceof CatalogDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const slug = generateSlug(req.name);
    const now = new Date().toISOString();

    const category: ProductCategory = {
      id: `cat_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      parent_id: parentId,
      name: req.name.trim(),
      code,
      slug,
      materialized_path: materializedPath,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.categoriesStore.set(category.id, category);
    return category;
  }

  async getCategories(
    tenantId: string,
    parentId?: string | null,
  ): Promise<ProductCategory[]> {
    return Array.from(this.categoriesStore.values()).filter((c) => {
      if (c.tenant_id !== tenantId) return false;
      if (parentId !== undefined) {
        return c.parent_id === parentId;
      }
      return true;
    });
  }

  async getCategoryById(tenantId: string, id: string): Promise<ProductCategory> {
    const category = this.categoriesStore.get(id);
    if (!category || category.tenant_id !== tenantId) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }
    return category;
  }

  async getCategoryTree(tenantId: string): Promise<CategoryNode[]> {
    const all = await this.getCategories(tenantId);
    const nodeMap = new Map<string, CategoryNode>();

    for (const cat of all) {
      nodeMap.set(cat.id, { ...cat, children: [] });
    }

    const roots: CategoryNode[] = [];

    for (const cat of all) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parent_id && nodeMap.has(cat.parent_id)) {
        nodeMap.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async updateCategory(
    tenantId: string,
    id: string,
    req: UpdateCategoryRequest,
  ): Promise<ProductCategory> {
    const category = await this.getCategoryById(tenantId, id);

    if (req.parent_id !== undefined && req.parent_id !== category.parent_id) {
      // Validate acyclicity
      try {
        validateCategoryAcyclicity(id, req.parent_id, (lookupId) => {
          const item = this.categoriesStore.get(lookupId);
          return item && item.tenant_id === tenantId ? { parent_id: item.parent_id } : undefined;
        });
      } catch (err: unknown) {
        if (err instanceof CatalogDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      let newParentPath: string | null = null;
      if (req.parent_id) {
        const newParent = await this.getCategoryById(tenantId, req.parent_id);
        newParentPath = newParent.materialized_path;
      }

      const oldPath = category.materialized_path;
      const newPath = calculateMaterializedCategoryPath(newParentPath, category.code);

      category.parent_id = req.parent_id;
      category.materialized_path = newPath;

      // Update paths of all descendant categories
      for (const item of this.categoriesStore.values()) {
        if (item.tenant_id === tenantId && item.materialized_path.startsWith(oldPath + '/')) {
          item.materialized_path = newPath + item.materialized_path.slice(oldPath.length);
          item.updated_at = new Date().toISOString();
        }
      }
    }

    if (req.name !== undefined) {
      category.name = req.name.trim();
      category.slug = generateSlug(category.name);
    }

    if (req.is_active !== undefined) {
      category.is_active = req.is_active;
    }

    category.updated_at = new Date().toISOString();
    this.categoriesStore.set(category.id, category);
    return category;
  }

  clearStore(): void {
    this.categoriesStore.clear();
  }
}
