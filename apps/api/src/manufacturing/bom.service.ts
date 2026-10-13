import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  BillOfMaterials,
  BomLine,
  BomByproduct,
  CreateBillOfMaterialsRequest,
  ExplodeBomResponse,
} from '@stokrova/contracts';
import {
  assertNoBomCircularDependency,
  explodeBillOfMaterials,
  generateUuidV7,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';

@Injectable()
export class BomService {
  private bomsStore = new Map<string, BillOfMaterials>();
  private bomCounter = 1000;

  constructor(private readonly variantsService: VariantsService) {}

  async createBom(
    tenantId: string,
    request: CreateBillOfMaterialsRequest,
  ): Promise<BillOfMaterials> {
    await this.variantsService.getVariantById(tenantId, request.variant_id);

    if (!request.lines || request.lines.length === 0) {
      throw new BadRequestException('Bill of Materials must contain at least one component line.');
    }

    // Circular dependency check helper
    const getSubComponentIds = (vId: string): string[] => {
      const activeBom = this.findActiveBom(tenantId, vId);
      return activeBom?.lines?.map((l) => l.component_variant_id) ?? [];
    };

    for (const lineReq of request.lines) {
      await this.variantsService.getVariantById(tenantId, lineReq.component_variant_id);
      assertNoBomCircularDependency(
        request.variant_id,
        lineReq.component_variant_id,
        getSubComponentIds,
      );
    }

    const bomId = generateUuidV7();
    this.bomCounter += 1;
    const bomNumber = `BOM-${this.bomCounter}`;
    const now = new Date().toISOString();

    const createdLines: BomLine[] = request.lines.map((l) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      bom_id: bomId,
      component_variant_id: l.component_variant_id,
      quantity: l.quantity,
      scrap_percentage_basis_points: l.scrap_percentage_basis_points ?? 0,
      fixed_scrap_quantity: l.fixed_scrap_quantity ?? 0,
      operation_step_number: l.operation_step_number ?? null,
      notes: l.notes ?? null,
      created_at: now,
      updated_at: now,
    }));

    const createdByproducts: BomByproduct[] = (request.byproducts ?? []).map((bp) => ({
      id: generateUuidV7(),
      tenant_id: tenantId,
      bom_id: bomId,
      variant_id: bp.variant_id,
      quantity: bp.quantity,
      cost_allocation_basis_points: bp.cost_allocation_basis_points ?? 0,
      created_at: now,
      updated_at: now,
    }));

    const isActive = request.is_active_revision ?? true;

    // Deactivate existing revisions if this one is active
    if (isActive) {
      for (const [key, existingBom] of this.bomsStore.entries()) {
        if (
          key.startsWith(`${tenantId}:`) &&
          existingBom.variant_id === request.variant_id &&
          existingBom.is_active_revision
        ) {
          existingBom.is_active_revision = false;
          existingBom.updated_at = now;
        }
      }
    }

    const bom: BillOfMaterials = {
      id: bomId,
      tenant_id: tenantId,
      bom_number: bomNumber,
      variant_id: request.variant_id,
      version: request.version ?? 1,
      revision_label: request.revision_label ?? 'REV-A',
      type: request.type ?? 'MANUFACTURE',
      status: 'ACTIVE',
      output_quantity: request.output_quantity ?? 1,
      routing_id: request.routing_id ?? null,
      notes: request.notes ?? null,
      is_active_revision: isActive,
      created_at: now,
      updated_at: now,
      lines: createdLines,
      byproducts: createdByproducts,
    };

    this.bomsStore.set(`${tenantId}:${bomId}`, bom);
    return bom;
  }

  async getBomById(tenantId: string, bomId: string): Promise<BillOfMaterials> {
    const bom = this.bomsStore.get(`${tenantId}:${bomId}`);
    if (!bom) {
      throw new NotFoundException(`Bill of Materials '${bomId}' not found for tenant '${tenantId}'.`);
    }
    return bom;
  }

  async listBoms(tenantId: string, variantId?: string): Promise<BillOfMaterials[]> {
    const boms: BillOfMaterials[] = [];
    for (const [key, b] of this.bomsStore.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (variantId && b.variant_id !== variantId) continue;
        boms.push(b);
      }
    }
    return boms;
  }

  findActiveBom(tenantId: string, variantId: string): BillOfMaterials | null {
    for (const [key, b] of this.bomsStore.entries()) {
      if (key.startsWith(`${tenantId}:`) && b.variant_id === variantId && b.is_active_revision) {
        return b;
      }
    }
    return null;
  }

  async explodeBom(
    tenantId: string,
    variantId: string,
    targetQuantity: number,
  ): Promise<ExplodeBomResponse> {
    const explosion = explodeBillOfMaterials(targetVariantId(variantId), targetQuantity, (vId) => {
      const activeBom = this.findActiveBom(tenantId, vId);
      if (!activeBom || !activeBom.lines) return null;
      return {
        output_quantity: activeBom.output_quantity,
        lines: activeBom.lines.map((l) => ({
          component_variant_id: l.component_variant_id,
          quantity: l.quantity,
          scrap_percentage_basis_points: l.scrap_percentage_basis_points,
          fixed_scrap_quantity: l.fixed_scrap_quantity,
        })),
      };
    });

    return {
      target_variant_id: variantId,
      target_quantity: targetQuantity,
      explosion: explosion.map((item) => ({
        variant_id: item.variant_id,
        sku: item.variant_id,
        level: item.level,
        parent_variant_id: item.parent_variant_id,
        unit_quantity: item.unit_quantity,
        total_quantity: item.total_quantity,
        scrap_quantity: item.scrap_quantity,
        gross_quantity: item.gross_quantity,
        is_subassembly: item.is_subassembly,
        sub_bom_id: this.findActiveBom(tenantId, item.variant_id)?.id ?? null,
      })),
    };

    function targetVariantId(id: string) {
      return id;
    }
  }
}
