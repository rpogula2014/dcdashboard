/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Drawer, Descriptions, Spin, Alert, Tag, Table, Empty, Tabs, Badge, Tooltip } from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  HistoryOutlined,
  CarOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { OrderRow } from '../../types';
import {
  fetchOrderHoldHistory,
  fetchDescartesRoutingInfo,
  fetchNetworkInventory,
  type HoldHistoryRecord,
  type DescartesRoutingInfo,
  type NetworkInventoryItem,
} from '../../services/api';
import './OrderDetailDrawer.css';

// Helper function to format ISO date strings to readable format with AM/PM
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

interface OrderDetailDrawerProps {
  order: OrderRow | null;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailDrawer({ order, open, onClose }: OrderDetailDrawerProps) {
  const [holdHistory, setHoldHistory] = useState<HoldHistoryRecord[]>([]);
  const [routingInfo, setRoutingInfo] = useState<DescartesRoutingInfo[]>([]);
  const [networkInventory, setNetworkInventory] = useState<NetworkInventoryItem[]>([]);
  const [loadingHolds, setLoadingHolds] = useState(false);
  const [loadingRouting, setLoadingRouting] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Reset state when order changes
  const orderId = order?.raw.line_id;
  useEffect(() => {
    // Reset when a new order is selected
    setHoldHistory([]);
    setRoutingInfo([]);
    setNetworkInventory([]);
    setHoldError(null);
    setRoutingError(null);
    setInventoryError(null);

  }, [orderId]);

  // Fetch additional data when drawer opens
  useEffect(() => {
    if (!open || !order) {
      return;
    }

    const raw = order.raw;

    // Fetch hold history if hold_applied = 'Y'
    if (raw.hold_applied === 'Y' && raw.header_id && raw.line_id) {
      setLoadingHolds(true);
      setHoldError(null);
      fetchOrderHoldHistory(raw.header_id, raw.line_id)
        .then((data) => {
          setHoldHistory(data);
        })
        .catch((err) => {
          setHoldError(err.message || 'Failed to load hold history');
        })
        .finally(() => {
          setLoadingHolds(false);
        });
    }

    // Fetch routing info if routed = 'Y'
    if (raw.routed === 'Y' && raw.order_number && raw.line_id) {
      setLoadingRouting(true);
      setRoutingError(null);
      fetchDescartesRoutingInfo(raw.order_number, raw.line_id)
        .then((data) => {
          setRoutingInfo(data);
        })
        .catch((err) => {
          setRoutingError(err.message || 'Failed to load routing info');
        })
        .finally(() => {
          setLoadingRouting(false);
        });
    }

    // Fetch network inventory if backorder (ordered > reserved) and no ISO
    const isBackorder = (raw.ordered_quantity ?? 0) > (raw.reserved_qty ?? 0);
    const hasNoIso = !raw.iso || raw.iso.trim() === '';
    if (isBackorder && hasNoIso && raw.inventory_item_id) {
      setLoadingInventory(true);
      setInventoryError(null);
      // Use DEFAULT_DC (132) - dcid parameter will use the default in the API function
      fetchNetworkInventory(0, raw.inventory_item_id)
        .then((data) => {
          setNetworkInventory(data);
        })
        .catch((err) => {
          setInventoryError(err.message || 'Failed to load network inventory');
        })
        .finally(() => {
          setLoadingInventory(false);
        });
    }
  }, [open, order]);

  if (!order) return null;

  const raw = order.raw;

  // Hold history table columns
  const holdHistoryColumns = [
    { title: 'Hold Name', dataIndex: 'hold_name', key: 'hold_name' },
    { title: 'Level', dataIndex: 'holdlevel', key: 'holdlevel' },
    { title: 'Applied Date', dataIndex: 'applied_date', key: 'applied_date', render: (val: string) => formatDateTime(val) },
    { title: 'Applied By', dataIndex: 'applied_by', key: 'applied_by' },
    { title: 'Released', dataIndex: 'released_flag', key: 'released_flag' },
    { title: 'Released Date', dataIndex: 'released_date', key: 'released_date', render: (val: string) => formatDateTime(val) },
    { title: 'Released By', dataIndex: 'released_by', key: 'released_by' },
  ];

  // Routing info table columns
  const routingColumns = [
    {
      title: 'Message ID',
      dataIndex: 'msg_id',
      key: 'msg_id',
      render: (val: string, record: DescartesRoutingInfo) => (
        <Tooltip title={`Payload ID: ${record.payload_id}`}>
          <span style={{ cursor: 'help' }}>{val}</span>
        </Tooltip>
      ),
    },
    { title: 'Purpose', dataIndex: 'message_purpose', key: 'message_purpose' },
    { title: 'Earliest Date', dataIndex: 'earliestdate', key: 'earliestdate', render: (val: string) => formatDateTime(val) },
    { title: 'Latest Date', dataIndex: 'latestdate', key: 'latestdate', render: (val: string) => formatDateTime(val) },
    { title: 'Profit Value', dataIndex: 'profitvalue', key: 'profitvalue' },
    { title: 'Send Time', dataIndex: 'sendtime', key: 'sendtime', render: (val: string) => formatDateTime(val) },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
  ];

  // Network inventory table columns
  const inventoryColumns = [
    { title: 'DC Type', dataIndex: 'dc', key: 'dc' },
    { title: 'Organization', dataIndex: 'organization_code', key: 'organization_code' },
    { title: 'Local+ Qty', dataIndex: 'local_qty', key: 'local_qty' },
  ];

  // Helper to determine if order is backorder without ISO
  const isBackorder = (raw.ordered_quantity ?? 0) > (raw.reserved_qty ?? 0);
  const hasNoIso = !raw.iso || raw.iso.trim() === '';
  const showInventoryTab = isBackorder && hasNoIso;

  // Tab items configuration
  const tabItems = [
    {
      key: 'details',
      label: (
        <span>
          <InfoCircleOutlined />
          Order Details
        </span>
      ),
      children: (
        <>
          {/* Order Information */}
          <Descriptions title="Order Information" bordered size="small" column={2}>
            <Descriptions.Item label="Order #">{raw.order_number}</Descriptions.Item>
            <Descriptions.Item label="Line">{raw.line}</Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color={raw.order_category === 'CUSTOMER ORDER' ? 'blue' : 'purple'}>
                {raw.order_category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Line Category">{raw.line_category_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="Order Type">{raw.order_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="Fulfillment">{raw.fulfillment_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ordered">{formatDateTime(raw.ordered_date)}</Descriptions.Item>
            <Descriptions.Item label="Ship Date">{formatDateTime(raw.schedule_ship_date)}</Descriptions.Item>
          </Descriptions>

          {/* Customer & Shipping */}
          <Descriptions title="Customer & Shipping" bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Sold To" span={2}>{raw.sold_to || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ship To">{raw.ship_to || '-'}</Descriptions.Item>
            <Descriptions.Item label="Addressee">{raw.ship_to_addressee || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {raw.ship_to_address1 || '-'}{raw.ship_to_address5 && `, ${raw.ship_to_address5}`}
            </Descriptions.Item>
            <Descriptions.Item label="Ship Method">{raw.shipping_method_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="DC">{raw.dc || '-'}</Descriptions.Item>
            <Descriptions.Item label="Instructions" span={2}>{raw.shipping_instructions || '-'}</Descriptions.Item>
          </Descriptions>

          {/* Item Details */}
          <Descriptions title="Item Details" bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Item">{raw.ordered_item || '-'}</Descriptions.Item>
            <Descriptions.Item label="Item ID">{raw.inventory_item_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{raw.item_description || '-'}</Descriptions.Item>
            <Descriptions.Item label="Product Grp">{raw.productgrp || '-'}</Descriptions.Item>
            <Descriptions.Item label="Vendor">{raw.vendor || '-'}</Descriptions.Item>
            <Descriptions.Item label="Style">{raw.style || '-'}</Descriptions.Item>
            <Descriptions.Item label="Set Name">{raw.set_name || '-'}</Descriptions.Item>
          </Descriptions>

          {/* Quantities & Status */}
          <Descriptions title="Quantities & Status" bordered size="small" column={3} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Ordered">{raw.ordered_quantity ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Reserved">{raw.reserved_qty ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Requested">{raw.requested_quantity ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">{raw.original_line_status || '-'}</Descriptions.Item>
            <Descriptions.Item label="ISO">{raw.iso || '-'}</Descriptions.Item>
            <Descriptions.Item label="Delivery ID">{raw.delivery_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="Hold">
              <Tag color={raw.hold_applied === 'Y' ? (raw.hold_released === 'Y' ? 'green' : 'red') : 'default'}>
                {raw.hold_applied === 'Y' ? (raw.hold_released === 'Y' ? 'Released' : 'On Hold') : 'None'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Routed">
              <Tag color={raw.routed === 'Y' ? 'green' : 'orange'}>
                {raw.routed === 'Y' ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </>
      ),
    },
    {
      key: 'holds',
      label: (
        <span>
          <HistoryOutlined />
          Hold History
          {raw.hold_applied === 'Y' && (
            <Badge
              count={holdHistory.length}
              style={{ marginLeft: 8 }}
              color={raw.hold_released === 'Y' ? 'green' : 'red'}
            />
          )}
        </span>
      ),
      children: (
        <>
          {raw.hold_applied !== 'Y' ? (
            <Empty description="No holds applied to this order" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : loadingHolds ? (
            <Spin size="small"><span>Loading hold history...</span></Spin>
          ) : holdError ? (
            <Alert type="error" message={holdError} showIcon />
          ) : holdHistory.length > 0 ? (
            <Table
              dataSource={holdHistory}
              columns={holdHistoryColumns}
              rowKey={(_, index) => `hold-${index}`}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Empty description="No hold history found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </>
      ),
    },
    {
      key: 'routing',
      label: (
        <span>
          <CarOutlined />
          Routing Info
          {raw.routed === 'Y' && (
            <Badge
              count={routingInfo.length}
              style={{ marginLeft: 8 }}
              color="blue"
            />
          )}
        </span>
      ),
      children: (
        <>
          {raw.routed !== 'Y' ? (
            <Empty description="Order is not routed" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : loadingRouting ? (
            <Spin size="small"><span>Loading routing information...</span></Spin>
          ) : routingError ? (
            <Alert type="error" message={routingError} showIcon />
          ) : routingInfo.length > 0 ? (
            <Table
              dataSource={routingInfo}
              columns={routingColumns}
              rowKey={(_, index) => `routing-${index}`}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Empty description="No routing information found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </>
      ),
    },
    // Network Inventory tab - only shown for backorders without ISO
    ...(showInventoryTab
      ? [
          {
            key: 'inventory',
            label: (
              <span>
                <DatabaseOutlined />
                Network Inventory
                {networkInventory.length > 0 && (
                  <Badge
                    count={networkInventory.length}
                    style={{ marginLeft: 8 }}
                    color="cyan"
                  />
                )}
              </span>
            ),
            children: (
              <>
                {loadingInventory ? (
                  <Spin size="small"><span>Loading network inventory...</span></Spin>
                ) : inventoryError ? (
                  <Alert type="error" message={inventoryError} showIcon />
                ) : networkInventory.length > 0 ? (
                  <Table
                    dataSource={networkInventory}
                    columns={inventoryColumns}
                    rowKey={(_, index) => `inventory-${index}`}
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                ) : (
                  <Empty description="No network inventory found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <Drawer
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          Order {order.orderNumber} / Line {order.lineNumber}
        </span>
      }
      placement="right"
      width={900}
      onClose={onClose}
      open={open}
      closeIcon={<CloseOutlined />}
      className="order-detail-drawer"
    >
      <Tabs defaultActiveKey="details" items={tabItems} />
    </Drawer>
  );
}

export default OrderDetailDrawer;
