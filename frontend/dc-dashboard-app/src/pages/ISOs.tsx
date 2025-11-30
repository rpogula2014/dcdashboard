import { ShopOutlined } from '@ant-design/icons';
import { OrdersTable, OrderDetailDrawer } from '../components/Dashboard';
import { useOrderContext } from '../contexts';
import { useOrderDetail } from '../hooks';

export function ISOs() {
  // Get data from context - filter for Internal Service Orders
  const { orderRows } = useOrderContext();

  // Filter orders where order_category = "INTERNAL ORDER"
  const isoOrders = orderRows.filter(
    (order) => order.raw.order_category === 'INTERNAL ORDER'
  );

  // Use the order detail drawer hook
  const { selectedOrder, drawerOpen, openDrawer, closeDrawer } = useOrderDetail();

  return (
    <div className="page-content">
      {/* Stats Summary */}
      <div className="stats-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShopOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
          <span style={{ color: '#999', fontSize: '12px' }}>Total ISOs:</span>
          <span style={{ color: '#333', fontWeight: '600' }}>{isoOrders.length}</span>
        </div>
      </div>

      {/* Orders Table */}
      <OrdersTable
        data={isoOrders}
        showShipMethod={true}
        showRouting={false}
        pagination={{
          defaultPageSize: 15,
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
