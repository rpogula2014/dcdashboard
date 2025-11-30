import type { OrderRow } from '../../types';

export type GroupBy = 'item' | 'productGroup' | 'vendor';

export interface GroupedData {
  name: string;
  lineCount: number;
  unitCount: number;
  orders: OrderRow[];
}

export interface ChartProps {
  data: GroupedData[];
  onBarClick: (data: GroupedData) => void;
}

// Shipped trips data by ship method
export interface ShippedTripData {
  shipMethod: string;
  tripCount: number;
  totalUnits: number;
  avgUnitsPerTrip: number;
  orders: OrderRow[];
}

export interface ShippedTripsChartProps {
  data: ShippedTripData[];
  onBarClick?: (data: ShippedTripData) => void;
}

// Shipped by product group/vendor
export interface ShippedProductData {
  name: string;
  unitCount: number;
  lineCount: number;
  orders: OrderRow[];
}

export interface ShippedProductChartProps {
  data: ShippedProductData[];
  title: string;
  onBarClick?: (data: ShippedProductData) => void;
}
