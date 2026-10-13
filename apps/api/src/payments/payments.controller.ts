import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateInvoiceRequestSchema,
  RecordPaymentRequestSchema,
  ConfirmPaymentRequestSchema,
  PrintReceiptRequestSchema,
  ProcessMultiTenderCheckoutSchema,
} from '@stokrova/validation';
import type {
  InvoiceResponse,
  CreateInvoiceRequest,
  PaymentResponse,
  RecordPaymentRequest,
  ConfirmPaymentRequest,
  ReceiptPrintResponse,
  PrintReceiptRequest,
  RegisterSettlementReport,
  ProcessMultiTenderCheckoutRequest,
  ProcessMultiTenderCheckoutResponse,
  UserIdentity,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller()
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices')
  async createInvoice(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<InvoiceResponse> {
    const parseResult = CreateInvoiceRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid invoice creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.paymentsService.createInvoice(
      tenantId,
      parseResult.data as CreateInvoiceRequest,
    );
  }

  @Get('invoices/:id')
  async getInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponse> {
    const inv = await this.paymentsService.getInvoiceById(tenantId, id);
    return this.paymentsService.toInvoiceResponse(inv);
  }

  @Post('payments')
  @RequirePermission(StandardPermissions.PAYMENTS_COLLECT)
  async recordPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<PaymentResponse> {
    const parseResult = RecordPaymentRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid payment recording payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.paymentsService.recordPayment(
      tenantId,
      user.id,
      parseResult.data as RecordPaymentRequest,
    );
  }

  @Post('payments/:id/confirm')
  @RequirePermission(StandardPermissions.PAYMENTS_COLLECT)
  async confirmPayment(
    @CurrentTenant() tenantId: string,
    @Param('id') paymentId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<PaymentResponse> {
    const parseResult = ConfirmPaymentRequestSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid payment confirmation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.paymentsService.confirmPayment(
      tenantId,
      paymentId,
      user.id,
      parseResult.data as ConfirmPaymentRequest,
    );
  }

  @Get('payments/:id')
  async getPayment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PaymentResponse> {
    return this.paymentsService.getPaymentById(tenantId, id);
  }

  @Post('receipts/print')
  async printReceipt(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<ReceiptPrintResponse> {
    const parseResult = PrintReceiptRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid receipt print payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.paymentsService.printReceipt(
      tenantId,
      user.id,
      parseResult.data as PrintReceiptRequest,
    );
  }

  @Get('receipts/order/:orderId')
  async getReceiptHistory(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
  ): Promise<ReceiptPrintResponse[]> {
    return this.paymentsService.getReceiptHistory(tenantId, orderId);
  }

  @Get('payments/settlement/:sessionId')
  async getRegisterSettlement(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<RegisterSettlementReport> {
    return this.paymentsService.getRegisterSettlement(tenantId, sessionId);
  }

  @Post('payments/checkout/multi-tender')
  async processMultiTenderCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<ProcessMultiTenderCheckoutResponse> {
    const parseResult = ProcessMultiTenderCheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid multi-tender checkout payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.paymentsService.processMultiTenderCheckout(
      tenantId,
      user.id,
      parseResult.data as ProcessMultiTenderCheckoutRequest,
    );
  }

  @Get('payments/checkout/:id')
  async getCheckoutById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ProcessMultiTenderCheckoutResponse> {
    return this.paymentsService.getCheckoutById(tenantId, id);
  }
}
