/**
 * NL to SQL Service Configuration
 */

// LLM API URL for NL-to-SQL conversion (separate from data API)
export const LLM_API_URL = import.meta.env.VITE_LLM_API_URL || 'http://localhost:8001';

// Enable mock mode for development without backend
export const USE_MOCK_MODE = import.meta.env.VITE_USE_MOCK_NL_TO_SQL === 'true';

// LLM API timeout (1 minute for slow LLM responses)
export const LLM_API_TIMEOUT_MS = 60000;

// Dangerous SQL patterns to block
export const DANGEROUS_PATTERNS: RegExp[] = [
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
