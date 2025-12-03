/**
 * NL to SQL Service
 * Converts natural language queries to SQL via backend API
 * and executes them against DuckDB in the browser
 */

import { executeQuery, getTableSchema, listTables } from '../duckdb/duckdbService';
import type { QueryResult, QueryError, NLToSQLResult, QueryRoutingDecision } from '../../types';

// LLM API URL for NL-to-SQL conversion (separate from data API)
const LLM_API_URL = import.meta.env.VITE_LLM_API_URL || 'http://localhost:8001';

// Enable mock mode for development without backend
const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_NL_TO_SQL === 'true';

// LLM API timeout (1 minute for slow LLM responses)
const LLM_API_TIMEOUT_MS = 60000;

// Dangerous SQL patterns to block
const DANGEROUS_PATTERNS = [
  /\bDROP\b/i,
  /\bDELETE\b/i,
  /\bTRUNCATE\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /;\s*--/i, // Comment injection
  /UNION\s+SELECT/i, // Union injection
];

/**
 * Generate the schema context string for the LLM
 * This describes the available tables and columns
 */
export async function generateSchemaContext(): Promise<string> {
  const tables = await listTables();
  const schemaLines: string[] = [];

  for (const tableName of tables) {
    const columns = await getTableSchema(tableName);
    schemaLines.push(`\nTable: ${tableName}`);
    schemaLines.push('Columns:');

    for (const col of columns) {
      // Add descriptions based on known column names
      const description = getColumnDescription(tableName, col.column_name);
      schemaLines.push(`  - ${col.column_name} (${col.data_type}): ${description}`);
    }
  }

  return schemaLines.join('\n');
}

/**
 * Get human-readable description for known columns
 */
function getColumnDescription(tableName: string, columnName: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    dc_order_lines: {
      // Order identification
      order_number: 'Order number identifier',
      line_id: 'Order line ID',
      line: 'Line number.shipment number',
      header_id: 'Order header ID',
      orig_sys_document_ref: 'Original system document reference',
      inventory_item_id: 'Inventory item ID',

      // Dates - VARCHAR ISO datetime strings (e.g., '2025-12-03T23:59:00')
      ordered_date: 'VARCHAR ISO datetime - Date the order was placed. Use CAST(ordered_date AS DATE) for date filtering',
      schedule_ship_date: 'VARCHAR ISO datetime - Scheduled shipping date. Use CAST(schedule_ship_date AS DATE) for date filtering',

      // Item information
      ordered_item: 'Item SKU/code',
      item_description: 'Item description',
      productgrp: 'Product group',
      vendor: 'Vendor name',
      style: 'Product style',

      // Quantities
      ordered_quantity: 'Quantity ordered',
      reserved_qty: 'Quantity reserved in inventory',
      localplusqty: 'Local+ quantity available',

      // Customer/Location
      sold_to: 'Sold to customer name',
      ship_to: 'Ship to customer/location code',
      ship_to_addressee: 'Ship to addressee name',
      ship_to_address1: 'Ship to address line 1',
      ship_to_address5: 'Ship to address line 5',
      dc: 'Distribution center code',

      // Shipping
      shipping_method_code: 'Shipping method (ROUTE TRUCK, PARCEL, etc.)',
      shipping_instructions: 'Shipping instructions',
      delivery_id: 'Delivery ID',
      trip_id: 'Trip ID for routing',

      // Order classification
      order_type: 'Order type',
      order_category: "Order category: 'INTERNAL ORDER' or 'CUSTOMER ORDER'",
      line_category_code: 'Line category code',
      fulfillment_type: 'Fulfillment type',
      iso: 'Internal sales order reference',
      price_list: 'Price list name',
      set_name: 'Ship set name',
      original_line_status: "Line status (Ready to Release, Backordered, Release to Warehouse, Staged/Pick Confirmed, Shipped)",

      // Status flags (Y/N values)
      hold_applied: "'Y' if hold applied, 'N' if not",
      hold_released: "'Y' if hold released, 'N' if not",
      routed: "'Y' if routed to Descartes, 'N' if not",
      planned: "'Y' if planned from Descartes, 'N' if not",
      localplusqtyexists: "'Y' if local+ quantity exists, 'N' if not",

      // Computed numeric flags (1/0) - use these for counting/filtering
      hold_applied_flag: '1 if on hold, 0 if not (use for counting)',
      hold_released_flag: '1 if hold released, 0 if not (use for counting)',
      routed_flag: '1 if routed, 0 if not (use for counting)',
      planned_flag: '1 if planned, 0 if not (use for counting)',
      localplusqtyexists_flag: '1 if local+ exists, 0 if not',
    },
    route_plans: {
      route_id: 'Unique route identifier',
      route_name: 'Route name/description',
      schedule_key: 'Schedule identifier',
      driver_key: 'Driver identifier',
      truck_key: 'Truck identifier',
      process_code: 'Process code',
      trip_id: 'Trip identifier (links to dc_order_lines)',
      route_start_date: 'DATETIME - Route start date. Use CAST(route_start_date AS DATE) for date filtering',
      location_key: 'Stop location identifier',
      location_type: 'Type of location (pickup, delivery)',
      location_name: 'Location name',
      stop_number: 'Stop sequence number',
      order_number: 'Order number at this stop',
      linenum: 'Line number',
      order_type: 'Type of order',
      delivery_id: 'Delivery identifier',
      ordered_item: 'Item being delivered',
      quantity: 'Quantity for this stop',
      order_key: 'Order key',
      product_key: 'Product key',
      back_order_flag: "'Y' if backorder, 'N' if not",
      is_back_order: '1 if backorder, 0 if not (use for counting)',
    },
  };

  return descriptions[tableName]?.[columnName] || 'Column data';
}

/**
 * Validate SQL for safety - block dangerous operations
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sql)) {
      return {
        valid: false,
        error: `SQL contains potentially dangerous operation: ${pattern.source}`,
      };
    }
  }

  // Ensure it's a SELECT statement
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return {
      valid: false,
      error: 'Only SELECT queries are allowed',
    };
  }

  return { valid: true };
}

/**
 * Mock NL to SQL conversion for development
 * Maps common queries to SQL templates
 */
function mockConvertNLToSQL(userQuery: string): NLToSQLResult {
  const query = userQuery.toLowerCase();

  // Common query patterns
  if (query.includes('how many') && query.includes('hold')) {
    return {
      sql: `SELECT COUNT(*) as count FROM dc_order_lines WHERE hold_applied_flag = 1`,
      confidence: 0.9,
      explanation: 'Counting orders that are currently on hold.',
      suggestedDisplayType: 'text',
    };
  }

  if (query.includes('orders') && query.includes('over') && query.includes('unit')) {
    const match = query.match(/(\d+)/);
    const threshold = match ? parseInt(match[1]) : 100;
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, shipping_method_code
            FROM dc_order_lines
            WHERE ordered_quantity > ${threshold}
            ORDER BY ordered_quantity DESC
            LIMIT 50`,
      confidence: 0.85,
      explanation: `Showing orders with quantity over ${threshold} units.`,
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('top') && query.includes('customer')) {
    const match = query.match(/top\s+(\d+)/i);
    const limit = match ? parseInt(match[1]) : 10;
    return {
      sql: `SELECT sold_to as customer, COUNT(*) as order_count
            FROM dc_order_lines
            GROUP BY sold_to
            ORDER BY order_count DESC
            LIMIT ${limit}`,
      confidence: 0.9,
      explanation: `Top ${limit} customers by order count.`,
      suggestedDisplayType: 'chart',
      suggestedChartType: 'bar',
    };
  }

  if (query.includes('ship') && query.includes('today')) {
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, schedule_ship_date
            FROM dc_order_lines
            WHERE DATE(schedule_ship_date) = CURRENT_DATE
            ORDER BY order_number`,
      confidence: 0.85,
      explanation: 'Orders scheduled to ship today.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('routes') && query.includes('today')) {
    return {
      sql: `SELECT DISTINCT route_id, route_name, driver_key, truck_key
            FROM route_plans
            WHERE DATE(route_start_date) = CURRENT_DATE`,
      confidence: 0.85,
      explanation: 'Routes planned for today.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('route') && query.includes('most') && query.includes('stop')) {
    return {
      sql: `SELECT route_name, COUNT(DISTINCT stop_number) as stop_count
            FROM route_plans
            GROUP BY route_id, route_name
            ORDER BY stop_count DESC
            LIMIT 10`,
      confidence: 0.85,
      explanation: 'Routes with the most stops.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'bar',
    };
  }

  if (query.includes('driver')) {
    return {
      sql: `SELECT DISTINCT driver_key, route_name, route_start_date
            FROM route_plans
            WHERE driver_key IS NOT NULL
            ORDER BY route_start_date DESC`,
      confidence: 0.8,
      explanation: 'Drivers assigned to routes.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('percentage') || query.includes('%')) {
    if (query.includes('routed')) {
      return {
        sql: `SELECT
                ROUND(SUM(CASE WHEN routed_flag = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as routed_percentage,
                COUNT(*) as total_orders
              FROM dc_order_lines`,
        confidence: 0.9,
        explanation: 'Percentage of orders that are routed.',
        suggestedDisplayType: 'text',
      };
    }
  }

  if (query.includes('shipping method') || query.includes('ship method')) {
    return {
      sql: `SELECT shipping_method_code, COUNT(*) as order_count
            FROM dc_order_lines
            GROUP BY shipping_method_code
            ORDER BY order_count DESC`,
      confidence: 0.9,
      explanation: 'Orders by shipping method.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'pie',
    };
  }

  if (query.includes('status') || query.includes('distribution')) {
    return {
      sql: `SELECT
              CASE
                WHEN hold_applied_flag = 1 AND hold_released_flag = 0 THEN 'On Hold'
                WHEN routed_flag = 1 THEN 'Routed'
                WHEN planned_flag = 1 THEN 'Planned'
                ELSE 'Pending'
              END as status,
              COUNT(*) as count
            FROM dc_order_lines
            GROUP BY status
            ORDER BY count DESC`,
      confidence: 0.85,
      explanation: 'Order distribution by status.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'pie',
    };
  }

  if (query.includes('backorder')) {
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to
            FROM dc_order_lines
            WHERE reserved_qty < ordered_quantity
            ORDER BY ordered_quantity DESC`,
      confidence: 0.85,
      explanation: 'Orders with backordered items (reserved qty less than ordered).',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('released') && query.includes('hold')) {
    return {
      sql: `SELECT order_number, ordered_item, sold_to, schedule_ship_date
            FROM dc_order_lines
            WHERE hold_applied_flag = 1 AND hold_released_flag = 1
            ORDER BY schedule_ship_date`,
      confidence: 0.9,
      explanation: 'Orders with released holds.',
      suggestedDisplayType: 'table',
    };
  }

  // Default: show recent orders
  return {
    sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, shipping_method_code, schedule_ship_date
          FROM dc_order_lines
          ORDER BY schedule_ship_date DESC
          LIMIT 20`,
    confidence: 0.6,
    explanation: 'Showing recent orders. Try being more specific with your question.',
    suggestedDisplayType: 'table',
  };
}

/**
 * Convert natural language to SQL via backend API
 */
export async function convertNLToSQL(
  userQuery: string,
  contextInfo: string = ''
): Promise<NLToSQLResult> {
  // Use mock mode for development
  if (USE_MOCK_MODE) {
    console.log('[NLtoSQL] Using mock mode');
    return mockConvertNLToSQL(userQuery);
  }

  // Generate schema context
  const schemaContext = await generateSchemaContext();

  try {
    // Set up timeout for LLM API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_API_TIMEOUT_MS);

    const response = await fetch(`${LLM_API_URL}/api/nl-to-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: userQuery,
        schema_context: schemaContext,
        context_info: contextInfo,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Validate the generated SQL
    const validation = validateSQL(data.sql);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return {
      sql: data.sql,
      confidence: data.confidence || 0.8,
      explanation: data.explanation,
      suggestedDisplayType: mapDisplayType(data.display_type),
      suggestedChartType: data.chart_type ? mapChartType(data.chart_type) : undefined,
      usage: data.usage,
    };
  } catch (error) {
    console.error('[NLtoSQL] API call failed, falling back to mock:', error);
    // Fallback to mock mode if API fails
    return mockConvertNLToSQL(userQuery);
  }
}

/**
 * Classify a query to determine routing (local vs API)
 */
export async function classifyQuery(
  userQuery: string
): Promise<QueryRoutingDecision> {
  // For now, always use local data
  return {
    classification: 'local-data',
    primaryTable: 'dc_order_lines',
    reason: 'Using local DuckDB data',
  };
}

/**
 * Execute SQL and return results with metadata
 */
export async function executeNLQuery(
  sql: string
): Promise<QueryResult> {
  console.log('[DuckDB] Starting query execution...');
  const startTime = performance.now();

  // Validate SQL before execution
  const validation = validateSQL(sql);
  if (!validation.valid) {
    console.error('[DuckDB] SQL validation failed:', validation.error);
    throw createQueryError('sql-syntax', validation.error || 'Invalid SQL', sql);
  }
  console.log('[DuckDB] SQL validation passed');

  try {
    console.log('[DuckDB] Calling executeQuery...');
    const rows = await executeQuery(sql);
    const executionTime = performance.now() - startTime;
    console.log('[DuckDB] Query executed in', executionTime.toFixed(2), 'ms, rows:', rows.length);

    // Extract column names from first row
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTime,
      sql,
    };
  } catch (error) {
    console.error('[DuckDB] Query execution failed:', error);
    throw createQueryError(
      'execution',
      error instanceof Error ? error.message : 'Query execution failed',
      sql
    );
  }
}

/**
 * Attempt to correct a failed SQL query via API
 */
export async function correctSQLError(
  originalQuery: string,
  errorMessage: string,
  errorType: string
): Promise<{ corrected_sql: string; confidence: number }> {
  // In mock mode, return a simple fix attempt
  if (USE_MOCK_MODE) {
    return {
      corrected_sql: originalQuery.replace(/LIMIT \d+/, 'LIMIT 10'),
      confidence: 0.5,
    };
  }

  const schemaContext = await generateSchemaContext();

  try {
    // Set up timeout for LLM API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_API_TIMEOUT_MS);

    const response = await fetch(`${LLM_API_URL}/api/correct-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_query: originalQuery,
        error_message: errorMessage,
        error_type: errorType,
        schema_context: schemaContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[NLtoSQL] SQL correction failed:', error);
    return {
      corrected_sql: originalQuery,
      confidence: 0,
    };
  }
}

/**
 * Full query pipeline (no retry - single attempt)
 */
export async function processNaturalLanguageQuery(
  userQuery: string,
  contextInfo: string = ''
): Promise<{
  result: QueryResult;
  nlResult: NLToSQLResult;
  retryCount: number;
}> {
  // Convert NL to SQL
  console.log('[NLtoSQL] Converting query:', userQuery);
  const nlResult = await convertNLToSQL(userQuery, contextInfo);
  console.log('[NLtoSQL] Generated SQL:', nlResult.sql);

  // Execute the query (no retry)
  console.log('[NLtoSQL] Executing DuckDB query...');
  const result = await executeNLQuery(nlResult.sql);
  console.log('[NLtoSQL] Query result:', result.rowCount, 'rows');
  return { result, nlResult, retryCount: 0 };
}

/**
 * Create a user-friendly query error
 */
function createQueryError(
  type: QueryError['type'],
  message: string,
  sql?: string
): QueryError {
  const userMessages: Record<QueryError['type'], string> = {
    'sql-syntax': 'There was a problem with the generated query. Please try rephrasing your question.',
    execution: 'The query could not be executed. The data might not be available.',
    'no-results': 'No data found matching your query.',
    timeout: 'The query took too long to execute. Try a simpler question.',
    unknown: 'An unexpected error occurred. Please try again.',
  };

  return {
    type,
    message,
    userMessage: userMessages[type],
    sql,
    suggestions: getSuggestions(type),
  };
}

/**
 * Get suggestions based on error type
 */
function getSuggestions(errorType: QueryError['type']): string[] {
  const suggestions: Record<QueryError['type'], string[]> = {
    'sql-syntax': [
      'Try asking in a different way',
      'Be more specific about what data you want',
      'Ask about a specific order or customer',
    ],
    execution: [
      'Check if the data has been loaded',
      'Try a simpler query first',
      'Verify the column names exist',
    ],
    'no-results': [
      'Broaden your search criteria',
      'Check if filters are too restrictive',
      'Verify the data range',
    ],
    timeout: [
      'Ask for fewer results',
      'Add more specific filters',
      'Try asking about a smaller date range',
    ],
    unknown: [
      'Refresh the page and try again',
      'Try a different question',
      'Contact support if the issue persists',
    ],
  };

  return suggestions[errorType] || [];
}

/**
 * Map display type to internal type
 */
function mapDisplayType(displayType?: string): 'table' | 'chart' | 'text' | 'error' {
  if (!displayType) return 'table';
  const map: Record<string, 'table' | 'chart' | 'text' | 'error'> = {
    TABLE: 'table',
    table: 'table',
    CHART: 'chart',
    chart: 'chart',
    TEXT: 'text',
    text: 'text',
  };
  return map[displayType] || 'table';
}

/**
 * Map chart type to internal type
 */
function mapChartType(chartType?: string): 'bar' | 'line' | 'pie' | 'area' {
  if (!chartType) return 'bar';
  const map: Record<string, 'bar' | 'line' | 'pie' | 'area'> = {
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
