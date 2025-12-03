/**
 * ResultChart Component
 * Displays query results as interactive charts
 */

import { Typography, Empty } from 'antd';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { QueryResult, ChartType } from '../../types';
import './TalkToData.css';

const { Text } = Typography;

interface ResultChartProps {
  result: QueryResult;
  chartType: ChartType;
  height?: number;
}

// Color palette for charts
const CHART_COLORS = [
  '#1890ff', // Blue
  '#52c41a', // Green
  '#faad14', // Yellow
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa8c16', // Orange
  '#2f54eb', // Geek Blue
  '#a0d911', // Lime
];

/**
 * Detect which columns should be used for chart axes
 */
function detectChartColumns(result: QueryResult): {
  labelColumn: string | null;
  valueColumns: string[];
} {
  if (result.columns.length === 0) {
    return { labelColumn: null, valueColumns: [] };
  }

  // Find potential label column (string/category)
  // and value columns (numeric)
  let labelColumn: string | null = null;
  const valueColumns: string[] = [];

  for (const col of result.columns) {
    const values = result.rows.map((row) => row[col]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined);

    if (nonNullValues.length === 0) continue;

    // Check if mostly numeric
    const numericCount = nonNullValues.filter(
      (v) => typeof v === 'number' || !isNaN(Number(v))
    ).length;
    const isNumeric = numericCount / nonNullValues.length > 0.8;

    if (isNumeric) {
      valueColumns.push(col);
    } else if (!labelColumn) {
      // Use first non-numeric column as label
      labelColumn = col;
    }
  }

  // If no label column found, use first column
  if (!labelColumn && result.columns.length > 0) {
    labelColumn = result.columns[0];
    // Remove it from value columns if present
    const idx = valueColumns.indexOf(labelColumn);
    if (idx > -1) valueColumns.splice(idx, 1);
  }

  return { labelColumn, valueColumns };
}

/**
 * Extract numeric value from DuckDB result (handles BigInt, TypedArrays, etc.)
 */
function extractNumericValue(val: unknown): number | null {
  // Handle null/undefined
  if (val === null || val === undefined) return null;

  // Handle BigInt (DuckDB COUNT results)
  if (typeof val === 'bigint') {
    return Number(val);
  }

  // Handle TypedArrays (DuckDB SUM/aggregate results)
  if (ArrayBuffer.isView(val) && !(val instanceof DataView)) {
    const typedArray = val as Uint32Array | Int32Array | Float64Array;
    // The actual value is typically in the first element
    // For large numbers, it may span multiple elements (little-endian)
    if (typedArray.length > 0) {
      // Simple case: just use first element for most values
      // For very large numbers, we'd need to combine elements
      if (typedArray.length === 4 && typedArray[1] === 0 && typedArray[2] === 0 && typedArray[3] === 0) {
        return typedArray[0];
      }
      // For larger values, combine first two 32-bit values
      if (typedArray instanceof Uint32Array || typedArray instanceof Int32Array) {
        return typedArray[0] + (typedArray[1] || 0) * 0x100000000;
      }
      return typedArray[0];
    }
    return 0;
  }

  // Handle regular numbers
  if (typeof val === 'number') {
    return val;
  }

  // Handle numeric strings
  if (typeof val === 'string' && !isNaN(Number(val))) {
    return Number(val);
  }

  return null;
}

/**
 * Format data for Recharts
 */
function formatChartData(
  result: QueryResult,
  labelColumn: string | null
): Array<Record<string, unknown>> {
  return result.rows.map((row, index) => {
    const formatted: Record<string, unknown> = {};

    for (const key of Object.keys(row)) {
      const val = row[key];
      const numericVal = extractNumericValue(val);

      if (numericVal !== null) {
        formatted[key] = numericVal;
      } else {
        formatted[key] = val;
      }
    }

    // Ensure label is a string
    if (labelColumn) {
      const label = row[labelColumn];
      formatted[labelColumn] =
        label !== null && label !== undefined ? String(label) : `Item ${index + 1}`;
    }

    return formatted;
  });
}

/**
 * Truncate long labels for axis display
 */
function truncateLabel(label: string, maxLength: number = 15): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
}

/**
 * Format large numbers for display
 */
function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toLocaleString();
}

/**
 * Custom tooltip content
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e8e8e8',
        borderRadius: 4,
        padding: '6px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color }}>
          {formatColumnName(entry.name)}: {entry.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

/**
 * Format column name for display
 */
function formatColumnName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Custom label for bar chart - shows value on top of each bar
 */
function renderBarLabel(props: Record<string, unknown>) {
  const xProp = props.x ?? 0;
  const yProp = props.y ?? 0;
  const widthProp = props.width ?? 0;
  const valueProp = props.value ?? 0;
  const x = typeof xProp === 'string' ? parseFloat(xProp) : Number(xProp);
  const y = typeof yProp === 'string' ? parseFloat(yProp) : Number(yProp);
  const width = typeof widthProp === 'string' ? parseFloat(widthProp) : Number(widthProp);
  const value = typeof valueProp === 'string' ? parseFloat(valueProp) : Number(valueProp);
  if (value === 0 || isNaN(value)) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="#666"
      textAnchor="middle"
      fontSize={10}
      fontWeight={500}
    >
      {formatAxisValue(value)}
    </text>
  );
}

/**
 * Render Bar Chart
 */
function renderBarChart(
  data: Array<Record<string, unknown>>,
  labelColumn: string,
  valueColumns: string[],
  height: number
) {
  const isHorizontal = data.length > 10;

  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" tickFormatter={formatAxisValue} tick={{ fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey={labelColumn}
            width={100}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => truncateLabel(v, 15)}
          />
          <Tooltip content={<CustomTooltip />} />
          {valueColumns.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {valueColumns.map((col, index) => (
            <Bar
              key={col}
              dataKey={col}
              name={formatColumnName(col)}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              label={{ position: 'right', fontSize: 10, fill: '#666' }}
              minPointSize={3}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis
          dataKey={labelColumn}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => truncateLabel(v, 12)}
          angle={data.length > 5 ? -45 : 0}
          textAnchor={data.length > 5 ? 'end' : 'middle'}
          height={data.length > 5 ? 60 : 30}
          interval={0}
        />
        <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 10 }} width={45} />
        <Tooltip content={<CustomTooltip />} />
        {valueColumns.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {valueColumns.map((col, index) => (
          <Bar
            key={col}
            dataKey={col}
            name={formatColumnName(col)}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            label={renderBarLabel as never}
            minPointSize={3}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Render Line Chart
 */
function renderLineChart(
  data: Array<Record<string, unknown>>,
  labelColumn: string,
  valueColumns: string[],
  height: number
) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={labelColumn}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => truncateLabel(v)}
          angle={data.length > 8 ? -45 : 0}
          textAnchor={data.length > 8 ? 'end' : 'middle'}
          height={data.length > 8 ? 80 : 30}
        />
        <YAxis tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {valueColumns.length > 1 && <Legend />}
        {valueColumns.map((col, index) => (
          <Line
            key={col}
            type="monotone"
            dataKey={col}
            name={formatColumnName(col)}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Render Pie Chart
 */
function renderPieChart(
  data: Array<Record<string, unknown>>,
  labelColumn: string,
  valueColumns: string[],
  height: number
) {
  // Use first value column for pie chart
  const valueColumn = valueColumns[0];
  if (!valueColumn) return null;

  // Calculate total for percentage
  const total = data.reduce((sum, item) => {
    const val = item[valueColumn];
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueColumn}
          nameKey={labelColumn}
          cx="50%"
          cy="50%"
          outerRadius={Math.min(height / 2 - 30, 80)}
          innerRadius={Math.min(height / 2 - 30, 80) * 0.4}
          label={({ name, value, percent }) => {
            if (!percent || percent < 0.02) return null; // Skip very small slices
            return `${truncateLabel(String(name), 10)}: ${formatAxisValue(value as number)}`;
          }}
          labelLine={{ stroke: '#999', strokeWidth: 1 }}
          paddingAngle={1}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 10 }}
          formatter={(value) => {
            const item = data.find(d => d[labelColumn] === value);
            const itemValue = item ? item[valueColumn] : 0;
            const pct = total > 0 ? ((itemValue as number) / total * 100).toFixed(1) : 0;
            return `${value} (${pct}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Render Area Chart
 */
function renderAreaChart(
  data: Array<Record<string, unknown>>,
  labelColumn: string,
  valueColumns: string[],
  height: number
) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, bottom: 40, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={labelColumn}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => truncateLabel(v)}
          angle={data.length > 8 ? -45 : 0}
          textAnchor={data.length > 8 ? 'end' : 'middle'}
          height={data.length > 8 ? 80 : 30}
        />
        <YAxis tickFormatter={formatAxisValue} />
        <Tooltip content={<CustomTooltip />} />
        {valueColumns.length > 1 && <Legend />}
        {valueColumns.map((col, index) => (
          <Area
            key={col}
            type="monotone"
            dataKey={col}
            name={formatColumnName(col)}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            fillOpacity={0.3}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ResultChart({ result, chartType, height = 220 }: ResultChartProps) {
  if (result.rowCount === 0) {
    return (
      <Empty
        description="No data to visualize"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="result-chart-empty"
      />
    );
  }

  const { labelColumn, valueColumns } = detectChartColumns(result);
  //console.log('[ResultChart] labelColumn:', labelColumn, 'valueColumns:', valueColumns);
  //console.log('[ResultChart] raw result.rows:', result.rows);

  if (!labelColumn || valueColumns.length === 0) {
    return (
      <Empty
        description="Cannot determine chart axes from data"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="result-chart-empty"
      />
    );
  }

  const chartData = formatChartData(result, labelColumn);
  //console.log('[ResultChart] formatted chartData:', chartData);

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart(chartData, labelColumn, valueColumns, height);
      case 'line':
        return renderLineChart(chartData, labelColumn, valueColumns, height);
      case 'pie':
        return renderPieChart(chartData, labelColumn, valueColumns, height);
      case 'area':
        return renderAreaChart(chartData, labelColumn, valueColumns, height);
      default:
        return renderBarChart(chartData, labelColumn, valueColumns, height);
    }
  };

  return (
    <div className="result-chart-container">
      <div className="result-chart-meta">
        <Text type="secondary">
          {result.rowCount} data point{result.rowCount !== 1 ? 's' : ''} &bull;{' '}
          {formatColumnName(valueColumns[0])}
          {valueColumns.length > 1 && ` (+${valueColumns.length - 1} more)`}
        </Text>
      </div>
      <div className="result-chart-wrapper">{renderChart()}</div>
    </div>
  );
}

export default ResultChart;
