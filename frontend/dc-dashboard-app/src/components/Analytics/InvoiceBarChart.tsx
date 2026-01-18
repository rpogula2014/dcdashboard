import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { InvoiceChartData } from '../../hooks/useInvoiceAnalytics';
import { CHART_COLORS } from './utils';

interface InvoiceBarChartProps {
  data: InvoiceChartData[];
  onBarClick?: (data: InvoiceChartData) => void;
}

// Format currency for display
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom bar label renderer - uses explicit any to satisfy Recharts' flexible label prop types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInvoiceBarLabel(data: InvoiceChartData[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const index = Number(props.index) || 0;
    const entry = data[index];
    if (!entry) return null;
    const x = Number(props.x) || 0;
    const y = Number(props.y) || 0;
    const width = Number(props.width) || 0;
    return (
      <text x={x + width + 5} y={y + 14} fill="#666" fontSize={11}>
        {entry.count} | {formatCurrency(entry.amount)}
      </text>
    );
  };
}

export function InvoiceBarChart({ data, onBarClick }: InvoiceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 120, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: string) =>
            value.length > 20 ? `${value.substring(0, 20)}...` : value
          }
        />
        <RechartsTooltip
          formatter={(value: number, name: string) => {
            if (name === 'amount') {
              return [formatCurrency(value), 'Amount'];
            }
            return [`${value} invoices`, 'Count'];
          }}
          labelFormatter={(label: string) => label}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="amount"
          label={createInvoiceBarLabel(data)}
          onClick={(barData) => onBarClick?.(barData as unknown as InvoiceChartData)}
          cursor={onBarClick ? 'pointer' : 'default'}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
