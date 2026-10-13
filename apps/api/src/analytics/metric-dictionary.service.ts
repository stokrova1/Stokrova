import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MetricCategory,
  MetricDefinition,
  MetricDictionaryResponse,
} from '@stokrova/contracts';
import { STANDARD_METRIC_DEFINITIONS } from '@stokrova/domain';

@Injectable()
export class MetricDictionaryService {
  private readonly metricRegistry: Map<string, MetricDefinition> = new Map(
    Object.entries(STANDARD_METRIC_DEFINITIONS),
  );

  /**
   * List all registered metrics with optional category and search filters.
   */
  async listMetrics(
    category?: MetricCategory,
    search?: string,
  ): Promise<MetricDictionaryResponse> {
    let metrics = Array.from(this.metricRegistry.values());

    if (category) {
      metrics = metrics.filter((m) => m.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      metrics = metrics.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.owner_domain.toLowerCase().includes(q),
      );
    }

    return {
      metrics,
      total_count: metrics.length,
    };
  }

  /**
   * Get single metric definition by identifier with complete governance metadata.
   */
  async getMetric(metricId: string): Promise<MetricDefinition> {
    const metric = this.metricRegistry.get(metricId);
    if (!metric) {
      throw new NotFoundException(`Metric '${metricId}' is not registered in the metric dictionary.`);
    }
    return metric;
  }

  /**
   * Check whether a metric ID is registered.
   */
  hasMetric(metricId: string): boolean {
    return this.metricRegistry.has(metricId);
  }
}
