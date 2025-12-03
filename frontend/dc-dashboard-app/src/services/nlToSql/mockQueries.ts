/**
 * Mock NL to SQL Queries
 * Development mock for NL-to-SQL conversion without backend
 */

import type { NLToSQLResult } from '../../types';

/**
 * Mock NL to SQL conversion for development
 * Maps common queries to SQL templates
 */
export function mockConvertNLToSQL(userQuery: string): NLToSQLResult {
  const query = userQuery.toLowerCase();

  // Common query patterns
  if (query.includes('how many') && query.includes('hold')) {
    return {
      sql: `SELECT COUNT(*) as count FROM dc_order_lines WHERE hold_applied_flag = 1`,
      confidence: 0.9,
      explanation: 'Counting orders that are currently on hold.',
      suggestedDisplayType: 'text',
    };
  }

  if (query.includes('orders') && query.includes('over') && query.includes('unit')) {
    const match = query.match(/(\d+)/);
    const threshold = match ? parseInt(match[1]) : 100;
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, shipping_method_code
            FROM dc_order_lines
            WHERE ordered_quantity > ${threshold}
            ORDER BY ordered_quantity DESC
            LIMIT 50`,
      confidence: 0.85,
      explanation: `Showing orders with quantity over ${threshold} units.`,
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('top') && query.includes('customer')) {
    const match = query.match(/top\s+(\d+)/i);
    const limit = match ? parseInt(match[1]) : 10;
    return {
      sql: `SELECT sold_to as customer, COUNT(*) as order_count
            FROM dc_order_lines
            GROUP BY sold_to
            ORDER BY order_count DESC
            LIMIT ${limit}`,
      confidence: 0.9,
      explanation: `Top ${limit} customers by order count.`,
      suggestedDisplayType: 'chart',
      suggestedChartType: 'bar',
    };
  }

  if (query.includes('ship') && query.includes('today')) {
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, schedule_ship_date
            FROM dc_order_lines
            WHERE DATE(schedule_ship_date) = CURRENT_DATE
            ORDER BY order_number`,
      confidence: 0.85,
      explanation: 'Orders scheduled to ship today.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('routes') && query.includes('today')) {
    return {
      sql: `SELECT DISTINCT route_id, route_name, driver_key, truck_key
            FROM route_plans
            WHERE DATE(route_start_date) = CURRENT_DATE`,
      confidence: 0.85,
      explanation: 'Routes planned for today.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('route') && query.includes('most') && query.includes('stop')) {
    return {
      sql: `SELECT route_name, COUNT(DISTINCT stop_number) as stop_count
            FROM route_plans
            GROUP BY route_id, route_name
            ORDER BY stop_count DESC
            LIMIT 10`,
      confidence: 0.85,
      explanation: 'Routes with the most stops.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'bar',
    };
  }

  if (query.includes('driver')) {
    return {
      sql: `SELECT DISTINCT driver_key, route_name, route_start_date
            FROM route_plans
            WHERE driver_key IS NOT NULL
            ORDER BY route_start_date DESC`,
      confidence: 0.8,
      explanation: 'Drivers assigned to routes.',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('percentage') || query.includes('%')) {
    if (query.includes('routed')) {
      return {
        sql: `SELECT
                ROUND(SUM(CASE WHEN routed_flag = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as routed_percentage,
                COUNT(*) as total_orders
              FROM dc_order_lines`,
        confidence: 0.9,
        explanation: 'Percentage of orders that are routed.',
        suggestedDisplayType: 'text',
      };
    }
  }

  if (query.includes('shipping method') || query.includes('ship method')) {
    return {
      sql: `SELECT shipping_method_code, COUNT(*) as order_count
            FROM dc_order_lines
            GROUP BY shipping_method_code
            ORDER BY order_count DESC`,
      confidence: 0.9,
      explanation: 'Orders by shipping method.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'pie',
    };
  }

  if (query.includes('status') || query.includes('distribution')) {
    return {
      sql: `SELECT
              CASE
                WHEN hold_applied_flag = 1 AND hold_released_flag = 0 THEN 'On Hold'
                WHEN routed_flag = 1 THEN 'Routed'
                WHEN planned_flag = 1 THEN 'Planned'
                ELSE 'Pending'
              END as status,
              COUNT(*) as count
            FROM dc_order_lines
            GROUP BY status
            ORDER BY count DESC`,
      confidence: 0.85,
      explanation: 'Order distribution by status.',
      suggestedDisplayType: 'chart',
      suggestedChartType: 'pie',
    };
  }

  if (query.includes('backorder')) {
    return {
      sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to
            FROM dc_order_lines
            WHERE reserved_qty < ordered_quantity
            ORDER BY ordered_quantity DESC`,
      confidence: 0.85,
      explanation: 'Orders with backordered items (reserved qty less than ordered).',
      suggestedDisplayType: 'table',
    };
  }

  if (query.includes('released') && query.includes('hold')) {
    return {
      sql: `SELECT order_number, ordered_item, sold_to, schedule_ship_date
            FROM dc_order_lines
            WHERE hold_applied_flag = 1 AND hold_released_flag = 1
            ORDER BY schedule_ship_date`,
      confidence: 0.9,
      explanation: 'Orders with released holds.',
      suggestedDisplayType: 'table',
    };
  }

  // Default: show recent orders
  return {
    sql: `SELECT order_number, ordered_item, ordered_quantity, sold_to, shipping_method_code, schedule_ship_date
          FROM dc_order_lines
          ORDER BY schedule_ship_date DESC
          LIMIT 20`,
    confidence: 0.6,
    explanation: 'Showing recent orders. Try being more specific with your question.',
    suggestedDisplayType: 'table',
  };
}
