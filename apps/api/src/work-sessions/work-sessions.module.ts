import { Module } from '@nestjs/common';
import { WorkSessionsController } from './work-sessions.controller.js';
import { WorkSessionsService } from './work-sessions.service.js';

@Module({
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService],
  exports: [WorkSessionsService],
})
export class WorkSessionsModule {}
