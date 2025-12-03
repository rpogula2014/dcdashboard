/**
 * ResultTable Component
 * Displays query results as an interactive data table
 */

import { Table, Typography, Empty } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { QueryResult, QueryResultRow } from '../../types';
import './TalkToData.css';

const { Text } = Typography;

interface ResultTableProps {
  result: QueryResult;
  maxHeight?: number;
  pagination?: TablePaginationConfig | false;
}

/**
 * Check if a number looks like a Unix timestamp (milliseconds)
 * Valid range: 2000-01-01 to 2100-01-01
 * Excludes numbers that are likely IDs (order_number, line_id, etc.)
 */
function isTimestamp(value: number, columnName?: string): boolean {
  // Skip timestamp detection for ID-like columns
  const idColumns = ['order_number', 'line_id', 'header_id', 'delivery_id', 'trip_id', 'inventory_item_id'];
  if (columnName && idColumns.some(id => columnName.toLowerCase().includes(id.replace('_', '')))) {
    return false;
  }
  const minTimestamp = 946684800000; // 2000-01-01
  const maxTimestamp = 4102444800000; // 2100-01-01
  return value >= minTimestamp && value <= maxTimestamp;
}

/**
 * Format date as DD-MMM-YYYY (e.g., 01-DEC-2025)
 */
function formatDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown, columnName?: string): React.ReactNode {
  if (value === null || value === undefined) {
    return <Text type="secondary">-</Text>;
  }

  if (typeof value === 'number') {
    // Check if this looks like a timestamp (for date columns or by value range)
    const isDateColumn = columnName?.toLowerCase().includes('date');
    if (isDateColumn || isTimestamp(value, columnName)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    }
    // Format numbers with commas for thousands
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  // Handle date strings
  if (typeof value === 'string') {
    // Check if it looks like a date
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    }
  }

  return String(value);
}

/**
 * Infer column type from values
 */
function inferColumnType(values: unknown[]): 'number' | 'date' | 'text' {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined);

  if (nonNullValues.length === 0) return 'text';

  // Check if all values are numbers
  if (nonNullValues.every((v) => typeof v === 'number')) {
    return 'number';
  }

  // Check if all values look like dates
  if (
    nonNullValues.every((v) => {
      if (typeof v === 'string') {
        return /^\d{4}-\d{2}-\d{2}/.test(v);
      }
      return v instanceof Date;
    })
  ) {
    return 'date';
  }

  return 'text';
}

/**
 * Generate Ant Design columns from query result
 */
function generateColumns(result: QueryResult): ColumnsType<QueryResultRow> {
  if (result.columns.length === 0) return [];

  return result.columns.map((columnName) => {
    // Get all values for this column to infer type
    const values = result.rows.map((row) => row[columnName]);
    const columnType = inferColumnType(values);

    // Calculate max width based on column name and content
    const maxContentLength = Math.max(
      columnName.length,
      ...values.slice(0, 20).map((v) => String(v ?? '').length)
    );
    const width = Math.min(Math.max(maxContentLength * 10, 80), 250);

    const column: ColumnsType<QueryResultRow>[number] = {
      title: formatColumnName(columnName),
      dataIndex: columnName,
      key: columnName,
      width,
      ellipsis: true,
      sorter: (a, b) => {
        const aVal = a[columnName];
        const bVal = b[columnName];

        // Handle nulls
        if (aVal === null || aVal === undefined) return -1;
        if (bVal === null || bVal === undefined) return 1;

        // Compare based on type
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      },
      render: (value: unknown) => formatCellValue(value, columnName),
    };

    // Right-align numbers
    if (columnType === 'number') {
      column.align = 'right';
    }

    return column;
  });
}

/**
 * Format column name for display (e.g., order_number -> Order Number)
 */
function formatColumnName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate unique row key
 */
function getRowKey(row: QueryResultRow, index: number): string {
  // Try to use common ID fields
  const idFields = ['id', 'key', 'order_number', 'line_id', 'route_id'];
  for (const field of idFields) {
    if (row[field] !== undefined) {
      return `${field}-${row[field]}-${index}`;
    }
  }
  // Fallback to index
  return `row-${index}`;
}

export function ResultTable({
  result,
  maxHeight = 250,
  pagination = {
    defaultPageSize: 10,
    showSizeChanger: true,
    showTotal: (total: number, range: [number, number]) =>
      `${range[0]}-${range[1]} of ${total}`,
    pageSizeOptions: ['10', '25', '50', '100'],
    size: 'small',
  },
}: ResultTableProps) {
  if (result.rowCount === 0) {
    return (
      <Empty
        description="No results found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="result-table-empty"
      />
    );
  }

  const columns = generateColumns(result);

  return (
    <div className="result-table-container">
      <div className="result-table-meta">
        <Text type="secondary">
          {result.rowCount} result{result.rowCount !== 1 ? 's' : ''} in{' '}
          {result.executionTime.toFixed(0)}ms
        </Text>
      </div>
      <Table<QueryResultRow>
        columns={columns}
        dataSource={result.rows}
        rowKey={(row, index) => getRowKey(row, index ?? 0)}
        pagination={pagination}
        size="small"
        scroll={{ x: 'max-content', y: maxHeight }}
        className="result-table"
        bordered
      />
    </div>
  );
}

export default ResultTable;
