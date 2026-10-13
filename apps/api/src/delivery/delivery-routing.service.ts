import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  DeliveryRun,
  DeliveryStop,
  DeliveryRunResponse,
  ListDeliveryRunsResponse,
  CreateDeliveryRunRequest,
  DispatchRunRequest,
} from '@stokrova/contracts';
import {
  CreateDeliveryRunSchema,
  DispatchRunSchema,
} from '@stokrova/validation';
import {
  assertVehicleCapacityLimits,
  assertDeliveryRunTransition,
  DeliveryFleetDomainError,
  type DomainDeliveryRunStatus,
} from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { FleetService } from './fleet.service.js';

@Injectable()
export class DeliveryRoutingService {
  private readonly runs = new Map<string, DeliveryRun>();
  private readonly stops = new Map<string, DeliveryStop>();
  private runSeq = 1001;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly fleetService: FleetService,
  ) {}

  async createDeliveryRun(
    tenantId: string,
    req: CreateDeliveryRunRequest,
  ): Promise<DeliveryRunResponse> {
    const parsed = CreateDeliveryRunSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    let vehicleCode: string | null = null;
    if (parsed.vehicle_id) {
      const v = await this.fleetService.getVehicleEntity(tenantId, parsed.vehicle_id);
      vehicleCode = v.vehicle_code;
    }

    let driverName: string | null = null;
    if (parsed.driver_id) {
      const d = await this.fleetService.getDriverEntity(tenantId, parsed.driver_id);
      driverName = d.full_name;
    }

    const runId = `run_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const datePrefix = now.slice(0, 10).replace(/-/g, '');
    const runNumber = `RUN-${datePrefix}-${this.runSeq++}`;

    let totalWeight = 0;
    let totalVolume = 0;

    const createdStops: DeliveryStop[] = parsed.stops.map((s, index) => {
      totalWeight += s.total_weight_grams;
      totalVolume += s.total_volume_cm3;

      const stop: DeliveryStop = {
        id: `stop_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenant_id: tenantId,
        run_id: runId,
        stop_sequence: index + 1,
        order_id: s.order_id,
        order_number: s.order_number,
        recipient_name: s.recipient_name,
        recipient_phone: s.recipient_phone,
        delivery_address: s.delivery_address,
        latitude_microdegrees: s.latitude_microdegrees ?? null,
        longitude_microdegrees: s.longitude_microdegrees ?? null,
        time_window_start: s.time_window_start ?? null,
        time_window_end: s.time_window_end ?? null,
        estimated_arrival: null,
        actual_arrival: null,
        status: 'PENDING',
        failure_reason: null,
        total_weight_grams: s.total_weight_grams,
        total_volume_cm3: s.total_volume_cm3,
        notes: s.notes ?? null,
        created_at: now,
        updated_at: now,
      };

      this.stops.set(stop.id, stop);
      return stop;
    });

    const run: DeliveryRun = {
      id: runId,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      run_number: runNumber,
      vehicle_id: parsed.vehicle_id ?? null,
      vehicle_code: vehicleCode,
      driver_id: parsed.driver_id ?? null,
      driver_name: driverName,
      status: 'PLANNING',
      total_stops: createdStops.length,
      completed_stops: 0,
      total_weight_grams: totalWeight,
      total_volume_cm3: totalVolume,
      dispatched_at: null,
      completed_at: null,
      cancelled_at: null,
      notes: parsed.notes ?? null,
      stops: createdStops,
      created_at: now,
      updated_at: now,
    };

    this.runs.set(run.id, run);
    return { run };
  }

  async optimizeRun(
    tenantId: string,
    id: string,
  ): Promise<DeliveryRunResponse> {
    const run = await this.getRunEntity(tenantId, id);

    try {
      assertDeliveryRunTransition(
        run.status as DomainDeliveryRunStatus,
        'OPTIMIZED',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // Sequence optimization (re-index stop_sequence)
    const reorderedStops = [...run.stops].map((s, index) => {
      const updatedStop = { ...s, stop_sequence: index + 1 };
      this.stops.set(s.id, updatedStop);
      return updatedStop;
    });

    const updated: DeliveryRun = {
      ...run,
      status: 'OPTIMIZED',
      stops: reorderedStops,
      updated_at: new Date().toISOString(),
    };

    this.runs.set(id, updated);
    return { run: updated };
  }

  async dispatchRun(
    tenantId: string,
    id: string,
    req: DispatchRunRequest,
  ): Promise<DeliveryRunResponse> {
    const parsed = DispatchRunSchema.parse(req);
    const run = await this.getRunEntity(tenantId, id);

    try {
      assertDeliveryRunTransition(
        run.status as DomainDeliveryRunStatus,
        'DISPATCHED',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 1. Verify vehicle and check capacity limits
    const vehicle = await this.fleetService.getVehicleEntity(tenantId, parsed.vehicle_id);
    try {
      assertVehicleCapacityLimits(
        {
          vehicle_code: vehicle.vehicle_code,
          status: vehicle.status,
          is_active: vehicle.is_active,
          max_payload_grams: vehicle.max_payload_grams,
          max_volume_cm3: vehicle.max_volume_cm3,
        },
        run.stops.map((s) => ({
          total_weight_grams: s.total_weight_grams,
          total_volume_cm3: s.total_volume_cm3,
        })),
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 2. Verify driver and transition driver shift to EN_ROUTE
    const driver = await this.fleetService.getDriverEntity(tenantId, parsed.driver_id);
    await this.fleetService.updateDriverShift(tenantId, driver.id, {
      shift_status: 'EN_ROUTE',
    });

    const now = new Date().toISOString();
    const updated: DeliveryRun = {
      ...run,
      status: 'DISPATCHED',
      vehicle_id: vehicle.id,
      vehicle_code: vehicle.vehicle_code,
      driver_id: driver.id,
      driver_name: driver.full_name,
      dispatched_at: now,
      notes: parsed.notes ? `${run.notes ? run.notes + '\n' : ''}${parsed.notes}` : run.notes,
      updated_at: now,
    };

    this.runs.set(id, updated);
    return { run: updated };
  }

  async startTransit(
    tenantId: string,
    id: string,
  ): Promise<DeliveryRunResponse> {
    const run = await this.getRunEntity(tenantId, id);

    try {
      assertDeliveryRunTransition(
        run.status as DomainDeliveryRunStatus,
        'IN_TRANSIT',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const updated: DeliveryRun = {
      ...run,
      status: 'IN_TRANSIT',
      updated_at: new Date().toISOString(),
    };

    this.runs.set(id, updated);
    return { run: updated };
  }

  async getRunById(
    tenantId: string,
    id: string,
  ): Promise<DeliveryRunResponse> {
    const run = await this.getRunEntity(tenantId, id);
    return { run };
  }

  async listRuns(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListDeliveryRunsResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const runs = Array.from(this.runs.values()).filter(
      (r) => r.tenant_id === tenantId && r.warehouse_id === warehouseId,
    );
    return { runs };
  }

  public async getRunEntity(
    tenantId: string,
    id: string,
  ): Promise<DeliveryRun> {
    const run = this.runs.get(id);
    if (!run || run.tenant_id !== tenantId) {
      throw new NotFoundException(`Delivery run with ID '${id}' not found.`);
    }
    return run;
  }

  public async getStopEntity(
    tenantId: string,
    stopId: string,
  ): Promise<DeliveryStop> {
    const stop = this.stops.get(stopId);
    if (!stop || stop.tenant_id !== tenantId) {
      throw new NotFoundException(`Delivery stop with ID '${stopId}' not found.`);
    }
    return stop;
  }

  public async updateRunEntity(
    tenantId: string,
    run: DeliveryRun,
  ): Promise<void> {
    if (run.tenant_id !== tenantId) {
      throw new NotFoundException(`Delivery run with ID '${run.id}' not found.`);
    }
    this.runs.set(run.id, run);
  }

  public async updateStopEntity(
    tenantId: string,
    stop: DeliveryStop,
  ): Promise<void> {
    if (stop.tenant_id !== tenantId) {
      throw new NotFoundException(`Delivery stop with ID '${stop.id}' not found.`);
    }
    this.stops.set(stop.id, stop);

    // Synchronize parent run stops
    const run = this.runs.get(stop.run_id);
    if (run) {
      const updatedStops = run.stops.map((s) => (s.id === stop.id ? stop : s));
      const completedCount = updatedStops.filter((s) => s.status === 'DELIVERED').length;
      this.runs.set(run.id, {
        ...run,
        stops: updatedStops,
        completed_stops: completedCount,
        updated_at: new Date().toISOString(),
      });
    }
  }
}
