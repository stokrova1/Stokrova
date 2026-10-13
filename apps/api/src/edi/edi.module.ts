import { Module } from '@nestjs/common';
import { EdiService } from './edi.service.js';
import { EdiController } from './edi.controller.js';

@Module({
  controllers: [EdiController],
  providers: [EdiService],
  exports: [EdiService],
})
export class EdiModule {}
