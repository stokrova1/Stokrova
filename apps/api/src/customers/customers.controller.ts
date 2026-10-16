import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateCustomerGroupSchema,
  CreateCustomerAddressSchema,
} from '@stokrova/validation';
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateCustomerGroupRequest,
  CreateCustomerAddressRequest,
  CustomerResponse,
  CustomerGroupResponse,
  CustomerAddressResponse,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('customers')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // --------------------------------------------------------------------------
  // Customer Groups
  // --------------------------------------------------------------------------

  @Post('groups')
  @RequirePermission(StandardPermissions.CUSTOMERS_MANAGE)
  async createGroup(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<CustomerGroupResponse> {
    const parseResult = CreateCustomerGroupSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid customer group payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.customersService.createGroup(
      tenantId,
      parseResult.data as CreateCustomerGroupRequest,
    );
  }

  @Get('groups')
  @RequirePermission(StandardPermissions.CUSTOMERS_VIEW)
  async listGroups(
    @CurrentTenant() tenantId: string,
  ): Promise<CustomerGroupResponse[]> {
    return this.customersService.listGroups(tenantId);
  }

  // --------------------------------------------------------------------------
  // Customers
  // --------------------------------------------------------------------------

  @Post()
  @RequirePermission(StandardPermissions.CUSTOMERS_CREATE)
  async createCustomer(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<CustomerResponse> {
    const parseResult = CreateCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid customer payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.customersService.createCustomer(
      tenantId,
      userId || 'usr_anonymous',
      parseResult.data as CreateCustomerRequest,
    );
  }

  @Get()
  @RequirePermission(StandardPermissions.CUSTOMERS_VIEW)
  async listCustomers(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('customer_group_id') customerGroupId?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  ): Promise<CustomerResponse[]> {
    return this.customersService.listCustomers(tenantId, {
      search,
      customer_group_id: customerGroupId,
      status,
    });
  }

  @Get(':id')
  @RequirePermission(StandardPermissions.CUSTOMERS_VIEW)
  async getCustomerById(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
  ): Promise<CustomerResponse> {
    return this.customersService.getCustomerById(tenantId, customerId);
  }

  @Patch(':id')
  @RequirePermission(StandardPermissions.CUSTOMERS_UPDATE)
  async updateCustomer(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
    @Body() body: unknown,
  ): Promise<CustomerResponse> {
    const parseResult = UpdateCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid update customer payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.customersService.updateCustomer(
      tenantId,
      customerId,
      parseResult.data as UpdateCustomerRequest,
    );
  }

  @Post(':id/addresses')
  @RequirePermission(StandardPermissions.CUSTOMERS_UPDATE)
  async addAddress(
    @CurrentTenant() tenantId: string,
    @Param('id') customerId: string,
    @Body() body: unknown,
  ): Promise<CustomerAddressResponse> {
    const parseResult = CreateCustomerAddressSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid address payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.customersService.addAddress(
      tenantId,
      customerId,
      parseResult.data as CreateCustomerAddressRequest,
    );
  }
}
