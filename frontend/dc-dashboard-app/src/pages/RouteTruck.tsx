import { TruckOutlined, WarningFilled } from '@ant-design/icons';
import { OrdersTable, OrderFiltersPanel, useOrderFilters, OrderDetailDrawer } from '../components/Dashboard';
import { useOrderContext } from '../contexts';
import { useOrderDetail } from '../hooks';

export function RouteTruck() {
  // Get data from context (connected to API)
  const { routeTruckOrders: orders } = useOrderContext();

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

  const notRoutedOrders = filteredOrders.filter(o => o.routing === 'pending');
  const routedOrders = filteredOrders.filter(o => o.routing === 'success');

  // Planned status
  const plannedOrders = filteredOrders.filter(o => o.raw.planned === 'Y');
  const notPlannedOrders = filteredOrders.filter(o => o.raw.planned !== 'Y');

  // Calculate totals
  const totalUnits = filteredOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const uniqueOrders = new Set(filteredOrders.map(o => o.orderNumber)).size;
  const routedUnits = routedOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const pendingUnits = notRoutedOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const plannedUnits = plannedOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);
  const notPlannedUnits = notPlannedOrders.reduce((sum, o) => sum + (o.orderedQty || 0), 0);

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
        showRoutingFilter={true}
        showPlannedFilter={true}
      />

      {/* Alert for not routed orders */}
      {notRoutedOrders.length > 0 && (
        <div className="alert-section">
          <div className="alert-banner warning">
            <WarningFilled className="alert-banner-icon" />
            <div className="alert-banner-content">
              <div className="alert-banner-title">
                {notRoutedOrders.length} Order{notRoutedOrders.length > 1 ? 's' : ''} Not Routed
              </div>
              <div className="alert-banner-description">
                These Route Truck orders are awaiting routing assignment
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TruckOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#52c41a' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Routed:</span>
            <span style={{ color: '#52c41a', fontWeight: '600' }}>{routedOrders.length} lines</span>
            <span style={{ color: '#999', fontSize: '11px' }}>({routedUnits.toLocaleString()} units)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#faad14' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Pending:</span>
            <span style={{ color: '#faad14', fontWeight: '600' }}>{notRoutedOrders.length} lines</span>
            <span style={{ color: '#999', fontSize: '11px' }}>({pendingUnits.toLocaleString()} units)</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: '#e8e8e8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1890ff' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Planned:</span>
            <span style={{ color: '#1890ff', fontWeight: '600' }}>{plannedOrders.length} lines</span>
            <span style={{ color: '#999', fontSize: '11px' }}>({plannedUnits.toLocaleString()} units)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4d4f' }} />
            <span style={{ color: '#999', fontSize: '12px' }}>Not Planned:</span>
            <span style={{ color: '#ff4d4f', fontWeight: '600' }}>{notPlannedOrders.length} lines</span>
            <span style={{ color: '#999', fontSize: '11px' }}>({notPlannedUnits.toLocaleString()} units)</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable
        data={filteredOrders}
        showShipMethod={false}
        showPlanned={true}
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

export default RouteTruck;
