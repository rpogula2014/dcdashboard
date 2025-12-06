/**
 * useOrders Hook
 * Manages order data fetching from API with fallback to mock data
 * Includes loading states, error handling, and auto-refresh support
 * Also loads data into DuckDB for SQL queries and alerts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DCOpenOrderLine, OrderRow, KPIData, RefreshInterval } from '../types';
import { fetchOpenDCOrderLines, fetchRoutePlans, fetchDCOnhand, checkApiHealth, type ApiError } from '../services/api';
import {
  mockOrders,
  transformToOrderRow,
  SHIP_METHODS,
} from '../mock/data';
import { initializeDuckDB } from '../services/duckdb/duckdbService';
import { loadDCOrderLines, loadRoutePlans, loadDCOnhand } from '../services/duckdb/dataLoaders';

// =============================
// TYPES
// =============================

export interface UseOrdersResult {
  // Data
  orders: DCOpenOrderLine[];
  orderRows: OrderRow[];
  routeTruckOrders: OrderRow[];
  otherShipMethodOrders: OrderRow[];
  exceptionOrders: OrderRow[];
  kpiData: KPIData[];

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: ApiError | null;
  lastSynced: Date | null;
  isApiAvailable: boolean;
  isUsingMockData: boolean;

  // Actions
  refresh: () => Promise<void>;
  clearError: () => void;
}

export interface UseOrdersOptions {
  autoRefresh?: boolean;
  refreshInterval?: RefreshInterval;
  useMockDataFallback?: boolean;
  dc?: number;
}

// =============================
// HELPER FUNCTIONS
// =============================

/**
 * Transform raw order data to OrderRow array
 */
function transformOrders(orders: DCOpenOrderLine[]): OrderRow[] {
  // Defensive check - ensure orders is an array
  if (!Array.isArray(orders)) {
    console.warn('[useOrders] Expected orders array, got:', typeof orders);
    return [];
  }
  return orders.map(transformToOrderRow);
}

/**
 * Filter orders by ship method
 * Now uses display name comparison since transformToOrderRow converts to display names
 * Route Truck orders are also filtered to only include CUSTOMER ORDER category
 */
function filterByShipMethod(orders: OrderRow[], filterRouteTruck: boolean): OrderRow[] {
  return orders.filter((order) =>
    filterRouteTruck
      ? order.shipMethod === SHIP_METHODS.ROUTE_TRUCK && order.raw.order_category === 'CUSTOMER ORDER'
      : order.shipMethod !== SHIP_METHODS.ROUTE_TRUCK
  );
}

/**
 * Filter orders with exceptions
 */
function filterExceptions(orders: OrderRow[]): OrderRow[] {
  return orders.filter((order) => order.exception !== null);
}

/**
 * Helper to calculate total units from orders
 */
function calculateTotalUnits(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + (o.raw.ordered_quantity ?? 0), 0);
}

/**
 * Calculate KPI data from orders
 */
function calculateKPIData(orders: OrderRow[]): KPIData[] {
  const routeTruckOrders = filterByShipMethod(orders, true);
  const otherOrdersAll = filterByShipMethod(orders, false);
  // Separate ISOs from other ship methods
  const isoOrders = otherOrdersAll.filter((o) => o.raw.order_category === 'INTERNAL ORDER');
  const otherOrders = otherOrdersAll.filter((o) => o.raw.order_category !== 'INTERNAL ORDER');
  const exceptionOrders = filterExceptions(orders);

  // Line counts
  const totalLines = orders.length;
  const routedLines = routeTruckOrders.filter((o) => o.routing === 'success');
  const notRoutedLines = routeTruckOrders.filter((o) => o.routing === 'pending');
  const criticalLines = exceptionOrders.filter((o) => o.exception === 'critical');
  const warningLines = exceptionOrders.filter((o) => o.exception === 'warning');

  // Unit totals
  const totalUnits = calculateTotalUnits(orders);
  const routeTruckUnits = calculateTotalUnits(routeTruckOrders);
  const otherUnits = calculateTotalUnits(otherOrders);
  const isoUnits = calculateTotalUnits(isoOrders);
  const exceptionUnits = calculateTotalUnits(exceptionOrders);
  const onHoldUnits = calculateTotalUnits(criticalLines);
  const notRoutedUnits = calculateTotalUnits(notRoutedLines);

  return [
    {
      title: 'Total Lines',
      value: totalLines,
      progress: 100,
      footer: `${totalUnits.toLocaleString()} units to ship`,
      color: 'blue',
    },
    {
      title: 'Route Truck',
      value: routeTruckOrders.length,
      progress: routeTruckOrders.length > 0
        ? Math.round((routedLines.length / routeTruckOrders.length) * 100)
        : 0,
      footer: `${routeTruckUnits.toLocaleString()} units | ${routedLines.length} routed, ${notRoutedLines.length} pending`,
      color: 'green',
    },
    {
      title: 'Other Ship Methods',
      value: otherOrders.length,
      progress: totalLines > 0
        ? Math.round((otherOrders.length / totalLines) * 100)
        : 0,
      footer: `${otherUnits.toLocaleString()} units | UPS, FedEx, LTL, Pickup`,
      color: 'blue',
    },
    {
      title: 'ISOs',
      value: isoOrders.length,
      progress: totalLines > 0
        ? Math.round((isoOrders.length / totalLines) * 100)
        : 0,
      footer: `${isoUnits.toLocaleString()} units | Internal Orders`,
      color: 'purple',
    },
    {
      title: 'Exceptions',
      value: exceptionOrders.length,
      progress: totalLines > 0
        ? Math.round((exceptionOrders.length / totalLines) * 100)
        : 0,
      footer: `${exceptionUnits.toLocaleString()} units | ${criticalLines.length} critical, ${warningLines.length} warnings`,
      color: exceptionOrders.length > 0 ? 'red' : 'green',
    },
    {
      title: 'On Hold',
      value: criticalLines.length,
      progress: criticalLines.length > 0 ? 100 : 0,
      footer: `${onHoldUnits.toLocaleString()} units | Requires attention`,
      color: criticalLines.length > 0 ? 'red' : 'green',
    },
    {
      title: 'Not Routed',
      value: notRoutedLines.length,
      progress: notRoutedLines.length > 0 ? 100 : 0,
      footer: `${notRoutedUnits.toLocaleString()} units | Route Truck pending`,
      color: notRoutedLines.length > 0 ? 'orange' : 'green',
    },
  ];
}

// =============================
// DUCKDB INTEGRATION
// =============================

/**
 * Load order data into DuckDB for SQL queries and alerts
 * Runs asynchronously without blocking the UI
 */
async function loadToDuckDB(data: DCOpenOrderLine[], dcId?: number): Promise<void> {
  if (!data || data.length === 0) {
    console.log('[useOrders] No data to load into DuckDB');
    return;
  }

  try {
    // Initialize DuckDB (singleton, returns immediately if already initialized)
    await initializeDuckDB();

    // Load order lines into DuckDB table
    await loadDCOrderLines(data);
    console.log(`[useOrders] Loaded ${data.length} orders into DuckDB`);

    // Load route_plans and dc_onhand asynchronously (fire and forget)
    loadRoutePlansToDuckDB(dcId);
    loadDCOnhandToDuckDB(dcId);
  } catch (error) {
    // Log but don't throw - DuckDB loading is not critical for basic app functionality
    console.warn('[useOrders] Failed to load data into DuckDB:', error);
  }
}

/**
 * Fetch and load route plans into DuckDB (async, non-blocking)
 */
async function loadRoutePlansToDuckDB(dcId?: number): Promise<void> {
  try {
    const routePlans = await fetchRoutePlans(dcId);
    if (routePlans && routePlans.length > 0) {
      await loadRoutePlans(routePlans);
      console.log(`[useOrders] Loaded ${routePlans.length} route plans into DuckDB`);
    }
  } catch (error) {
    console.warn('[useOrders] Failed to load route plans into DuckDB:', error);
  }
}

/**
 * Fetch and load DC onhand inventory into DuckDB (async, non-blocking)
 */
async function loadDCOnhandToDuckDB(dcId?: number): Promise<void> {
  try {
    const onhandData = await fetchDCOnhand(dcId);
    if (onhandData && onhandData.length > 0) {
      await loadDCOnhand(onhandData);
      console.log(`[useOrders] Loaded ${onhandData.length} onhand records into DuckDB`);
    }
  } catch (error) {
    console.warn('[useOrders] Failed to load onhand data into DuckDB:', error);
  }
}

// =============================
// HOOK
// =============================

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const {
    autoRefresh = false,
    refreshInterval = 60000,
    useMockDataFallback = true,
    dc,
  } = options;

  // State
  const [orders, setOrders] = useState<DCOpenOrderLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Refs for interval management
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false); // Prevent duplicate concurrent fetches

  // Derived data
  const orderRows = transformOrders(orders);
  const routeTruckOrders = filterByShipMethod(orderRows, true);
  const otherShipMethodOrders = filterByShipMethod(orderRows, false);
  const exceptionOrders = filterExceptions(orderRows);
  const kpiData = calculateKPIData(orderRows);

  /**
   * Fetch orders from API or fall back to mock data
   */
  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!isMountedRef.current) return;

    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      console.log('[useOrders] Skipping duplicate fetch request');
      return;
    }
    isFetchingRef.current = true;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // First, check if API is available
      const apiHealthy = await checkApiHealth();
      setIsApiAvailable(apiHealthy);

      if (apiHealthy) {
        // Fetch from API with selected DC
        const data = await fetchOpenDCOrderLines({ dc });
        if (isMountedRef.current) {
          setOrders(data);
          setIsUsingMockData(false);
          setLastSynced(new Date());

          // Load data into DuckDB for SQL queries and alerts
          loadToDuckDB(data, dc);
        }
      } else if (useMockDataFallback) {
        // Fall back to mock data
        console.warn('[useOrders] API unavailable, using mock data');
        if (isMountedRef.current) {
          setOrders(mockOrders);
          setIsUsingMockData(true);
          setLastSynced(new Date());
          // Note: Not loading mock data to DuckDB - alerts require real data
        }
      } else {
        throw {
          message: 'API server is unavailable',
          status: 503,
        } as ApiError;
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const apiError = err as ApiError;
      console.error('[useOrders] Error fetching orders:', apiError);

      if (useMockDataFallback) {
        // Use mock data on error
        console.warn('[useOrders] Falling back to mock data due to error');
        setOrders(mockOrders);
        setIsUsingMockData(true);
        setLastSynced(new Date());
        // Don't set error if we have fallback data
      } else {
        setError(apiError);
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [useMockDataFallback, dc]);

  /**
   * Manual refresh action
   */
  const refresh = useCallback(async () => {
    await fetchOrders(true);
  }, [fetchOrders]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchOrders(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrders]);

  // Auto-refresh management
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchOrders(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchOrders]);

  return {
    // Data
    orders,
    orderRows,
    routeTruckOrders,
    otherShipMethodOrders,
    exceptionOrders,
    kpiData,

    // State
    isLoading,
    isRefreshing,
    error,
    lastSynced,
    isApiAvailable,
    isUsingMockData,

    // Actions
    refresh,
    clearError,
  };
}

/**
 * Filter orders by order category (Internal Service Orders)
 */
function filterISOs(orders: OrderRow[]): OrderRow[] {
  return orders.filter((order) => order.raw.order_category === 'INTERNAL ORDER');
}

/**
 * Get sidebar badge counts from orders
 */
export function getSidebarCounts(orderRows: OrderRow[]): Record<string, number> {
  return {
    summary: orderRows.length,
    routeTruck: filterByShipMethod(orderRows, true).length,
    otherShipMethods: filterByShipMethod(orderRows, false).length,
    isos: filterISOs(orderRows).length,
    exceptions: filterExceptions(orderRows).length,
  };
}

export default useOrders;
