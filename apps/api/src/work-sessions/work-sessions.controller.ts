import { Body, Controller, Get, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { TenantGuard } from '../auth/tenant.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import {
  WorkSessionsService,
  type StartSessionDto,
  type EndSessionDto,
  type SyncSessionDto,
} from './work-sessions.service.js';

const requireUser = (me?: UserIdentity): string => {
  if (!me?.id) throw new BadRequestException('Signed-in worker is required.');
  return me.id;
};

@Controller('work-sessions')
@UseGuards(AuthGuard, TenantGuard)
export class WorkSessionsController {
  constructor(private readonly sessions: WorkSessionsService) {}

  @Post('start')
  start(
    @CurrentTenant() tenantId: string,
    @CurrentUser() me: UserIdentity | undefined,
    @Body() body: StartSessionDto,
  ) {
    const userId = requireUser(me);
    return this.sessions.start(tenantId, userId, body || {});
  }

  @Post('end')
  end(
    @CurrentTenant() tenantId: string,
    @CurrentUser() me: UserIdentity | undefined,
    @Body() body: EndSessionDto,
  ) {
    const userId = requireUser(me);
    return this.sessions.end(tenantId, userId, body || {});
  }

  @Get('current')
  getCurrent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() me: UserIdentity | undefined,
  ) {
    const userId = requireUser(me);
    return this.sessions.getCurrent(tenantId, userId);
  }

  @Get('history')
  getHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() me: UserIdentity | undefined,
    @Query('date') date?: string,
    @Query('all') all?: string,
  ) {
    const userId = requireUser(me);
    // If all === 'true', owner/manager can view all staff sessions; otherwise worker views their own
    const filterUser = all === 'true' ? undefined : userId;
    return this.sessions.listHistory(tenantId, filterUser, date);
  }

  @Get(':id')
  getById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.sessions.getById(tenantId, id);
  }

  @Get(':id/events')
  getEvents(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.sessions.getSessionEvents(tenantId, id);
  }

  @Post('sync')
  syncOffline(
    @CurrentTenant() tenantId: string,
    @CurrentUser() me: UserIdentity | undefined,
    @Body() body: SyncSessionDto,
  ) {
    const userId = requireUser(me);
    return this.sessions.syncOffline(tenantId, userId, body);
  }
}
