import { Injectable } from '@nestjs/common';
import type {
  ReportExecutionResult,
  ReportRow,
} from '@stokrova/contracts';
import {
  runCustomReportSchema,
  type RunCustomReportDto,
} from '@stokrova/validation';

@Injectable()
export class ReportingService {
  /**
   * Run custom parameter-driven business report.
   */
  async runReport(
    _tenantId: string,
    dto: RunCustomReportDto,
    customRows?: ReportRow[]
  ): Promise<ReportExecutionResult> {
    const validated = runCustomReportSchema.parse(dto);

    // Zero-placeholder: Default to empty array when no custom rows or database aggregation provided
    const rows: ReportRow[] = customRows ?? [];

    return {
      report_name: validated.name,
      generated_at: new Date().toISOString(),
      row_count: rows.length,
      rows,
    };
  }
}
