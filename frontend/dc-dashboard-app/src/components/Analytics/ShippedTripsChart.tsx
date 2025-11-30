import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ShippedTripsChartProps, ShippedTripData } from './types';

export function ShippedTripsChart({ data, onBarClick }: ShippedTripsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="shipMethod"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <RechartsTooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length > 0) {
              const tripData = payload[0].payload as ShippedTripData;
              return (
                <div style={{
                  background: '#fff',
                  border: '1px solid #ccc',
                  padding: '10px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
                  <div style={{ color: '#1890ff', marginBottom: 4 }}>
                    Trips: {tripData.tripCount}
                  </div>
                  <div style={{ color: '#52c41a', marginBottom: 4 }}>
                    Avg Units/Trip: {tripData.avgUnitsPerTrip.toFixed(1)}
                  </div>
                  <div style={{ color: '#666', fontWeight: 500 }}>
                    Total Units: {tripData.totalUnits.toLocaleString()}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar
          dataKey="tripCount"
          name="Trips"
          fill="#1890ff"
          onClick={(barData) => onBarClick?.(barData as unknown as ShippedTripData)}
          cursor={onBarClick ? 'pointer' : 'default'}
        />
        <Bar
          dataKey="avgUnitsPerTrip"
          name="Avg Units/Trip"
          fill="#52c41a"
          onClick={(barData) => onBarClick?.(barData as unknown as ShippedTripData)}
          cursor={onBarClick ? 'pointer' : 'default'}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
