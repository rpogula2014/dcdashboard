/**
 * Mock Data for DC Dashboard Development
 * Contains sample orders for all ship methods, statuses, and exception scenarios
 */

import type { DCOpenOrderLine, OrderRow, KPIData, StatusType, ExceptionType } from '../types';

// Helper to get date strings
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Ship method codes - display names
export const SHIP_METHODS = {
  ROUTE_TRUCK: 'Route Truck',
  UPS_GROUND: 'UPS Ground',
  UPS_2DAY: 'UPS 2nd Day Air',
  UPS_NEXT_DAY: 'UPS Next Day Air',
  FEDEX_GROUND: 'FedEx Ground',
  FEDEX_EXPRESS: 'FedEx Express',
  WILL_CALL: 'Will Call',
  LTL_FREIGHT: 'LTL Freight',
} as const;

// API ship method codes that map to Route Truck
export const ROUTE_TRUCK_CODES = [
  '000001_RUTTRUK_T_GND',  // API code for Route Truck
  'Route Truck',           // Display name (for mock data)
] as const;

/**
 * Check if a ship method code is Route Truck
 */
export function isRouteTruck(shipMethodCode: string | null | undefined): boolean {
  if (!shipMethodCode) return false;
  return ROUTE_TRUCK_CODES.some(code =>
    shipMethodCode.toUpperCase().includes(code.toUpperCase()) ||
    code.toUpperCase().includes(shipMethodCode.toUpperCase())
  );
}

/**
 * Get display name for ship method code
 */
export function getShipMethodDisplayName(shipMethodCode: string | null | undefined): string {
  if (!shipMethodCode) return 'Unknown';
  if (isRouteTruck(shipMethodCode)) return SHIP_METHODS.ROUTE_TRUCK;
  return shipMethodCode;
}

// Order statuses
export const ORDER_STATUSES = {
  READY_TO_RELEASE: 'Ready to Release',
  AWAITING_SHIPPING: 'Awaiting Shipping',
  BACKORDERED: 'Backordered',
  AWAITING_RECEIPT: 'Awaiting Receipt',
  ENTERED: 'Entered',
  STAGED: 'Staged/Pick Confirmed',
  SHIPPED: 'Shipped',
} as const;

// Generate mock DCOpenOrderLine data
export const mockOrders: DCOpenOrderLine[] = [
  // =============================
  // ROUTE TRUCK ORDERS (high volume)
  // =============================

  // Normal Route Truck orders - routed successfully
  {
    ordered_date: formatDate(addDays(today, -2)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-LT275/65R18',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10001,
    orig_sys_document_ref: 'ECOMM-78901',
    order_number: 1001234,
    line_id: 1,
    shipping_instructions: 'Deliver to loading dock B',
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'ABC Tire Center',
    dc: 'DC-PHX',
    ship_to: 'ABC Tire Center - Main',
    ship_to_address1: '1234 Industrial Blvd',
    ship_to_address5: 'Phoenix, AZ 85001',
    set_name: 'STANDARD',
    header_id: 5001234,
    ship_to_addressee: 'John Smith',
    delivery_id: 9001234,
    original_line_status: ORDER_STATUSES.AWAITING_SHIPPING,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P225/60R16',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10002,
    orig_sys_document_ref: 'ECOMM-78902',
    order_number: 1001235,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 8,
    reserved_qty: 8,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'WHOLESALE',
    sold_to: 'Quick Lube Express',
    dc: 'DC-PHX',
    ship_to: 'Quick Lube - Downtown',
    ship_to_address1: '567 Main Street',
    ship_to_address5: 'Tempe, AZ 85281',
    set_name: 'STANDARD',
    header_id: 5001235,
    ship_to_addressee: 'Mike Johnson',
    delivery_id: 9001235,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 8,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P245/45R19',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10003,
    orig_sys_document_ref: 'POS-34521',
    order_number: 1001236,
    line_id: 1,
    shipping_instructions: 'Call before delivery',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 1)),
    ordered_quantity: 2,
    reserved_qty: 2,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Premier Auto Shop',
    dc: 'DC-PHX',
    ship_to: 'Premier Auto - West',
    ship_to_address1: '890 Commerce Drive',
    ship_to_address5: 'Glendale, AZ 85301',
    set_name: 'STANDARD',
    header_id: 5001236,
    ship_to_addressee: 'Sarah Williams',
    delivery_id: 9001236,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 2,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },

  // =============================
  // EXCEPTION: Route Truck NOT ROUTED (warning)
  // =============================
  {
    ordered_date: formatDate(addDays(today, -2)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-LT265/70R17',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10004,
    orig_sys_document_ref: 'ECOMM-78903',
    order_number: 1001237,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 6,
    reserved_qty: 6,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'WHOLESALE',
    sold_to: 'Valley Tire Warehouse',
    dc: 'DC-PHX',
    ship_to: 'Valley Tire - Chandler',
    ship_to_address1: '2345 Automotive Way',
    ship_to_address5: 'Chandler, AZ 85225',
    set_name: 'STANDARD',
    header_id: 5001237,
    ship_to_addressee: 'Dave Brown',
    delivery_id: 9001237,
    original_line_status: ORDER_STATUSES.AWAITING_SHIPPING,
    requested_quantity: 6,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N', // NOT ROUTED - Exception
  },
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P205/55R16',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10005,
    orig_sys_document_ref: 'POS-34522',
    order_number: 1001238,
    line_id: 1,
    shipping_instructions: 'Gate code: 1234',
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Budget Auto Care',
    dc: 'DC-PHX',
    ship_to: 'Budget Auto - Mesa',
    ship_to_address1: '4567 Service Road',
    ship_to_address5: 'Mesa, AZ 85201',
    set_name: 'STANDARD',
    header_id: 5001238,
    ship_to_addressee: 'Lisa Chen',
    delivery_id: 9001238,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 4,
    item_description: 'All-Terrain Tire 265/70R17',
    productgrp: 'TIRES',
    vendor: 'Goodyear',
    style: 'Wrangler AT',
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N', // NOT ROUTED - Exception
  },

  // =============================
  // EXCEPTION: Orders ON HOLD (critical)
  // =============================
  {
    ordered_date: formatDate(addDays(today, -3)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P255/35R20',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10006,
    orig_sys_document_ref: 'ECOMM-78904',
    order_number: 1001239,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Elite Performance',
    dc: 'DC-PHX',
    ship_to: 'Elite Performance - Scottsdale',
    ship_to_address1: '7890 Luxury Lane',
    ship_to_address5: 'Scottsdale, AZ 85254',
    set_name: 'STANDARD',
    header_id: 5001239,
    ship_to_addressee: 'Robert Davis',
    delivery_id: null,
    original_line_status: ORDER_STATUSES.ENTERED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'Y', // ON HOLD - Critical Exception
    hold_released: 'N',
    routed: 'N',
  },
  {
    ordered_date: formatDate(addDays(today, -4)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-WHEEL-18X8-BLK',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10020,
    orig_sys_document_ref: 'POS-34523',
    order_number: 1001240,
    line_id: 1,
    shipping_instructions: 'Credit hold pending',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, -1)),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.UPS_GROUND,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'WHOLESALE',
    sold_to: 'AutoZone #4521',
    dc: 'DC-PHX',
    ship_to: 'AutoZone Distribution',
    ship_to_address1: '1111 Warehouse Blvd',
    ship_to_address5: 'Phoenix, AZ 85007',
    set_name: 'STANDARD',
    header_id: 5001240,
    ship_to_addressee: 'Receiving Dept',
    delivery_id: null,
    original_line_status: ORDER_STATUSES.ENTERED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'Y', // ON HOLD - Critical Exception
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // EXCEPTION: LATE/OVERDUE Orders (critical)
  // =============================
  {
    ordered_date: formatDate(addDays(today, -5)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-LT285/75R16',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10007,
    orig_sys_document_ref: 'ECOMM-78905',
    order_number: 1001241,
    line_id: 1,
    shipping_instructions: 'URGENT - Customer waiting',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, -2)), // PAST DUE
    ordered_quantity: 8,
    reserved_qty: 8,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Rush',
    price_list: 'RETAIL',
    sold_to: 'Truck Stop Tire Service',
    dc: 'DC-PHX',
    ship_to: 'Truck Stop - I-10',
    ship_to_address1: '9999 Highway Service Rd',
    ship_to_address5: 'Buckeye, AZ 85326',
    set_name: 'RUSH',
    header_id: 5001241,
    ship_to_addressee: 'Fleet Manager',
    delivery_id: 9001241,
    original_line_status: ORDER_STATUSES.AWAITING_SHIPPING,
    requested_quantity: 8,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },
  {
    ordered_date: formatDate(addDays(today, -4)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P195/65R15',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10008,
    orig_sys_document_ref: 'POS-34524',
    order_number: 1001242,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, -1)), // PAST DUE
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.UPS_GROUND,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Discount Tire Direct',
    dc: 'DC-PHX',
    ship_to: 'Discount Tire Direct',
    ship_to_address1: '3333 Economy Blvd',
    ship_to_address5: 'Gilbert, AZ 85234',
    set_name: 'STANDARD',
    header_id: 5001242,
    ship_to_addressee: 'Order Desk',
    delivery_id: 9001242,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // EXCEPTION: SHORT QUANTITY (warning)
  // =============================
  {
    ordered_date: formatDate(addDays(today, -2)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P235/55R18',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10009,
    orig_sys_document_ref: 'ECOMM-78906',
    order_number: 1001243,
    line_id: 1,
    shipping_instructions: 'Partial OK if needed',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 1)),
    ordered_quantity: 10,
    reserved_qty: 6, // SHORT - Only 6 of 10 reserved
    shipping_method_code: SHIP_METHODS.LTL_FREIGHT,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'WHOLESALE',
    sold_to: 'Costco Tire Center',
    dc: 'DC-PHX',
    ship_to: 'Costco #1234',
    ship_to_address1: '5555 Warehouse Row',
    ship_to_address5: 'Phoenix, AZ 85043',
    set_name: 'STANDARD',
    header_id: 5001243,
    ship_to_addressee: 'Tire Department',
    delivery_id: 9001243,
    original_line_status: ORDER_STATUSES.BACKORDERED,
    requested_quantity: 10,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-WHEEL-17X7.5-SLV',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10021,
    orig_sys_document_ref: 'POS-34525',
    order_number: 1001244,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 8,
    reserved_qty: 4, // SHORT - Only 4 of 8 reserved
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Wheel Warehouse',
    dc: 'DC-PHX',
    ship_to: 'Wheel Warehouse - Central',
    ship_to_address1: '6666 Rim Road',
    ship_to_address5: 'Tempe, AZ 85283',
    set_name: 'STANDARD',
    header_id: 5001244,
    ship_to_addressee: 'Parts Dept',
    delivery_id: 9001244,
    original_line_status: ORDER_STATUSES.AWAITING_RECEIPT,
    requested_quantity: 8,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },

  // =============================
  // UPS ORDERS (Other ship methods)
  // =============================
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P215/45R17',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10010,
    orig_sys_document_ref: 'WEB-99001',
    order_number: 1001245,
    line_id: 1,
    shipping_instructions: 'Leave at door',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 2)),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.UPS_GROUND,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'John Homeowner',
    dc: 'DC-PHX',
    ship_to: 'Residential',
    ship_to_address1: '123 Maple Street',
    ship_to_address5: 'Phoenix, AZ 85014',
    set_name: 'STANDARD',
    header_id: 5001245,
    ship_to_addressee: 'John Homeowner',
    delivery_id: 9001245,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P225/45R18',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10011,
    orig_sys_document_ref: 'WEB-99002',
    order_number: 1001246,
    line_id: 1,
    shipping_instructions: 'Signature required',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 1)),
    ordered_quantity: 2,
    reserved_qty: 2,
    shipping_method_code: SHIP_METHODS.UPS_2DAY,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Rush',
    price_list: 'RETAIL',
    sold_to: 'Sarah Connor',
    dc: 'DC-PHX',
    ship_to: 'Residential',
    ship_to_address1: '456 Oak Avenue',
    ship_to_address5: 'Scottsdale, AZ 85260',
    set_name: 'RUSH',
    header_id: 5001246,
    ship_to_addressee: 'Sarah Connor',
    delivery_id: 9001246,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 2,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P295/30R22',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10012,
    orig_sys_document_ref: 'WEB-99003',
    order_number: 1001247,
    line_id: 1,
    shipping_instructions: 'ASAP - Customer racing',
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.UPS_NEXT_DAY,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Rush',
    price_list: 'RETAIL',
    sold_to: 'Fast Eddie Racing',
    dc: 'DC-PHX',
    ship_to: 'Track Delivery',
    ship_to_address1: '1 Speedway Blvd',
    ship_to_address5: 'Avondale, AZ 85323',
    set_name: 'RUSH',
    header_id: 5001247,
    ship_to_addressee: 'Pit Crew',
    delivery_id: 9001247,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // FEDEX ORDERS
  // =============================
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P185/60R15',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10013,
    orig_sys_document_ref: 'WEB-99004',
    order_number: 1001248,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 3)),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.FEDEX_GROUND,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Mary Shopper',
    dc: 'DC-PHX',
    ship_to: 'Residential',
    ship_to_address1: '789 Pine Lane',
    ship_to_address5: 'Mesa, AZ 85204',
    set_name: 'STANDARD',
    header_id: 5001248,
    ship_to_addressee: 'Mary Shopper',
    delivery_id: 9001248,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P265/50R20',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10014,
    orig_sys_document_ref: 'WEB-99005',
    order_number: 1001249,
    line_id: 1,
    shipping_instructions: 'Hold at FedEx location',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 1)),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.FEDEX_EXPRESS,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Rush',
    price_list: 'RETAIL',
    sold_to: 'Tom Traveler',
    dc: 'DC-PHX',
    ship_to: 'FedEx Office Hold',
    ship_to_address1: '1000 Airport Way',
    ship_to_address5: 'Phoenix, AZ 85034',
    set_name: 'RUSH',
    header_id: 5001249,
    ship_to_addressee: 'Tom Traveler',
    delivery_id: 9001249,
    original_line_status: ORDER_STATUSES.AWAITING_SHIPPING,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // WILL CALL ORDERS
  // =============================
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P235/65R17',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10015,
    orig_sys_document_ref: 'COUNTER-001',
    order_number: 1001250,
    line_id: 1,
    shipping_instructions: 'Customer pickup today',
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.WILL_CALL,
    iso: 'US',
    fulfillment_type: 'PICKUP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Walk-in Customer',
    dc: 'DC-PHX',
    ship_to: 'Will Call Counter',
    ship_to_address1: 'DC-PHX Will Call',
    ship_to_address5: 'Phoenix, AZ 85009',
    set_name: 'STANDARD',
    header_id: 5001250,
    ship_to_addressee: 'Walk-in Customer',
    delivery_id: null,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // LTL FREIGHT ORDERS
  // =============================
  {
    ordered_date: formatDate(addDays(today, -2)),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-11R22.5-STEER',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10016,
    orig_sys_document_ref: 'EDI-55001',
    order_number: 1001251,
    line_id: 1,
    shipping_instructions: 'Liftgate required',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 2)),
    ordered_quantity: 20,
    reserved_qty: 20,
    shipping_method_code: SHIP_METHODS.LTL_FREIGHT,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'WHOLESALE',
    sold_to: 'Big Rig Tire Supply',
    dc: 'DC-PHX',
    ship_to: 'Big Rig - Tucson',
    ship_to_address1: '8888 Trucking Blvd',
    ship_to_address5: 'Tucson, AZ 85706',
    set_name: 'FREIGHT',
    header_id: 5001251,
    ship_to_addressee: 'Receiving Dock',
    delivery_id: 9001251,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 20,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // INTERNAL ORDERS
  // =============================
  {
    ordered_date: formatDate(addDays(today, -1)),
    line_category_code: 'TRANSFER',
    ordered_item: 'DG-TIRE-P225/50R17',
    order_category: 'INTERNAL ORDER',
    inventory_item_id: 10017,
    orig_sys_document_ref: 'INT-DC-LAX',
    order_number: 9001001,
    line_id: 1,
    shipping_instructions: 'DC to DC transfer',
    line: '1.1',
    schedule_ship_date: formatDate(addDays(today, 1)),
    ordered_quantity: 50,
    reserved_qty: 50,
    shipping_method_code: SHIP_METHODS.LTL_FREIGHT,
    iso: 'US',
    fulfillment_type: 'TRANSFER',
    order_type: 'Transfer',
    price_list: 'INTERNAL',
    sold_to: 'DC-LAX',
    dc: 'DC-PHX',
    ship_to: 'DC-LAX Warehouse',
    ship_to_address1: '500 Distribution Way',
    ship_to_address5: 'Los Angeles, CA 90001',
    set_name: 'TRANSFER',
    header_id: 5009001,
    ship_to_addressee: 'Receiving',
    delivery_id: 9009001,
    original_line_status: ORDER_STATUSES.AWAITING_SHIPPING,
    requested_quantity: 50,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'N',
  },

  // =============================
  // ADDITIONAL ROUTE TRUCK ORDERS (for volume)
  // =============================
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P245/70R17',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10018,
    orig_sys_document_ref: 'ECOMM-78907',
    order_number: 1001252,
    line_id: 1,
    shipping_instructions: null,
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Sunrise Tire Co',
    dc: 'DC-PHX',
    ship_to: 'Sunrise Tire - East',
    ship_to_address1: '2222 Morning Drive',
    ship_to_address5: 'Gilbert, AZ 85296',
    set_name: 'STANDARD',
    header_id: 5001252,
    ship_to_addressee: 'Parts Counter',
    delivery_id: 9001252,
    original_line_status: ORDER_STATUSES.READY_TO_RELEASE,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },
  {
    ordered_date: formatDate(today),
    line_category_code: 'ORDER',
    ordered_item: 'DG-TIRE-P275/60R20',
    order_category: 'CUSTOMER ORDER',
    inventory_item_id: 10019,
    orig_sys_document_ref: 'POS-34526',
    order_number: 1001253,
    line_id: 1,
    shipping_instructions: 'After 2pm delivery',
    line: '1.1',
    schedule_ship_date: formatDate(today),
    ordered_quantity: 4,
    reserved_qty: 4,
    shipping_method_code: SHIP_METHODS.ROUTE_TRUCK,
    iso: 'US',
    fulfillment_type: 'SHIP',
    order_type: 'Standard',
    price_list: 'RETAIL',
    sold_to: 'Performance Plus Auto',
    dc: 'DC-PHX',
    ship_to: 'Performance Plus - Peoria',
    ship_to_address1: '3333 Fast Lane',
    ship_to_address5: 'Peoria, AZ 85383',
    set_name: 'STANDARD',
    header_id: 5001253,
    ship_to_addressee: 'Service Manager',
    delivery_id: 9001253,
    original_line_status: ORDER_STATUSES.STAGED,
    requested_quantity: 4,
    item_description: null,
    productgrp: null,
    vendor: null,
    style: null,
    hold_applied: 'N',
    hold_released: 'N',
    routed: 'Y',
  },
];

// =============================
// HELPER FUNCTIONS
// =============================

/**
 * Determine exception type based on order data
 */
export function getExceptionType(order: DCOpenOrderLine): ExceptionType {
  // Shipped orders should not have exceptions
  if (order.original_line_status === ORDER_STATUSES.SHIPPED) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Critical: On hold
  if (order.hold_applied === 'Y' && order.hold_released !== 'Y') {
    return 'critical';
  }

  // Critical: Late/overdue (only for non-shipped orders)
  if (order.schedule_ship_date) {
    const shipDate = new Date(order.schedule_ship_date);
    shipDate.setHours(0, 0, 0, 0);
    if (shipDate < today) {
      return 'critical';
    }
  }

  // Warning: Route Truck not routed
  if (isRouteTruck(order.shipping_method_code) && order.routed === 'N') {
    return 'warning';
  }

  // Warning: Short quantity
  if (
    order.reserved_qty !== null &&
    order.ordered_quantity !== null &&
    order.reserved_qty < order.ordered_quantity
  ) {
    return 'warning';
  }

  return null;
}

/**
 * Determine routing status type
 */
export function getRoutingStatus(order: DCOpenOrderLine): StatusType {
  // Route Truck orders need routing
  if (isRouteTruck(order.shipping_method_code)) {
    return order.routed === 'Y' ? 'success' : 'pending';
  }
  // Non-route truck orders don't need routing
  return 'na';
}

/**
 * Determine tracking status type
 */
export function getTrackingStatus(order: DCOpenOrderLine): StatusType {
  // If picked or staged, tracking may be available
  if (order.original_line_status === ORDER_STATUSES.STAGED ||
      order.original_line_status === ORDER_STATUSES.STAGED) {
    return order.delivery_id ? 'success' : 'pending';
  }
  // Not yet at tracking stage
  return 'na';
}

/**
 * Transform DCOpenOrderLine to OrderRow for table display
 */
export function transformToOrderRow(order: DCOpenOrderLine): OrderRow {
  const shipDate = order.schedule_ship_date ? new Date(order.schedule_ship_date) : null;

  return {
    key: `${order.order_number}-${order.line_id}`,
    orderNumber: order.order_number || 0,
    lineNumber: order.line || '',
    customer: order.sold_to || 'Unknown',
    item: order.ordered_item || 'N/A',
    lines: 1, // We'd aggregate this in real implementation
    shipMethod: getShipMethodDisplayName(order.shipping_method_code),
    shipSet: order.set_name || 'N/A',
    status: order.original_line_status || 'Unknown',
    routing: getRoutingStatus(order),
    dueTime: shipDate
      ? shipDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'N/A',
    exception: getExceptionType(order),
    // Quantity fields
    orderedQty: order.ordered_quantity || 0,
    reservedQty: order.reserved_qty || 0,
    // Hold status
    holdApplied: order.hold_applied === 'Y',
    holdReleased: order.hold_released === 'Y',
    raw: order,
  };
}

/**
 * Get all orders as OrderRows
 */
export function getMockOrderRows(): OrderRow[] {
  return mockOrders.map(transformToOrderRow);
}

/**
 * Get orders filtered by ship method
 */
export function getOrdersByShipMethod(shipMethod: string): OrderRow[] {
  return mockOrders
    .filter(order => order.shipping_method_code === shipMethod)
    .map(transformToOrderRow);
}

/**
 * Get Route Truck orders (only CUSTOMER ORDER category)
 */
export function getRouteTruckOrders(): OrderRow[] {
  return mockOrders
    .filter(order =>
      order.shipping_method_code === SHIP_METHODS.ROUTE_TRUCK &&
      order.order_category === 'CUSTOMER ORDER'
    )
    .map(transformToOrderRow);
}

/**
 * Get non-Route Truck orders (Others)
 */
export function getOtherShipMethodOrders(): OrderRow[] {
  return mockOrders
    .filter(order => !isRouteTruck(order.shipping_method_code))
    .map(transformToOrderRow);
}

/**
 * Get exception orders only
 */
export function getExceptionOrders(): OrderRow[] {
  return mockOrders
    .filter(order => getExceptionType(order) !== null)
    .map(transformToOrderRow);
}

/**
 * Get KPI summary data
 */
export function getMockKPIData(): KPIData[] {
  const allOrders = getMockOrderRows();
  const routeTruckOrders = getRouteTruckOrders();
  const exceptionOrders = getExceptionOrders();
  const otherOrders = getOtherShipMethodOrders();

  const totalOrders = allOrders.length;
  const routedOrders = routeTruckOrders.filter(o => o.routing === 'success').length;
  const notRoutedOrders = routeTruckOrders.filter(o => o.routing === 'pending').length;
  const criticalExceptions = exceptionOrders.filter(o => o.exception === 'critical').length;
  const warningExceptions = exceptionOrders.filter(o => o.exception === 'warning').length;

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
      progress: Math.round((routedOrders / routeTruckOrders.length) * 100) || 0,
      footer: `${routedOrders} routed, ${notRoutedOrders} pending`,
      color: 'green',
    },
    {
      title: 'Other Ship Methods',
      value: otherOrders.length,
      progress: Math.round((otherOrders.length / totalOrders) * 100) || 0,
      footer: 'UPS, FedEx, LTL, Will Call',
      color: 'blue',
    },
    {
      title: 'Exceptions',
      value: exceptionOrders.length,
      progress: Math.round((exceptionOrders.length / totalOrders) * 100) || 0,
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

/**
 * Get sidebar badge counts
 */
export function getSidebarBadgeCounts(): Record<string, number> {
  return {
    summary: getMockOrderRows().length,
    routeTruck: getRouteTruckOrders().length,
    otherShipMethods: getOtherShipMethodOrders().length,
    exceptions: getExceptionOrders().length,
  };
}
