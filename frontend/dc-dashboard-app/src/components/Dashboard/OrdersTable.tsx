import { Table, Tag, Tooltip } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { OrderRow } from '../../types';
import './OrdersTable.css';

interface OrdersTableProps {
  data: OrderRow[];
  loading?: boolean;
  title?: string;
  showShipMethod?: boolean;
  showRouting?: boolean;
  pagination?: TablePaginationConfig | false;
  onRowClick?: (order: OrderRow) => void;
}

function getStatusTag(status: string) {
  const statusColors: Record<string, string> = {
    'Ready to Release': 'green',
    'Awaiting Shipping': 'blue',
    'Backordered': 'orange',
    'Awaiting Receipt': 'purple',
    'Entered': 'default',
    'Staged': 'geekblue',
    'Staged/Pick Confirmed': 'geekblue',
    'Shipped': 'cyan',
  };

  return (
    <Tag color={statusColors[status] || 'default'} className="status-tag">
      {status}
    </Tag>
  );
}

export function OrdersTable({
  data,
  loading = false,
  title,
  showShipMethod = true,
  showRouting = true,
  pagination = {
    defaultPageSize: 10,
    showSizeChanger: true,
    showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} orders`,
    pageSizeOptions: ['10', '15', '20', '50'],
  },
  onRowClick,
}: OrdersTableProps) {
  const columns: ColumnsType<OrderRow> = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      sorter: (a, b) => a.orderNumber - b.orderNumber,
      width: 130,
      render: (num: number, record: OrderRow) => (
        <span className="order-number">
          {num}
          {record.lineNumber && (
            <span className="line-number">/{record.lineNumber}</span>
          )}
          {record.exception && (
            <span className={`exception-dot ${record.exception}`} />
          )}
        </span>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      sorter: (a, b) => a.customer.localeCompare(b.customer),
      width: 180,
      render: (customer: string) => (
        <span className="customer-name" style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
          {customer}
        </span>
      ),
    },
    {
      title: 'Item',
      dataIndex: 'item',
      key: 'item',
      ellipsis: true,
      width: 100,
      render: (item: string, record: OrderRow) => {
        const { item_description, productgrp, vendor, style } = record.raw;
        const hasDetails = item_description || productgrp || vendor || style;

        const tooltipContent = hasDetails ? (
          <div style={{ maxWidth: 300 }}>
            {item_description && (
              <div style={{ marginBottom: 4 }}>
                <strong>Description:</strong> {item_description}
              </div>
            )}
            {productgrp && (
              <div style={{ marginBottom: 4 }}>
                <strong>Product Group:</strong> {productgrp}
              </div>
            )}
            {vendor && (
              <div style={{ marginBottom: 4 }}>
                <strong>Vendor:</strong> {vendor}
              </div>
            )}
            {style && (
              <div>
                <strong>Style:</strong> {style}
              </div>
            )}
          </div>
        ) : item;

        return (
          <Tooltip title={tooltipContent} placement="topLeft">
            <code className="item-code" style={{ cursor: hasDetails ? 'help' : 'default' }}>
              {item}
            </code>
          </Tooltip>
        );
      },
    },
    ...(showShipMethod ? [{
      title: 'Ship Method',
      dataIndex: 'shipMethod',
      key: 'shipMethod',
      width: 100,
      filters: [
        { text: 'Route Truck', value: 'Route Truck' },
        { text: 'UPS Ground', value: 'UPS Ground' },
        { text: 'UPS 2nd Day Air', value: 'UPS 2nd Day Air' },
        { text: 'UPS Next Day Air', value: 'UPS Next Day Air' },
        { text: 'FedEx Ground', value: 'FedEx Ground' },
        { text: 'FedEx Express', value: 'FedEx Express' },
        { text: 'Will Call', value: 'Will Call' },
        { text: 'LTL Freight', value: 'LTL Freight' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) =>
        record.shipMethod === value,
      render: (method: string) => (
        <span className="ship-method">{method}</span>
      ),
    }] : []),
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      filters: [
        { text: 'Ready to Release', value: 'Ready to Release' },
        { text: 'Awaiting Shipping', value: 'Awaiting Shipping' },
        { text: 'Backordered', value: 'Backordered' },
        { text: 'Awaiting Receipt', value: 'Awaiting Receipt' },
        { text: 'Entered', value: 'Entered' },
        { text: 'Staged/Pick Confirmed', value: 'Staged/Pick Confirmed' },
        { text: 'Shipped', value: 'Shipped' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) =>
        record.status === value,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 75,
      align: 'center',
      render: (_: unknown, record: OrderRow) => {
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
      title: 'Hold',
      key: 'hold',
      width: 70,
      align: 'center',
      filters: [
        { text: 'On Hold', value: 'applied' },
        { text: 'Released', value: 'released' },
        { text: 'No Hold', value: 'none' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) => {
        if (value === 'applied') return record.holdApplied && !record.holdReleased;
        if (value === 'released') return record.holdApplied && record.holdReleased;
        if (value === 'none') return !record.holdApplied;
        return true;
      },
      render: (_: unknown, record: OrderRow) => {
        if (!record.holdApplied) {
          return <span className="hold-none">-</span>;
        }
        if (record.holdReleased) {
          return (
            <Tooltip title="Hold Released">
              <CheckCircleFilled className="hold-released" />
            </Tooltip>
          );
        }
        return (
          <Tooltip title="On Hold">
            <CloseCircleFilled className="hold-applied" />
          </Tooltip>
        );
      },
    },
    {
      title: 'Ship Set',
      dataIndex: 'shipSet',
      key: 'shipSet',
      width: 80,
      render: (shipSet: string) => (
        <span className="ship-set">{shipSet}</span>
      ),
    },
    {
      title: 'ISO',
      key: 'iso',
      width: 60,
      align: 'center',
      filters: [
        { text: 'Has ISO', value: 'yes' },
        { text: 'No ISO', value: 'no' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) => {
        const hasIso = record.raw.iso && record.raw.iso.trim() !== '';
        return value === 'yes' ? hasIso : !hasIso;
      },
      render: (_: unknown, record: OrderRow) => {
        const hasIso = record.raw.iso && record.raw.iso.trim() !== '';
        return hasIso ? (
          <Tooltip title={record.raw.iso}>
            <CheckCircleFilled style={{ color: '#52c41a' }} />
          </Tooltip>
        ) : (
          <span style={{ color: '#d9d9d9' }}>-</span>
        );
      },
    },
    {
      title: 'L+',
      key: 'localplusqtyexists',
      width: 50,
      align: 'center',
      filters: [
        { text: 'Has Local+', value: 'yes' },
        { text: 'No Local+', value: 'no' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) => {
        const hasLocalPlus = record.raw.localplusqtyexists === 'Y';
        return value === 'yes' ? hasLocalPlus : !hasLocalPlus;
      },
      render: (_: unknown, record: OrderRow) => {
        const hasLocalPlus = record.raw.localplusqtyexists === 'Y';
        const qty = record.raw.localplusqty;
        return hasLocalPlus ? (
          <Tooltip title={`Local+ Qty: ${qty ?? 0}`}>
            <CheckCircleFilled style={{ color: '#13c2c2' }} />
          </Tooltip>
        ) : (
          <span style={{ color: '#d9d9d9' }}>-</span>
        );
      },
    },
    ...(showRouting ? [{
      title: 'Routing',
      dataIndex: 'routing',
      key: 'routing',
      width: 80,
      align: 'center' as const,
      filters: [
        { text: 'Routed', value: 'success' },
        { text: 'Not Routed', value: 'pending' },
      ],
      onFilter: (value: boolean | React.Key, record: OrderRow) =>
        record.routing === value,
      render: (status: OrderRow['routing']) => {
        // Only show routing status for Route Truck orders
        if (status === 'na') {
          return <span className="routing-na">-</span>;
        }
        if (status === 'success') {
          return (
            <Tooltip title="Routed">
              <CheckCircleFilled style={{ color: '#52c41a' }} />
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Not Routed">
            <CloseCircleFilled style={{ color: '#ff4d4f' }} />
          </Tooltip>
        );
      },
    }] : []),
    {
      title: 'Due',
      dataIndex: 'dueTime',
      key: 'dueTime',
      sorter: (a, b) => {
        const dateA = a.raw.schedule_ship_date || '';
        const dateB = b.raw.schedule_ship_date || '';
        return dateA.localeCompare(dateB);
      },
      width: 75,
      render: (due: string, record: OrderRow) => (
        <span className={`due-date ${record.exception === 'critical' ? 'overdue' : ''}`}>
          {due}
        </span>
      ),
    },
  ] as ColumnsType<OrderRow>;

  return (
    <div className="orders-table-container">
      {title && <h3 className="orders-table-title">{title}</h3>}
      <Table<OrderRow>
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        rowKey="key"
        className="orders-table"
        rowClassName={(record) => {
          if (record.exception === 'critical') return 'row-critical';
          if (record.exception === 'warning') return 'row-warning';
          return '';
        }}
        onRow={(record) => ({
          onClick: onRowClick ? () => onRowClick(record) : undefined,
          style: onRowClick ? { cursor: 'pointer' } : undefined,
        })}
        scroll={{ x: 900 }}
        size="middle"
      />
    </div>
  );
}

export default OrdersTable;
