import { Injectable } from '@nestjs/common';
import type {
  EnterpriseReportExecutionResult,
  ReportExportResponse,
  ExportReportFormat,
} from '@stokrova/contracts';
import { sanitizeCsvValue } from '@stokrova/domain';

@Injectable()
export class ReportExportService {
  /**
   * Export report execution result into requested format.
   * Enforces strict CSV Formula Injection protection on every cell.
   */
  async exportReport(
    result: EnterpriseReportExecutionResult,
    format: ExportReportFormat = 'CSV',
    customFileName?: string,
  ): Promise<ReportExportResponse> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = customFileName ?? `${result.report_name}_${timestamp}`;

    switch (format) {
      case 'CSV':
        return this.exportToCsv(result, baseName);
      case 'JSON':
        return this.exportToJson(result, baseName);
      default:
        // EXCEL and PDF fallback to CSV format with appropriate headers
        return this.exportToCsv(result, baseName);
    }
  }

  /**
   * Generates sanitized CSV string with formula escape protection.
   */
  private exportToCsv(
    result: EnterpriseReportExecutionResult,
    baseName: string,
  ): ReportExportResponse {
    const dimensions = result.query_definition.dimensions;
    const metrics = result.query_definition.metrics;
    const headers = [...dimensions, ...metrics];

    const lines: string[] = [];

    // Header line
    lines.push(headers.map((h) => this.escapeCsvCell(h)).join(','));

    // Data rows
    for (const row of result.rows) {
      const cellValues: string[] = [];

      // Add dimension values
      for (const d of dimensions) {
        const val = row.dimensions[d] ?? '';
        cellValues.push(this.escapeCsvCell(String(val)));
      }

      // Add metric values
      for (const m of metrics) {
        const val = row.metrics[m] ?? '';
        cellValues.push(this.escapeCsvCell(String(val)));
      }

      lines.push(cellValues.join(','));
    }

    const csvContent = lines.join('\r\n');
    const fileName = `${baseName}.csv`;

    return {
      file_name: fileName,
      format: 'CSV',
      content_type: 'text/csv',
      data: csvContent,
      row_count: result.rows.length,
      byte_size: Buffer.byteLength(csvContent, 'utf-8'),
    };
  }

  private exportToJson(
    result: EnterpriseReportExecutionResult,
    baseName: string,
  ): ReportExportResponse {
    const jsonContent = JSON.stringify(result, null, 2);
    const fileName = `${baseName}.json`;

    return {
      file_name: fileName,
      format: 'JSON',
      content_type: 'application/json',
      data: jsonContent,
      row_count: result.rows.length,
      byte_size: Buffer.byteLength(jsonContent, 'utf-8'),
    };
  }

  /**
   * Protects against CSV injection attacks and escapes quotes.
   */
  private escapeCsvCell(val: string): string {
    const sanitized = sanitizeCsvValue(val);
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }
}
