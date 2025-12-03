/**
 * Query Executor
 * Executes SQL queries against DuckDB and processes results
 */

import type { QueryResult, NLToSQLResult } from '../../types';
import { executeQuery } from '../duckdb/duckdbService';
import { validateSQL } from './validation';
import { createQueryError } from './errors';
import { convertNLToSQL } from './llmClient';

/**
 * Execute SQL and return results with metadata
 */
export async function executeNLQuery(sql: string): Promise<QueryResult> {
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
 * Full query pipeline (no retry - single attempt)
 * Converts natural language to SQL and executes it
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
