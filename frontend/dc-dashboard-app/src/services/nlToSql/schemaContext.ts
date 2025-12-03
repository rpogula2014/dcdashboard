/**
 * Schema Context Generation
 * Generates schema context strings for LLM prompts
 */

import { listTables, getTableSchema } from '../duckdb/duckdbService';

/**
 * Column descriptions for known tables
 */
const COLUMN_DESCRIPTIONS: Record<string, Record<string, string>> = {
  dc_order_lines: {
    // Order identification
    order_number: 'Order number identifier',
    line_id: 'Order line ID',
    line: 'Line number.shipment number',
    header_id: 'Order header ID',
    orig_sys_document_ref: 'Original system document reference',
    inventory_item_id: 'Inventory item ID',

    // Dates - VARCHAR ISO datetime strings (e.g., '2025-12-03T23:59:00')
    ordered_date: 'VARCHAR ISO datetime - Date the order was placed. Use CAST(ordered_date AS DATE) for date filtering',
    schedule_ship_date: 'VARCHAR ISO datetime - Scheduled shipping date. Use CAST(schedule_ship_date AS DATE) for date filtering',

    // Item information
    ordered_item: 'Item SKU/code',
    item_description: 'Item description',
    productgrp: 'Product group',
    vendor: 'Vendor name',
    style: 'Product style',

    // Quantities
    ordered_quantity: 'Quantity ordered',
    reserved_qty: 'Quantity reserved in inventory',
    localplusqty: 'Local+ quantity available',

    // Customer/Location
    sold_to: 'Sold to customer name',
    ship_to: 'Ship to customer/location code',
    ship_to_addressee: 'Ship to addressee name',
    ship_to_address1: 'Ship to address line 1',
    ship_to_address5: 'Ship to address line 5',
    dc: 'Distribution center code',

    // Shipping
    shipping_method_code: 'Shipping method (ROUTE TRUCK, PARCEL, etc.)',
    shipping_instructions: 'Shipping instructions',
    delivery_id: 'Delivery ID',
    trip_id: 'Trip ID for routing',

    // Order classification
    order_type: 'Order type',
    order_category: "Order category: 'INTERNAL ORDER' or 'CUSTOMER ORDER'",
    line_category_code: 'Line category code',
    fulfillment_type: 'Fulfillment type',
    iso: 'Internal sales order reference',
    price_list: 'Price list name',
    set_name: 'Ship set name',
    original_line_status: "Line status (Ready to Release, Backordered, Release to Warehouse, Staged/Pick Confirmed, Shipped)",

    // Status flags (Y/N values)
    hold_applied: "'Y' if hold applied, 'N' if not",
    hold_released: "'Y' if hold released, 'N' if not",
    routed: "'Y' if routed to Descartes, 'N' if not",
    planned: "'Y' if planned from Descartes, 'N' if not",
    localplusqtyexists: "'Y' if local+ quantity exists, 'N' if not",

    // Computed numeric flags (1/0) - use these for counting/filtering
    hold_applied_flag: '1 if on hold, 0 if not (use for counting)',
    hold_released_flag: '1 if hold released, 0 if not (use for counting)',
    routed_flag: '1 if routed, 0 if not (use for counting)',
    planned_flag: '1 if planned, 0 if not (use for counting)',
    localplusqtyexists_flag: '1 if local+ exists, 0 if not',
  },
  route_plans: {
    route_id: 'Unique route identifier',
    route_name: 'Route name/description',
    schedule_key: 'Schedule identifier',
    driver_key: 'Driver identifier',
    truck_key: 'Truck identifier',
    process_code: 'Process code',
    trip_id: 'Trip identifier (links to dc_order_lines)',
    route_start_date: 'DATETIME - Route start date. Use CAST(route_start_date AS DATE) for date filtering',
    location_key: 'Stop location identifier',
    location_type: 'Type of location (pickup, delivery)',
    location_name: 'Location name',
    stop_number: 'Stop sequence number',
    order_number: 'Order number at this stop',
    linenum: 'Line number',
    order_type: 'Type of order',
    delivery_id: 'Delivery identifier',
    ordered_item: 'Item being delivered',
    quantity: 'Quantity for this stop',
    order_key: 'Order key',
    product_key: 'Product key',
    back_order_flag: "'Y' if backorder, 'N' if not",
    is_back_order: '1 if backorder, 0 if not (use for counting)',
  },
  dc_onhand: {
    inventory_item_id: 'Unique inventory item identifier',
    itemnumber: 'Item number/SKU code',
    item_description: 'Description of the item',
    subinventory_code: 'Subinventory code (STOCK, QUICKPICK, STAGE, REDELIVER, RECRTS, RECSPECIAL, etc.)',
    quantity: 'Quantity on hand at this location',
    locator: 'Storage locator code within the subinventory',
    aisle: 'Aisle identifier within the warehouse',
    customsubinventory: 'Custom subinventory data (JSON type)',
    vendor: 'Internal vendor code (DO NOT use for user queries)',
    vendor_display: 'User-friendly vendor name - ALWAYS USE THIS for vendor queries (e.g., "Hercules")',
    product_group: 'Product group code',
    productgrp: 'Product group description',
    style: 'Product style identifier',
  },
};

/**
 * Get human-readable description for known columns
 */
export function getColumnDescription(tableName: string, columnName: string): string {
  return COLUMN_DESCRIPTIONS[tableName]?.[columnName] || 'Column data';
}

/**
 * Generate the schema context string for the LLM
 * This describes the available tables and columns
 */
export async function generateSchemaContext(): Promise<string> {
  const tables = await listTables();
  const schemaLines: string[] = [];

  for (const tableName of tables) {
    const columns = await getTableSchema(tableName);
    schemaLines.push(`\nTable: ${tableName}`);
    schemaLines.push('Columns:');

    for (const col of columns) {
      const description = getColumnDescription(tableName, col.column_name);
      schemaLines.push(`  - ${col.column_name} (${col.data_type}): ${description}`);
    }
  }

  return schemaLines.join('\n');
}
