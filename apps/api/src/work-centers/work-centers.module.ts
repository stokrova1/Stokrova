import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { BranchesService } from './branches.service.js';
import { BranchesController } from './branches.controller.js';
import { WorkCentersService } from './work-centers.service.js';
import { WorkCentersController } from './work-centers.controller.js';
import { RegistersService } from './registers.service.js';
import { RegistersController } from './registers.controller.js';

@Module({
  imports: [TenancyModule, RbacModule],
  controllers: [BranchesController, WorkCentersController, RegistersController],
  providers: [BranchesService, WorkCentersService, RegistersService],
  exports: [BranchesService, WorkCentersService, RegistersService],
})
export class WorkCentersModule {}
