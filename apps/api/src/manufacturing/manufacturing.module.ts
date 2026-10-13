import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';

import { BomController } from './bom.controller.js';
import { BomService } from './bom.service.js';

import { MfgWorkCentersController } from './mfg-work-centers.controller.js';
import { MfgWorkCentersService } from './mfg-work-centers.service.js';

import { RoutingsController } from './routings.controller.js';
import { RoutingsService } from './routings.service.js';

import { ManufacturingOrdersController } from './manufacturing-orders.controller.js';
import { ManufacturingOrdersService } from './manufacturing-orders.service.js';

@Module({
  imports: [
    CatalogModule,
    TenancyModule,
    RbacModule,
    WarehouseModule,
    InventoryModule,
    TrackingModule,
  ],
  controllers: [
    BomController,
    MfgWorkCentersController,
    RoutingsController,
    ManufacturingOrdersController,
  ],
  providers: [
    BomService,
    MfgWorkCentersService,
    RoutingsService,
    ManufacturingOrdersService,
  ],
  exports: [
    BomService,
    MfgWorkCentersService,
    RoutingsService,
    ManufacturingOrdersService,
  ],
})
export class ManufacturingModule {}
