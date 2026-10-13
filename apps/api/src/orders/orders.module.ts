import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WorkCentersModule } from '../work-centers/work-centers.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [
    TenancyModule,
    RbacModule,
    WorkCentersModule,
    WarehouseModule,
    CatalogModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
