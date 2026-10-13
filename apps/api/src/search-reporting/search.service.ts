import { Injectable } from '@nestjs/common';
import type {
  GlobalSearchResponse,
  SearchIndexEntry,
} from '@stokrova/contracts';
import { rankAndFilterSearchResults } from '@stokrova/domain';
import {
  globalSearchQuerySchema,
  type GlobalSearchQueryDto,
} from '@stokrova/validation';

@Injectable()
export class SearchService {
  private readonly searchIndex = new Map<string, SearchIndexEntry>();

  /**
   * Upsert an entity into the high-speed search index.
   */
  indexEntity(tenantId: string, entry: SearchIndexEntry): void {
    const key = `${tenantId}:${entry.entity_type}:${entry.entity_id}`;
    this.searchIndex.set(key, entry);
  }

  /**
   * Bulk index multiple entries.
   */
  bulkIndexEntities(tenantId: string, entries: SearchIndexEntry[]): void {
    for (const entry of entries) {
      this.indexEntity(tenantId, entry);
    }
  }

  /**
   * Global multi-entity search with scoring and ranking.
   */
  async globalSearch(
    tenantId: string,
    queryDto: GlobalSearchQueryDto
  ): Promise<GlobalSearchResponse> {
    const validated = globalSearchQuerySchema.parse(queryDto);

    // Filter index entries by tenant
    const prefix = `${tenantId}:`;
    const tenantEntries: SearchIndexEntry[] = [];
    for (const [key, entry] of this.searchIndex.entries()) {
      if (key.startsWith(prefix)) {
        tenantEntries.push(entry);
      }
    }

    const matches = rankAndFilterSearchResults(
      tenantEntries,
      validated.query,
      validated.entity_type
    );

    const limited = matches.slice(0, validated.limit);

    return {
      query: validated.query,
      total_matches: matches.length,
      items: limited,
    };
  }
}
