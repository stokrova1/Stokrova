import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { TenantGuard } from './tenant.guard.js';

@Global()
@Module({
  providers: [AuthGuard, TenantGuard],
  exports: [AuthGuard, TenantGuard],
})
export class AuthModule {}
