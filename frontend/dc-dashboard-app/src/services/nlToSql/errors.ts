/**
 * Error Handling Utilities
 * User-friendly error creation and suggestions
 */

import type { QueryError } from '../../types';

/**
 * Error type to user-friendly message mapping
 */
const USER_MESSAGES: Record<QueryError['type'], string> = {
  'sql-syntax': 'There was a problem with the generated query. Please try rephrasing your question.',
  execution: 'The query could not be executed. The data might not be available.',
  'no-results': 'No data found matching your query.',
  timeout: 'The query took too long to execute. Try a simpler question.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Suggestions based on error type
 */
const ERROR_SUGGESTIONS: Record<QueryError['type'], string[]> = {
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

/**
 * Get suggestions based on error type
 */
export function getSuggestions(errorType: QueryError['type']): string[] {
  return ERROR_SUGGESTIONS[errorType] || [];
}

/**
 * Create a user-friendly query error
 */
export function createQueryError(
  type: QueryError['type'],
  message: string,
  sql?: string
): QueryError {
  return {
    type,
    message,
    userMessage: USER_MESSAGES[type],
    sql,
    suggestions: getSuggestions(type),
  };
}
