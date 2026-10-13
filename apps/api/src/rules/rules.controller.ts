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
import { RulesService } from './rules.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateBusinessRuleRequestSchema,
  UpdateBusinessRuleRequestSchema,
  SubmitApprovalRequestSchema,
  DecideApprovalRequestSchema,
  EvaluateRulesRequestSchema,
} from '@stokrova/validation';
import type {
  BusinessRuleResponse,
  CreateBusinessRuleRequest,
  UpdateBusinessRuleRequest,
  ApprovalRequestResponse,
  SubmitApprovalRequest,
  DecideApprovalRequest,
  EvaluateRulesRequest,
  RuleEvaluationResult,
  RuleEventTrigger,
  UserIdentity,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller()
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class RulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly rbacService: RbacService,
  ) {}

  @Post('rules')
  @RequirePermission(StandardPermissions.WORKFLOWS_MANAGE)
  async createRule(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<BusinessRuleResponse> {
    const parseResult = CreateBusinessRuleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid business rule payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rulesService.createRule(
      tenantId,
      parseResult.data as CreateBusinessRuleRequest,
    );
  }

  @Get('rules')
  async getRules(
    @CurrentTenant() tenantId: string,
    @Query('trigger') trigger?: RuleEventTrigger,
  ): Promise<BusinessRuleResponse[]> {
    return this.rulesService.getRules(tenantId, trigger);
  }

  @Get('rules/:id')
  async getRule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<BusinessRuleResponse> {
    return this.rulesService.getRuleById(tenantId, id);
  }

  @Patch('rules/:id')
  @RequirePermission(StandardPermissions.WORKFLOWS_MANAGE)
  async updateRule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BusinessRuleResponse> {
    const parseResult = UpdateBusinessRuleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid rule update payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rulesService.updateRule(
      tenantId,
      id,
      parseResult.data as UpdateBusinessRuleRequest,
    );
  }

  @Post('rules/evaluate')
  async evaluateRules(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<RuleEvaluationResult> {
    const parseResult = EvaluateRulesRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid rule evaluation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rulesService.evaluateRules(
      tenantId,
      parseResult.data as EvaluateRulesRequest,
    );
  }

  @Post('approvals')
  async submitApproval(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<ApprovalRequestResponse> {
    const parseResult = SubmitApprovalRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid approval request payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.rulesService.submitApproval(
      tenantId,
      user.id,
      parseResult.data as SubmitApprovalRequest,
    );
  }

  @Get('approvals/inbox')
  async getInbox(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity,
    @Query('role_id') roleId?: string,
  ): Promise<ApprovalRequestResponse[]> {
    return this.rulesService.getPendingApprovals(tenantId, {
      roleId,
      userId: user.id,
    });
  }

  @Get('approvals/:id')
  async getApproval(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<ApprovalRequestResponse> {
    return this.rulesService.getApprovalById(tenantId, id);
  }

  @Post('approvals/:id/decide')
  @RequirePermission(StandardPermissions.APPROVALS_MANAGE)
  async decideApproval(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<ApprovalRequestResponse> {
    const parseResult = DecideApprovalRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid approval decision payload.',
          details: parseResult.error.format(),
        },
      });
    }

    const assignments = await this.rbacService.getUserActiveAssignments(tenantId, user.id);
    const roleCodes = assignments.map((a) => a.role_code);
    if (user.is_platform_admin) {
      roleCodes.push('BUSINESS_OWNER');
    }

    return this.rulesService.decideApproval(
      tenantId,
      id,
      user.id,
      roleCodes,
      parseResult.data as DecideApprovalRequest,
    );
  }
}
