import { Module } from '@nestjs/common';
import { InvoicingController } from './invoicing.controller.js';
import { InvoicingService } from './invoicing.service.js';
import { OrdersModule } from '../orders/orders.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OutboxModule } from '../infrastructure/outbox/outbox.module.js';

@Module({
  imports: [OrdersModule, CustomersModule, AuditModule, OutboxModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
