import { Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { InvoiceLineRaw } from '../../types';
import type { InvoiceChartData } from '../../hooks/useInvoiceAnalytics';
import { formatDate } from './utils';

interface InvoiceDetailsModalProps {
  visible: boolean;
  selectedGroup: InvoiceChartData | null;
  groupLabel: string;  // e.g., "Product Group", "Order Type"
  onClose: () => void;
}

export function InvoiceDetailsModal({
  visible,
  selectedGroup,
  groupLabel,
  onClose
}: InvoiceDetailsModalProps) {
  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const columns: ColumnsType<InvoiceLineRaw> = [
    {
      title: 'Invoice #',
      dataIndex: 'trx_number',
      key: 'trx_number',
      width: 120,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Date',
      dataIndex: 'trx_date',
      key: 'trx_date',
      width: 100,
      render: (value: string | null) => formatDate(value),
    },
    {
      title: 'Trans Type',
      dataIndex: 'invtranstype',
      key: 'invtranstype',
      width: 100,
      render: (value: string | null) => value ? <Tag>{value}</Tag> : '-',
    },
    {
      title: 'Bill To',
      dataIndex: 'billcustname',
      key: 'billcustname',
      width: 150,
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Item',
      dataIndex: 'item_number',
      key: 'item_number',
      width: 120,
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Product Grp',
      dataIndex: 'productgrp',
      key: 'productgrp',
      width: 100,
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity_invoiced',
      key: 'quantity_invoiced',
      width: 70,
      align: 'right',
      render: (value: number | null) => value ?? 0,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_selling_price',
      key: 'unit_selling_price',
      width: 100,
      align: 'right',
      render: (value: number | null) => formatCurrency(value),
    },
    {
      title: 'Amount',
      dataIndex: 'extended_amount',
      key: 'extended_amount',
      width: 110,
      align: 'right',
      render: (value: number | null) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Ship Method',
      dataIndex: 'shipmethod',
      key: 'shipmethod',
      width: 100,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Order Type',
      dataIndex: 'ordertype',
      key: 'ordertype',
      width: 100,
      render: (value: string | null) => value || '-',
    },
  ];

  // Format summary for title
  const formatSummary = () => {
    if (!selectedGroup) return '';
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(selectedGroup.amount);
    return `${selectedGroup.count} invoices, ${formattedAmount}`;
  };

  return (
    <Modal
      title={
        selectedGroup
          ? `${groupLabel}: ${selectedGroup.name} (${formatSummary()})`
          : 'Invoice Details'
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
    >
      {selectedGroup && (
        <Table
          dataSource={selectedGroup.lines}
          columns={columns}
          rowKey={(record) => `${record.customer_trx_id}-${record.customer_trx_line_id}`}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} lines` }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </Modal>
  );
}
