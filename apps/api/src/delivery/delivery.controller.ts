import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FleetService } from './fleet.service.js';
import { DeliveryRoutingService } from './delivery-routing.service.js';
import { PodService } from './pod.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  CreateDriverSchema,
  UpdateDriverSchema,
  UpdateDriverShiftSchema,
  CreateDeliveryRunSchema,
  DispatchRunSchema,
  SubmitPodSchema,
  FailStopSchema,
} from '@stokrova/validation';
import type {
  VehicleResponse,
  ListVehiclesResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  DriverResponse,
  ListDriversResponse,
  CreateDriverRequest,
  UpdateDriverRequest,
  UpdateDriverShiftRequest,
  DeliveryRunResponse,
  ListDeliveryRunsResponse,
  CreateDeliveryRunRequest,
  DispatchRunRequest,
  SubmitPodRequest,
  FailStopRequest,
  PodResponse,
  DeliveryStopResponse,
  ProofOfDelivery,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('delivery')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class DeliveryController {
  constructor(
    private readonly fleetService: FleetService,
    private readonly routingService: DeliveryRoutingService,
    private readonly podService: PodService,
  ) {}

  // --------------------------------------------------------------------------
  // Vehicles
  // --------------------------------------------------------------------------

  @Post('vehicles')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async createVehicle(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateVehicleRequest,
  ): Promise<VehicleResponse> {
    CreateVehicleSchema.parse(body);
    return this.fleetService.createVehicle(tenantId, body);
  }

  @Get('vehicles')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async listVehicles(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListVehiclesResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.fleetService.listVehicles(tenantId, warehouseId);
  }

  @Get('vehicles/:id')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async getVehicleById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<VehicleResponse> {
    return this.fleetService.getVehicleById(tenantId, id);
  }

  @Patch('vehicles/:id')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async updateVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateVehicleRequest,
  ): Promise<VehicleResponse> {
    UpdateVehicleSchema.parse(body);
    return this.fleetService.updateVehicle(tenantId, id, body);
  }

  // --------------------------------------------------------------------------
  // Drivers
  // --------------------------------------------------------------------------

  @Post('drivers')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async createDriver(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDriverRequest,
  ): Promise<DriverResponse> {
    CreateDriverSchema.parse(body);
    return this.fleetService.createDriver(tenantId, body);
  }

  @Get('drivers')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async listDrivers(
    @CurrentTenant() tenantId: string,
  ): Promise<ListDriversResponse> {
    return this.fleetService.listDrivers(tenantId);
  }

  @Get('drivers/:id')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async getDriverById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DriverResponse> {
    return this.fleetService.getDriverById(tenantId, id);
  }

  @Patch('drivers/:id')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async updateDriver(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateDriverRequest,
  ): Promise<DriverResponse> {
    UpdateDriverSchema.parse(body);
    return this.fleetService.updateDriver(tenantId, id, body);
  }

  @Post('drivers/:id/shift')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async updateDriverShift(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateDriverShiftRequest,
  ): Promise<DriverResponse> {
    UpdateDriverShiftSchema.parse(body);
    return this.fleetService.updateDriverShift(tenantId, id, body);
  }

  // --------------------------------------------------------------------------
  // Delivery Runs
  // --------------------------------------------------------------------------

  @Post('runs')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async createDeliveryRun(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDeliveryRunRequest,
  ): Promise<DeliveryRunResponse> {
    CreateDeliveryRunSchema.parse(body);
    return this.routingService.createDeliveryRun(tenantId, body);
  }

  @Get('runs')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async listRuns(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListDeliveryRunsResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.routingService.listRuns(tenantId, warehouseId);
  }

  @Get('runs/:id')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async getRunById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeliveryRunResponse> {
    return this.routingService.getRunById(tenantId, id);
  }

  @Post('runs/:id/optimize')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async optimizeRun(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeliveryRunResponse> {
    return this.routingService.optimizeRun(tenantId, id);
  }

  @Post('runs/:id/dispatch')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async dispatchRun(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: DispatchRunRequest,
  ): Promise<DeliveryRunResponse> {
    DispatchRunSchema.parse(body);
    return this.routingService.dispatchRun(tenantId, id, body);
  }

  @Post('runs/:id/start-transit')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async startTransit(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeliveryRunResponse> {
    return this.routingService.startTransit(tenantId, id);
  }

  // --------------------------------------------------------------------------
  // Stops & Proof of Delivery (POD)
  // --------------------------------------------------------------------------

  @Post('stops/:id/arrive')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async arriveAtStop(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<DeliveryStopResponse> {
    return this.podService.arriveAtStop(tenantId, id);
  }

  @Post('stops/:id/pod')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async submitPod(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: SubmitPodRequest,
  ): Promise<PodResponse> {
    SubmitPodSchema.parse(body);
    return this.podService.submitPod(tenantId, id, body);
  }

  @Post('stops/:id/fail')
  @RequirePermission(StandardPermissions.DELIVERY_MANAGE)
  async failStop(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: FailStopRequest,
  ): Promise<DeliveryStopResponse> {
    FailStopSchema.parse(body);
    return this.podService.failStop(tenantId, id, body);
  }

  @Get('stops/:id/pod')
  @RequirePermission(StandardPermissions.DELIVERY_VIEW)
  async getPodByStopId(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ProofOfDelivery> {
    return this.podService.getPodByStopId(tenantId, id);
  }
}
