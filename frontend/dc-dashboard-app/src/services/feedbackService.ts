/**
 * Metrics & Feedback Service
 * Handles logging AI chat metrics and updating user feedback
 */

import type {
  MetricsPayload,
  MetricsResponse,
  FeedbackUpdatePayload,
  FeedbackUpdateResponse,
} from '../types';

// Use the same API URL as the NL-to-SQL service (Talk to Data backend)
const API_URL = import.meta.env.VITE_LLM_API_URL || 'http://localhost:8001';
const API_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Sanitize object for JSON serialization (handles BigInt from DuckDB, Date objects, etc.)
 */
function sanitizeForJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForJSON);
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJSON(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Log AI chat metrics immediately after receiving AI response
 * Creates a record in the database with question, answer, and token usage
 */
export async function logMetrics(payload: MetricsPayload): Promise<MetricsResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    // Sanitize payload to handle BigInt and other non-JSON-serializable types
    const sanitizedPayload = sanitizeForJSON(payload);

    const response = await fetch(`${API_URL}/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to log metrics: ${response.status}`);
    }

    const result: MetricsResponse = await response.json();
    console.log(`[Metrics] Logged successfully for message ${payload.message_id}:`,
      `in=${payload.input_tokens}, out=${payload.output_tokens}, cost=$${payload.cost_usd.toFixed(6)}`);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Metrics] Request timed out');
      throw new Error('Metrics logging timed out.');
    }
    console.error('[Metrics] Error logging metrics:', error);
    throw error;
  }
}

/**
 * Update feedback (rating) for an existing metrics record
 * Called when user clicks thumbs up/down on an AI response
 */
export async function updateFeedback(
  messageId: string,
  payload: FeedbackUpdatePayload
): Promise<FeedbackUpdateResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(`${API_URL}/api/metrics/${messageId}/feedback`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update feedback: ${response.status}`);
    }

    const result: FeedbackUpdateResponse = await response.json();
    console.log(`[Feedback] Updated successfully for message ${messageId}: ${payload.rating}`);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Feedback] Request timed out');
      throw new Error('Feedback update timed out. Please try again.');
    }
    console.error('[Feedback] Error updating feedback:', error);
    throw error;
  }
}

/**
 * Calculate cost based on Claude Haiku 4.5 pricing
 * Input: $1/MTok, Output: $5/MTok
 * Cache read: $0.10/MTok, Cache write: $1.25/MTok
 */
export function calculateCost(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}): number {
  const inputCost = (usage.input_tokens / 1_000_000) * 1.0;
  const outputCost = (usage.output_tokens / 1_000_000) * 5.0;
  const cacheReadCost = (usage.cache_read_input_tokens / 1_000_000) * 0.10;
  const cacheWriteCost = (usage.cache_creation_input_tokens / 1_000_000) * 1.25;
  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}
