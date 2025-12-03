/**
 * useRoutePlans Hook
 * Fetches and transforms Descartes route plan data into hierarchical structure
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RoutePlanRaw, Route, RouteOrderLine } from '../types';
import { fetchRoutePlans, type ApiError } from '../services/api';

export interface UseRoutePlansResult {
  // Raw data
  rawData: RoutePlanRaw[];
  // Transformed hierarchical data
  routes: Route[];
  // State
  isLoading: boolean;
  error: ApiError | null;
  // Actions
  refresh: () => Promise<void>;
}

/**
 * Transform flat route plan data into hierarchical structure
 * Level 1: Routes -> Level 2: Stops -> Level 3: Order Lines
 */
function transformToHierarchy(rawData: RoutePlanRaw[]): Route[] {
  const routeMap = new Map<number, Route>();

  rawData.forEach((item) => {
    const routeId = item.route_id;

    // Get or create route
    if (!routeMap.has(routeId)) {
      routeMap.set(routeId, {
        route_id: item.route_id,
        route_name: item.route_name,
        schedule_key: item.schedule_key,
        driver_key: item.driver_key,
        truck_key: item.truck_key,
        process_code: item.process_code,
        trip_id: item.trip_id,
        route_start_date: item.route_start_date,
        stops: [],
      });
    }

    const route = routeMap.get(routeId)!;

    // Create stop key for grouping
    const stopKey = `${item.location_key}-${item.stop_number}`;

    // Find or create stop
    let stop = route.stops.find(
      (s) => `${s.location_key}-${s.stop_number}` === stopKey
    );

    if (!stop) {
      stop = {
        location_key: item.location_key,
        location_type: item.location_type,
        location_name: item.location_name,
        stop_number: item.stop_number,
        orderLines: [],
      };
      route.stops.push(stop);
    }

    // Add order line
    const orderLine: RouteOrderLine = {
      order_number: item.order_number,
      linenum: item.linenum,
      order_type: item.order_type,
      delivery_id: item.delivery_id,
      ordered_item: item.ordered_item,
      quantity: item.quantity,
      order_key: item.order_key,
      product_key: item.product_key,
      back_order_flag: item.back_order_flag,
    };

    stop.orderLines.push(orderLine);
  });

  // Convert map to array and sort by route_id
  const routes = Array.from(routeMap.values());

  // Sort routes by route_id
  routes.sort((a, b) => a.route_id - b.route_id);

  // Sort stops within each route by stop_number
  routes.forEach((route) => {
    route.stops.sort((a, b) => (a.stop_number ?? 0) - (b.stop_number ?? 0));
  });

  return routes;
}

export function useRoutePlans(dcid?: number): UseRoutePlansResult {
  const [rawData, setRawData] = useState<RoutePlanRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    if (!dcid) {
      setRawData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchRoutePlans(dcid);
      setRawData(data);
    } catch (err) {
      setError(err as ApiError);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  }, [dcid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const routes = useMemo(() => transformToHierarchy(rawData), [rawData]);

  return {
    rawData,
    routes,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export default useRoutePlans;
