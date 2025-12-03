/**
 * NL to SQL Service
 * Converts natural language queries to SQL via backend API
 * and executes them against DuckDB in the browser
 *
 * Module Structure:
 * - config.ts: Configuration constants
 * - schemaContext.ts: Schema generation for LLM context
 * - validation.ts: SQL security validation
 * - mockQueries.ts: Mock query templates for development
 * - llmClient.ts: LLM API communication
 * - queryExecutor.ts: Query execution pipeline
 * - errors.ts: Error handling utilities
 * - typeMappers.ts: API type mapping
 */

// Configuration
export { LLM_API_URL, USE_MOCK_MODE, LLM_API_TIMEOUT_MS, DANGEROUS_PATTERNS } from './config';

// Schema Context
export { generateSchemaContext, getColumnDescription } from './schemaContext';

// Validation
export { validateSQL } from './validation';
export type { ValidationResult } from './validation';

// Mock Queries
export { mockConvertNLToSQL } from './mockQueries';

// LLM Client
export { convertNLToSQL, correctSQLError, classifyQuery } from './llmClient';

// Query Executor
export { executeNLQuery, processNaturalLanguageQuery } from './queryExecutor';

// Errors
export { createQueryError, getSuggestions } from './errors';

// Type Mappers
export { mapDisplayType, mapChartType } from './typeMappers';
