import { Module } from '@nestjs/common';
import { B2bCommerceService } from './b2b-commerce.service.js';
import { B2bPunchoutService } from './b2b-punchout.service.js';
import { B2bController } from './b2b.controller.js';

@Module({
  controllers: [B2bController],
  providers: [B2bCommerceService, B2bPunchoutService],
  exports: [B2bCommerceService, B2bPunchoutService],
})
export class B2bModule {}
