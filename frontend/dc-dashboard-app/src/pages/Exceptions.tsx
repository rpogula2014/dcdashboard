import { ExclamationCircleFilled, WarningFilled, CheckCircleFilled } from '@ant-design/icons';
import { OrdersTable } from '../components/Dashboard';
import { useOrderContext } from '../contexts';

export function Exceptions() {
  // Get data from context (connected to API)
  const { exceptionOrders: orders } = useOrderContext();
  const criticalOrders = orders.filter(o => o.exception === 'critical');
  const warningOrders = orders.filter(o => o.exception === 'warning');

  if (orders.length === 0) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <CheckCircleFilled className="empty-state-icon" />
          <h3 className="empty-state-title">No Exceptions</h3>
          <p className="empty-state-description">
            All orders are processing normally. Check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Alert Summary */}
      <div className="alert-section">
        {criticalOrders.length > 0 && (
          <div className="alert-banner critical">
            <ExclamationCircleFilled className="alert-banner-icon" />
            <div className="alert-banner-content">
              <div className="alert-banner-title">
                {criticalOrders.length} Critical Exception{criticalOrders.length > 1 ? 's' : ''}
              </div>
              <div className="alert-banner-description">
                Orders on hold or past due date - requires immediate attention
              </div>
            </div>
          </div>
        )}
        {warningOrders.length > 0 && (
          <div className="alert-banner warning">
            <WarningFilled className="alert-banner-icon" />
            <div className="alert-banner-content">
              <div className="alert-banner-title">
                {warningOrders.length} Warning{warningOrders.length > 1 ? 's' : ''}
              </div>
              <div className="alert-banner-description">
                Route Truck orders not routed or inventory short
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ExclamationCircleFilled style={{ fontSize: '14px', color: '#ff4d4f' }} />
          <span style={{ color: '#999', fontSize: '12px' }}>Critical:</span>
          <span style={{ color: '#ff4d4f', fontWeight: '600' }}>{criticalOrders.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <WarningFilled style={{ fontSize: '14px', color: '#faad14' }} />
          <span style={{ color: '#999', fontSize: '12px' }}>Warning:</span>
          <span style={{ color: '#faad14', fontWeight: '600' }}>{warningOrders.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#999', fontSize: '12px' }}>Total:</span>
          <span style={{ color: '#333', fontWeight: '600' }}>{orders.length}</span>
        </div>
      </div>

      {/* Critical Orders First */}
      {criticalOrders.length > 0 && (
        <div className="ship-method-group">
          <div className="ship-method-group-header">
            <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />
            <span className="ship-method-group-title" style={{ color: '#ff4d4f' }}>
              Critical - Immediate Attention Required
            </span>
            <span className="ship-method-group-count" style={{ background: '#fff1f0', color: '#ff4d4f' }}>
              {criticalOrders.length}
            </span>
          </div>
          <OrdersTable
            data={criticalOrders}
            pagination={false}
          />
        </div>
      )}

      {/* Warning Orders */}
      {warningOrders.length > 0 && (
        <div className="ship-method-group">
          <div className="ship-method-group-header">
            <WarningFilled style={{ color: '#faad14' }} />
            <span className="ship-method-group-title" style={{ color: '#faad14' }}>
              Warnings - Review Recommended
            </span>
            <span className="ship-method-group-count" style={{ background: '#fffbe6', color: '#faad14' }}>
              {warningOrders.length}
            </span>
          </div>
          <OrdersTable
            data={warningOrders}
            pagination={false}
          />
        </div>
      )}
    </div>
  );
}

export default Exceptions;
