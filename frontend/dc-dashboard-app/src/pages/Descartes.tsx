import { useMemo, useState } from 'react';
import { Collapse, Spin, Alert, Table, Tag, Empty, Statistic, Card, Input } from 'antd';
import {
  CloudOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  TruckOutlined,
  UserOutlined,
  CalendarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRoutePlans } from '../hooks';
import { useDCContext } from '../contexts';
import type { Route, RouteStop, RouteOrderLine } from '../types';
import './Descartes.css';

// Order line columns for the innermost table
const orderLineColumns: ColumnsType<RouteOrderLine> = [
  {
    title: 'Order #',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 100,
    render: (val) => <span style={{ fontWeight: 600 }}>{val || '-'}</span>,
  },
  {
    title: 'Line',
    dataIndex: 'linenum',
    key: 'linenum',
    width: 80,
  },
  {
    title: 'Type',
    dataIndex: 'order_type',
    key: 'order_type',
    width: 70,
    render: (val) => {
      if (!val) return '-';
      const isReturn = val.toLowerCase().includes('return');
      return (
        <Tag color={isReturn ? 'orange' : 'blue'} style={{ fontSize: '10px', margin: 0 }}>
          {isReturn ? 'Return' : 'Order'}
        </Tag>
      );
    },
  },
  {
    title: 'Item',
    dataIndex: 'ordered_item',
    key: 'ordered_item',
    width: 120,
    render: (val) => <code style={{ fontSize: '11px' }}>{val || '-'}</code>,
  },
  {
    title: 'Qty',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 70,
    align: 'right',
    render: (val) => val?.toLocaleString() ?? '-',
  },
  {
    title: 'Delivery ID',
    dataIndex: 'delivery_id',
    key: 'delivery_id',
    width: 100,
  },
  {
    title: 'Backorder',
    dataIndex: 'back_order_flag',
    key: 'back_order_flag',
    width: 90,
    align: 'center',
    render: (val) =>
      val === 'Y' ? (
        <Tag color="orange">Yes</Tag>
      ) : (
        <Tag color="green">No</Tag>
      ),
  },
];

// Component for rendering a stop's content
function StopContent({ stop }: { stop: RouteStop }) {
  return (
    <div className="stop-content">
      <Table
        columns={orderLineColumns}
        dataSource={stop.orderLines.map((ol, idx) => ({
          ...ol,
          key: `${ol.order_number}-${ol.linenum}-${idx}`,
        }))}
        size="small"
        pagination={false}
        className="order-lines-table"
      />
    </div>
  );
}

// Component for rendering stops within a route
function RouteStops({ stops }: { stops: RouteStop[] }) {
  const items = stops.map((stop, idx) => ({
    key: `stop-${stop.stop_number}-${idx}`,
    label: (
      <div className="stop-header">
        <EnvironmentOutlined className="stop-icon" />
        <span className="stop-number">Stop {stop.stop_number ?? idx + 1}</span>
        <span className="stop-name">{stop.location_name || 'Unknown Location'}</span>
        <Tag color="blue" className="stop-badge">
          {stop.orderLines.length} line{stop.orderLines.length !== 1 ? 's' : ''}
        </Tag>
      </div>
    ),
    children: <StopContent stop={stop} />,
  }));

  return (
    <Collapse
      className="stops-collapse"
      items={items}
      size="small"
    />
  );
}

// Component for rendering route content (just the stops now)
function RouteContent({ route }: { route: Route }) {
  return (
    <div className="route-content">
      <RouteStops stops={route.stops} />
    </div>
  );
}

// Helper function to safely convert value to lowercase string for search
function toLowerStr(val: unknown): string {
  if (val == null) return '';
  return String(val).toLowerCase();
}

// Helper function to check if a route matches the search term
function routeMatchesSearch(route: Route, searchLower: string): boolean {
  // Check route-level fields
  if (toLowerStr(route.route_id).includes(searchLower)) return true;
  if (toLowerStr(route.route_name).includes(searchLower)) return true;
  if (toLowerStr(route.driver_key).includes(searchLower)) return true;
  if (toLowerStr(route.truck_key).includes(searchLower)) return true;
  if (toLowerStr(route.trip_id).includes(searchLower)) return true;

  // Check stops and order lines
  for (const stop of route.stops) {
    if (toLowerStr(stop.location_name).includes(searchLower)) return true;
    if (toLowerStr(stop.location_key).includes(searchLower)) return true;

    for (const line of stop.orderLines) {
      if (toLowerStr(line.order_number).includes(searchLower)) return true;
      if (toLowerStr(line.ordered_item).includes(searchLower)) return true;
      if (toLowerStr(line.delivery_id).includes(searchLower)) return true;
    }
  }

  return false;
}

export function Descartes() {
  const { selectedDC } = useDCContext();
  const { routes, isLoading, error, refresh } = useRoutePlans(selectedDC);
  const [searchText, setSearchText] = useState('');

  // Filter routes based on search text
  const filteredRoutes = useMemo(() => {
    if (!searchText.trim()) return routes;
    const searchLower = searchText.toLowerCase().trim();
    return routes.filter((route) => routeMatchesSearch(route, searchLower));
  }, [routes, searchText]);

  // Calculate summary stats from filtered routes
  const stats = useMemo(() => {
    const totalRoutes = filteredRoutes.length;
    const totalStops = filteredRoutes.reduce((sum, r) => sum + r.stops.length, 0);
    const totalLines = filteredRoutes.reduce(
      (sum, r) => sum + r.stops.reduce((stopSum, s) => stopSum + s.orderLines.length, 0),
      0
    );
    const totalQty = filteredRoutes.reduce(
      (sum, r) =>
        sum +
        r.stops.reduce(
          (stopSum, s) =>
            stopSum + s.orderLines.reduce((lineSum, ol) => lineSum + (ol.quantity ?? 0), 0),
          0
        ),
      0
    );
    return { totalRoutes, totalStops, totalLines, totalQty };
  }, [filteredRoutes]);

  // Build collapse items for routes
  const routeItems = filteredRoutes.map((route) => {
    const totalLines = route.stops.reduce((sum, s) => sum + s.orderLines.length, 0);
    const totalQty = route.stops.reduce(
      (sum, s) => sum + s.orderLines.reduce((lineSum, ol) => lineSum + (ol.quantity ?? 0), 0),
      0
    );

    return {
      key: `route-${route.route_id}`,
      label: (
        <div className="route-header">
          <div className="route-header-main">
            <TruckOutlined className="route-icon" />
            <span className="route-id">Route {route.route_id}</span>
            <span className="route-name">{route.route_name || ''}</span>
          </div>
          <div className="route-header-details">
            <span className="route-detail">
              <UserOutlined /> {route.driver_key || '-'}
            </span>
            <span className="route-detail">
              <TruckOutlined /> {route.truck_key || '-'}
            </span>
            <span className="route-detail">
              <CalendarOutlined />{' '}
              {route.route_start_date
                ? new Date(route.route_start_date).toLocaleString()
                : '-'}
            </span>
            {route.trip_id && (
              <span className="route-detail">Trip: {route.trip_id}</span>
            )}
          </div>
          <div className="route-badges">
            <Tag color="purple">{route.stops.length} stops</Tag>
            <Tag color="blue">{totalLines} lines</Tag>
            <Tag color="cyan">{totalQty.toLocaleString()} units</Tag>
          </div>
        </div>
      ),
      children: <RouteContent route={route} />,
    };
  });

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="descartes-loading">
          <Spin size="large" />
          <p>Loading route plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <Alert
          message="Error Loading Route Plans"
          description={error.message}
          type="error"
          showIcon
          action={
            <button onClick={refresh} className="retry-button">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Search Bar */}
      <div className="descartes-search">
        <Input
          placeholder="Search routes, drivers, trucks, locations, orders, items..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="middle"
        />
        {searchText && (
          <span className="search-results-count">
            {filteredRoutes.length} of {routes.length} routes
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="descartes-stats">
        <Card size="small" className="stat-card">
          <Statistic
            title="Routes"
            value={stats.totalRoutes}
            prefix={<TruckOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Stops"
            value={stats.totalStops}
            prefix={<EnvironmentOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Order Lines"
            value={stats.totalLines}
            prefix={<ShoppingOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Total Units"
            value={stats.totalQty}
            prefix={<CloudOutlined />}
          />
        </Card>
      </div>

      {/* Routes Drilldown */}
      {routes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No route plans found"
        />
      ) : (
        <Collapse
          className="routes-collapse"
          items={routeItems}
          size="large"
        />
      )}
    </div>
  );
}

export default Descartes;
