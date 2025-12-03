/**
 * Result Type Detector
 * Analyzes query results to determine the best display type
 */

import type { QueryResult, ResultDisplayType, ChartType } from '../../types';

interface DetectionResult {
  displayType: ResultDisplayType;
  chartType?: ChartType;
  confidence: number;
  reason: string;
}

/**
 * Detect the best display type for query results
 */
export function detectResultType(
  result: QueryResult,
  suggestedType?: ResultDisplayType,
  suggestedChartType?: ChartType
): DetectionResult {
  // If LLM suggested a type with high confidence, respect it
  if (suggestedType && suggestedType !== 'error') {
    return {
      displayType: suggestedType,
      chartType: suggestedType === 'chart' ? suggestedChartType || detectBestChartType(result) : undefined,
      confidence: 0.9,
      reason: 'LLM suggested display type',
    };
  }

  // No results - show text message
  if (result.rowCount === 0) {
    return {
      displayType: 'text',
      confidence: 1.0,
      reason: 'No results to display',
    };
  }

  // Single row with single value - likely a count or aggregate
  if (result.rowCount === 1 && result.columns.length === 1) {
    return {
      displayType: 'text',
      confidence: 0.9,
      reason: 'Single aggregate value',
    };
  }

  // Single row with multiple columns - show as text summary
  if (result.rowCount === 1 && result.columns.length <= 5) {
    return {
      displayType: 'text',
      confidence: 0.8,
      reason: 'Single row detail view',
    };
  }

  // Check if this looks like aggregation data (good for charts)
  const aggregationScore = calculateAggregationScore(result);
  if (aggregationScore > 0.7 && result.rowCount >= 2 && result.rowCount <= 20) {
    return {
      displayType: 'chart',
      chartType: detectBestChartType(result),
      confidence: aggregationScore,
      reason: 'Aggregation data suitable for visualization',
    };
  }

  // Many rows - show as table
  if (result.rowCount > 1) {
    return {
      displayType: 'table',
      confidence: 0.85,
      reason: 'Multiple rows of data',
    };
  }

  // Default to table
  return {
    displayType: 'table',
    confidence: 0.7,
    reason: 'Default to table display',
  };
}

/**
 * Calculate how likely this result is aggregation data
 */
function calculateAggregationScore(result: QueryResult): number {
  let score = 0;
  const columnAnalysis = analyzeColumns(result);

  // Bonus for having exactly one label column and numeric columns
  if (columnAnalysis.labelColumns === 1 && columnAnalysis.numericColumns >= 1) {
    score += 0.4;
  }

  // Bonus for aggregation-like column names
  const aggNames = ['count', 'sum', 'avg', 'average', 'total', 'min', 'max'];
  const hasAggName = result.columns.some((col) =>
    aggNames.some((agg) => col.toLowerCase().includes(agg))
  );
  if (hasAggName) {
    score += 0.3;
  }

  // Bonus for small-ish result sets (easier to visualize)
  if (result.rowCount >= 2 && result.rowCount <= 15) {
    score += 0.2;
  } else if (result.rowCount > 15 && result.rowCount <= 30) {
    score += 0.1;
  }

  // Penalty for too many columns
  if (result.columns.length > 4) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Analyze column types in result
 */
function analyzeColumns(result: QueryResult): {
  numericColumns: number;
  labelColumns: number;
  dateColumns: number;
} {
  let numericColumns = 0;
  let labelColumns = 0;
  let dateColumns = 0;

  for (const col of result.columns) {
    const values = result.rows.map((row) => row[col]).filter((v) => v !== null && v !== undefined);
    if (values.length === 0) continue;

    // Check if numeric
    const numericCount = values.filter(
      (v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')
    ).length;

    if (numericCount / values.length > 0.8) {
      numericColumns++;
      continue;
    }

    // Check if date
    const dateCount = values.filter((v) => {
      if (typeof v === 'string') {
        return /^\d{4}-\d{2}-\d{2}/.test(v);
      }
      return v instanceof Date;
    }).length;

    if (dateCount / values.length > 0.8) {
      dateColumns++;
      continue;
    }

    // Otherwise it's a label/category column
    labelColumns++;
  }

  return { numericColumns, labelColumns, dateColumns };
}

/**
 * Detect the best chart type for the data
 */
export function detectBestChartType(result: QueryResult): ChartType {
  const { numericColumns, dateColumns } = analyzeColumns(result);

  // Time series data - use line chart
  if (dateColumns >= 1) {
    return 'line';
  }

  // Single value per category with few items - pie chart
  if (numericColumns === 1 && result.rowCount <= 8) {
    // Check if values are proportions (would look good as pie)
    const values = getNumericValues(result);
    if (values.length > 0) {
      const total = values.reduce((a, b) => a + b, 0);
      const allPositive = values.every((v) => v >= 0);
      if (allPositive && total > 0) {
        return 'pie';
      }
    }
  }

  // Multiple numeric columns or showing trends - use area chart
  if (numericColumns > 1) {
    return 'area';
  }

  // Default to bar chart
  return 'bar';
}

/**
 * Get all numeric values from result
 */
function getNumericValues(result: QueryResult): number[] {
  const values: number[] = [];

  for (const col of result.columns) {
    for (const row of result.rows) {
      const val = row[col];
      if (typeof val === 'number') {
        values.push(val);
      } else if (typeof val === 'string' && !isNaN(Number(val))) {
        values.push(Number(val));
      }
    }
  }

  return values;
}

/**
 * Check if result should show both table and chart
 */
export function shouldShowDualView(result: QueryResult): boolean {
  // Show both for medium-sized aggregation results
  const aggregationScore = calculateAggregationScore(result);
  return aggregationScore > 0.5 && result.rowCount >= 3 && result.rowCount <= 30;
}

/**
 * Get a human-readable description of the detection
 */
export function getDetectionDescription(detection: DetectionResult): string {
  switch (detection.displayType) {
    case 'table':
      return 'Displaying as table for detailed data view';
    case 'chart':
      return `Displaying as ${detection.chartType} chart for visualization`;
    case 'text':
      return 'Displaying as text summary';
    case 'error':
      return 'An error occurred';
    default:
      return 'Unknown display type';
  }
}
