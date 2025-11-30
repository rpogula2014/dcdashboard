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
}

// Page navigation keys
export type PageKey =
  | 'summary'
  | 'routeTruck'
  | 'otherShipMethods'
  | 'exceptions'
  | 'isos'
  | 'onhand'
  | 'cycleCount'
  | 'traction'
  | 'analytics';

// KPI Card data structure
export interface KPIData {
  title: string;
  value: number;
  progress?: number;
  footer?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
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
