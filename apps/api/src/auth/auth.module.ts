import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { SupabaseService } from './supabase.service.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';

@Global()
@Module({
  imports: [TenancyModule],
  controllers: [AuthController],
  providers: [AuthGuard, TenantGuard, SupabaseService, AuthService],
  exports: [AuthGuard, TenantGuard, SupabaseService, AuthService],
})
export class AuthModule {}
