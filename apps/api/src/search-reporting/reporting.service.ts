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
    tenantId: string,
    dto: RunCustomReportDto,
    customRows?: ReportRow[]
  ): Promise<ReportExecutionResult> {
    const validated = runCustomReportSchema.parse(dto);

    // Default mock data generator if no custom rows provided
    const rows: ReportRow[] = customRows ?? [
      {
        dimensions: {
          [validated.dimensions[0] ?? 'BRANCH']: `${tenantId}-Primary`,
        },
        metrics: {
          [validated.metrics[0] ?? 'TOTAL_REVENUE']: 1500000,
        },
      },
    ];

    return {
      report_name: validated.name,
      generated_at: new Date().toISOString(),
      row_count: rows.length,
      rows,
    };
  }
}
