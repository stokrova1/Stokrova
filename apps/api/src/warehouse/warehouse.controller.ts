import {
  Optional,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';
import { ZonesService } from './zones.service.js';
import { PutawayRulesService } from './putaway-rules.service.js';
import { PutawayService } from './putaway.service.js';
import { PickingService } from './picking.service.js';
import { WavesService } from './waves.service.js';
import { PackingStationService } from './packing-station.service.js';
import { ContainerizationService } from './containerization.service.js';
import { ShippingManifestService } from './shipping-manifest.service.js';
import { BarcodeLogisticsService } from './barcode-logistics.service.js';
import { BinTransfersService } from './bin-transfers.service.js';
import { CrossDockService } from './cross-dock.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import {
  CreateWarehouseSchema,
  UpdateWarehouseSchema,
  CreateStorageLocationSchema,
  UpdateStorageLocationSchema,
  CreateStorageZoneSchema,
  UpdateStorageZoneSchema,
  CreatePutAwayRuleSchema,
  UpdatePutAwayRuleSchema,
  CalculatePutAwaySchema,
  CreatePickListSchema,
  CreatePickWaveSchema,
  ConfirmPickLineSchema,
  ShortPickSchema,
  CreatePackingStationSchema,
  UpdatePackingStationSchema,
  CreatePackagingBoxSchema,
  CartonizationRecommendationSchema,
  OpenPackedContainerSchema,
  PackItemIntoContainerSchema,
  SealContainerSchema,
  CreateShippingManifestSchema,
  AddContainersToManifestSchema,
  DispatchManifestSchema,
  ParseBarcodeSchema,
  CreateInternalTransferSchema,
  EvaluateCrossDockOpportunitiesSchema,
  ExecuteCrossDockBypassSchema,
} from '@stokrova/validation';
import type {
  WarehouseResponse,
  ListWarehousesResponse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  StorageLocationResponse,
  ListStorageLocationsResponse,
  StorageLocationTreeResponse,
  CreateStorageLocationRequest,
  UpdateStorageLocationRequest,
  StorageZoneResponse,
  ListStorageZonesResponse,
  CreateStorageZoneRequest,
  UpdateStorageZoneRequest,
  PutAwayRuleResponse,
  ListPutAwayRulesResponse,
  CreatePutAwayRuleRequest,
  UpdatePutAwayRuleRequest,
  CalculatePutAwayRequest,
  CalculatePutAwayResponse,
  PickListResponse,
  ListPickListsResponse,
  CreatePickListRequest,
  ConfirmPickLineRequest,
  ShortPickRequest,
  PickWaveResponse,
  ListPickWavesResponse,
  CreatePickWaveRequest,
  CreatePickListLineRequest,
  OptimizeRoutingResponse,
  PackingStationResponse,
  ListPackingStationsResponse,
  CreatePackingStationRequest,
  UpdatePackingStationRequest,
  PackagingBoxResponse,
  ListPackagingBoxesResponse,
  CreatePackagingBoxRequest,
  CartonizationRecommendationResponse,
  CartonizationRecommendationRequest,
  PackedContainerResponse,
  ListPackedContainersResponse,
  OpenPackedContainerRequest,
  PackItemIntoContainerRequest,
  SealContainerRequest,
  ShippingManifestResponse,
  ListShippingManifestsResponse,
  CreateShippingManifestRequest,
  AddContainersToManifestRequest,
  DispatchManifestRequest,
  ParseBarcodeResponse,
  ParseBarcodeRequest,
  InternalTransferResponse,
  ListInternalTransfersResponse,
  CreateInternalTransferRequest,
  CrossDockOpportunityResponse,
  ListCrossDockOpportunitiesResponse,
  EvaluateCrossDockOpportunitiesRequest,
  ExecuteCrossDockBypassRequest,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

import { PlanEntitlementsService } from '../billing/plan-entitlements.service.js';

@Controller('warehouses')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class WarehouseController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly zonesService: ZonesService,
    private readonly rulesService: PutawayRulesService,
    private readonly putawayService: PutawayService,
    private readonly pickingService: PickingService,
    private readonly wavesService: WavesService,
    private readonly packingStationService: PackingStationService,
    private readonly containerizationService: ContainerizationService,
    private readonly shippingManifestService: ShippingManifestService,
    private readonly barcodeService: BarcodeLogisticsService,
    private readonly transfersService: BinTransfersService,
    private readonly crossDockService: CrossDockService,
    @Optional() private readonly plans?: PlanEntitlementsService,
  ) {
    this.plans?.registerCounter('max_warehouses', async (t) => (await this.warehousesService.getWarehouses(t)).length);
  }

  // --------------------------------------------------------------------------
  // Storage Locations (Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('locations')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createLocation(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<StorageLocationResponse> {
    const parseResult = CreateStorageLocationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid storage location creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const location = await this.locationsService.createLocation(
      tenantId,
      parseResult.data as CreateStorageLocationRequest,
    );
    return { location };
  }

  @Get('locations/tree')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getLocationTree(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<StorageLocationTreeResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }

    const locations = await this.locationsService.getLocationTree(
      tenantId,
      warehouseId,
    );
    return { locations };
  }

  @Get('locations')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getLocations(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
    @Query('parent_id') parentId?: string,
  ): Promise<ListStorageLocationsResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }

    const locations = await this.locationsService.getLocations(
      tenantId,
      warehouseId,
      parentId,
    );
    return { locations };
  }

  @Get('locations/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getLocationById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<StorageLocationResponse> {
    const location = await this.locationsService.getLocationById(tenantId, id);
    return { location };
  }

  @Patch('locations/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async updateLocation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<StorageLocationResponse> {
    const parseResult = UpdateStorageLocationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid storage location update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const location = await this.locationsService.updateLocation(
      tenantId,
      id,
      parseResult.data as UpdateStorageLocationRequest,
    );
    return { location };
  }

  // --------------------------------------------------------------------------
  // Storage Zones (Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('zones')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createZone(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<StorageZoneResponse> {
    const parseResult = CreateStorageZoneSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid storage zone creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const zone = await this.zonesService.createZone(
      tenantId,
      parseResult.data as CreateStorageZoneRequest,
    );
    return { zone };
  }

  @Get('zones')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getZones(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
  ): Promise<ListStorageZonesResponse> {
    const zones = await this.zonesService.getZones(tenantId, warehouseId);
    return { zones };
  }

  @Get('zones/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getZoneById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<StorageZoneResponse> {
    const zone = await this.zonesService.getZoneById(tenantId, id);
    return { zone };
  }

  @Patch('zones/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async updateZone(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<StorageZoneResponse> {
    const parseResult = UpdateStorageZoneSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid storage zone update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const zone = await this.zonesService.updateZone(
      tenantId,
      id,
      parseResult.data as UpdateStorageZoneRequest,
    );
    return { zone };
  }

  @Delete('zones/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async deleteZone(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.zonesService.deleteZone(tenantId, id);
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Put-Away Rules (Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('rules')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createPutAwayRule(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PutAwayRuleResponse> {
    const parseResult = CreatePutAwayRuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid put-away rule creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const rule = await this.rulesService.createRule(
      tenantId,
      parseResult.data as CreatePutAwayRuleRequest,
    );
    return { rule };
  }

  @Get('rules')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPutAwayRules(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
  ): Promise<ListPutAwayRulesResponse> {
    const rules = await this.rulesService.getRules(tenantId, warehouseId);
    return { rules };
  }

  @Get('rules/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPutAwayRuleById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PutAwayRuleResponse> {
    const rule = await this.rulesService.getRuleById(tenantId, id);
    return { rule };
  }

  @Patch('rules/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async updatePutAwayRule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PutAwayRuleResponse> {
    const parseResult = UpdatePutAwayRuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid put-away rule update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const rule = await this.rulesService.updateRule(
      tenantId,
      id,
      parseResult.data as UpdatePutAwayRuleRequest,
    );
    return { rule };
  }

  @Delete('rules/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async deletePutAwayRule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.rulesService.deleteRule(tenantId, id);
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Directed Put-Away Calculation
  // --------------------------------------------------------------------------

  @Post('putaway/calculate')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async calculatePutAway(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CalculatePutAwayResponse> {
    const parseResult = CalculatePutAwaySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid put-away calculation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const result = await this.putawayService.calculatePutAway(
      tenantId,
      parseResult.data as CalculatePutAwayRequest,
    );
    return result;
  }

  // --------------------------------------------------------------------------
  // Pick Lists (Phase 6B - Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('pick-lists')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createPickList(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PickListResponse> {
    const parseResult = CreatePickListSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid pick list creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const pickList = await this.pickingService.createPickList(
      tenantId,
      parseResult.data as CreatePickListRequest,
    );
    return { pick_list: pickList };
  }

  @Get('pick-lists')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPickLists(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('wave_id') waveId?: string,
  ): Promise<ListPickListsResponse> {
    const pickLists = await this.pickingService.getPickLists(
      tenantId,
      warehouseId,
      waveId,
    );
    return { pick_lists: pickLists };
  }

  @Get('pick-lists/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPickListById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PickListResponse> {
    const pickList = await this.pickingService.getPickListById(tenantId, id);
    return { pick_list: pickList };
  }

  @Post('pick-lists/:id/lines/:lineId/confirm')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async confirmPickLine(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
  ): Promise<PickListResponse> {
    const parseResult = ConfirmPickLineSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid pick confirmation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const pickList = await this.pickingService.confirmPickLine(
      tenantId,
      id,
      lineId,
      parseResult.data as ConfirmPickLineRequest,
    );
    return { pick_list: pickList };
  }

  @Post('pick-lists/:id/lines/:lineId/short')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async shortPickLine(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
  ): Promise<PickListResponse> {
    const parseResult = ShortPickSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid short pick payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const pickList = await this.pickingService.shortPickLine(
      tenantId,
      id,
      lineId,
      parseResult.data as ShortPickRequest,
    );
    return { pick_list: pickList };
  }

  @Post('pick-lists/:id/cancel')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async cancelPickList(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PickListResponse> {
    const pickList = await this.pickingService.cancelPickList(tenantId, id);
    return { pick_list: pickList };
  }

  @Post('pick-lists/:id/optimize-routing')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async optimizePickRouting(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<OptimizeRoutingResponse> {
    const pickList = await this.pickingService.optimizeRouting(tenantId, id);
    return {
      pick_list_id: pickList.id,
      ordered_lines: pickList.lines,
    };
  }

  // --------------------------------------------------------------------------
  // Waves (Phase 6B - Declared before :id to prevent route shadowing)
  // --------------------------------------------------------------------------

  @Post('waves')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createWave(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PickWaveResponse> {
    const parseResult = CreatePickWaveSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid pick wave creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const wave = await this.wavesService.createWave(
      tenantId,
      parseResult.data as CreatePickWaveRequest,
    );
    return { wave };
  }

  @Get('waves')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getWaves(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId?: string,
  ): Promise<ListPickWavesResponse> {
    const waves = await this.wavesService.getWaves(tenantId, warehouseId);
    return { waves };
  }

  @Get('waves/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getWaveById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PickWaveResponse> {
    const wave = await this.wavesService.getWaveById(tenantId, id);
    return { wave };
  }

  @Post('waves/:id/release')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async releaseWave(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { lines: CreatePickListLineRequest[] },
  ): Promise<PickWaveResponse> {
    if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
      throw new BadRequestException('Request body must contain non-empty lines array.');
    }

    const res = await this.wavesService.releaseWave(
      tenantId,
      id,
      body.lines,
    );
    return {
      wave: res.wave,
      pick_lists: res.pick_lists,
    };
  }

  // --------------------------------------------------------------------------
  // Packing Stations (Phase 6C - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('packing-stations')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createPackingStation(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PackingStationResponse> {
    const parseResult = CreatePackingStationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid packing station creation payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.packingStationService.createStation(
      tenantId,
      parseResult.data as CreatePackingStationRequest,
    );
  }

  @Get('packing-stations')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listPackingStations(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListPackingStationsResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.packingStationService.listStations(tenantId, warehouseId);
  }

  @Get('packing-stations/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPackingStationById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PackingStationResponse> {
    return this.packingStationService.getStationById(tenantId, id);
  }

  @Patch('packing-stations/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async updatePackingStation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PackingStationResponse> {
    const parseResult = UpdatePackingStationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid packing station update payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.packingStationService.updateStation(
      tenantId,
      id,
      parseResult.data as UpdatePackingStationRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Packaging Boxes (Phase 6C - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('boxes')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createPackagingBox(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PackagingBoxResponse> {
    const parseResult = CreatePackagingBoxSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid packaging box payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.packingStationService.createPackagingBox(
      tenantId,
      parseResult.data as CreatePackagingBoxRequest,
    );
  }

  @Get('boxes')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listPackagingBoxes(
    @CurrentTenant() tenantId: string,
  ): Promise<ListPackagingBoxesResponse> {
    return this.packingStationService.listPackagingBoxes(tenantId);
  }

  @Get('boxes/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getPackagingBoxById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PackagingBoxResponse> {
    return this.packingStationService.getPackagingBoxById(tenantId, id);
  }

  // --------------------------------------------------------------------------
  // Cartonization (Phase 6C - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('cartonization/recommend')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async recommendCartonization(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CartonizationRecommendationResponse> {
    const parseResult = CartonizationRecommendationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid cartonization request payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.containerizationService.recommendCartonization(
      tenantId,
      parseResult.data as CartonizationRecommendationRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Packed Containers (Phase 6C - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('containers')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async openContainer(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<PackedContainerResponse> {
    const parseResult = OpenPackedContainerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid container creation payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.containerizationService.openContainer(
      tenantId,
      parseResult.data as OpenPackedContainerRequest,
    );
  }

  @Get('containers')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listContainers(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListPackedContainersResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.containerizationService.listContainers(tenantId, warehouseId);
  }

  @Get('containers/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getContainerById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PackedContainerResponse> {
    return this.containerizationService.getContainerById(tenantId, id);
  }

  @Post('containers/:id/pack')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async packItemIntoContainer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PackedContainerResponse> {
    const parseResult = PackItemIntoContainerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid pack item payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.containerizationService.packItem(
      tenantId,
      id,
      parseResult.data as PackItemIntoContainerRequest,
    );
  }

  @Post('containers/:id/seal')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async sealContainer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PackedContainerResponse> {
    const parseResult = SealContainerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid seal container payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.containerizationService.sealContainer(
      tenantId,
      id,
      parseResult.data as SealContainerRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Shipping Manifests (Phase 6C - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('manifests')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createManifest(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ShippingManifestResponse> {
    const parseResult = CreateShippingManifestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid shipping manifest creation payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.shippingManifestService.createManifest(
      tenantId,
      parseResult.data as CreateShippingManifestRequest,
    );
  }

  @Get('manifests')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listManifests(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListShippingManifestsResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.shippingManifestService.listManifests(tenantId, warehouseId);
  }

  @Get('manifests/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getManifestById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ShippingManifestResponse> {
    return this.shippingManifestService.getManifestById(tenantId, id);
  }

  @Post('manifests/:id/containers')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async addContainersToManifest(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ShippingManifestResponse> {
    const parseResult = AddContainersToManifestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid add containers to manifest payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.shippingManifestService.addContainersToManifest(
      tenantId,
      id,
      parseResult.data as AddContainersToManifestRequest,
    );
  }

  @Post('manifests/:id/seal')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async sealManifest(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ShippingManifestResponse> {
    return this.shippingManifestService.sealManifest(tenantId, id);
  }

  @Post('manifests/:id/dispatch')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async dispatchManifest(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ShippingManifestResponse> {
    const parseResult = DispatchManifestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid dispatch manifest payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.shippingManifestService.dispatchManifest(
      tenantId,
      id,
      parseResult.data as DispatchManifestRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Barcode Logistics (Phase 6D - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('barcode/parse')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async parseBarcode(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ParseBarcodeResponse> {
    const parseResult = ParseBarcodeSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid barcode payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.barcodeService.parseBarcode(
      tenantId,
      parseResult.data as ParseBarcodeRequest,
    );
  }

  // --------------------------------------------------------------------------
  // Internal Bin Transfers (Phase 6D - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('transfers')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createTransfer(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<InternalTransferResponse> {
    const parseResult = CreateInternalTransferSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid internal transfer creation payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.transfersService.createTransfer(
      tenantId,
      parseResult.data as CreateInternalTransferRequest,
    );
  }

  @Get('transfers')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listTransfers(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListInternalTransfersResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.transfersService.listTransfers(tenantId, warehouseId);
  }

  @Get('transfers/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getTransferById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InternalTransferResponse> {
    return this.transfersService.getTransferById(tenantId, id);
  }

  @Post('transfers/:id/start')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async startTransfer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InternalTransferResponse> {
    return this.transfersService.startTransfer(tenantId, id);
  }

  @Post('transfers/:id/complete')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async completeTransfer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InternalTransferResponse> {
    return this.transfersService.completeTransfer(tenantId, id);
  }

  @Post('transfers/:id/cancel')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async cancelTransfer(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InternalTransferResponse> {
    return this.transfersService.cancelTransfer(tenantId, id);
  }

  // --------------------------------------------------------------------------
  // Cross-Docking Operations (Phase 6D - Declared before :id)
  // --------------------------------------------------------------------------

  @Post('cross-dock/evaluate')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async evaluateCrossDock(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<ListCrossDockOpportunitiesResponse> {
    const parseResult = EvaluateCrossDockOpportunitiesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid cross-dock evaluation payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.crossDockService.evaluateOpportunities(
      tenantId,
      parseResult.data as EvaluateCrossDockOpportunitiesRequest,
    );
  }

  @Post('cross-dock/execute')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async executeCrossDockBypass(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CrossDockOpportunityResponse> {
    const parseResult = ExecuteCrossDockBypassSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid cross-dock execute bypass payload.',
          details: parseResult.error.format(),
        },
      });
    }
    return this.crossDockService.executeBypass(
      tenantId,
      parseResult.data as ExecuteCrossDockBypassRequest,
    );
  }

  @Get('cross-dock')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async listCrossDockOpportunities(
    @CurrentTenant() tenantId: string,
    @Query('warehouse_id') warehouseId: string,
  ): Promise<ListCrossDockOpportunitiesResponse> {
    if (!warehouseId) {
      throw new BadRequestException('warehouse_id query parameter is required.');
    }
    return this.crossDockService.listOpportunities(tenantId, warehouseId);
  }

  @Get('cross-dock/:id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getCrossDockOpportunityById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<CrossDockOpportunityResponse> {
    return this.crossDockService.getOpportunityById(tenantId, id);
  }

  // --------------------------------------------------------------------------
  // Warehouses
  // --------------------------------------------------------------------------

  @Post()
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async createWarehouse(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<WarehouseResponse> {
    const parseResult = CreateWarehouseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid warehouse creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    await this.plans?.assertCanAdd(tenantId, 'max_warehouses');
    const warehouse = await this.warehousesService.createWarehouse(
      tenantId,
      parseResult.data as CreateWarehouseRequest,
    );
    return { warehouse };
  }

  @Get()
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getWarehouses(
    @CurrentTenant() tenantId: string,
    @Query('branch_id') branchId?: string,
  ): Promise<ListWarehousesResponse> {
    const warehouses = await this.warehousesService.getWarehouses(
      tenantId,
      branchId,
    );
    return { warehouses };
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.WAREHOUSES_VIEW)
  async getWarehouseById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<WarehouseResponse> {
    const warehouse = await this.warehousesService.getWarehouseById(
      tenantId,
      id,
    );
    return { warehouse };
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.WAREHOUSES_MANAGE)
  async updateWarehouse(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<WarehouseResponse> {
    const parseResult = UpdateWarehouseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid warehouse update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const warehouse = await this.warehousesService.updateWarehouse(
      tenantId,
      id,
      parseResult.data as UpdateWarehouseRequest,
    );
    return { warehouse };
  }
}
