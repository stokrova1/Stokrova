import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  FleetVehicle,
  FleetDriver,
  VehicleResponse,
  ListVehiclesResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  DriverResponse,
  ListDriversResponse,
  CreateDriverRequest,
  UpdateDriverRequest,
  UpdateDriverShiftRequest,
} from '@stokrova/contracts';
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  CreateDriverSchema,
  UpdateDriverSchema,
  UpdateDriverShiftSchema,
} from '@stokrova/validation';
import { WarehousesService } from '../warehouse/warehouses.service.js';

@Injectable()
export class FleetService {
  private readonly vehicles = new DurableMap<FleetVehicle>('fleet_vehicles');
  private readonly drivers = new DurableMap<FleetDriver>('fleet_drivers');

  constructor(private readonly warehousesService: WarehousesService) {}

  // ==========================================================================
  // Vehicles
  // ==========================================================================

  async createVehicle(
    tenantId: string,
    req: CreateVehicleRequest,
  ): Promise<VehicleResponse> {
    const parsed = CreateVehicleSchema.parse(req);
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // Check unique vehicle code
    const existingCode = Array.from(this.vehicles.values()).find(
      (v) => v.tenant_id === tenantId && v.vehicle_code === parsed.vehicle_code,
    );
    if (existingCode) {
      throw new ConflictException(
        `Vehicle code '${parsed.vehicle_code}' already exists.`,
      );
    }

    // Check unique license plate
    const existingPlate = Array.from(this.vehicles.values()).find(
      (v) => v.tenant_id === tenantId && v.license_plate === parsed.license_plate,
    );
    if (existingPlate) {
      throw new ConflictException(
        `License plate '${parsed.license_plate}' already exists.`,
      );
    }

    const now = new Date().toISOString();
    const vehicle: FleetVehicle = {
      id: `veh_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      vehicle_code: parsed.vehicle_code,
      license_plate: parsed.license_plate,
      make_model: parsed.make_model,
      type: parsed.type,
      status: parsed.status ?? 'ACTIVE',
      max_payload_grams: parsed.max_payload_grams,
      max_volume_cm3: parsed.max_volume_cm3,
      odometer_meters: parsed.odometer_meters ?? 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.vehicles.set(vehicle.id, vehicle);
    return { vehicle };
  }

  async updateVehicle(
    tenantId: string,
    id: string,
    req: UpdateVehicleRequest,
  ): Promise<VehicleResponse> {
    const parsed = UpdateVehicleSchema.parse(req);
    const vehicle = await this.getVehicleEntity(tenantId, id);

    const updated: FleetVehicle = {
      ...vehicle,
      license_plate: parsed.license_plate ?? vehicle.license_plate,
      make_model: parsed.make_model ?? vehicle.make_model,
      type: parsed.type ?? vehicle.type,
      max_payload_grams: parsed.max_payload_grams ?? vehicle.max_payload_grams,
      max_volume_cm3: parsed.max_volume_cm3 ?? vehicle.max_volume_cm3,
      odometer_meters: parsed.odometer_meters ?? vehicle.odometer_meters,
      status: parsed.status ?? vehicle.status,
      is_active: parsed.is_active ?? vehicle.is_active,
      updated_at: new Date().toISOString(),
    };

    this.vehicles.set(id, updated);
    return { vehicle: updated };
  }

  async getVehicleById(
    tenantId: string,
    id: string,
  ): Promise<VehicleResponse> {
    const vehicle = await this.getVehicleEntity(tenantId, id);
    return { vehicle };
  }

  async listVehicles(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListVehiclesResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const vehicles = Array.from(this.vehicles.values()).filter(
      (v) => v.tenant_id === tenantId && v.warehouse_id === warehouseId,
    );
    return { vehicles };
  }

  // ==========================================================================
  // Drivers
  // ==========================================================================

  async createDriver(
    tenantId: string,
    req: CreateDriverRequest,
  ): Promise<DriverResponse> {
    const parsed = CreateDriverSchema.parse(req);

    // Check unique driver code
    const existingCode = Array.from(this.drivers.values()).find(
      (d) => d.tenant_id === tenantId && d.driver_code === parsed.driver_code,
    );
    if (existingCode) {
      throw new ConflictException(
        `Driver code '${parsed.driver_code}' already exists.`,
      );
    }

    const now = new Date().toISOString();
    const driver: FleetDriver = {
      id: `drv_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      user_id: parsed.user_id,
      driver_code: parsed.driver_code,
      full_name: parsed.full_name,
      phone_number: parsed.phone_number,
      license_number: parsed.license_number,
      license_expiry_date: parsed.license_expiry_date,
      assigned_vehicle_id: parsed.assigned_vehicle_id ?? null,
      shift_status: 'OFF_DUTY',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.drivers.set(driver.id, driver);
    return { driver };
  }

  async updateDriver(
    tenantId: string,
    id: string,
    req: UpdateDriverRequest,
  ): Promise<DriverResponse> {
    const parsed = UpdateDriverSchema.parse(req);
    const driver = await this.getDriverEntity(tenantId, id);

    const updated: FleetDriver = {
      ...driver,
      full_name: parsed.full_name ?? driver.full_name,
      phone_number: parsed.phone_number ?? driver.phone_number,
      license_number: parsed.license_number ?? driver.license_number,
      license_expiry_date: parsed.license_expiry_date ?? driver.license_expiry_date,
      assigned_vehicle_id: parsed.assigned_vehicle_id ?? driver.assigned_vehicle_id,
      is_active: parsed.is_active ?? driver.is_active,
      updated_at: new Date().toISOString(),
    };

    this.drivers.set(id, updated);
    return { driver: updated };
  }

  async updateDriverShift(
    tenantId: string,
    id: string,
    req: UpdateDriverShiftRequest,
  ): Promise<DriverResponse> {
    const parsed = UpdateDriverShiftSchema.parse(req);
    const driver = await this.getDriverEntity(tenantId, id);

    const updated: FleetDriver = {
      ...driver,
      shift_status: parsed.shift_status,
      updated_at: new Date().toISOString(),
    };

    this.drivers.set(id, updated);
    return { driver: updated };
  }

  async getDriverById(
    tenantId: string,
    id: string,
  ): Promise<DriverResponse> {
    const driver = await this.getDriverEntity(tenantId, id);
    return { driver };
  }

  async listDrivers(tenantId: string): Promise<ListDriversResponse> {
    const drivers = Array.from(this.drivers.values()).filter(
      (d) => d.tenant_id === tenantId,
    );
    return { drivers };
  }

  public async getVehicleEntity(
    tenantId: string,
    id: string,
  ): Promise<FleetVehicle> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle || vehicle.tenant_id !== tenantId) {
      throw new NotFoundException(`Vehicle with ID '${id}' not found.`);
    }
    return vehicle;
  }

  public async getDriverEntity(
    tenantId: string,
    id: string,
  ): Promise<FleetDriver> {
    const driver = this.drivers.get(id);
    if (!driver || driver.tenant_id !== tenantId) {
      throw new NotFoundException(`Driver with ID '${id}' not found.`);
    }
    return driver;
  }
}
