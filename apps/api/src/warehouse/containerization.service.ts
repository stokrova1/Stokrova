import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PackedContainer,
  PackedContainerLine,
  PackedContainerResponse,
  ListPackedContainersResponse,
  OpenPackedContainerRequest,
  PackItemIntoContainerRequest,
  SealContainerRequest,
  CartonizationRecommendationRequest,
  CartonizationRecommendationResponse,
  ContainerStatus,
} from '@stokrova/contracts';
import {
  CartonizationRecommendationSchema,
  OpenPackedContainerSchema,
  PackItemIntoContainerSchema,
  SealContainerSchema,
} from '@stokrova/validation';
import {
  cartonizeItems,
  formatSSCC18,
  assertContainerWeightTolerance,
  assertContainerTransition,
  WarehouseOpsDomainError,
  type DomainPackagingBox,
  type DomainCartonItem,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';
import { PackingStationService } from './packing-station.service.js';

@Injectable()
export class ContainerizationService {
  private readonly containers = new DurableMap<PackedContainer>('packed_containers');
  private readonly containerLines = new DurableMap<PackedContainerLine>('packed_container_lines');
  private containerSeq = 1001;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly packingStationService: PackingStationService,
  ) {}

  // --------------------------------------------------------------------------
  // Automated 3D / Weight Cartonization Recommendation
  // --------------------------------------------------------------------------

  async recommendCartonization(
    tenantId: string,
    req: CartonizationRecommendationRequest,
  ): Promise<CartonizationRecommendationResponse> {
    const parsed = CartonizationRecommendationSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    const availableBoxes = await this.packingStationService.listPackagingBoxes(tenantId);
    if (availableBoxes.boxes.length === 0) {
      throw new BadRequestException(
        'No packaging boxes configured for this tenant. Configure at least one packaging box before cartonizing.',
      );
    }

    const domainBoxes: DomainPackagingBox[] = availableBoxes.boxes.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      length_mm: b.length_mm,
      width_mm: b.width_mm,
      height_mm: b.height_mm,
      max_weight_grams: b.max_weight_grams,
      tare_weight_grams: b.tare_weight_grams,
    }));

    const domainItems: DomainCartonItem[] = parsed.items.map((i) => ({
      variant_id: i.variant_id,
      sku: i.sku,
      quantity: i.quantity,
      weight_grams_each: i.weight_grams_each,
      length_mm: i.length_mm,
      width_mm: i.width_mm,
      height_mm: i.height_mm,
    }));

    try {
      const plan = cartonizeItems(domainItems, domainBoxes);
      return {
        total_cartons: plan.total_cartons,
        cartons: plan.cartons,
      };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Container Lifecycle & Sealing
  // --------------------------------------------------------------------------

  async openContainer(
    tenantId: string,
    req: OpenPackedContainerRequest,
  ): Promise<PackedContainerResponse> {
    const parsed = OpenPackedContainerSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    let tareWeight = 0;
    if (parsed.box_type_id) {
      const box = await this.packingStationService.getPackagingBoxById(
        tenantId,
        parsed.box_type_id,
      );
      tareWeight = box.box.tare_weight_grams;
    }

    if (parsed.station_id) {
      await this.packingStationService.getStationById(tenantId, parsed.station_id);
    }

    const nextNum = this.containerSeq++;
    const containerNumber = `CNT-${nextNum}`;

    // Format GS1 SSCC-18 barcode
    // Extension digit: 0, Company Prefix derived from tenant or default 0614141, Serial padded
    const ssccBarcode = formatSSCC18(
      0,
      '0614141',
      String(nextNum).padStart(9, '0'),
    );

    const now = new Date().toISOString();
    const container: PackedContainer = {
      id: `cnt_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      station_id: parsed.station_id ?? null,
      box_type_id: parsed.box_type_id ?? null,
      container_number: containerNumber,
      sscc_barcode: ssccBarcode,
      tracking_number: parsed.tracking_number ?? null,
      status: 'OPEN',
      tare_weight_grams: tareWeight,
      net_weight_grams: 0,
      gross_weight_grams: tareWeight,
      scale_verified_weight_grams: null,
      weight_discrepancy_grams: null,
      manifest_id: null,
      seal_number: null,
      lines: [],
      sealed_at: null,
      dispatched_at: null,
      created_at: now,
      updated_at: now,
    };

    this.containers.set(container.id, container);
    return { container };
  }

  async packItem(
    tenantId: string,
    containerId: string,
    req: PackItemIntoContainerRequest,
  ): Promise<PackedContainerResponse> {
    const parsed = PackItemIntoContainerSchema.parse(req);
    const container = await this.getContainerEntity(tenantId, containerId);

    if (container.status !== 'OPEN') {
      throw new BadRequestException(
        `Cannot pack items into container in '${container.status}' status. Container must be OPEN.`,
      );
    }

    const now = new Date().toISOString();
    const lineId = `cnt_line_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const line: PackedContainerLine = {
      id: lineId,
      tenant_id: tenantId,
      container_id: containerId,
      pick_list_line_id: parsed.pick_list_line_id ?? null,
      order_id: parsed.order_id,
      order_line_id: parsed.order_line_id,
      variant_id: parsed.variant_id,
      sku: parsed.sku,
      quantity: parsed.quantity,
      batch_id: parsed.batch_id ?? null,
      serial_numbers: parsed.serial_numbers ?? null,
      created_at: now,
    };

    this.containerLines.set(line.id, line);

    // Recompute container weights
    const addedWeightGrams = parsed.unit_weight_grams * parsed.quantity;
    const newNetWeight = container.net_weight_grams + addedWeightGrams;
    const newGrossWeight = container.tare_weight_grams + newNetWeight;

    const updatedLines = [...container.lines, line];
    const updatedContainer: PackedContainer = {
      ...container,
      lines: updatedLines,
      net_weight_grams: newNetWeight,
      gross_weight_grams: newGrossWeight,
      updated_at: now,
    };

    this.containers.set(containerId, updatedContainer);
    return { container: updatedContainer };
  }

  async sealContainer(
    tenantId: string,
    containerId: string,
    req: SealContainerRequest,
  ): Promise<PackedContainerResponse> {
    const parsed = SealContainerSchema.parse(req);
    const container = await this.getContainerEntity(tenantId, containerId);

    try {
      assertContainerTransition(container.status, 'SEALED');

      // Verify weight tolerance against scale reading
      const toleranceResult = assertContainerWeightTolerance(
        parsed.scale_weight_grams,
        container.gross_weight_grams,
        parsed.tolerance_percentage_bp,
      );

      const now = new Date().toISOString();
      const updated: PackedContainer = {
        ...container,
        status: 'SEALED',
        scale_verified_weight_grams: parsed.scale_weight_grams,
        weight_discrepancy_grams: toleranceResult.discrepancyGrams,
        seal_number: parsed.seal_number ?? null,
        sealed_at: now,
        updated_at: now,
      };

      this.containers.set(containerId, updated);
      return { container: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async getContainerById(
    tenantId: string,
    id: string,
  ): Promise<PackedContainerResponse> {
    const container = await this.getContainerEntity(tenantId, id);
    return { container };
  }

  async listContainers(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListPackedContainersResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const containers = Array.from(this.containers.values()).filter(
      (c) => c.tenant_id === tenantId && c.warehouse_id === warehouseId,
    );
    return { containers };
  }

  async updateContainerStatus(
    tenantId: string,
    id: string,
    status: ContainerStatus,
  ): Promise<PackedContainerResponse> {
    const container = await this.getContainerEntity(tenantId, id);
    try {
      assertContainerTransition(container.status, status);
      const updated: PackedContainer = {
        ...container,
        status,
        updated_at: new Date().toISOString(),
      };
      this.containers.set(id, updated);
      return { container: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async assignManifestToContainer(
    tenantId: string,
    containerId: string,
    manifestId: string | null,
    status: ContainerStatus,
  ): Promise<PackedContainer> {
    const container = await this.getContainerEntity(tenantId, containerId);
    const updated: PackedContainer = {
      ...container,
      manifest_id: manifestId,
      status,
      updated_at: new Date().toISOString(),
    };
    this.containers.set(containerId, updated);
    return updated;
  }

  private async getContainerEntity(
    tenantId: string,
    id: string,
  ): Promise<PackedContainer> {
    const container = this.containers.get(id);
    if (!container || container.tenant_id !== tenantId) {
      throw new NotFoundException(`Packed container '${id}' not found.`);
    }
    return container;
  }
}
