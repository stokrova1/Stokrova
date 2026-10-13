import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DataExportJob } from '@stokrova/contracts';
import {
  generateCsvExportString,
  generateJsonlExportString,
} from '@stokrova/domain';
import {
  createDataExportSchema,
  type CreateDataExportDto,
} from '@stokrova/validation';

export interface StoredExportFile {
  job: DataExportJob;
  content: string;
}

@Injectable()
export class DataExportService {
  private readonly exportsByToken = new Map<string, StoredExportFile>();
  private readonly jobsByTenant = new Map<string, DataExportJob[]>();

  /**
   * Create and immediately serialize a streaming data export job.
   */
  async createExportJob(
    tenantId: string,
    dto: CreateDataExportDto,
    rowsToExport: Record<string, unknown>[] = []
  ): Promise<DataExportJob> {
    const validated = createDataExportSchema.parse(dto);

    const jobId = randomUUID();
    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours TTL

    let content = '';
    if (validated.format === 'CSV') {
      const headers = rowsToExport.length > 0 ? Object.keys(rowsToExport[0]!) : [];
      content = generateCsvExportString(headers, rowsToExport);
    } else {
      content = generateJsonlExportString(rowsToExport);
    }

    const job: DataExportJob = {
      id: jobId,
      tenant_id: tenantId,
      entity_type: validated.entity_type,
      format: validated.format,
      status: 'COMPLETED',
      row_count: rowsToExport.length,
      download_token: token,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      completed_at: now.toISOString(),
    };

    this.exportsByToken.set(token, { job, content });

    let tenantJobs = this.jobsByTenant.get(tenantId);
    if (!tenantJobs) {
      tenantJobs = [];
      this.jobsByTenant.set(tenantId, tenantJobs);
    }
    tenantJobs.push(job);

    return job;
  }

  /**
   * Retrieve serialized export content via secure one-time download token.
   */
  async downloadExport(token: string): Promise<{ format: string; content: string }> {
    const stored = this.exportsByToken.get(token);
    if (!stored) {
      throw new NotFoundException(`Export with token '${token}' not found or expired`);
    }

    if (new Date(stored.job.expires_at).getTime() < Date.now()) {
      stored.job.status = 'EXPIRED';
      throw new NotFoundException('Export download link has expired');
    }

    return {
      format: stored.job.format,
      content: stored.content,
    };
  }
}
