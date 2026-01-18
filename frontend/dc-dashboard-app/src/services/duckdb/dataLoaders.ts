/**
 * Data Loaders for DuckDB
 * Loads DC Order Lines and Route Plans into DuckDB for querying
 */

import type { DCOpenOrderLine, RoutePlanRaw, InvoiceLineRaw } from '../../types';
import type { DCOnhandItem } from '../api';
import { insertData, executeQuery, getConnection, tableExists } from './duckdbService';

// Table names
export const TABLE_NAMES = {
  DC_ORDER_LINES: 'dc_order_lines',
  ROUTE_PLANS: 'route_plans',
  DC_ONHAND: 'dc_onhand',
  INVOICE_LINES: 'invoice_lines',
} as const;

// Track data loading state
interface DataLoadState {
  dcOrderLines: {
    loaded: boolean;
    count: number;
    lastLoaded: Date | null;
  };
  routePlans: {
    loaded: boolean;
    count: number;
    lastLoaded: Date | null;
  };
  dcOnhand: {
    loaded: boolean;
    count: number;
    lastLoaded: Date | null;
  };
  invoiceLines: {
    loaded: boolean;
    count: number;
    lastLoaded: Date | null;
  };
}

let loadState: DataLoadState = {
  dcOrderLines: { loaded: false, count: 0, lastLoaded: null },
  routePlans: { loaded: false, count: 0, lastLoaded: null },
  dcOnhand: { loaded: false, count: 0, lastLoaded: null },
  invoiceLines: { loaded: false, count: 0, lastLoaded: null },
};

/**
 * Load DC Order Lines into DuckDB
 * Transforms data for optimal querying
 */
export async function loadDCOrderLines(data: DCOpenOrderLine[]): Promise<void> {
  if (data.length === 0) {
    console.warn('[DataLoader] No DC Order Lines to load');
    return;
  }

  // Transform data: convert Y/N to boolean for easier querying
  const transformedData = data.map((order) => ({
    ...order,
    // Convert Y/N flags to numeric (1/0) for SQL aggregations
    hold_applied_flag: order.hold_applied === 'Y' ? 1 : 0,
    hold_released_flag: order.hold_released === 'Y' ? 1 : 0,
    routed_flag: order.routed === 'Y' ? 1 : 0,
    planned_flag: order.planned === 'Y' ? 1 : 0,
    localplusqtyexists_flag: order.localplusqtyexists === 'Y' ? 1 : 0,
  }));

  await insertData(TABLE_NAMES.DC_ORDER_LINES, transformedData, true);

  loadState.dcOrderLines = {
    loaded: true,
    count: data.length,
    lastLoaded: new Date(),
  };

  console.log(`[DataLoader] Loaded ${data.length} DC Order Lines`);

  // Debug: Log date column types and sample values
  try {
    const debugQuery = await executeQuery<{
      schedule_ship_date: unknown;
      data_type: string;
    }>(`
      SELECT schedule_ship_date, typeof(schedule_ship_date) as data_type
      FROM ${TABLE_NAMES.DC_ORDER_LINES}
      LIMIT 5
    `);
    console.log('[DataLoader] Date column debug:', debugQuery);
  } catch (e) {
    console.warn('[DataLoader] Debug query failed:', e);
  }
}

/**
 * Load Route Plans into DuckDB
 */
export async function loadRoutePlans(data: RoutePlanRaw[]): Promise<void> {
  if (data.length === 0) {
    console.warn('[DataLoader] No Route Plans to load');
    return;
  }

  // Transform data for optimal querying
  const transformedData = data.map((route) => ({
    ...route,
    // Numeric flag for back orders
    is_back_order: route.back_order_flag === 'Y' ? 1 : 0,
  }));

  await insertData(TABLE_NAMES.ROUTE_PLANS, transformedData, true);

  loadState.routePlans = {
    loaded: true,
    count: data.length,
    lastLoaded: new Date(),
  };

  console.log(`[DataLoader] Loaded ${data.length} Route Plans`);
}

/**
 * Load DC Onhand Inventory into DuckDB
 */
export async function loadDCOnhand(data: DCOnhandItem[]): Promise<void> {
  if (data.length === 0) {
    console.warn('[DataLoader] No DC Onhand data to load');
    return;
  }

  // Transform data to satisfy Record<string, unknown> type
  const transformedData = data.map((item) => ({ ...item }));

  await insertData(TABLE_NAMES.DC_ONHAND, transformedData, true);

  loadState.dcOnhand = {
    loaded: true,
    count: data.length,
    lastLoaded: new Date(),
  };

  console.log(`[DataLoader] Loaded ${data.length} DC Onhand items`);
}

/**
 * Load Invoice Lines into DuckDB
 */
export async function loadInvoiceLines(data: InvoiceLineRaw[]): Promise<void> {
  if (data.length === 0) {
    console.warn('[DataLoader] No Invoice Lines to load');
    return;
  }

  // Transform data to satisfy Record<string, unknown> type
  const transformedData = data.map((line) => ({
    ...line,
    // Add numeric flag for line type
    is_tax_line: line.line_type === 'TAX' ? 1 : 0,
  }));

  await insertData(TABLE_NAMES.INVOICE_LINES, transformedData, true);

  loadState.invoiceLines = {
    loaded: true,
    count: data.length,
    lastLoaded: new Date(),
  };

  console.log(`[DataLoader] Loaded ${data.length} Invoice Lines`);
}

/**
 * Load both datasets into DuckDB
 */
export async function loadAllData(
  orderLines: DCOpenOrderLine[],
  routePlans: RoutePlanRaw[]
): Promise<void> {
  await Promise.all([
    loadDCOrderLines(orderLines),
    loadRoutePlans(routePlans),
  ]);
}

/**
 * Get the current data load state
 */
export function getDataLoadState(): DataLoadState {
  return { ...loadState };
}

/**
 * Check if a table exists and has data in DuckDB
 * This is more reliable than checking in-memory state across page navigations
 */
export async function checkTableHasData(tableName: string): Promise<{ exists: boolean; count: number }> {
  try {
    if (!(await tableExists(tableName))) {
      return { exists: false, count: 0 };
    }
    const result = await executeQuery<{ count: number }>(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = result[0]?.count ?? 0;
    return { exists: count > 0, count };
  } catch (e) {
    console.warn(`[DataLoader] Could not check table ${tableName}:`, e);
    return { exists: false, count: 0 };
  }
}

/**
 * Synchronize in-memory load state with actual DuckDB tables
 * Call this on page mount to recover state after navigation
 */
export async function syncLoadStateFromDuckDB(): Promise<DataLoadState> {
  const [orderLines, routePlans, dcOnhand, invoiceLines] = await Promise.all([
    checkTableHasData(TABLE_NAMES.DC_ORDER_LINES),
    checkTableHasData(TABLE_NAMES.ROUTE_PLANS),
    checkTableHasData(TABLE_NAMES.DC_ONHAND),
    checkTableHasData(TABLE_NAMES.INVOICE_LINES),
  ]);

  // Update in-memory state if tables have data
  if (orderLines.exists && !loadState.dcOrderLines.loaded) {
    loadState.dcOrderLines = { loaded: true, count: orderLines.count, lastLoaded: new Date() };
  }
  if (routePlans.exists && !loadState.routePlans.loaded) {
    loadState.routePlans = { loaded: true, count: routePlans.count, lastLoaded: new Date() };
  }
  if (dcOnhand.exists && !loadState.dcOnhand.loaded) {
    loadState.dcOnhand = { loaded: true, count: dcOnhand.count, lastLoaded: new Date() };
  }
  if (invoiceLines.exists && !loadState.invoiceLines.loaded) {
    loadState.invoiceLines = { loaded: true, count: invoiceLines.count, lastLoaded: new Date() };
  }

  return { ...loadState };
}

/**
 * Check if data is loaded and ready for querying
 */
export function isDataReady(): boolean {
  return loadState.dcOrderLines.loaded || loadState.routePlans.loaded || loadState.dcOnhand.loaded || loadState.invoiceLines.loaded;
}

/**
 * Get summary statistics about loaded data
 */
export async function getDataSummary(): Promise<{
  dcOrderLines: { count: number; lastLoaded: Date | null };
  routePlans: { count: number; lastLoaded: Date | null };
  dcOnhand: { count: number; lastLoaded: Date | null };
  invoiceLines: { count: number; lastLoaded: Date | null };
  tables: string[];
}> {
  const tables = [];

  try {
    if (await tableExists(TABLE_NAMES.DC_ORDER_LINES)) {
      tables.push(TABLE_NAMES.DC_ORDER_LINES);
    }
    if (await tableExists(TABLE_NAMES.ROUTE_PLANS)) {
      tables.push(TABLE_NAMES.ROUTE_PLANS);
    }
    if (await tableExists(TABLE_NAMES.DC_ONHAND)) {
      tables.push(TABLE_NAMES.DC_ONHAND);
    }
    if (await tableExists(TABLE_NAMES.INVOICE_LINES)) {
      tables.push(TABLE_NAMES.INVOICE_LINES);
    }
  } catch (e) {
    console.warn('[DataLoader] Could not check tables:', e);
  }

  return {
    dcOrderLines: {
      count: loadState.dcOrderLines.count,
      lastLoaded: loadState.dcOrderLines.lastLoaded,
    },
    routePlans: {
      count: loadState.routePlans.count,
      lastLoaded: loadState.routePlans.lastLoaded,
    },
    dcOnhand: {
      count: loadState.dcOnhand.count,
      lastLoaded: loadState.dcOnhand.lastLoaded,
    },
    invoiceLines: {
      count: loadState.invoiceLines.count,
      lastLoaded: loadState.invoiceLines.lastLoaded,
    },
    tables,
  };
}

/**
 * Refresh data in DuckDB (reload from source)
 * Useful when underlying data has been updated
 */
export async function refreshData(
  orderLines: DCOpenOrderLine[],
  routePlans: RoutePlanRaw[]
): Promise<void> {
  console.log('[DataLoader] Refreshing data...');
  await loadAllData(orderLines, routePlans);
}

/**
 * Create indexes for better query performance
 * Called after data is loaded
 */
export async function createIndexes(): Promise<void> {
  const conn = await getConnection();

  try {
    // Create indexes on commonly queried columns
    if (await tableExists(TABLE_NAMES.DC_ORDER_LINES)) {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_order_number
        ON ${TABLE_NAMES.DC_ORDER_LINES}(order_number)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_ship_method
        ON ${TABLE_NAMES.DC_ORDER_LINES}(shipping_method_code)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_hold_applied
        ON ${TABLE_NAMES.DC_ORDER_LINES}(hold_applied_flag)
      `);
      console.log('[DataLoader] Created indexes on dc_order_lines');
    }

    if (await tableExists(TABLE_NAMES.ROUTE_PLANS)) {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_route_id
        ON ${TABLE_NAMES.ROUTE_PLANS}(route_id)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_trip_id
        ON ${TABLE_NAMES.ROUTE_PLANS}(trip_id)
      `);
      console.log('[DataLoader] Created indexes on route_plans');
    }

    if (await tableExists(TABLE_NAMES.DC_ONHAND)) {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_onhand_item
        ON ${TABLE_NAMES.DC_ONHAND}(inventory_item_id)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_onhand_subinv
        ON ${TABLE_NAMES.DC_ONHAND}(subinventory_code)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_onhand_locator
        ON ${TABLE_NAMES.DC_ONHAND}(locator)
      `);
      console.log('[DataLoader] Created indexes on dc_onhand');
    }

    if (await tableExists(TABLE_NAMES.INVOICE_LINES)) {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_invoice_trx_id
        ON ${TABLE_NAMES.INVOICE_LINES}(customer_trx_id)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_invoice_trx_number
        ON ${TABLE_NAMES.INVOICE_LINES}(trx_number)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_invoice_transtype
        ON ${TABLE_NAMES.INVOICE_LINES}(invtranstype)
      `);
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_invoice_billcust
        ON ${TABLE_NAMES.INVOICE_LINES}(billcustname)
      `);
      console.log('[DataLoader] Created indexes on invoice_lines');
    }
  } catch (error) {
    console.warn('[DataLoader] Index creation failed (may already exist):', error);
  }
}

/**
 * Get available table schemas for LLM context
 * Returns column information that can be passed to the LLM for SQL generation
 */
export async function getTableSchemas(): Promise<{
  [tableName: string]: { column_name: string; data_type: string }[];
}> {
  const schemas: { [tableName: string]: { column_name: string; data_type: string }[] } = {};

  for (const tableName of Object.values(TABLE_NAMES)) {
    if (await tableExists(tableName)) {
      const columns = await executeQuery<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`
      );
      schemas[tableName] = columns;
    }
  }

  return schemas;
}

/**
 * Generate a human-readable schema description for LLM prompts
 */
export function generateSchemaDescription(): string {
  return `
## Available Tables

### dc_order_lines
Contains DC open order line data with the following key columns:
- order_number: Order identifier
- line_id: Line identifier within the order
- ordered_item: Item/SKU ordered
- ordered_quantity: Quantity ordered
- reserved_qty: Quantity reserved
- schedule_ship_date: Scheduled shipping date
- shipping_method_code: Shipping method (e.g., 'ROUTE TRUCK', 'PARCEL')
- dc: Distribution center code
- sold_to: Customer identifier
- ship_to: Ship-to location
- hold_applied_flag: 1 if order is on hold, 0 otherwise
- hold_released_flag: 1 if hold was released, 0 otherwise
- routed_flag: 1 if routed, 0 otherwise
- planned_flag: 1 if planned, 0 otherwise
- order_category: 'INTERNAL ORDER' or 'CUSTOMER ORDER'
- item_description: Description of the item
- vendor: Vendor name
- trip_id: Trip identifier if assigned

### route_plans
Contains Descartes route plan data:
- route_id: Route identifier
- route_name: Name of the route
- trip_id: Trip identifier
- driver_key: Driver assigned
- truck_key: Truck assigned
- route_start_date: Start date of the route
- location_name: Stop location name
- stop_number: Sequence of the stop
- order_number: Related order number
- ordered_item: Item on the route
- quantity: Quantity to deliver
- is_back_order: 1 if back order, 0 otherwise

### dc_onhand
Contains DC onhand inventory data:
- inventory_item_id: Unique item identifier
- itemnumber: Item number/SKU
- item_description: Description of the item
- subinventory_code: Subinventory code (e.g., STOCK, QUICKPICK, STAGE)
- quantity: Quantity on hand
- locator: Storage locator code
- aisle: Aisle identifier
- CustomSubinventory: Custom subinventory classification
- vendor: Vendor name
- vendor_display: Vendor name (Combination of code and value ex. 093-ABC)
- product_group: Product group code (Combination of code and value ex. 01-DCV)
- productgrp_display: Product group description
- style: Product style

### invoice_lines
Contains invoice line data from receivables:
- customer_trx_id: Invoice transaction identifier
- trx_number: Invoice number
- trx_date: Invoice date
- invtranstype: Transaction type (Invoice, Credit Memo, Debit Memo, etc.)
- batchsource: Batch source
- ordertype: Order type
- shipmethod: Shipping method
- billcustname: Bill-to customer name
- shipcustname: Ship-to customer name
- shiploc: Ship-to location
- line_number: Line number within the invoice
- line_type: LINE or TAX
- is_tax_line: 1 if TAX line, 0 if LINE
- item_number: Item number/SKU
- productgrp: Product group
- vendor: Vendor name
- style: Product style
- quantity_invoiced: Quantity invoiced
- unit_selling_price: Unit selling price
- extended_amount: Extended amount (qty * price)
- sales_order: Related sales order number
- sales_order_line: Related sales order line
- tax_name: Tax name (for TAX lines)
- tax_rate: Tax rate (for TAX lines)
`;
}
