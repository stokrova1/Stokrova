import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PosModule } from '../pos/pos.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { InsightsController } from './insights.controller.js';
import { InsightsService } from './insights.service.js';

@Module({
  imports: [RbacModule, OrdersModule, CatalogModule, InventoryModule, PosModule, TenancyModule, DeliveryModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
