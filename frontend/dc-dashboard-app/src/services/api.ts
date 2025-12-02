/**
 * API Service Module for DC Dashboard
 * Connects to Python FastAPI backend for DC order data
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type { DCOpenOrderLine, ApiResponse, RoutePlanRaw } from '../types';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for logging and auth (if needed in future)
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp for debugging
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.params) {
      console.log('[API] Parameters:', config.params);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] No response received:', error.message);
    } else {
      // Error setting up request
      console.error('[API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * API Error type for consistent error handling
 */
export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

/**
 * Format axios error into ApiError
 */
function formatError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    return {
      message: axiosError.response?.data?.detail || axiosError.message || 'An error occurred',
      status: axiosError.response?.status,
      details: axiosError.response?.data,
    };
  }
  return {
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}

// =============================
// DC ORDER LINES API
// =============================

// Default query parameters
const DEFAULT_DC = 132;
const DEFAULT_DAYS_BACK = 60;

/**
 * Parameters for fetching DC order lines
 */
export interface FetchOrderLinesParams {
  dc?: number;
  days_back?: number;
}

/**
 * API Response wrapper - the API may return data in different formats
 */
interface ApiResponseWrapper {
  data?: DCOpenOrderLine[];
  items?: DCOpenOrderLine[];
  results?: DCOpenOrderLine[];
  [key: string]: unknown;
}

/**
 * Fetch open DC order lines from the Python API
 * Endpoint: GET /api/v1/dc-order-lines/open?dc={dc}&days_back={days_back}
 *
 * @param params - Optional parameters (dc, days_back)
 * @returns Array of DCOpenOrderLine objects
 */
export async function fetchOpenDCOrderLines(
  params: FetchOrderLinesParams = {}
): Promise<DCOpenOrderLine[]> {
  const { dc = DEFAULT_DC, days_back = DEFAULT_DAYS_BACK } = params;

  try {
    const response = await apiClient.get<DCOpenOrderLine[] | ApiResponseWrapper>('/api/v1/dc-order-lines/open', {
      params: {
        dc,
        days_back,
      },
    });

    // Handle different response formats
    const responseData = response.data;

    // If response is already an array, return it
    if (Array.isArray(responseData)) {
      return responseData;
    }

    // If response is wrapped in an object, try to extract the array
    if (responseData && typeof responseData === 'object') {
      // Try common wrapper properties
      if (Array.isArray(responseData.data)) {
        return responseData.data;
      }
      if (Array.isArray(responseData.items)) {
        return responseData.items;
      }
      if (Array.isArray(responseData.results)) {
        return responseData.results;
      }

      // Log the actual response structure for debugging
      console.warn('[API] Unexpected response format:', responseData);
    }

    // If we can't determine the format, return empty array
    console.error('[API] Could not extract order array from response:', responseData);
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch open DC order lines:', apiError);
    throw apiError;
  }
}

/**
 * Fetch open DC order lines with pagination support
 *
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @param params - Optional parameters (dc, days_back)
 * @returns Paginated response with DC order lines
 */
export async function fetchOpenDCOrderLinesPaginated(
  page: number = 1,
  pageSize: number = 50,
  params: FetchOrderLinesParams = {}
): Promise<ApiResponse<DCOpenOrderLine[]>> {
  const { dc = DEFAULT_DC, days_back = DEFAULT_DAYS_BACK } = params;

  try {
    const response = await apiClient.get<DCOpenOrderLine[]>('/api/v1/dc-order-lines/open', {
      params: {
        dc,
        days_back,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      },
    });

    // Note: Actual pagination details may need adjustment based on API response structure
    return {
      data: response.data,
      total: response.data.length, // This should come from API headers or response body
      page,
      pageSize,
    };
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch paginated DC order lines:', apiError);
    throw apiError;
  }
}

/**
 * Check if the API server is available
 *
 * @returns true if API is reachable, false otherwise
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    // Try to reach the API - adjust endpoint if the backend has a dedicated health check
    await apiClient.get('/docs', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// =============================
// ORDER HOLD HISTORY API
// =============================

/**
 * Hold history record from API
 */
export interface HoldHistoryRecord {
  held_by?: string;
  hold_name?: string;
  holdlevel?: string;
  applied_date?: string;
  applied_by?: string;
  released_flag?: string;
  released_date?: string | null;
  released_by?: string | null;
  release_reason_code?: string | null;
  release_comment?: string | null;
  [key: string]: unknown;
}

/**
 * Fetch order hold history
 * Endpoint: GET /api/v1/order-holds/history?header_id={header_id}&line_id={line_id}
 *
 * @param headerId - Order header ID
 * @param lineId - Order line ID
 * @returns Array of hold history records
 */
export async function fetchOrderHoldHistory(
  headerId: number,
  lineId: number
): Promise<HoldHistoryRecord[]> {
  try {
    const response = await apiClient.get<HoldHistoryRecord[] | { data?: HoldHistoryRecord[] }>('/api/v1/order-holds/history', {
      params: {
        header_id: headerId,
        line_id: lineId,
      },
    });

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch order hold history:', apiError);
    throw apiError;
  }
}

// =============================
// DESCARTES ROUTING INFO API
// =============================

/**
 * Descartes routing info from API
 */
export interface DescartesRoutingInfo {
  payload_id?: number;
  msg_id?: string;
  message_purpose?: string;
  earliestdate?: string;
  latestdate?: string;
  profitvalue?: number;
  sendtime?: string;
  qty?: number | null;
  [key: string]: unknown;
}

/**
 * Fetch Descartes routing information
 * Endpoint: GET /api/v1/descartes/info?order_number={order_number}&line_id={line_id}
 *
 * @param orderNumber - Order number
 * @param lineId - Order line ID
 * @returns Array of Descartes routing records
 */
export async function fetchDescartesRoutingInfo(
  orderNumber: number,
  lineId: number
): Promise<DescartesRoutingInfo[]> {
  try {
    const response = await apiClient.get<DescartesRoutingInfo[] | { data?: DescartesRoutingInfo[] }>('/api/v1/descartes/info', {
      params: {
        order_number: orderNumber,
        line_id: lineId,
      },
    });

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch Descartes routing info:', apiError);
    throw apiError;
  }
}

// =============================
// NETWORK INVENTORY API
// =============================

/**
 * Network inventory item from API
 */
export interface NetworkInventoryItem {
  dc: string;
  organization_code: string;
  local_qty: number;
}

/**
 * Network inventory API response
 */
export interface NetworkInventoryResponse {
  data: NetworkInventoryItem[];
  total: number;
  dcid: number;
  itemid: number;
}

/**
 * Fetch network inventory for a DC and item
 * Endpoint: GET /api/v1/network-inventory/?dcid={dcid}&itemid={itemid}
 *
 * @param dcid - DC/organization ID (defaults to DEFAULT_DC if not provided or NaN)
 * @param itemid - Inventory item ID
 * @returns Network inventory response with local and local+ quantities
 */
export async function fetchNetworkInventory(
  dcid: number,
  itemid: number
): Promise<NetworkInventoryItem[]> {
  const effectiveDcId = dcid && !isNaN(dcid) ? dcid : DEFAULT_DC;
  try {
    const response = await apiClient.get<NetworkInventoryResponse | NetworkInventoryItem[]>('/api/v1/network-inventory/', {
      params: {
        dcid: effectiveDcId,
        itemid,
      },
    });

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch network inventory:', apiError);
    throw apiError;
  }
}

// =============================
// TRACTION EXCEPTIONS API
// =============================

/**
 * Open trip exception from API
 */
export interface OpenTripException {
  noofopenlines: number;
  route_id: number | null;
  trip_id: number;
  issueorder: string | null;
  mdsprocessstatus: string | null;
  mdsprocessmsg: string | null;
  route_description: string | null;
  driver1: string | null;
  tractionstatus: string | null;
  tractionmsg: string | null;
}

/**
 * Traction exceptions API response
 */
export interface TractionExceptionsResponse {
  data: OpenTripException[];
  total: number;
  org_id: number;
}

/**
 * Fetch open trip exceptions (traction exceptions)
 * Endpoint: GET /api/v1/exceptions/open-trips?org_id={org_id}
 *
 * @param orgId - Organization ID (defaults to DEFAULT_DC)
 * @returns Array of open trip exception records
 */
export async function fetchTractionExceptions(
  orgId: number = DEFAULT_DC
): Promise<OpenTripException[]> {
  try {
    const response = await apiClient.get<TractionExceptionsResponse | OpenTripException[]>(
      '/api/v1/exceptions/open-trips',
      {
        params: { org_id: orgId },
      }
    );

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch traction exceptions:', apiError);
    throw apiError;
  }
}

// =============================
// DC LOCATIONS API
// =============================

/**
 * DC Location from API
 */
export interface DCLocation {
  organization_id: number;
  location_code: string;
  location_name?: string;
}

/**
 * Fetch DC locations
 * Endpoint: GET /api/v1/dc-locations
 *
 * @returns Array of DC location records
 */
export async function fetchDCLocations(): Promise<DCLocation[]> {
  try {
    const response = await apiClient.get<DCLocation[] | { data?: DCLocation[] }>(
      '/api/v1/dc-locations'
    );

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch DC locations:', apiError);
    throw apiError;
  }
}

// =============================
// DESCARTES ROUTE PLANS API
// =============================

/**
 * Fetch Descartes route plans
 * Endpoint: GET /api/v1/descartes/route-plans?dcid={dcid}
 *
 * @param dcid - DC/organization ID
 * @returns Array of route plan records
 */
export async function fetchRoutePlans(
  dcid: number = DEFAULT_DC
): Promise<RoutePlanRaw[]> {
  try {
    const response = await apiClient.get<RoutePlanRaw[] | { data?: RoutePlanRaw[] }>(
      '/api/v1/descartes/route-plans',
      {
        params: { dcid },
      }
    );

    const responseData = response.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return [];
  } catch (error) {
    const apiError = formatError(error);
    console.error('[API] Failed to fetch route plans:', apiError);
    throw apiError;
  }
}

// =============================
// EXPORTS
// =============================

export { apiClient, API_BASE_URL, DEFAULT_DC };
