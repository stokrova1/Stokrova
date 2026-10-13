import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { RbacGuard } from './rbac.guard.js';
import { RbacController } from './rbac.controller.js';

@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacService, RbacGuard],
  exports: [RbacService, RbacGuard],
})
export class RbacModule {}
