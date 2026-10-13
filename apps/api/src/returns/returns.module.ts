import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { RmaService } from './rma.service.js';
import { QualityInspectionService } from './quality-inspection.service.js';
import { DispositionService } from './disposition.service.js';
import { ReturnsController } from './returns.controller.js';

@Module({
  imports: [TenancyModule, RbacModule, WarehouseModule],
  controllers: [ReturnsController],
  providers: [RmaService, QualityInspectionService, DispositionService],
  exports: [RmaService, QualityInspectionService, DispositionService],
})
export class ReturnsModule {}
