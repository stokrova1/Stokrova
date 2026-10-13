import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { FleetService } from './fleet.service.js';
import { DeliveryRoutingService } from './delivery-routing.service.js';
import { PodService } from './pod.service.js';
import { DeliveryController } from './delivery.controller.js';

@Module({
  imports: [TenancyModule, RbacModule, WarehouseModule],
  controllers: [DeliveryController],
  providers: [FleetService, DeliveryRoutingService, PodService],
  exports: [FleetService, DeliveryRoutingService, PodService],
})
export class DeliveryModule {}
