/**
 * @deprecated This file has been split into smaller modules.
 * Import from './index' instead, which re-exports from:
 *
 * - config.ts: Configuration constants
 * - schemaContext.ts: Schema generation for LLM context
 * - validation.ts: SQL security validation
 * - mockQueries.ts: Mock query templates for development
 * - llmClient.ts: LLM API communication
 * - queryExecutor.ts: Query execution pipeline
 * - errors.ts: Error handling utilities
 * - typeMappers.ts: API type mapping
 *
 * This file is kept for backwards compatibility but will be removed in a future version.
 */

// Re-export everything from the new modules for backwards compatibility
export {
  // Configuration
  LLM_API_URL,
  USE_MOCK_MODE,
  LLM_API_TIMEOUT_MS,
  DANGEROUS_PATTERNS,

  // Schema Context
  generateSchemaContext,

  // Validation
  validateSQL,

  // LLM Client
  convertNLToSQL,
  correctSQLError,
  classifyQuery,

  // Query Executor
  executeNLQuery,
  processNaturalLanguageQuery,
} from './index';
