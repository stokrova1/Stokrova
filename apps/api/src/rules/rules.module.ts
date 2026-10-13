import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { RulesService } from './rules.service.js';
import { RulesController } from './rules.controller.js';

@Module({
  imports: [TenancyModule, RbacModule],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
