/**
 * NL to SQL Service - Public API
 */

export {
  // Main functions
  convertNLToSQL,
  classifyQuery,
  executeNLQuery,
  processNaturalLanguageQuery,

  // Utility functions
  generateSchemaContext,
  validateSQL,
  correctSQLError,
} from './nlToSqlService';
