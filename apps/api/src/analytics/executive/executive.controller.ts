import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { StandardPermissions } from '@stokrova/domain';
import type { UserIdentity } from '@stokrova/contracts';
import { AuthGuard } from '../../auth/auth.guard.js';
import { TenantGuard } from '../../auth/tenant.guard.js';
import { RbacGuard } from '../../rbac/rbac.guard.js';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator.js';
import { CurrentTenant } from '../../auth/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { ExecutiveSalesService } from './executive-sales.service.js';
import type { PipelineKind } from './executive-sales.repository.js';

const PIPELINE_KINDS: PipelineKind[] = ['orders', 'invoices', 'payments', 'refunds'];
const TIMEZONE = /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/;

/**
 * Executive sales: snapshot (daily/weekly totals, margins, comparisons), spreadsheet import,
 * sales pipeline lists and an AI analyst that reads the same server-calculated snapshot.
 * Identity and tenant access are verified by the existing Auth/Tenant/RBAC guards.
 */
@Controller('analytics/executive')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ExecutiveController {
  constructor(private readonly sales: ExecutiveSalesService) {}

  @Get('snapshot')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  snapshot(@CurrentTenant() tenantId: string, @Query('tz') tz?: string) {
    const zone = tz && TIMEZONE.test(tz) ? tz : 'Africa/Lagos';
    return this.sales.getSnapshot(tenantId, zone);
  }

  @Post('import')
  @RequirePermission(StandardPermissions.ANALYTICS_RUN)
  import(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserIdentity | undefined,
    @Body() body: { rows?: Record<string, string>[]; currency?: string; csv?: string },
  ) {
    if (!user) throw new BadRequestException('Sign in to import sales.');
    if (body.csv && body.csv.length > 5_000_000) throw new BadRequestException('File is too large (5 MB max).');
    return this.sales.importRows(tenantId, user.id, body.rows ?? [], (body.currency ?? 'NGN').toUpperCase(), body.csv);
  }

  @Get('pipeline')
  @RequirePermission(StandardPermissions.SALES_ORDER_VIEW)
  pipeline(@CurrentTenant() tenantId: string, @Query('kind') kind: string, @Query('limit') limit?: string) {
    if (!PIPELINE_KINDS.includes(kind as PipelineKind)) throw new BadRequestException('Unknown pipeline kind.');
    return this.sales.listPipeline(tenantId, kind as PipelineKind, Number(limit ?? 50) || 50);
  }

  /** Streams an AI explanation (Server-Sent Events) grounded in the tenant's own snapshot. */
  @Post('ask')
  @RequirePermission(StandardPermissions.ANALYTICS_VIEW)
  async ask(
    @CurrentTenant() tenantId: string,
    @Body() body: { question?: string; tz?: string },
    @Res() res: any,
  ) {
    const question = (body.question ?? '').trim();
    if (!question || question.length > 1200) throw new BadRequestException('Ask a question of up to 1200 characters.');
    const url = process.env['AI_GATEWAY_URL'];
    const key = process.env['AI_GATEWAY_API_KEY'];
    const model = process.env['AI_MODEL'] ?? 'google/gemini-3-flash-preview';
    if (!url || !key) throw new ServiceUnavailableException('AI analyst is not configured (AI_GATEWAY_URL, AI_GATEWAY_API_KEY).');

    const zone = body.tz && TIMEZONE.test(body.tz) ? body.tz : 'Africa/Lagos';
    const snapshot = await this.sales.getSnapshot(tenantId, zone);
    if (snapshot.week.transactions === 0 && snapshot.previousWeek.transactions === 0) {
      throw new BadRequestException('No sales recorded in the last two weeks yet. Import sales first.');
    }

    const upstream = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are an executive sales analyst. Use only the JSON snapshot provided. Amounts are integer minor units: divide by 100. ' +
              'Null means unavailable — never estimate it. Separate observed facts from possible drivers, and label drivers as hypotheses. Be concise.',
          },
          { role: 'user', content: `Snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${question}` },
        ],
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      res.status(upstream.status === 429 || upstream.status === 402 ? upstream.status : 502).json({
        message: upstream.status === 429 ? 'Too many requests, try again shortly.' : 'AI analyst is unavailable.',
        detail: detail.slice(0, 500),
      });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  }
}
