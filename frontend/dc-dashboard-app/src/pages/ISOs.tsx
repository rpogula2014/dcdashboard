import { useMemo } from 'react';
import { ShopOutlined } from '@ant-design/icons';
import { OrdersTable, OrderFiltersPanel, useOrderFilters, OrderDetailDrawer } from '../components/Dashboard';
import { useOrderContext } from '../contexts';
import { useOrderDetail } from '../hooks';

export function ISOs() {
  // Get data from context - filter for Internal Service Orders
  const { orderRows } = useOrderContext();

  // Filter orders where order_category = "INTERNAL ORDER"
  const isoOrders = useMemo(() => {
    return orderRows.filter(
      (order) => order.raw.order_category === 'INTERNAL ORDER'
    );
  }, [orderRows]);

  // Use the reusable filter hook
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    handleFilterChange,
    clearFilters,
    applyPreset,
    statusOptions,
  } = useOrderFilters(isoOrders);

  // Use the order detail drawer hook
  const { selectedOrder, drawerOpen, openDrawer, closeDrawer } = useOrderDetail();

  // Calculate totals
  const totalUnits = filteredOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const uniqueOrders = new Set(filteredOrders.map(o => o.orderNumber)).size;

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

      {/* Stats Summary */}
      <div className="stats-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShopOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Orders:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{uniqueOrders}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#999', fontSize: '12px' }}>Lines:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{filteredOrders.length}</span>
            {hasActiveFilters && (
              <span style={{ color: '#999', fontSize: '11px' }}>(of {isoOrders.length})</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#999', fontSize: '12px' }}>Units:</span>
            <span style={{ color: '#333', fontWeight: '600' }}>{totalUnits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable
        data={filteredOrders}
        showShipMethod={true}
        showRouting={false}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
        }}
        onRowClick={openDrawer}
      />

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
}

export default ISOs;
