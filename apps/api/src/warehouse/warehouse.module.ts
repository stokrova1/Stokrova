import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
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
import { WarehouseController } from './warehouse.controller.js';

@Module({
  imports: [TenancyModule, RbacModule],
  controllers: [WarehouseController],
  providers: [
    WarehousesService,
    LocationsService,
    ZonesService,
    PutawayRulesService,
    PutawayService,
    PickingService,
    WavesService,
    PackingStationService,
    ContainerizationService,
    ShippingManifestService,
    BarcodeLogisticsService,
    BinTransfersService,
    CrossDockService,
  ],
  exports: [
    WarehousesService,
    LocationsService,
    ZonesService,
    PutawayRulesService,
    PutawayService,
    PickingService,
    WavesService,
    PackingStationService,
    ContainerizationService,
    ShippingManifestService,
    BarcodeLogisticsService,
    BinTransfersService,
    CrossDockService,
  ],
})
export class WarehouseModule {}
