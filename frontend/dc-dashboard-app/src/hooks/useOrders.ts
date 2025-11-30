/**
 * useOrders Hook
 * Manages order data fetching from API with fallback to mock data
 * Includes loading states, error handling, and auto-refresh support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DCOpenOrderLine, OrderRow, KPIData, RefreshInterval } from '../types';
import { fetchOpenDCOrderLines, checkApiHealth, type ApiError } from '../services/api';
import {
  mockOrders,
  transformToOrderRow,
  SHIP_METHODS,
} from '../mock/data';

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
 * Calculate KPI data from orders
 */
function calculateKPIData(orders: OrderRow[]): KPIData[] {
  const routeTruckOrders = filterByShipMethod(orders, true);
  const otherOrders = filterByShipMethod(orders, false);
  const exceptionOrders = filterExceptions(orders);

  const totalOrders = orders.length;
  const routedOrders = routeTruckOrders.filter((o) => o.routing === 'success').length;
  const notRoutedOrders = routeTruckOrders.filter((o) => o.routing === 'pending').length;
  const criticalExceptions = exceptionOrders.filter((o) => o.exception === 'critical').length;
  const warningExceptions = exceptionOrders.filter((o) => o.exception === 'warning').length;

  return [
    {
      title: 'Total Orders',
      value: totalOrders,
      progress: 100,
      footer: `${totalOrders} lines to ship today`,
      color: 'blue',
    },
    {
      title: 'Route Truck',
      value: routeTruckOrders.length,
      progress: routeTruckOrders.length > 0
        ? Math.round((routedOrders / routeTruckOrders.length) * 100)
        : 0,
      footer: `${routedOrders} routed, ${notRoutedOrders} pending`,
      color: 'green',
    },
    {
      title: 'Other Ship Methods',
      value: otherOrders.length,
      progress: totalOrders > 0
        ? Math.round((otherOrders.length / totalOrders) * 100)
        : 0,
      footer: 'UPS, FedEx, LTL, Will Call',
      color: 'blue',
    },
    {
      title: 'Exceptions',
      value: exceptionOrders.length,
      progress: totalOrders > 0
        ? Math.round((exceptionOrders.length / totalOrders) * 100)
        : 0,
      footer: `${criticalExceptions} critical, ${warningExceptions} warnings`,
      color: exceptionOrders.length > 0 ? 'red' : 'green',
    },
    {
      title: 'On Hold',
      value: criticalExceptions,
      progress: criticalExceptions > 0 ? 100 : 0,
      footer: 'Requires immediate attention',
      color: criticalExceptions > 0 ? 'red' : 'green',
    },
    {
      title: 'Not Routed',
      value: notRoutedOrders,
      progress: notRoutedOrders > 0 ? 100 : 0,
      footer: 'Route Truck orders pending routing',
      color: notRoutedOrders > 0 ? 'orange' : 'green',
    },
  ];
}

// =============================
// HOOK
// =============================

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const {
    autoRefresh = false,
    refreshInterval = 60000,
    useMockDataFallback = true,
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
        // Fetch from API
        const data = await fetchOpenDCOrderLines();
        if (isMountedRef.current) {
          setOrders(data);
          setIsUsingMockData(false);
          setLastSynced(new Date());
        }
      } else if (useMockDataFallback) {
        // Fall back to mock data
        console.warn('[useOrders] API unavailable, using mock data');
        if (isMountedRef.current) {
          setOrders(mockOrders);
          setIsUsingMockData(true);
          setLastSynced(new Date());
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
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [useMockDataFallback]);

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
