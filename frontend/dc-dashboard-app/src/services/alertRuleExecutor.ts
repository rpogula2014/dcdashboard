/**
 * Alert Rule Executor Service
 * Executes alert rules against DuckDB tables and returns matching results
 */

import { executeQuery, tableExists } from './duckdb/duckdbService';
import type { AlertRule, AlertResult, AlertDataSource, QueryResultRow } from '../types';

// Maximum rows to return per rule (for performance)
const MAX_RESULTS_PER_RULE = 500;

/**
 * Execute a single alert rule and return the result
 */
export async function executeAlertRule(
  rule: AlertRule,
  whereClause: string
): Promise<AlertResult> {
  const startTime = Date.now();

  try {
    // Verify the data source table exists
    const exists = await tableExists(rule.dataSource);
    if (!exists) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        matchCount: 0,
        matchingOrders: [],
        lastChecked: new Date(),
        error: `Table '${rule.dataSource}' not found. Data may not be loaded yet.`,
      };
    }

    // Build the query
    const sql = `
      SELECT *
      FROM ${rule.dataSource}
      WHERE ${whereClause}
      LIMIT ${MAX_RESULTS_PER_RULE}
    `;

    console.log(`[AlertExecutor] Running rule '${rule.name}':`, sql);

    // Execute the query
    const rows = await executeQuery<QueryResultRow>(sql);

    // Get total count if we hit the limit
    let totalCount = rows.length;
    if (rows.length === MAX_RESULTS_PER_RULE) {
      const countSql = `SELECT COUNT(*) as cnt FROM ${rule.dataSource} WHERE ${whereClause}`;
      const countResult = await executeQuery<{ cnt: number | bigint }>(countSql);
      totalCount = Number(countResult[0]?.cnt || rows.length);
    }

    const executionTime = Date.now() - startTime;
    console.log(
      `[AlertExecutor] Rule '${rule.name}' found ${totalCount} matches in ${executionTime}ms`
    );

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      matchCount: totalCount,
      matchingOrders: rows,
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error(`[AlertExecutor] Rule '${rule.name}' failed:`, error);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      matchCount: 0,
      matchingOrders: [],
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute multiple alert rules in parallel
 */
export async function executeAllAlertRules(
  rules: AlertRule[],
  buildWhereClause: (rule: AlertRule) => string
): Promise<AlertResult[]> {
  // Filter to only enabled rules
  const enabledRules = rules.filter((rule) => rule.enabled);

  if (enabledRules.length === 0) {
    console.log('[AlertExecutor] No enabled rules to execute');
    return [];
  }

  console.log(`[AlertExecutor] Executing ${enabledRules.length} enabled rules`);

  // Execute all rules in parallel
  const results = await Promise.all(
    enabledRules.map((rule) => executeAlertRule(rule, buildWhereClause(rule)))
  );

  // Sort by severity (critical first) then by match count
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  results.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.matchCount - a.matchCount;
  });

  // Log summary
  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);
  const rulesWithMatches = results.filter((r) => r.matchCount > 0).length;
  console.log(
    `[AlertExecutor] Complete: ${rulesWithMatches}/${results.length} rules with matches, ${totalMatches} total exceptions`
  );

  return results;
}

/**
 * Get available columns for a data source (for rule builder dropdowns)
 */
export async function getDataSourceColumns(
  dataSource: AlertDataSource
): Promise<{ column_name: string; data_type: string }[]> {
  try {
    const exists = await tableExists(dataSource);
    if (!exists) {
      console.warn(`[AlertExecutor] Table '${dataSource}' does not exist`);
      return [];
    }

    const columns = await executeQuery<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${dataSource}'`
    );

    return columns;
  } catch (error) {
    console.error(`[AlertExecutor] Failed to get columns for ${dataSource}:`, error);
    return [];
  }
}

/**
 * Validate a WHERE clause by running a test query
 */
export async function validateWhereClause(
  dataSource: AlertDataSource,
  whereClause: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Run a limited query to check syntax
    const sql = `SELECT 1 FROM ${dataSource} WHERE ${whereClause} LIMIT 1`;
    await executeQuery(sql);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid expression',
    };
  }
}
