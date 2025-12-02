import { useMemo } from 'react';
import { Card, Row, Col, Progress, Typography } from 'antd';
import { ExclamationCircleFilled, WarningFilled, CheckCircleOutlined, CarOutlined } from '@ant-design/icons';
import { KPICard, ExceptionsCard } from '../components/Dashboard';
import { useOrderContext } from '../contexts';

const { Text } = Typography;

export function Summary() {
  // Get data from context (connected to API)
  const { orderRows: allOrders, exceptionOrders, kpiData } = useOrderContext();

  // Get critical and warning counts
  const criticalOrders = exceptionOrders.filter(o => o.exception === 'critical');
  const warningOrders = exceptionOrders.filter(o => o.exception === 'warning');

  // Calculate shipping progress for today
  const shippingProgress = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Orders scheduled to ship today
    const scheduledToday = allOrders.filter(o => {
      if (!o.raw.schedule_ship_date) return false;
      const shipDate = new Date(o.raw.schedule_ship_date);
      shipDate.setHours(0, 0, 0, 0);
      return shipDate.getTime() === today.getTime();
    });

    // Shipped orders from today's schedule
    const shippedToday = scheduledToday.filter(o => o.status === 'Shipped');

    // Calculate units
    const totalUnitsToShip = scheduledToday.reduce((sum, o) => sum + (o.raw.ordered_quantity ?? 0), 0);
    const unitsShipped = shippedToday.reduce((sum, o) => sum + (o.raw.ordered_quantity ?? 0), 0);

    // Calculate lines
    const totalLinesToShip = scheduledToday.length;
    const linesShipped = shippedToday.length;

    // Distinct trips
    const tripCount = new Set(
      shippedToday
        .map(o => o.raw.trip_id)
        .filter(id => id !== null && id !== undefined)
    ).size;

    return {
      totalUnitsToShip,
      unitsShipped,
      unitsPercent: totalUnitsToShip > 0 ? Math.round((unitsShipped / totalUnitsToShip) * 100) : 0,
      totalLinesToShip,
      linesShipped,
      linesPercent: totalLinesToShip > 0 ? Math.round((linesShipped / totalLinesToShip) * 100) : 0,
      tripCount,
    };
  }, [allOrders]);

  return (
    <div className="page-content">
      {/* Alert Banners */}
      {(criticalOrders.length > 0 || warningOrders.length > 0) && (
        <div className="alert-section">
          {criticalOrders.length > 0 && (
            <div className="alert-banner critical">
              <ExclamationCircleFilled className="alert-banner-icon" />
              <div className="alert-banner-content">
                <div className="alert-banner-title">
                  {criticalOrders.length} Critical Exception{criticalOrders.length > 1 ? 's' : ''}
                </div>
                <div className="alert-banner-description">
                  Orders on hold or past due date require immediate attention
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
      )}

      {/* Shipping Progress Today */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={32} align="middle">
          <Col flex="200px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>Shipping Progress</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
              <CarOutlined />
              <Text type="secondary">{shippingProgress.tripCount} trips completed</Text>
            </div>
          </Col>
          <Col flex="1">
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong>Units</Text>
                <Text>
                  <Text style={{ color: '#52c41a', fontWeight: 600 }}>{shippingProgress.unitsShipped.toLocaleString()}</Text>
                  <Text type="secondary"> / {shippingProgress.totalUnitsToShip.toLocaleString()}</Text>
                </Text>
              </div>
              <Progress
                percent={shippingProgress.unitsPercent}
                strokeColor="#52c41a"
                railColor="#f0f0f0"
                size="small"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong>Lines</Text>
                <Text>
                  <Text style={{ color: '#1890ff', fontWeight: 600 }}>{shippingProgress.linesShipped.toLocaleString()}</Text>
                  <Text type="secondary"> / {shippingProgress.totalLinesToShip.toLocaleString()}</Text>
                </Text>
              </div>
              <Progress
                percent={shippingProgress.linesPercent}
                strokeColor="#1890ff"
                railColor="#f0f0f0"
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Exceptions Section */}
      <ExceptionsCard orders={allOrders} />
    </div>
  );
}

export default Summary;
