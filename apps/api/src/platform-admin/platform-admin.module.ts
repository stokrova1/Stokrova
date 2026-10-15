import { Module } from '@nestjs/common';
import { PlatformAdminController } from './platform-admin.controller.js';
import { PlatformAdminService } from './platform-admin.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
