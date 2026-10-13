import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateWorkflowRequestSchema,
  CreateWorkflowVersionRequestSchema,
  SpawnWorkflowExecutionRequestSchema,
  ClaimTaskRequestSchema,
  CompleteTaskRequestSchema,
  ReleaseTaskRequestSchema,
} from '@stokrova/validation';
import type {
  WorkflowResponse,
  CreateWorkflowRequest,
  WorkflowVersionResponse,
  CreateWorkflowVersionRequest,
  WorkflowTaskResponse,
  SpawnWorkflowExecutionRequest,
  ClaimTaskRequest,
  CompleteTaskRequest,
  ReleaseTaskRequest,
  UserIdentity,
  TaskStatus,
  TaskPriority,
} from '@stokrova/contracts';
import { StandardPermissions } from '@stokrova/domain';

@Controller('workflows')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @RequirePermission(StandardPermissions.WORKFLOWS_MANAGE)
  async createWorkflow(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<WorkflowResponse> {
    const parseResult = CreateWorkflowRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid workflow creation payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.createWorkflow(
      tenantId,
      parseResult.data as CreateWorkflowRequest,
    );
  }

  @Get()
  async getWorkflows(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: WorkflowResponse['category'],
  ): Promise<WorkflowResponse[]> {
    return this.workflowsService.getWorkflows(tenantId, category);
  }

  @Get(':id')
  async getWorkflow(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<WorkflowResponse> {
    return this.workflowsService.getWorkflowById(tenantId, id);
  }

  @Post(':id/versions')
  @RequirePermission(StandardPermissions.WORKFLOWS_MANAGE)
  async createVersion(
    @CurrentTenant() tenantId: string,
    @Param('id') workflowId: string,
    @Body() body: unknown,
  ): Promise<WorkflowVersionResponse> {
    const parseResult = CreateWorkflowVersionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid workflow version payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.createVersion(
      tenantId,
      workflowId,
      parseResult.data as CreateWorkflowVersionRequest,
    );
  }

  @Post('versions/:versionId/publish')
  @RequirePermission(StandardPermissions.WORKFLOWS_MANAGE)
  async publishVersion(
    @CurrentTenant() tenantId: string,
    @Param('versionId') versionId: string,
  ): Promise<WorkflowVersionResponse> {
    return this.workflowsService.publishVersion(tenantId, versionId);
  }

  @Post('executions')
  async spawnExecution(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown,
  ): Promise<WorkflowTaskResponse> {
    const parseResult = SpawnWorkflowExecutionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid workflow execution spawn payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.spawnWorkflow(
      tenantId,
      parseResult.data as SpawnWorkflowExecutionRequest,
    );
  }

  @Get('tasks/queue')
  async getQueue(
    @CurrentTenant() tenantId: string,
    @Query('role_id') roleId?: string,
    @Query('work_center_id') workCenterId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
  ): Promise<WorkflowTaskResponse[]> {
    return this.workflowsService.getQueueTasks(tenantId, {
      roleId,
      workCenterId,
      status,
      priority,
    });
  }

  @Get('tasks/:taskId')
  async getTask(
    @CurrentTenant() tenantId: string,
    @Param('taskId') taskId: string,
  ): Promise<WorkflowTaskResponse> {
    return this.workflowsService.getTaskById(tenantId, taskId);
  }

  @Post('tasks/:taskId/claim')
  async claimTask(
    @CurrentTenant() tenantId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<WorkflowTaskResponse> {
    const parseResult = ClaimTaskRequestSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid task claim payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.claimTask(
      tenantId,
      taskId,
      user.id,
      parseResult.data as ClaimTaskRequest,
    );
  }

  @Post('tasks/:taskId/release')
  async releaseTask(
    @CurrentTenant() tenantId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<WorkflowTaskResponse> {
    const parseResult = ReleaseTaskRequestSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid task release payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.releaseTask(
      tenantId,
      taskId,
      user.id,
      parseResult.data as ReleaseTaskRequest,
    );
  }

  @Post('tasks/:taskId/complete')
  async completeTask(
    @CurrentTenant() tenantId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<{ completed_task: WorkflowTaskResponse; spawned_tasks: WorkflowTaskResponse[] }> {
    const parseResult = CompleteTaskRequestSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid task completion payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.workflowsService.completeTask(
      tenantId,
      taskId,
      user.id,
      parseResult.data as CompleteTaskRequest,
    );
  }
}
