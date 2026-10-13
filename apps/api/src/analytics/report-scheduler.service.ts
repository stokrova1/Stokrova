import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ReportSchedule,
  ReportExecutionLog,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
} from '@stokrova/contracts';
import {
  CreateReportScheduleSchema,
  UpdateReportScheduleSchema,
} from '@stokrova/validation';
import { SavedReportsService } from './saved-reports.service.js';
import { ReportExportService } from './report-export.service.js';

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);
  private readonly schedules = new Map<string, ReportSchedule>();
  private readonly executionLogs: ReportExecutionLog[] = [];

  constructor(
    private readonly savedReportsService: SavedReportsService,
    private readonly reportExportService: ReportExportService,
  ) {}

  /**
   * Create an automated report schedule.
   */
  async createSchedule(
    tenantId: string,
    req: CreateReportScheduleRequest,
  ): Promise<ReportSchedule> {
    const parsed = CreateReportScheduleSchema.parse(req);

    const scheduleId = `sch_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const schedule: ReportSchedule = {
      id: scheduleId,
      tenant_id: tenantId,
      saved_report_id: parsed.saved_report_id,
      name: parsed.name,
      cadence: parsed.cadence,
      cron_expression: parsed.cron_expression ?? undefined,
      delivery_channel: parsed.delivery_channel,
      recipients: parsed.recipients,
      export_format: parsed.export_format,
      is_active: parsed.is_active ?? true,
      next_run_at: nextRun,
      created_at: now,
      updated_at: now,
    };

    this.schedules.set(scheduleId, schedule);
    return schedule;
  }

  /**
   * List schedules for a tenant.
   */
  async listSchedules(tenantId: string): Promise<ReportSchedule[]> {
    return Array.from(this.schedules.values()).filter(
      (s) => s.tenant_id === tenantId,
    );
  }

  /**
   * Get schedule by ID.
   */
  async getSchedule(tenantId: string, scheduleId: string): Promise<ReportSchedule> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.tenant_id !== tenantId) {
      throw new NotFoundException(`Schedule '${scheduleId}' not found.`);
    }
    return schedule;
  }

  /**
   * Update schedule.
   */
  async updateSchedule(
    tenantId: string,
    scheduleId: string,
    req: UpdateReportScheduleRequest,
  ): Promise<ReportSchedule> {
    const schedule = await this.getSchedule(tenantId, scheduleId);
    const parsed = UpdateReportScheduleSchema.parse(req);

    const updated: ReportSchedule = {
      ...schedule,
      name: parsed.name ?? schedule.name,
      cadence: parsed.cadence ?? schedule.cadence,
      cron_expression: parsed.cron_expression !== undefined ? parsed.cron_expression ?? undefined : schedule.cron_expression,
      delivery_channel: parsed.delivery_channel ?? schedule.delivery_channel,
      recipients: parsed.recipients ?? schedule.recipients,
      export_format: parsed.export_format ?? schedule.export_format,
      is_active: parsed.is_active ?? schedule.is_active,
      updated_at: new Date().toISOString(),
    };

    this.schedules.set(scheduleId, updated);
    return updated;
  }

  /**
   * Trigger schedule run immediately, logging execution history.
   */
  async triggerSchedule(
    tenantId: string,
    scheduleId: string,
    triggeredBy = 'SYSTEM',
  ): Promise<ReportExecutionLog> {
    const schedule = await this.getSchedule(tenantId, scheduleId);
    const logId = `log_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const startTime = Date.now();

    try {
      // Execute the underlying report
      const result = await this.savedReportsService.executeSavedReport(
        tenantId,
        schedule.saved_report_id,
        triggeredBy,
        ['ADMIN'], // Execute with elevated permissions for scheduled delivery
      );

      // Export payload
      await this.reportExportService.exportReport(
        result,
        schedule.export_format,
      );

      const duration = Date.now() - startTime;
      const now = new Date().toISOString();

      const log: ReportExecutionLog = {
        id: logId,
        tenant_id: tenantId,
        schedule_id: schedule.id,
        saved_report_id: schedule.saved_report_id,
        triggered_by: triggeredBy,
        status: 'SUCCESS',
        duration_ms: duration,
        row_count: result.row_count,
        export_format: schedule.export_format,
        recipient_count: schedule.recipients.length,
        executed_at: now,
      };

      this.executionLogs.push(log);

      // Update schedule timestamps
      schedule.last_run_at = now;
      schedule.next_run_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      this.logger.log(
        `Report schedule '${schedule.name ?? schedule.schedule_name}' executed successfully: ${result.row_count} rows exported as ${schedule.export_format}`,
      );

      return log;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const now = new Date().toISOString();

      const log: ReportExecutionLog = {
        id: logId,
        tenant_id: tenantId,
        schedule_id: schedule.id,
        saved_report_id: schedule.saved_report_id,
        triggered_by: triggeredBy,
        status: 'FAILED',
        duration_ms: duration,
        row_count: 0,
        export_format: schedule.export_format,
        recipient_count: schedule.recipients.length,
        error_message: err.message ?? 'Unknown execution failure',
        executed_at: now,
      };

      this.executionLogs.push(log);
      this.logger.error(`Report schedule '${schedule.name ?? schedule.schedule_name}' failed: ${err.message}`);
      return log;
    }
  }

  /**
   * Get execution audit logs.
   */
  async getExecutionLogs(tenantId: string, savedReportId?: string): Promise<ReportExecutionLog[]> {
    return this.executionLogs.filter((l) => {
      if (l.tenant_id !== tenantId) return false;
      if (savedReportId && l.saved_report_id !== savedReportId) return false;
      return true;
    });
  }
}
