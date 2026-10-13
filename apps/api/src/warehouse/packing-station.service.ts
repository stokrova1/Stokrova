import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PackingStation,
  PackingStationResponse,
  ListPackingStationsResponse,
  CreatePackingStationRequest,
  UpdatePackingStationRequest,
  PackagingBoxType,
  PackagingBoxResponse,
  ListPackagingBoxesResponse,
  CreatePackagingBoxRequest,
} from '@stokrova/contracts';
import {
  CreatePackingStationSchema,
  UpdatePackingStationSchema,
  CreatePackagingBoxSchema,
} from '@stokrova/validation';
import { WarehousesService } from './warehouses.service.js';

@Injectable()
export class PackingStationService {
  private readonly stations = new Map<string, PackingStation>();
  private readonly boxes = new Map<string, PackagingBoxType>();

  constructor(private readonly warehousesService: WarehousesService) {}

  // --------------------------------------------------------------------------
  // Packing Stations
  // --------------------------------------------------------------------------

  async createStation(
    tenantId: string,
    req: CreatePackingStationRequest,
  ): Promise<PackingStationResponse> {
    const parsed = CreatePackingStationSchema.parse(req);

    // Verify warehouse exists under tenant
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // Check code uniqueness within warehouse
    for (const station of this.stations.values()) {
      if (
        station.tenant_id === tenantId &&
        station.warehouse_id === parsed.warehouse_id &&
        station.station_code.toLowerCase() === parsed.station_code.toLowerCase()
      ) {
        throw new BadRequestException(
          `Packing station code '${parsed.station_code}' already exists in this warehouse.`,
        );
      }
    }

    const now = new Date().toISOString();
    const station: PackingStation = {
      id: `pack_stn_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      station_code: parsed.station_code.toUpperCase(),
      station_name: parsed.station_name,
      status: 'ACTIVE',
      default_staging_location_id: parsed.default_staging_location_id ?? null,
      scale_device_id: parsed.scale_device_id ?? null,
      printer_device_id: parsed.printer_device_id ?? null,
      notes: parsed.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.stations.set(station.id, station);
    return { station };
  }

  async getStationById(
    tenantId: string,
    id: string,
  ): Promise<PackingStationResponse> {
    const station = this.stations.get(id);
    if (!station || station.tenant_id !== tenantId) {
      throw new NotFoundException(`Packing station '${id}' not found.`);
    }
    return { station };
  }

  async listStations(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListPackingStationsResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const stations = Array.from(this.stations.values()).filter(
      (s) => s.tenant_id === tenantId && s.warehouse_id === warehouseId,
    );
    return { stations };
  }

  async updateStation(
    tenantId: string,
    id: string,
    req: UpdatePackingStationRequest,
  ): Promise<PackingStationResponse> {
    const parsed = UpdatePackingStationSchema.parse(req);
    const existing = await this.getStationById(tenantId, id);

    const updated: PackingStation = {
      ...existing.station,
      station_name: parsed.station_name ?? existing.station.station_name,
      status: parsed.status ?? existing.station.status,
      default_staging_location_id:
        parsed.default_staging_location_id !== undefined
          ? parsed.default_staging_location_id
          : existing.station.default_staging_location_id,
      scale_device_id:
        parsed.scale_device_id !== undefined
          ? parsed.scale_device_id
          : existing.station.scale_device_id,
      printer_device_id:
        parsed.printer_device_id !== undefined
          ? parsed.printer_device_id
          : existing.station.printer_device_id,
      notes: parsed.notes !== undefined ? parsed.notes : existing.station.notes,
      updated_at: new Date().toISOString(),
    };

    this.stations.set(id, updated);
    return { station: updated };
  }

  // --------------------------------------------------------------------------
  // Packaging Boxes (Carton Types)
  // --------------------------------------------------------------------------

  async createPackagingBox(
    tenantId: string,
    req: CreatePackagingBoxRequest,
  ): Promise<PackagingBoxResponse> {
    const parsed = CreatePackagingBoxSchema.parse(req);

    // Code uniqueness across tenant
    for (const box of this.boxes.values()) {
      if (
        box.tenant_id === tenantId &&
        box.code.toLowerCase() === parsed.code.toLowerCase()
      ) {
        throw new BadRequestException(
          `Packaging box code '${parsed.code}' already exists.`,
        );
      }
    }

    const now = new Date().toISOString();
    const box: PackagingBoxType = {
      id: `box_type_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      code: parsed.code.toUpperCase(),
      name: parsed.name,
      length_mm: parsed.length_mm,
      width_mm: parsed.width_mm,
      height_mm: parsed.height_mm,
      max_weight_grams: parsed.max_weight_grams,
      tare_weight_grams: parsed.tare_weight_grams,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.boxes.set(box.id, box);
    return { box };
  }

  async getPackagingBoxById(
    tenantId: string,
    id: string,
  ): Promise<PackagingBoxResponse> {
    const box = this.boxes.get(id);
    if (!box || box.tenant_id !== tenantId) {
      throw new NotFoundException(`Packaging box type '${id}' not found.`);
    }
    return { box };
  }

  async listPackagingBoxes(
    tenantId: string,
  ): Promise<ListPackagingBoxesResponse> {
    const boxes = Array.from(this.boxes.values()).filter(
      (b) => b.tenant_id === tenantId && b.is_active,
    );
    return { boxes };
  }
}
