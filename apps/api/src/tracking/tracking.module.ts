import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { BatchesService } from './batches.service.js';
import { SerialsService } from './serials.service.js';
import { TrackingController } from './tracking.controller.js';

@Module({
  imports: [TenancyModule, RbacModule, CatalogModule, WarehouseModule],
  controllers: [TrackingController],
  providers: [BatchesService, SerialsService],
  exports: [BatchesService, SerialsService],
})
export class TrackingModule {}
