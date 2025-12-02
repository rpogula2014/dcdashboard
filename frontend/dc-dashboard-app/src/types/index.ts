/**
 * DC Dashboard Type Definitions
 * Based on Python API DCOpenOrderLine model
 */

// Order line from Python API
export interface DCOpenOrderLine {
  // Order identification
  ordered_date: string | null;
  line_category_code: string | null;
  ordered_item: string | null;
  order_category: 'INTERNAL ORDER' | 'CUSTOMER ORDER' | null;
  inventory_item_id: number | null;
  orig_sys_document_ref: string | null;
  order_number: number | null;
  line_id: number | null;
  shipping_instructions: string | null;
  line: string | null;
  schedule_ship_date: string | null;
  ordered_quantity: number | null;
  reserved_qty: number | null;
  shipping_method_code: string | null;
  iso: string | null;
  fulfillment_type: string | null;
  order_type: string | null;
  price_list: string | null;
  sold_to: string | null;
  dc: string | null;
  ship_to: string | null;
  ship_to_address1: string | null;
  ship_to_address5: string | null;
  set_name: string | null;
  header_id: number | null;
  ship_to_addressee: string | null;
  delivery_id: number | null;
  trip_id?: string | number | null;
  original_line_status: string | null;
  requested_quantity: number | null;

  // Item details (for tooltip)
  item_description: string | null;
  productgrp: string | null;
  vendor: string | null;
  style: string | null;

  // Status flags
  hold_applied: 'Y' | 'N' | null;
  hold_released: 'Y' | 'N' | null;
  routed: 'Y' | 'N' | null;
  localplusqtyexists: 'Y' | 'N' | null;
  localplusqty: number | null;
  planned: 'Y' | 'N' | null;
}

// Page navigation keys
export type PageKey =
  | 'summary'
  | 'routeTruck'
  | 'otherShipMethods'
  | 'isos'
  | 'onhand'
  | 'cycleCount'
  | 'traction'
  | 'analytics'
  | 'descartes';

// KPI Card data structure
export interface KPIData {
  title: string;
  value: number;
  progress?: number;
  footer?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
}

// Exception types for order highlighting
export type ExceptionType =
  | 'critical'   // Order on hold, late
  | 'warning'    // Not routed, short quantity
  | null;        // No exception

// Status icon variants
export type StatusType =
  | 'success'    // Completed successfully
  | 'fail'       // Failed
  | 'pending'    // In progress
  | 'na';        // Not applicable

// Order display row (transformed from DCOpenOrderLine for table display)
export interface OrderRow {
  key: string;
  orderNumber: number;
  lineNumber: string;
  customer: string;
  item: string;
  lines: number;
  shipMethod: string;
  shipSet: string;
  status: string;
  routing: StatusType;
  dueTime: string;
  exception: ExceptionType;
  // Quantity fields
  orderedQty: number;
  reservedQty: number;
  // Hold status
  holdApplied: boolean;
  holdReleased: boolean;
  // Original data for reference
  raw: DCOpenOrderLine;
}

// Auto-refresh intervals
export type RefreshInterval =
  | 0       // Off
  | 30000   // 30 seconds
  | 60000   // 1 minute
  | 300000; // 5 minutes

// Sidebar navigation item
export interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

// Filter state for orders
export interface OrderFilters {
  status?: string[];
  shipMethod?: string[];
  dateRange?: [string, string];
  search?: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
  pageSize: number;
}

// Descartes Route Plan types
export interface RoutePlanRaw {
  route_id: number;
  route_name: string | null;
  schedule_key: string | null;
  driver_key: string | null;
  truck_key: string | null;
  process_code: string | null;
  trip_id: number | null;
  route_start_date: string | null;
  location_key: string | null;
  location_type: string | null;
  location_name: string | null;
  stop_number: number | null;
  order_number: string | null;
  linenum: string | null;
  order_type: string | null;
  delivery_id: number | null;
  ordered_item: string | null;
  quantity: number | null;
  order_key: string | null;
  product_key: string | null;
  back_order_flag: string | null;
}

// Level 3: Order Line within a stop
export interface RouteOrderLine {
  order_number: string | null;
  linenum: string | null;
  order_type: string | null;
  delivery_id: number | null;
  ordered_item: string | null;
  quantity: number | null;
  order_key: string | null;
  product_key: string | null;
  back_order_flag: string | null;
}

// Level 2: Stop within a route
export interface RouteStop {
  location_key: string | null;
  location_type: string | null;
  location_name: string | null;
  stop_number: number | null;
  orderLines: RouteOrderLine[];
}

// Level 1: Route
export interface Route {
  route_id: number;
  route_name: string | null;
  schedule_key: string | null;
  driver_key: string | null;
  truck_key: string | null;
  process_code: string | null;
  trip_id: number | null;
  route_start_date: string | null;
  stops: RouteStop[];
}
