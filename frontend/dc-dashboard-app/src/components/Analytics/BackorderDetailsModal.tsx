import { Modal, Table, Tooltip } from 'antd';
import type { OrderRow } from '../../types';
import type { GroupedData } from './types';
import { calculateAging, formatDate } from './utils';

interface BackorderDetailsModalProps {
  visible: boolean;
  selectedGroup: GroupedData | null;
  onClose: () => void;
}

export function BackorderDetailsModal({ visible, selectedGroup, onClose }: BackorderDetailsModalProps) {
  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 100,
    },
    {
      title: 'Line',
      dataIndex: 'lineNumber',
      key: 'lineNumber',
      width: 60,
    },
    {
      title: 'Item',
      dataIndex: 'item',
      key: 'item',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Ordered',
      key: 'orderedQty',
      width: 80,
      render: (_: unknown, record: OrderRow) => record.raw.ordered_quantity ?? 0,
    },
    {
      title: 'Reserved',
      key: 'reservedQty',
      width: 80,
      render: (_: unknown, record: OrderRow) => record.raw.reserved_qty ?? 0,
    },
    {
      title: 'Backorder',
      key: 'backorderQty',
      width: 90,
      render: (_: unknown, record: OrderRow) => {
        const ordered = record.raw.ordered_quantity ?? 0;
        const reserved = record.raw.reserved_qty ?? 0;
        return <span style={{ color: '#f5222d', fontWeight: 500 }}>{ordered - reserved}</span>;
      },
    },
    {
      title: 'Ship Date',
      key: 'shipDate',
      width: 110,
      render: (_: unknown, record: OrderRow) => formatDate(record.raw.schedule_ship_date),
    },
    {
      title: 'Aging (Days)',
      key: 'aging',
      width: 100,
      render: (_: unknown, record: OrderRow) => {
        const aging = calculateAging(record.raw.schedule_ship_date);
        let color = '#52c41a'; // green
        if (aging > 14) color = '#f5222d'; // red
        else if (aging > 7) color = '#faad14'; // orange
        return (
          <Tooltip title={`${aging} days overdue`}>
            <span style={{ color, fontWeight: 500 }}>{aging}</span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        selectedGroup
          ? `Backorder Details: ${selectedGroup.name} (${selectedGroup.lineCount} lines, ${selectedGroup.unitCount} units)`
          : 'Backorder Details'
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      {selectedGroup && (
        <Table
          dataSource={selectedGroup.orders}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </Modal>
  );
}
