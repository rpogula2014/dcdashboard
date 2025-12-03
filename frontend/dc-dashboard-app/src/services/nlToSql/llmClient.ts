/**
 * LLM Client
 * Handles communication with the LLM API for NL-to-SQL conversion
 */

import type { NLToSQLResult, QueryRoutingDecision } from '../../types';
import { LLM_API_URL, LLM_API_TIMEOUT_MS, USE_MOCK_MODE } from './config';
import { generateSchemaContext } from './schemaContext';
import { validateSQL } from './validation';
import { mockConvertNLToSQL } from './mockQueries';
import { mapDisplayType, mapChartType } from './typeMappers';

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
 * Classify a query to determine routing (local vs API)
 */
export async function classifyQuery(
  _userQuery: string
): Promise<QueryRoutingDecision> {
  // For now, always use local data
  return {
    classification: 'local-data',
    primaryTable: 'dc_order_lines',
    reason: 'Using local DuckDB data',
  };
}
