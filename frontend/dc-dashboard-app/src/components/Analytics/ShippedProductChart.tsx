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
import type { ShippedProductChartProps, ShippedProductData } from './types';
import { CHART_COLORS, renderBarLabel } from './utils';

export function ShippedProductChart({ data, onBarClick }: ShippedProductChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 35)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
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
          formatter={(value: number) => [`${value} units`, 'Shipped']}
          labelFormatter={(label: string) => label}
        />
        <Bar
          dataKey="unitCount"
          label={renderBarLabel}
          onClick={(barData) => onBarClick?.(barData as unknown as ShippedProductData)}
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
