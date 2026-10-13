import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ShippingManifest,
  ShippingManifestResponse,
  ListShippingManifestsResponse,
  CreateShippingManifestRequest,
  AddContainersToManifestRequest,
  DispatchManifestRequest,
  PackedContainer,
} from '@stokrova/contracts';
import {
  CreateShippingManifestSchema,
  AddContainersToManifestSchema,
  DispatchManifestSchema,
} from '@stokrova/validation';
import {
  assertManifestTransition,
  assertManifestDispatchable,
  WarehouseOpsDomainError,
  type DomainShippingManifestStatus,
  type DomainContainerStatus,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';
import { ContainerizationService } from './containerization.service.js';

@Injectable()
export class ShippingManifestService {
  private readonly manifests = new Map<string, ShippingManifest>();
  private readonly manifestContainers = new Map<string, string[]>(); // manifestId -> containerId[]
  private manifestSeq = 1001;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly containerizationService: ContainerizationService,
  ) {}

  async createManifest(
    tenantId: string,
    req: CreateShippingManifestRequest,
  ): Promise<ShippingManifestResponse> {
    const parsed = CreateShippingManifestSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    const nextNum = this.manifestSeq++;
    const manifestNumber = `MNF-${nextNum}`;

    const now = new Date().toISOString();
    const manifest: ShippingManifest = {
      id: `mnf_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      manifest_number: manifestNumber,
      carrier_id: parsed.carrier_id,
      carrier_name: parsed.carrier_name,
      status: 'DRAFT',
      vehicle_reference: parsed.vehicle_reference ?? null,
      driver_name: parsed.driver_name ?? null,
      driver_phone: parsed.driver_phone ?? null,
      total_containers: 0,
      total_gross_weight_grams: 0,
      containers: [],
      sealed_at: null,
      dispatched_at: null,
      created_at: now,
      updated_at: now,
    };

    this.manifests.set(manifest.id, manifest);
    this.manifestContainers.set(manifest.id, []);
    return { manifest };
  }

  async addContainersToManifest(
    tenantId: string,
    manifestId: string,
    req: AddContainersToManifestRequest,
  ): Promise<ShippingManifestResponse> {
    const parsed = AddContainersToManifestSchema.parse(req);
    const manifest = await this.getManifestEntity(tenantId, manifestId);

    if (manifest.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot add containers to manifest in '${manifest.status}' status. Manifest must be in DRAFT.`,
      );
    }

    const currentContainerIds = this.manifestContainers.get(manifestId) ?? [];
    const newContainerIds = [...currentContainerIds];
    const resolvedContainers: PackedContainer[] = [];
    let addedWeightGrams = 0;

    for (const containerId of parsed.container_ids) {
      if (newContainerIds.includes(containerId)) {
        continue;
      }

      const cRes = await this.containerizationService.getContainerById(tenantId, containerId);
      const container = cRes.container;

      if (container.warehouse_id !== manifest.warehouse_id) {
        throw new BadRequestException(
          `Container '${containerId}' belongs to warehouse '${container.warehouse_id}', but manifest belongs to '${manifest.warehouse_id}'.`,
        );
      }

      if (container.status !== 'SEALED' && container.status !== 'STAGED') {
        throw new BadRequestException(
          `Container '${containerId}' is in '${container.status}' status. Only SEALED or STAGED containers can be added to a manifest.`,
        );
      }

      // Assign manifest to container and transition to STAGED
      const updatedContainer = await this.containerizationService.assignManifestToContainer(
        tenantId,
        containerId,
        manifestId,
        'STAGED',
      );

      newContainerIds.push(containerId);
      resolvedContainers.push(updatedContainer);
      addedWeightGrams += updatedContainer.gross_weight_grams;
    }

    // Include existing containers
    for (const cid of currentContainerIds) {
      if (!resolvedContainers.some((c) => c.id === cid)) {
        const cRes = await this.containerizationService.getContainerById(tenantId, cid);
        resolvedContainers.push(cRes.container);
      }
    }

    const totalWeight = resolvedContainers.reduce(
      (acc, c) => acc + c.gross_weight_grams,
      0,
    );

    const now = new Date().toISOString();
    const updatedManifest: ShippingManifest = {
      ...manifest,
      total_containers: resolvedContainers.length,
      total_gross_weight_grams: totalWeight,
      containers: resolvedContainers,
      updated_at: now,
    };

    this.manifestContainers.set(manifestId, newContainerIds);
    this.manifests.set(manifestId, updatedManifest);
    return { manifest: updatedManifest };
  }

  async sealManifest(
    tenantId: string,
    manifestId: string,
  ): Promise<ShippingManifestResponse> {
    const manifest = await this.getManifestEntity(tenantId, manifestId);
    try {
      assertManifestTransition(
        manifest.status as DomainShippingManifestStatus,
        'SEALED',
      );

      const now = new Date().toISOString();
      const updated: ShippingManifest = {
        ...manifest,
        status: 'SEALED',
        sealed_at: now,
        updated_at: now,
      };

      this.manifests.set(manifestId, updated);
      return { manifest: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async dispatchManifest(
    tenantId: string,
    manifestId: string,
    req: DispatchManifestRequest,
  ): Promise<ShippingManifestResponse> {
    const parsed = DispatchManifestSchema.parse(req);
    const manifest = await this.getManifestEntity(tenantId, manifestId);
    const containerIds = this.manifestContainers.get(manifestId) ?? [];

    const containers: PackedContainer[] = [];
    for (const cid of containerIds) {
      const c = await this.containerizationService.getContainerById(tenantId, cid);
      containers.push(c.container);
    }

    try {
      assertManifestDispatchable(
        manifest.status as DomainShippingManifestStatus,
        containers.map((c) => ({
          id: c.id,
          status: c.status as DomainContainerStatus,
        })),
      );

      assertManifestTransition(
        manifest.status as DomainShippingManifestStatus,
        'DISPATCHED',
      );

      const now = new Date().toISOString();

      // Dispatch all associated containers
      const dispatchedContainers: PackedContainer[] = [];
      for (const c of containers) {
        const dispatched = await this.containerizationService.assignManifestToContainer(
          tenantId,
          c.id,
          manifestId,
          'DISPATCHED',
        );
        dispatchedContainers.push(dispatched);
      }

      const updated: ShippingManifest = {
        ...manifest,
        status: 'DISPATCHED',
        vehicle_reference: parsed.vehicle_reference ?? manifest.vehicle_reference,
        driver_name: parsed.driver_name ?? manifest.driver_name,
        driver_phone: parsed.driver_phone ?? manifest.driver_phone,
        containers: dispatchedContainers,
        dispatched_at: now,
        updated_at: now,
      };

      this.manifests.set(manifestId, updated);
      return { manifest: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async getManifestById(
    tenantId: string,
    id: string,
  ): Promise<ShippingManifestResponse> {
    const manifest = await this.getManifestEntity(tenantId, id);
    const containerIds = this.manifestContainers.get(id) ?? [];
    const containers: PackedContainer[] = [];
    for (const cid of containerIds) {
      const c = await this.containerizationService.getContainerById(tenantId, cid);
      containers.push(c.container);
    }

    return { manifest: { ...manifest, containers } };
  }

  async listManifests(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListShippingManifestsResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const manifests = Array.from(this.manifests.values()).filter(
      (m) => m.tenant_id === tenantId && m.warehouse_id === warehouseId,
    );
    return { manifests };
  }

  private async getManifestEntity(
    tenantId: string,
    id: string,
  ): Promise<ShippingManifest> {
    const manifest = this.manifests.get(id);
    if (!manifest || manifest.tenant_id !== tenantId) {
      throw new NotFoundException(`Shipping manifest '${id}' not found.`);
    }
    return manifest;
  }
}
