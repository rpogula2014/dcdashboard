import { useMemo } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Tabs, Badge } from 'antd';
import { OrdersTable, OrderFiltersPanel, useOrderFilters, OrderDetailDrawer } from '../components/Dashboard';
import { useOrderContext } from '../contexts';
import { useOrderDetail } from '../hooks';
import { SHIP_METHODS } from '../mock/data';

// Define display order for ship methods (constant)
const METHOD_ORDER: string[] = [
  SHIP_METHODS.UPS_GROUND,
  SHIP_METHODS.UPS_2DAY,
  SHIP_METHODS.UPS_NEXT_DAY,
  SHIP_METHODS.FEDEX_GROUND,
  SHIP_METHODS.FEDEX_EXPRESS,
  SHIP_METHODS.LTL_FREIGHT,
  SHIP_METHODS.WILL_CALL,
];

export function OtherShipMethods() {
  // Get data from context (connected to API)
  const { otherShipMethodOrders: allOrders } = useOrderContext();

  // Filter out internal orders (ISOs are shown on their own page)
  const orders = useMemo(() => {
    return allOrders.filter(order => order.raw.order_category !== 'INTERNAL ORDER');
  }, [allOrders]);

  // Use the reusable filter hook
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    handleFilterChange,
    clearFilters,
    applyPreset,
    statusOptions,
  } = useOrderFilters(orders);

  // Use the order detail drawer hook
  const { selectedOrder, drawerOpen, openDrawer, closeDrawer } = useOrderDetail();

  // Group filtered orders by ship method
  const ordersByMethod = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const method = order.shipMethod;
      if (!acc[method]) {
        acc[method] = [];
      }
      acc[method].push(order);
      return acc;
    }, {} as Record<string, typeof filteredOrders>);
  }, [filteredOrders]);

  const sortedMethods = useMemo(() => {
    return Object.keys(ordersByMethod).sort((a, b) => {
      const indexA = METHOD_ORDER.indexOf(a);
      const indexB = METHOD_ORDER.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [ordersByMethod]);

  // Calculate totals similar to RouteTruck
  const totalUnits = filteredOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const uniqueOrders = new Set(filteredOrders.map(o => o.orderNumber)).size;

  // Create tab items
  const tabItems = sortedMethods.map(method => ({
    key: method,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {method}
        <Badge
          count={ordersByMethod[method].length}
          style={{ backgroundColor: '#1890ff' }}
          overflowCount={999}
        />
      </span>
    ),
    children: (
      <OrdersTable
        data={ordersByMethod[method]}
        showShipMethod={false}
        showRouting={false}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
        }}
        onRowClick={openDrawer}
      />
    ),
  }));

  return (
    <div className="page-content">
      {/* Filters Section */}
      <OrderFiltersPanel
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        statusOptions={statusOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        onApplyPreset={applyPreset}
        showRoutingFilter={false}
      />

      {/* Stats Summary Header */}
      <div className="stats-bar" style={{ flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <InboxOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Orders:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{uniqueOrders}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#999', fontSize: '12px' }}>Lines:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{filteredOrders.length}</span>
            {hasActiveFilters && (
              <span style={{ color: '#999', fontSize: '11px' }}>(of {orders.length})</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#999', fontSize: '12px' }}>Units:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{totalUnits.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {sortedMethods.map(method => {
            const methodOrders = ordersByMethod[method];
            const methodUnits = methodOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
            return (
              <div key={method} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#999', fontSize: '11px' }}>{method}:</span>
                <span style={{ color: '#1890ff', fontWeight: '500', fontSize: '11px' }}>
                  {methodOrders.length} lines
                </span>
                <span style={{ color: '#999', fontSize: '10px' }}>
                  ({methodUnits.toLocaleString()})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabbed Ship Methods */}
      {sortedMethods.length > 0 ? (
        <Tabs
          defaultActiveKey={sortedMethods[0]}
          items={tabItems}
          type="card"
          size="small"
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No orders match the current filters
        </div>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
}

export default OtherShipMethods;
