/**
 * Type Mappers
 * Map external API types to internal types
 */

import type { ResultDisplayType, ChartType } from '../../types';

/**
 * Map display type from API response to internal type
 */
export function mapDisplayType(displayType?: string): ResultDisplayType {
  if (!displayType) return 'table';

  const map: Record<string, ResultDisplayType> = {
    TABLE: 'table',
    table: 'table',
    CHART: 'chart',
    chart: 'chart',
    TEXT: 'text',
    text: 'text',
    ERROR: 'error',
    error: 'error',
  };

  return map[displayType] || 'table';
}

/**
 * Map chart type from API response to internal type
 */
export function mapChartType(chartType?: string): ChartType {
  if (!chartType) return 'bar';

  const map: Record<string, ChartType> = {
    BAR: 'bar',
    bar: 'bar',
    LINE: 'line',
    line: 'line',
    PIE: 'pie',
    pie: 'pie',
    AREA: 'area',
    area: 'area',
  };

  return map[chartType] || 'bar';
}
