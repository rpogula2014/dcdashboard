import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Card, Typography, Table, Spin, Tag, Tooltip } from 'antd';
import { ExclamationCircleFilled, WarningFilled, AlertOutlined } from '@ant-design/icons';
import { fetchTractionExceptions, type OpenTripException } from '../../services/api';
import { useDCContext, useRefreshContext } from '../../contexts';
import type { OrderRow } from '../../types';
import './OrdersTable.css';

const { Text } = Typography;

// Ship Set Exception interface
export interface ShipSetException {
  key: string;
  orderNumber: number;
  lineNumber: string;
  customer: string;
  item: string;
  shipSet: string;
  status: string;
  orderedQty: number;
  reservedQty: number;
  reason: string;
}

interface ExceptionsCardProps {
  orders: OrderRow[];
}

/**
 * Calculate ship set exceptions from order data
 */
function calculateShipSetExceptions(allOrders: OrderRow[]): ShipSetException[] {
  const exceptions: ShipSetException[] = [];
  const stagedStatus = 'Staged/Pick Confirmed';

  // Filter orders that are Staged/Pick Confirmed and have a ship set
  const stagedOrders = allOrders.filter(
    o => o.status === stagedStatus && o.shipSet && o.shipSet !== 'N/A'
  );

  // Group orders by order number
  const ordersByNumber = new Map<number, OrderRow[]>();
  stagedOrders.forEach(order => {
    const existing = ordersByNumber.get(order.orderNumber) || [];
    existing.push(order);
    ordersByNumber.set(order.orderNumber, existing);
  });

  // Check each staged order for exceptions
  stagedOrders.forEach(order => {
    const orderLines = ordersByNumber.get(order.orderNumber) || [];
    const lineCount = orderLines.length;

    if (lineCount === 1) {
      // Single line order: check if ordered qty != reserved qty
      if (order.orderedQty !== order.reservedQty) {
        exceptions.push({
          key: order.key,
          orderNumber: order.orderNumber,
          lineNumber: order.lineNumber,
          customer: order.customer,
          item: order.item,
          shipSet: order.shipSet,
          status: order.status,
          orderedQty: order.orderedQty,
          reservedQty: order.reservedQty,
          reason: `Qty mismatch: Ordered ${order.orderedQty} vs Reserved ${order.reservedQty}`,
        });
      }
    } else {
      // Multi-line order: check if another line has the same ship set
      const otherLinesWithSameShipSet = orderLines.filter(
        o => o.key !== order.key && o.shipSet === order.shipSet
      );
      if (otherLinesWithSameShipSet.length > 0) {
        // Only add if not already added (to avoid duplicates)
        if (!exceptions.some(e => e.key === order.key)) {
          exceptions.push({
            key: order.key,
            orderNumber: order.orderNumber,
            lineNumber: order.lineNumber,
            customer: order.customer,
            item: order.item,
            shipSet: order.shipSet,
            status: order.status,
            orderedQty: order.orderedQty,
            reservedQty: order.reservedQty,
            reason: `Multiple lines with ship set "${order.shipSet}"`,
          });
        }
      }
    }
  });

  return exceptions;
}

export function ExceptionsCard({ orders }: ExceptionsCardProps) {
  // Get selected DC from context
  const { selectedDC } = useDCContext();

  // Get refresh settings from context
  const { autoRefresh, refreshInterval, refreshTrigger } = useRefreshContext();

  // Traction exceptions state
  const [tractionExceptions, setTractionExceptions] = useState<OpenTripException[]>([]);
  const [tractionLoading, setTractionLoading] = useState(true);

  // Refs for interval management
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Fetch traction exceptions
  const loadTractionExceptions = useCallback(async (isInitial = false) => {
    if (!isMountedRef.current) return;

    try {
      if (isInitial) {
        setTractionLoading(true);
      }
      const data = await fetchTractionExceptions(selectedDC);
      if (isMountedRef.current) {
        setTractionExceptions(data);
      }
    } catch (error) {
      console.error('Failed to load traction exceptions:', error);
      if (isMountedRef.current) {
        setTractionExceptions([]);
      }
    } finally {
      if (isMountedRef.current && isInitial) {
        setTractionLoading(false);
      }
    }
  }, [selectedDC]);

  // Initial fetch and DC change handling
  useEffect(() => {
    isMountedRef.current = true;
    loadTractionExceptions(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTractionExceptions]);

  // Auto-refresh management
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadTractionExceptions(false);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, loadTractionExceptions]);

  // Manual refresh trigger - responds to refresh button clicks
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadTractionExceptions(false);
    }
  }, [refreshTrigger, loadTractionExceptions]);

  // Calculate ship set exceptions
  const shipSetExceptions = useMemo(() => calculateShipSetExceptions(orders), [orders]);

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertOutlined style={{ color: '#ff4d4f' }} />
          <span>Exceptions</span>
        </div>
      }
      style={{ marginTop: 16 }}
    >
      {/* Traction Exceptions */}
      <div style={{ marginBottom: tractionExceptions.length > 0 && shipSetExceptions.length > 0 ? 24 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />
          <Text strong>Traction Exceptions</Text>
          <span style={{
            background: '#fff1f0',
            color: '#ff4d4f',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
          }}>
            {tractionExceptions.length}
          </span>
        </div>
        {tractionLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="small" />
            <Text type="secondary" style={{ marginLeft: 8 }}>Loading traction exceptions...</Text>
          </div>
        ) : tractionExceptions.length === 0 ? (
          <Text type="secondary">No traction exceptions</Text>
        ) : (
          <div className="orders-table-container">
            <Table
              dataSource={tractionExceptions}
              rowKey="trip_id"
              size="middle"
              pagination={false}
              className="orders-table"
              scroll={{ x: 900 }}
              columns={[
                {
                  title: 'Trip ID',
                  dataIndex: 'trip_id',
                  key: 'trip_id',
                  width: 100,
                  render: (id: number) => (
                    <span className="order-number">{id}</span>
                  ),
                },
                {
                  title: 'Route',
                  dataIndex: 'route_description',
                  key: 'route_description',
                  width: 150,
                  render: (text: string | null) => text || '-',
                },
                {
                  title: 'Driver',
                  dataIndex: 'driver1',
                  key: 'driver1',
                  width: 120,
                  render: (text: string | null) => (
                    <span className="customer-name">{text || '-'}</span>
                  ),
                },
                {
                  title: 'Open Lines',
                  dataIndex: 'noofopenlines',
                  key: 'noofopenlines',
                  width: 90,
                  align: 'center' as const,
                  render: (count: number) => (
                    <span className="qty-display">{count}</span>
                  ),
                },
                {
                  title: 'Issue Orders',
                  dataIndex: 'issueorder',
                  key: 'issueorder',
                  ellipsis: true,
                  render: (text: string | null) => (
                    <code className="item-code">{text || '-'}</code>
                  ),
                },
                {
                  title: 'MDS Status',
                  dataIndex: 'mdsprocessstatus',
                  key: 'mdsprocessstatus',
                  width: 100,
                  render: (text: string | null) => (
                    <Tag color={text === 'S' ? 'green' : 'red'}>{text || '-'}</Tag>
                  ),
                },
                {
                  title: 'Traction Status',
                  dataIndex: 'tractionstatus',
                  key: 'tractionstatus',
                  width: 120,
                  render: (text: string | null) => (
                    <Tag color={text?.includes('E') ? 'red' : 'default'}>
                      {text || '-'}
                    </Tag>
                  ),
                },
                {
                  title: 'Traction Message',
                  dataIndex: 'tractionmsg',
                  key: 'tractionmsg',
                  ellipsis: true,
                  render: (text: string | null) => (
                    <span className="due-date overdue">{text || '-'}</span>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* Ship Set Exceptions */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <WarningFilled style={{ color: '#faad14' }} />
          <Text strong>Ship Set Exceptions</Text>
          <span style={{
            background: '#fffbe6',
            color: '#faad14',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
          }}>
            {shipSetExceptions.length}
          </span>
        </div>
        {shipSetExceptions.length === 0 ? (
          <Text type="secondary">No ship set exceptions</Text>
        ) : (
          <div className="orders-table-container">
            <Table
              dataSource={shipSetExceptions}
              rowKey="key"
              size="middle"
              pagination={false}
              className="orders-table"
              scroll={{ x: 900 }}
              rowClassName={() => 'row-warning'}
              columns={[
                {
                  title: 'Order #',
                  dataIndex: 'orderNumber',
                  key: 'orderNumber',
                  width: 100,
                  render: (num: number, record: ShipSetException) => (
                    <span className="order-number">
                      {num}
                      {record.lineNumber && (
                        <span className="line-number">/{record.lineNumber}</span>
                      )}
                    </span>
                  ),
                },
                {
                  title: 'Customer',
                  dataIndex: 'customer',
                  key: 'customer',
                  width: 150,
                  ellipsis: true,
                  render: (text: string) => (
                    <span className="customer-name">{text}</span>
                  ),
                },
                {
                  title: 'Item',
                  dataIndex: 'item',
                  key: 'item',
                  width: 180,
                  ellipsis: true,
                  render: (text: string) => (
                    <code className="item-code">{text}</code>
                  ),
                },
                {
                  title: 'Ship Set',
                  dataIndex: 'shipSet',
                  key: 'shipSet',
                  width: 100,
                  render: (text: string) => (
                    <span className="ship-set">{text}</span>
                  ),
                },
                {
                  title: 'Qty',
                  key: 'quantity',
                  width: 80,
                  align: 'center' as const,
                  render: (_: unknown, record: ShipSetException) => {
                    const isShort = record.reservedQty < record.orderedQty;
                    return (
                      <Tooltip title={`Ordered: ${record.orderedQty}, Reserved: ${record.reservedQty}`}>
                        <span className={`qty-display ${isShort ? 'qty-short' : ''}`}>
                          {record.reservedQty}/{record.orderedQty}
                        </span>
                      </Tooltip>
                    );
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  width: 140,
                  render: (status: string) => (
                    <Tag color="geekblue" className="status-tag">{status}</Tag>
                  ),
                },
                {
                  title: 'Reason',
                  dataIndex: 'reason',
                  key: 'reason',
                  ellipsis: true,
                  render: (text: string) => (
                    <span className="due-date overdue">{text}</span>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

export default ExceptionsCard;
