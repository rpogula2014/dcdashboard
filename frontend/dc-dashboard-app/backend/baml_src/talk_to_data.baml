// ===========================================
// Talk to Data - NL to SQL Conversion
// ===========================================
// This file defines the BAML schemas and functions
// for converting natural language queries to SQL
// for the DC Dashboard "Talk to Data" feature.

// -------------------------------------------
// Table Schema Definitions
// -------------------------------------------

// DC Order Lines table schema - describes the structure
// for the LLM to understand what columns are available
class DCOrderLinesSchema {
  table_name string @description("Always 'dc_order_lines'")
  description string @description("DC open order lines containing order, item, shipping, and status information")
  columns DCOrderLineColumn[]
}

class DCOrderLineColumn {
  name string
  type string @description("SQL data type: VARCHAR, INTEGER, DATE, etc.")
  description string @description("Human-readable description of what this column contains")
  example_values string[] @description("Example values to help understand the data")
}

// Route Plans table schema
class RoutePlansSchema {
  table_name string @description("Always 'route_plans'")
  description string @description("Descartes route plans with stops, orders, and delivery information")
  columns RoutePlanColumn[]
}

class RoutePlanColumn {
  name string
  type string
  description string
  example_values string[]
}

// DC Onhand Inventory table schema
class DCOnhandSchema {
  table_name string @description("Always 'dc_onhand'")
  description string @description("DC onhand inventory with item quantities by location, subinventory, and vendor")
  columns DCOnhandColumn[]
}

class DCOnhandColumn {
  name string
  type string @description("SQL data type: VARCHAR, BIGINT, JSON, etc.")
  description string @description("Human-readable description of what this column contains")
  example_values string[] @description("Example values to help understand the data")
}

// Combined schema context for the LLM
class DatabaseSchema {
  dc_order_lines DCOrderLinesSchema
  route_plans RoutePlansSchema
  dc_onhand DCOnhandSchema
}

// -------------------------------------------
// NL to SQL Conversion Types
// -------------------------------------------

// The result type for display - helps the LLM suggest how to show results
enum ResultDisplayType {
  TABLE @description("Use for result sets with multiple rows/columns - most queries")
  CHART @description("Use for aggregations, counts, trends, and grouped data")
  TEXT @description("Use for single values, counts, or explanatory responses")
}

// Chart type suggestions for visualizations
enum ChartType {
  BAR @description("For comparing categories or counts")
  LINE @description("For time series or trends")
  PIE @description("For showing proportions of a whole")
  AREA @description("For cumulative trends over time")
}

// The structured output from NL to SQL conversion
class NLToSQLResponse {
  sql string @description("The generated DuckDB-compatible SQL query")
  confidence float @description("Confidence score from 0.0 to 1.0")
  explanation string @description("Brief explanation of what the query does")
  display_type ResultDisplayType @description("Suggested way to display results")
  chart_type ChartType? @description("If display_type is CHART, which chart type to use")
  tables_used string[] @description("List of tables referenced in the query")
  warning string? @description("Any warnings about the query or data limitations")
}

// -------------------------------------------
// Query Classification for Smart Routing
// -------------------------------------------

enum QueryClassification {
  LOCAL_DATA @description("Can be fully answered with local DuckDB data")
  NEEDS_API @description("Requires fresh API data not available locally")
  HYBRID @description("Needs both local query and API enrichment")
}

class QueryRoutingResponse {
  classification QueryClassification
  primary_table string? @description("Main table to query: 'dc_order_lines' or 'route_plans'")
  api_endpoints string[] @description("API endpoints needed if classification is NEEDS_API or HYBRID")
  reason string @description("Brief explanation of the routing decision")
}

// -------------------------------------------
// Error Recovery Types
// -------------------------------------------

class SQLErrorContext {
  original_query string
  error_message string
  error_type string @description("Type of error: syntax, execution, no_results, etc.")
}

class SQLCorrectionResponse {
  corrected_sql string @description("The corrected SQL query")
  explanation string @description("What was wrong and how it was fixed")
  confidence float @description("Confidence in the correction from 0.0 to 1.0")
}

// -------------------------------------------
// BAML Functions
// -------------------------------------------

// Main NL to SQL conversion function
function ConvertNLToSQL(user_query: string, schema_context: string, context_info: string) -> NLToSQLResponse {
  client CustomHaiku
  prompt #"
    {{ _.role("system", cache_control={"type": "ephemeral"}) }}
    You are an expert SQL query generator for a DC (Distribution Center) Dashboard application.
    Your task is to convert natural language questions into valid DuckDB SQL queries.

    ## Available Database Schema

    {{ schema_context }}

    ## Rules for SQL Generation

    1. **DuckDB Syntax**: Use DuckDB-compatible SQL syntax
    2. **Table Names**: Only use tables defined in the schema (dc_order_lines, route_plans, dc_onhand)
    3. **Column Names**: CRITICAL - Only use EXACT column names from the schema. Do NOT invent or modify column names.
    4. **Case Sensitivity**: Column names are case-sensitive as stored
    5. **NULL Handling**: Use proper NULL checks (IS NULL, IS NOT NULL, COALESCE)
    6. **Date Columns**: ordered_date, schedule_ship_date, route_start_date are VARCHAR columns with ISO datetime strings (e.g., '2025-12-03T23:59:00'). Use CAST(column AS DATE) to convert to DATE for comparisons. Example: CAST(schedule_ship_date AS DATE) = CURRENT_DATE
    7. **Aggregations**: Include GROUP BY when using aggregate functions
    8. **Limit Results**: Add LIMIT clause for potentially large result sets (default LIMIT 100)
    9. **Order Results**: Include ORDER BY for consistent results
    10. **JSON Columns**: customsubinventory in dc_onhand is JSON type. Use json_extract_string() to access values.

    ## Common Query Patterns

    ### Order Lines Queries
    - Count orders: SELECT COUNT(*) FROM dc_order_lines
    - Orders by status: SELECT hold_applied, COUNT(*) FROM dc_order_lines GROUP BY hold_applied
    - Orders for customer: SELECT * FROM dc_order_lines WHERE sold_to LIKE '%CustomerName%'
    - Shipping today: SELECT ship_to, COUNT(*) as count FROM dc_order_lines WHERE CAST(schedule_ship_date AS DATE) = CURRENT_DATE GROUP BY ship_to ORDER BY count DESC
    - Shipping tomorrow: SELECT shipping_method_code, COUNT(*) as count FROM dc_order_lines WHERE CAST(schedule_ship_date AS DATE) = CURRENT_DATE + INTERVAL 1 DAY GROUP BY shipping_method_code ORDER BY count DESC
    - Late orders: SELECT * FROM dc_order_lines WHERE CAST(schedule_ship_date AS DATE) < CURRENT_DATE

    ### Route Plans Queries
    - Route information: SELECT * FROM route_plans WHERE route_name = 'RouteName' limit 1
    - Routes today: SELECT route_name FROM route_plans WHERE CAST(route_start_date AS DATE) = CURRENT_DATE group by route_name
    - Routes by Stops: SELECT route_name, COUNT(distinct stop_number) as stop_count FROM route_plans WHERE CAST(route_start_date AS DATE) = CURRENT_DATE group by route_name

    ### Inventory (dc_onhand) Queries
    **IMPORTANT**: For vendor queries, ALWAYS use vendor_display (user-friendly name like "Hercules") instead of vendor (internal code).
    - Items in subinventory: SELECT * FROM dc_onhand WHERE subinventory_code = 'STOCK' LIMIT 100
    - Total quantity by subinventory: SELECT subinventory_code, SUM(quantity) as total_qty FROM dc_onhand GROUP BY subinventory_code ORDER BY total_qty DESC
    - Items in aisle: SELECT * FROM dc_onhand WHERE aisle = 'A1' LIMIT 100
    - Quantity by vendor: SELECT vendor_display, SUM(quantity) as total_qty FROM dc_onhand GROUP BY vendor_display ORDER BY total_qty DESC
    - Onhand for specific vendor: SELECT vendor_display, SUM(quantity) as total_onhand_qty FROM dc_onhand WHERE vendor_display LIKE '%Hercules%' GROUP BY vendor_display
    - Items by product group: SELECT product_group, COUNT(*) as item_count, SUM(quantity) as total_qty FROM dc_onhand GROUP BY product_group ORDER BY total_qty DESC
    - Search for item: SELECT * FROM dc_onhand WHERE itemnumber LIKE '%ITEMCODE%' OR item_description LIKE '%keyword%'
    - Items in locator: SELECT * FROM dc_onhand WHERE locator = 'A1-01-01'

    {{ _.role("user") }}
    {% if context_info %}
    ## Additional Context
    {{ context_info }}
    {% endif %}

    ## User Question
    {{ user_query }}

    Generate a SQL query that answers this question. Be precise and efficient.

    {{ ctx.output_format }}
  "#
}

// Query classification for smart routing
function ClassifyQuery(user_query: string, available_tables: string[]) -> QueryRoutingResponse {
  client CustomHaiku
  prompt #"
    You are a query router for a DC Dashboard application.
    Classify whether a user's question can be answered with local data or needs API calls.

    ## Available Local Tables
    {{ available_tables }}

    ## Table: dc_order_lines (Key Columns)
    - order_number, line_id, line: Order identification
    - ordered_item, inventory_item_id: Item details
    - ordered_quantity, reserved_qty: Quantities
    - schedule_ship_date, ordered_date: Dates
    - dc, ship_to, sold_to: Locations and customers
    - hold_applied, hold_released: Hold status flags (Y/N)
    - routed: Y/N flag if order is routed in Descartes
    - planned: Y/N flag if order is planned
    - trip_id: Links to route_plans table
    - original_line_status: Order line status (Ready to Release, Backordered, etc.)
    - productgrp, vendor, style, item_description: Item categorization
    - localplusqtyexists, localplusqty: Local+ inventory availability
    - order_category: INTERNAL ORDER or CUSTOMER ORDER
    - fulfillment_type, order_type, shipping_method_code: Fulfillment details
    - delivery_id: Delivery identifier

    ## Table: route_plans (Key Columns)
    - route_id, route_name: Route identification
    - trip_id: Links to dc_order_lines table
    - route_start_date: When route starts
    - driver_key, truck_key: Driver and truck assignments
    - location_key, location_name, location_type: Stop location details
    - stop_number: Sequence of stops on route
    - order_number, linenum, ordered_item, quantity: Order details on route
    - delivery_id, order_key: Delivery tracking
    - back_order_flag: Y/N if item is backordered on route

    ## Table: dc_onhand (Key Columns)
    - inventory_item_id (BIGINT): Unique inventory item identifier
    - itemnumber (VARCHAR): Item number/SKU code
    - item_description (VARCHAR): Description of the item
    - subinventory_code (VARCHAR): Subinventory code (STOCK, QUICKPICK, STAGE, REDELIVER, RECRTS, RECSPECIAL, etc.)
    - quantity (BIGINT): Quantity on hand at this location
    - locator (VARCHAR): Storage locator code within the subinventory
    - aisle (VARCHAR): Aisle identifier within the warehouse
    - customsubinventory (JSON): Custom subinventory data
    - vendor (VARCHAR): Internal vendor code (DO NOT use for user queries)
    - vendor_display (VARCHAR): User-friendly vendor name - ALWAYS USE THIS for vendor queries (e.g., "Hercules")
    - product_group (VARCHAR): Product group code
    - productgrp (VARCHAR): Product group description
    - style (VARCHAR): Product style identifier

    ## JOIN Capabilities (LOCAL_DATA)
    Tables can be joined on: order_number, trip_id, delivery_id, ordered_item, inventory_item_id, itemnumber
    Example: "Which orders are on route X?" → JOIN dc_order_lines with route_plans
    Example: "What's the onhand for items on order?" → JOIN dc_order_lines with dc_onhand on inventory_item_id

    ## Available API Endpoints (for data NOT in local tables)
    - /api/v1/order-holds/history - Hold history details (WHY held, WHO held, WHEN)
    - /api/v1/descartes/info - Real-time Descartes routing updates
    - /api/v1/network-inventory - Network-wide inventory across all DCs
    - /api/v1/exceptions/open-trips - Traction exception details

    ## Classification Rules

    LOCAL_DATA (use primary_table: 'dc_order_lines', 'route_plans', or 'dc_onhand'):
    - Order counts, statuses, filters, aggregations
    - Questions about hold_applied/hold_released flags (is it held? Y/N)
    - Questions about routed/planned status
    - Route summaries, stop counts, route timing
    - Orders by customer, item, DC, date range
    - Backorder analysis (reserved_qty vs ordered_quantity)
    - Orders on specific routes (JOIN on trip_id)
    - Items with local+ availability (localplusqtyexists)
    - Product group, vendor, style analysis
    - Any pattern analysis on loaded data
    - Inventory quantities by subinventory (STOCK, QUICKPICK, STAGE, etc.)
    - Items in specific aisles or locators
    - Inventory by vendor or product group
    - Onhand quantity lookups for specific items
    - Total inventory analysis and summaries

    NEEDS_API:
    - WHY was an order held? (hold history details)
    - WHO placed the hold? (hold history)
    - Real-time route updates (not yet synced)
    - Network inventory across OTHER DCs
    - Traction exception specifics

    HYBRID:
    - Local query + API enrichment needed
    - E.g., "Which held orders have release history?" (local held orders + hold history API)
    - E.g., "Do other DCs have stock for my backorders?" (local backorders + network inventory API)

    ## User Question
    {{ user_query }}

    {{ ctx.output_format }}
  "#
}

// SQL error correction with retry
function CorrectSQLError(error_context: SQLErrorContext, schema_context: string) -> SQLCorrectionResponse {
  client CustomSonnet4
  prompt #"
    You are a SQL debugging expert. A SQL query failed and you need to fix it.

    ## Original Query
    {{ error_context.original_query }}

    ## Error Message
    {{ error_context.error_message }}

    ## Error Type
    {{ error_context.error_type }}

    ## Database Schema
    {{ schema_context }}

    ## Instructions
    1. Analyze what went wrong with the original query
    2. Consider common issues:
       - Typos in column/table names
       - Missing quotes around string values
       - Invalid DuckDB syntax
       - Incorrect date formats
       - Missing GROUP BY clauses
       - Column type mismatches
    3. Generate a corrected query that will work

    {{ ctx.output_format }}
  "#
}

// Generate a text explanation of results
function ExplainResults(user_query: string, sql_query: string, result_summary: string) -> string {
  client CustomHaiku
  prompt #"
    You are a helpful data analyst assistant for a DC Dashboard.
    Explain query results in clear, concise language.

    ## User's Question
    {{ user_query }}

    ## SQL Query Used
    {{ sql_query }}

    ## Results Summary
    {{ result_summary }}

    ## Instructions
    - Provide a brief, friendly explanation of what the results show
    - Highlight key insights or notable patterns
    - If the results are empty, explain why that might be
    - Keep it to 2-3 sentences max
    - Use business-friendly language, not technical jargon

    Your response:
  "#
}

// -------------------------------------------
// Test Cases
// -------------------------------------------

test basic_count_query {
  functions [ConvertNLToSQL]
  args {
    user_query #"how many orders did we ship today grouped by order type"#
    schema_context #"
      Table: dc_order_lines
      Columns:
      - order_number (INTEGER): Order identifier
      - hold_applied (VARCHAR): 'Y' if hold applied, 'N' if not
      - hold_released (VARCHAR): 'Y' if hold released, 'N' if not
    "#
    context_info ""
  }
}

test customer_orders_query {
  functions [ConvertNLToSQL]
  args {
    user_query #"Show me all orders for customer ABC Corp"#
    schema_context #"
      Table: dc_order_lines
      Columns:
      - order_number (INTEGER): Order identifier
      - sold_to (VARCHAR): Customer name
      - ordered_item (VARCHAR): Item ordered
      - ordered_quantity (INTEGER): Quantity ordered
    "#
    context_info ""
  }
}

test classify_local_query {
  functions [ClassifyQuery]
  args {
    user_query #"How many orders are scheduled to ship today?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_api_query {
  functions [ClassifyQuery]
  args {
    user_query #"Why was order 12345 put on hold?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

// New tests for improved classification

test classify_routed_orders_local {
  functions [ClassifyQuery]
  args {
    user_query #"Show me all orders that are routed but not planned"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}


test classify_join_query_local {
  functions [ClassifyQuery]
  args {
    user_query #"Which orders are on route ROUTE001 today?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_localplus_local {
  functions [ClassifyQuery]
  args {
    user_query #"Show backorders that have local+ availability"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_hold_status_local {
  functions [ClassifyQuery]
  args {
    user_query #"How many orders are currently on hold?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_network_inventory_api {
  functions [ClassifyQuery]
  args {
    user_query #"Do other DCs have stock for item CSN.59000370?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_hybrid_hold_history {
  functions [ClassifyQuery]
  args {
    user_query #"Which held orders were released in the last hour and why?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_product_group_local {
  functions [ClassifyQuery]
  args {
    user_query #"Show me backorders grouped by vendor and product group"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_route_stops_local {
  functions [ClassifyQuery]
  args {
    user_query #"How many stops does each route have today?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

// -------------------------------------------
// DC Onhand Inventory Tests
// -------------------------------------------

test inventory_by_subinventory {
  functions [ConvertNLToSQL]
  args {
    user_query #"What is the total quantity in each subinventory?"#
    schema_context #"
      Table: dc_onhand
      Columns:
      - inventory_item_id (BIGINT): Unique inventory item identifier
      - itemnumber (VARCHAR): Item number/SKU code
      - item_description (VARCHAR): Description of the item
      - subinventory_code (VARCHAR): Subinventory code (STOCK, QUICKPICK, STAGE, REDELIVER, etc.)
      - quantity (BIGINT): Quantity on hand at this location
      - locator (VARCHAR): Storage locator code
      - aisle (VARCHAR): Aisle identifier
      - vendor (VARCHAR): Vendor/supplier name
      - vendor_display (VARCHAR): Vendor display name
      - product_group (VARCHAR): Product group code
      - productgrp_display (VARCHAR): Product group description
      - style (VARCHAR): Product style identifier
    "#
    context_info ""
  }
}

test inventory_in_aisle {
  functions [ConvertNLToSQL]
  args {
    user_query #"Show me all items in aisle A1"#
    schema_context #"
      Table: dc_onhand
      Columns:
      - inventory_item_id (BIGINT): Unique inventory item identifier
      - itemnumber (VARCHAR): Item number/SKU code
      - item_description (VARCHAR): Description of the item
      - subinventory_code (VARCHAR): Subinventory code
      - quantity (BIGINT): Quantity on hand
      - locator (VARCHAR): Storage locator code
      - aisle (VARCHAR): Aisle identifier
      - vendor_display (VARCHAR): Vendor display name
    "#
    context_info ""
  }
}

test inventory_by_vendor {
  functions [ConvertNLToSQL]
  args {
    user_query #"What is the total inventory quantity by vendor?"#
    schema_context #"
      Table: dc_onhand
      Columns:
      - itemnumber (VARCHAR): Item number/SKU code
      - quantity (BIGINT): Quantity on hand
      - vendor (VARCHAR): Internal vendor code (DO NOT use for user queries)
      - vendor_display (VARCHAR): User-friendly vendor name - ALWAYS USE THIS for vendor queries
    "#
    context_info ""
  }
}

test classify_onhand_local {
  functions [ClassifyQuery]
  args {
    user_query #"What items are in STOCK subinventory?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_inventory_by_vendor_local {
  functions [ClassifyQuery]
  args {
    user_query #"Show inventory grouped by vendor"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}

test classify_onhand_for_orders_local {
  functions [ClassifyQuery]
  args {
    user_query #"What is the onhand quantity for items that are backordered?"#
    available_tables ["dc_order_lines", "route_plans", "dc_onhand"]
  }
}
