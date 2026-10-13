import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ReplenishmentService } from './replenishment.service.js';
import { ReplenishmentController } from './replenishment.controller.js';

@Module({
  imports: [TenancyModule, RbacModule, WarehouseModule],
  controllers: [ReplenishmentController],
  providers: [ReplenishmentService],
  exports: [ReplenishmentService],
})
export class ReplenishmentModule {}
