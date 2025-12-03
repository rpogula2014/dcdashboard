/**
 * SQL Validation
 * Security validation for generated SQL queries
 */

import { DANGEROUS_PATTERNS } from './config';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate SQL for safety - block dangerous operations
 */
export function validateSQL(sql: string): ValidationResult {
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
