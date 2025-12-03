/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo } from 'react';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { Input, Select, DatePicker, Checkbox, Button, Collapse } from 'antd';
import type { Dayjs } from 'dayjs';
import type { OrderRow } from '../../types';

const { RangePicker } = DatePicker;

// Filter state interface
export interface OrderFiltersState {
  orderNumber: string;
  customer: string;
  shipTo: string;
  item: string;
  productGroup: string;
  vendor: string;
  orderedDateRange: [Dayjs | null, Dayjs | null] | null;
  status: string[];
  reservedNotRouted: boolean;
  hasActiveHolds: boolean;
  multiLineShipSet: boolean;
  hasISOs: boolean;
  noISOs: boolean;
  dueToday: boolean;
  backorder: boolean;
  planned: boolean;
  notPlanned: boolean;
  inDescartes: boolean;
  notInDescartes: boolean;
  ignoreShipped: boolean;
}

const initialFilters: OrderFiltersState = {
  orderNumber: '',
  customer: '',
  shipTo: '',
  item: '',
  productGroup: '',
  vendor: '',
  orderedDateRange: null,
  status: [],
  reservedNotRouted: false,
  hasActiveHolds: false,
  multiLineShipSet: false,
  hasISOs: false,
  noISOs: false,
  dueToday: false,
  backorder: false,
  planned: false,
  notPlanned: false,
  inDescartes: false,
  notInDescartes: false,
  ignoreShipped: false,
};

// Predefined filter presets
export interface FilterPreset {
  key: string;
  label: string;
  description: string;
  filters: Partial<OrderFiltersState>;
}

export const filterPresets: FilterPreset[] = [
  {
    key: 'ready_to_route',
    label: 'Ready to Route',
    description: 'Reserved orders without holds, not yet routed',
    filters: { reservedNotRouted: true, ignoreShipped: true },
  },
  {
    key: 'needs_attention',
    label: 'Needs Attention',
    description: 'Orders with active holds',
    filters: { hasActiveHolds: true, ignoreShipped: true },
  },
  {
    key: 'backorders_no_iso',
    label: 'Backorders (No ISO)',
    description: 'Backorder items without internal sales orders',
    filters: { backorder: true, noISOs: true, ignoreShipped: true },
  },
  {
    key: 'due_today',
    label: 'Due Today',
    description: 'Orders scheduled to ship today',
    filters: { dueToday: true, ignoreShipped: true },
  },
  {
    key: 'multi_line_sets',
    label: 'Multi-line Ship Sets',
    description: 'Orders with multiple lines in the same ship set',
    filters: { multiLineShipSet: true, ignoreShipped: true },
  },
  {
    key: 'has_isos',
    label: 'Has ISOs',
    description: 'Orders with internal sales orders',
    filters: { hasISOs: true, ignoreShipped: true },
  },
  {
    key: 'clean_orders',
    label: 'Clean Orders',
    description: 'No holds, no backorders, exclude shipped',
    filters: { ignoreShipped: true },
  },
];

// Hook return type
export interface UseOrderFiltersResult {
  filters: OrderFiltersState;
  filteredOrders: OrderRow[];
  hasActiveFilters: boolean;
  handleFilterChange: <K extends keyof OrderFiltersState>(key: K, value: OrderFiltersState[K]) => void;
  clearFilters: () => void;
  applyPreset: (presetKey: string) => void;
  statusOptions: { label: string; value: string }[];
}

// Custom hook for order filtering logic
export function useOrderFilters(orders: OrderRow[]): UseOrderFiltersResult {
  const [filters, setFilters] = useState<OrderFiltersState>(initialFilters);

  // Get unique values for select options
  const statusOptions = useMemo(() => {
    const statuses = [...new Set(orders.map(o => o.status))];
    return statuses.map(s => ({ label: s, value: s }));
  }, [orders]);

  // Calculate order + ship set combinations with more than 1 line (excluding N/A and empty values)
  const multiLineShipSetKeys = useMemo(() => {
    const shipSetCounts: Record<string, number> = {};
    orders.forEach(order => {
      const shipSet = order.shipSet?.trim();
      if (shipSet && shipSet !== '' && shipSet.toUpperCase() !== 'N/A') {
        const key = `${order.orderNumber}-${shipSet}`;
        shipSetCounts[key] = (shipSetCounts[key] || 0) + 1;
      }
    });
    return new Set(
      Object.entries(shipSetCounts)
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [orders]);

  // Apply filters to orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order: OrderRow) => {
      // Order number filter
      if (filters.orderNumber && !order.orderNumber.toString().includes(filters.orderNumber)) {
        return false;
      }

      // Text search filters (case-insensitive)
      if (filters.customer && !order.customer.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }
      if (filters.shipTo && !order.raw.ship_to?.toLowerCase().includes(filters.shipTo.toLowerCase())) {
        return false;
      }
      if (filters.item && !order.item.toLowerCase().includes(filters.item.toLowerCase())) {
        return false;
      }
      if (filters.productGroup && !order.raw.productgrp?.toLowerCase().includes(filters.productGroup.toLowerCase())) {
        return false;
      }
      if (filters.vendor && !order.raw.vendor?.toLowerCase().includes(filters.vendor.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.orderedDateRange && filters.orderedDateRange[0] && filters.orderedDateRange[1]) {
        const orderedDate = order.raw.ordered_date ? new Date(order.raw.ordered_date) : null;
        if (orderedDate) {
          const startDate = filters.orderedDateRange[0].startOf('day').toDate();
          const endDate = filters.orderedDateRange[1].endOf('day').toDate();
          if (orderedDate < startDate || orderedDate > endDate) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false;
      }

      // Ignore shipped filter
      if (filters.ignoreShipped && order.status === 'Shipped') {
        return false;
      }

      // Exception filters
      if (filters.reservedNotRouted) {
        const hasActiveHold = order.holdApplied && !order.holdReleased;
        // Reserved, no active holds, and not routed
        if (!(order.reservedQty > 0 && order.routing === 'pending' && !hasActiveHold)) {
          return false;
        }
      }

      if (filters.hasActiveHolds) {
        if (!(order.holdApplied && !order.holdReleased)) {
          return false;
        }
      }

      if (filters.multiLineShipSet) {
        const shipSet = order.shipSet?.trim();
        if (!shipSet || shipSet === '' || shipSet.toUpperCase() === 'N/A') {
          return false;
        }
        const key = `${order.orderNumber}-${shipSet}`;
        if (!multiLineShipSetKeys.has(key)) {
          return false;
        }
      }

      if (filters.hasISOs) {
        const iso = order.raw.iso?.trim();
        if (!iso || iso === '') {
          return false;
        }
      }

      if (filters.noISOs) {
        const iso = order.raw.iso?.trim();
        if (iso && iso !== '') {
          return false;
        }
      }

      if (filters.dueToday) {
        const shipDate = order.raw.schedule_ship_date;
        if (!shipDate) {
          return false;
        }
        const shipDateObj = new Date(shipDate);
        const today = new Date();
        const isToday =
          shipDateObj.getFullYear() === today.getFullYear() &&
          shipDateObj.getMonth() === today.getMonth() &&
          shipDateObj.getDate() === today.getDate();
        if (!isToday) {
          return false;
        }
      }

      if (filters.backorder) {
        const orderedQty = order.raw.ordered_quantity ?? 0;
        const reservedQty = order.raw.reserved_qty ?? 0;
        if (reservedQty >= orderedQty) {
          return false;
        }
      }

      if (filters.planned) {
        if (order.raw.planned !== 'Y') {
          return false;
        }
      }

      if (filters.notPlanned) {
        if (order.raw.planned === 'Y') {
          return false;
        }
      }

      if (filters.inDescartes) {
        if (order.raw.routed !== 'Y') {
          return false;
        }
      }

      if (filters.notInDescartes) {
        if (order.raw.routed === 'Y') {
          return false;
        }
      }

      return true;
    });
  }, [orders, filters, multiLineShipSetKeys]);

  const handleFilterChange = <K extends keyof OrderFiltersState>(key: K, value: OrderFiltersState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const applyPreset = (presetKey: string) => {
    const preset = filterPresets.find(p => p.key === presetKey);
    if (preset) {
      setFilters({ ...initialFilters, ...preset.filters });
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.orderNumber !== '' ||
      filters.customer !== '' ||
      filters.shipTo !== '' ||
      filters.item !== '' ||
      filters.productGroup !== '' ||
      filters.vendor !== '' ||
      filters.orderedDateRange !== null ||
      filters.status.length > 0 ||
      filters.reservedNotRouted ||
      filters.hasActiveHolds ||
      filters.multiLineShipSet ||
      filters.hasISOs ||
      filters.noISOs ||
      filters.dueToday ||
      filters.backorder ||
      filters.planned ||
      filters.notPlanned ||
      filters.inDescartes ||
      filters.notInDescartes ||
      filters.ignoreShipped
    );
  }, [filters]);

  return {
    filters,
    filteredOrders,
    hasActiveFilters,
    handleFilterChange,
    clearFilters,
    applyPreset,
    statusOptions,
  };
}

// Props for the filter panel component
interface OrderFiltersPanelProps {
  filters: OrderFiltersState;
  hasActiveFilters: boolean;
  statusOptions: { label: string; value: string }[];
  onFilterChange: <K extends keyof OrderFiltersState>(key: K, value: OrderFiltersState[K]) => void;
  onClearFilters: () => void;
  onApplyPreset?: (presetKey: string) => void;
  showRoutingFilter?: boolean;
  showPlannedFilter?: boolean;
  defaultExpanded?: boolean;
}

// Filter panel UI component
export function OrderFiltersPanel({
  filters,
  hasActiveFilters,
  statusOptions,
  onFilterChange,
  onClearFilters,
  onApplyPreset,
  showRoutingFilter = true,
  showPlannedFilter = false,
  defaultExpanded = true,
}: OrderFiltersPanelProps) {
  const [filtersExpanded, setFiltersExpanded] = useState<string[]>(defaultExpanded ? ['filters'] : []);

  return (
    <Collapse
      activeKey={filtersExpanded}
      onChange={(keys) => setFiltersExpanded(keys as string[])}
      style={{ marginBottom: '16px' }}
      items={[
        {
          key: 'filters',
          label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterOutlined />
              Filters
              {hasActiveFilters && (
                <span style={{
                  background: '#1890ff',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0 8px',
                  fontSize: '11px',
                }}>
                  Active
                </span>
              )}
            </span>
          ),
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Preset Selector and Search Filters Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', alignItems: 'end' }}>
                {/* Preset Dropdown */}
                {onApplyPreset && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Quick Presets</label>
                    <Select
                      placeholder="Select preset..."
                      onChange={(value) => value && onApplyPreset(value)}
                      options={filterPresets.map(p => ({
                        value: p.key,
                        label: p.label,
                        title: p.description,
                      }))}
                      allowClear
                      size="small"
                      style={{ width: '100%' }}
                      value={undefined}
                    />
                  </div>
                )}
                {/* All Search Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Order #</label>
                  <Input
                    placeholder="Order #"
                    value={filters.orderNumber}
                    onChange={(e) => onFilterChange('orderNumber', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Customer</label>
                  <Input
                    placeholder="Customer"
                    value={filters.customer}
                    onChange={(e) => onFilterChange('customer', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Ship To</label>
                  <Input
                    placeholder="Ship To"
                    value={filters.shipTo}
                    onChange={(e) => onFilterChange('shipTo', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Item</label>
                  <Input
                    placeholder="Item"
                    value={filters.item}
                    onChange={(e) => onFilterChange('item', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Product Group</label>
                  <Input
                    placeholder="Product Grp"
                    value={filters.productGroup}
                    onChange={(e) => onFilterChange('productGroup', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Vendor</label>
                  <Input
                    placeholder="Vendor"
                    value={filters.vendor}
                    onChange={(e) => onFilterChange('vendor', e.target.value)}
                    allowClear
                    size="small"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Ordered Date</label>
                  <RangePicker
                    value={filters.orderedDateRange}
                    onChange={(dates) => onFilterChange('orderedDateRange', dates)}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>Status</label>
                  <Select
                    mode="multiple"
                    placeholder="Status"
                    value={filters.status}
                    onChange={(value) => onFilterChange('status', value)}
                    options={statusOptions}
                    allowClear
                    size="small"
                    style={{ width: '100%' }}
                    maxTagCount="responsive"
                  />
                </div>
                </div>
              </div>

              {/* Exception Filters Row - Compact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>Quick Filters:</span>
                {showRoutingFilter && (
                  <Checkbox
                    checked={filters.reservedNotRouted}
                    onChange={(e) => onFilterChange('reservedNotRouted', e.target.checked)}
                  >
                    <span style={{ fontSize: '12px' }}>Reserved/Not Routed</span>
                  </Checkbox>
                )}
                <Checkbox
                  checked={filters.hasActiveHolds}
                  onChange={(e) => onFilterChange('hasActiveHolds', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Active Holds</span>
                </Checkbox>
                <Checkbox
                  checked={filters.multiLineShipSet}
                  onChange={(e) => onFilterChange('multiLineShipSet', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Multi-line Ship Set</span>
                </Checkbox>
                <Checkbox
                  checked={filters.hasISOs}
                  onChange={(e) => onFilterChange('hasISOs', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Has ISOs</span>
                </Checkbox>
                <Checkbox
                  checked={filters.noISOs}
                  onChange={(e) => onFilterChange('noISOs', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>No ISOs</span>
                </Checkbox>
                <Checkbox
                  checked={filters.dueToday}
                  onChange={(e) => onFilterChange('dueToday', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Due Today</span>
                </Checkbox>
                <Checkbox
                  checked={filters.backorder}
                  onChange={(e) => onFilterChange('backorder', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Backorder</span>
                </Checkbox>
                {showPlannedFilter && (
                  <Checkbox
                    checked={filters.planned}
                    onChange={(e) => onFilterChange('planned', e.target.checked)}
                  >
                    <span style={{ fontSize: '12px' }}>Planned</span>
                  </Checkbox>
                )}
                {showPlannedFilter && (
                  <Checkbox
                    checked={filters.notPlanned}
                    onChange={(e) => onFilterChange('notPlanned', e.target.checked)}
                  >
                    <span style={{ fontSize: '12px' }}>Not Planned</span>
                  </Checkbox>
                )}
                {showPlannedFilter && (
                  <Checkbox
                    checked={filters.inDescartes}
                    onChange={(e) => onFilterChange('inDescartes', e.target.checked)}
                  >
                    <span style={{ fontSize: '12px' }}>In Descartes</span>
                  </Checkbox>
                )}
                {showPlannedFilter && (
                  <Checkbox
                    checked={filters.notInDescartes}
                    onChange={(e) => onFilterChange('notInDescartes', e.target.checked)}
                  >
                    <span style={{ fontSize: '12px' }}>Not In Descartes</span>
                  </Checkbox>
                )}
                <Checkbox
                  checked={filters.ignoreShipped}
                  onChange={(e) => onFilterChange('ignoreShipped', e.target.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Ignore Shipped</span>
                </Checkbox>

                <Button
                  icon={<ClearOutlined />}
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                  size="small"
                  style={{ marginLeft: 'auto' }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

export default OrderFiltersPanel;
