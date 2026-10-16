import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildExecutiveSalesSnapshot,
  businessDate,
  parseSalesRows,
  shiftIsoDate,
  type ExecutiveSalesSnapshot,
} from '@stokrova/domain';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { ExecutiveSalesRepository, type PipelineKind } from './executive-sales.repository.js';

export interface ExecutiveImportResult {
  imported: number;
  errors: string[];
  fileKey: string | null;
}

const MAX_IMPORT_ROWS = 5000;

@Injectable()
export class ExecutiveSalesService {
  constructor(
    private readonly repo: ExecutiveSalesRepository,
    private readonly storage: StorageService,
  ) {}

  async getSnapshot(tenantId: string, timeZone = 'Africa/Lagos', asOf?: string): Promise<ExecutiveSalesSnapshot> {
    const today = asOf ?? businessDate(new Date(), timeZone);
    const records = await this.repo.loadRecords(tenantId, shiftIsoDate(today, -13), today, timeZone);
    return buildExecutiveSalesSnapshot(records, today);
  }

  /**
   * Imports parsed spreadsheet rows. The raw file (when supplied) is archived to object storage (Cloudflare R2)
   * so every figure can be traced back to its source upload.
   */
  async importRows(
    tenantId: string,
    userId: string,
    rows: Record<string, string>[],
    currencyCode: string,
    rawCsv?: string,
  ): Promise<ExecutiveImportResult> {
    if (!Array.isArray(rows) || rows.length === 0) throw new BadRequestException('No rows to import.');
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
    if (!/^[A-Z]{3}$/.test(currencyCode)) throw new BadRequestException('Currency must be a 3-letter code.');
    const parsed = parseSalesRows(rows);
    if (parsed.errors.length) return { imported: 0, errors: parsed.errors.slice(0, 50), fileKey: null };

    let fileKey: string | null = null;
    if (rawCsv) {
      fileKey = `tenants/${tenantId}/sales-imports/${Date.now()}.csv`;
      await this.storage.put(fileKey, rawCsv, { contentType: 'text/csv', metadata: { uploaded_by: userId } });
    }
    const imported = await this.repo.upsertEntries(tenantId, userId, parsed.rows, currencyCode, fileKey);
    return { imported, errors: [], fileKey };
  }

  listPipeline(tenantId: string, kind: PipelineKind, limit = 50) {
    return this.repo.listPipeline(tenantId, kind, limit);
  }
}
