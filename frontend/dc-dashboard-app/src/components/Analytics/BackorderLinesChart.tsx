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
import type { ChartProps, GroupedData } from './types';
import { CHART_COLORS, renderBarLabel } from './utils';

export function BackorderLinesChart({ data, onBarClick }: ChartProps) {
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
          width={120}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: string) =>
            value.length > 18 ? `${value.substring(0, 18)}...` : value
          }
        />
        <RechartsTooltip
          formatter={(value: number) => [`${value} lines`, 'Count']}
          labelFormatter={(label: string) => label}
        />
        <Bar
          dataKey="lineCount"
          label={renderBarLabel}
          onClick={(barData) => onBarClick(barData as unknown as GroupedData)}
          cursor="pointer"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
