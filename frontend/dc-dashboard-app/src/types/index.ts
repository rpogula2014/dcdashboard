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
  | 'descartes'
  | 'talkToData'
  | 'exceptionAlerts'
  | 'alertRulesConfig';

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

// ==========================================
// Talk to Data - Chat & Query Types
// ==========================================

// Chat message roles
export type ChatRole = 'user' | 'assistant' | 'system';

// Result display type determined by query output
export type ResultDisplayType = 'table' | 'chart' | 'text' | 'error';

// Chart types for visualization
export type ChartType = 'bar' | 'line' | 'pie' | 'area';

// Query execution status
export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

// DuckDB query result row (generic)
export type QueryResultRow = Record<string, unknown>;

// Query result with metadata
export interface QueryResult {
  rows: QueryResultRow[];
  columns: string[];
  rowCount: number;
  executionTime: number; // milliseconds
  sql: string;
}

// Token usage information from LLM
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  // For assistant messages with query results
  queryResult?: QueryResult;
  displayType?: ResultDisplayType;
  chartType?: ChartType;
  sql?: string;
  error?: string;
  // For contextual queries
  context?: QueryContext;
  // Token usage from LLM
  usage?: TokenUsage;
}

// Context for contextual queries (right-click, selection)
export interface QueryContext {
  type: 'single-row' | 'multi-row' | 'filtered-view';
  selectedRows?: QueryResultRow[];
  filters?: OrderFilters;
  tableName?: string;
}

// Example question for suggestions
export interface ExampleQuestion {
  text: string;
  category: 'orders' | 'routes' | 'analysis' | 'status';
  description?: string;
}

// Data freshness indicator
export interface DataFreshness {
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
}

// Chat session state
export interface ChatSession {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  dataFreshness: DataFreshness;
}

// NL to SQL conversion result from LLM
export interface NLToSQLResult {
  sql: string;
  confidence: number; // 0-1
  explanation?: string;
  suggestedDisplayType?: ResultDisplayType;
  suggestedChartType?: ChartType;
  usage?: TokenUsage;
}

// Query classification for smart routing
export type QueryClassification =
  | 'local-data'    // Can be answered with DuckDB
  | 'needs-api'     // Needs fresh API data
  | 'hybrid';       // Needs both local query + API enrichment

// Smart routing decision
export interface QueryRoutingDecision {
  classification: QueryClassification;
  primaryTable?: 'dc_order_lines' | 'route_plans';
  apiEndpoints?: string[];
  reason?: string;
}

// Error with user-friendly message
export interface QueryError {
  type: 'sql-syntax' | 'execution' | 'no-results' | 'timeout' | 'unknown';
  message: string;
  userMessage: string;
  sql?: string;
  suggestions?: string[];
}

// ==========================================
// Exception Alerts - Rule Configuration
// ==========================================

// Severity levels for alert rules
export type AlertSeverity = 'critical' | 'warning' | 'info';

// Data sources that can be queried for alerts
export type AlertDataSource = 'dc_order_lines' | 'route_plans' | 'dc_onhand';

// Operators for simple rule builder
export type RuleOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'IS NULL'
  | 'IS NOT NULL';

// Single condition in a rule (for simple builder)
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: string | number | null;
}

// Alert rule configuration
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  // Rule definition - either simple conditions or advanced expression
  conditions?: RuleCondition[];         // Simple builder mode
  advancedExpression?: string;          // Advanced SQL WHERE clause
  // Configuration
  severity: AlertSeverity;
  dataSource: AlertDataSource;
  refreshInterval: number;              // seconds (0 = manual only)
  enabled: boolean;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Result of evaluating an alert rule
export interface AlertResult {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  matchCount: number;
  matchingOrders: QueryResultRow[];     // The actual matching records
  lastChecked: Date;
  error?: string;                       // If rule execution failed
}

// Grouped alerts for display
export interface AlertGroup {
  rule: AlertRule;
  result: AlertResult;
  isExpanded: boolean;
}

// ==========================================
// AI Chat Metrics & Feedback Types
// ==========================================

// Feedback rating options
export type FeedbackRating = 'good' | 'bad';

// AI response object stored in metrics (JSONB in PostgreSQL)
export interface AiResponseData {
  content: string;
  sql?: string;
  displayType?: string;
  chartType?: string;
  queryResult?: {
    columns: string[];
    rowCount: number;
    executionTime: number;
    rows: Record<string, unknown>[];
  };
  error?: string;
}

// Payload for logging AI chat metrics (called after each AI response)
export interface MetricsPayload {
  message_id: string;
  user_question: string;
  ai_response: AiResponseData;
  dcid: string;
  user_email: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  cost_usd: number;
}

// Response from metrics logging
export interface MetricsResponse {
  success: boolean;
  id: number;
  message_id: string;
  message: string;
}

// Payload for updating feedback on existing metrics record
export interface FeedbackUpdatePayload {
  rating: FeedbackRating;
  feedback_text?: string;
}

// Response from feedback update
export interface FeedbackUpdateResponse {
  success: boolean;
  message_id: string;
  message: string;
}

// Legacy types (kept for backward compatibility)
export interface FeedbackPayload {
  user_question: string;
  ai_response: string;
  dcid: string;
  rating: FeedbackRating;
  feedback_text?: string;
  user_email: string;
}

export interface FeedbackResponse {
  success: boolean;
  id: number;
  message: string;
}
