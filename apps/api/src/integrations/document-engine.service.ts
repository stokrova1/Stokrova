import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  RenderedDocument,
  RenderDocumentRequest,
} from '@stokrova/contracts';
import { RenderDocumentSchema } from '@stokrova/validation';

@Injectable()
export class DocumentEngineService {
  private readonly renderCounts = new Map<string, number>();

  async renderDocument(
    tenantId: string,
    req: RenderDocumentRequest,
  ): Promise<RenderedDocument> {
    const parsed = RenderDocumentSchema.parse(req);
    const key = `${tenantId}:${parsed.document_type}:${parsed.entity_id}`;

    const existingCount = this.renderCounts.get(key) ?? 0;
    const isReprint = existingCount > 0;
    const nextCount = existingCount + 1;
    this.renderCounts.set(key, nextCount);

    const now = new Date().toISOString();
    const documentId = `doc_${randomUUID().slice(0, 8)}`;
    const format = parsed.format ?? 'HTML';

    const content =
      format === 'JSON'
        ? JSON.stringify({
            document_type: parsed.document_type,
            entity_id: parsed.entity_id,
            rendered_at: now,
            is_reprint: isReprint,
            reprint_count: isReprint ? nextCount - 1 : 0,
            notes: parsed.custom_notes ?? null,
          })
        : `<!DOCTYPE html><html><body><h1>STOKROVA ${parsed.document_type}</h1><p>ID: ${parsed.entity_id}</p>${isReprint ? `<p><strong>[COPY / REPRINT #${nextCount - 1}]</strong></p>` : ''}</body></html>`;

    return {
      document_id: documentId,
      document_type: parsed.document_type,
      entity_id: parsed.entity_id,
      format,
      content,
      rendered_at: now,
      is_reprint: isReprint,
      reprint_count: isReprint ? nextCount - 1 : 0,
    };
  }
}
