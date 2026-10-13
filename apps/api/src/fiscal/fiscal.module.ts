import { Module } from '@nestjs/common';
import { FiscalComplianceService } from './fiscal-compliance.service.js';
import { FiscalController } from './fiscal.controller.js';

@Module({
  controllers: [FiscalController],
  providers: [FiscalComplianceService],
  exports: [FiscalComplianceService],
})
export class FiscalModule {}
