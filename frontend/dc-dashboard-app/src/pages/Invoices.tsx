/**
 * Invoices Page
 * Displays invoice data in a hierarchical expandable view
 * Hierarchy: Transaction Type (invtranstype) → Invoice → Lines
 */

import { useMemo, useState } from 'react';
import { Collapse, Spin, Alert, Table, Tag, Empty, Statistic, Card, Input, Select, Button, Space, Tooltip } from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  FolderOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDCContext, useInvoiceContext } from '../contexts';
import type { Invoice, InvoiceLine, InvoiceGroup } from '../types';
import './Invoices.css';

// Transaction type color mapping
const TRANS_TYPE_COLORS: Record<string, string> = {
  'Invoice': '#1890ff',
  'Credit Memo': '#f5222d',
  'Debit Memo': '#fa8c16',
  'Deposit': '#52c41a',
  'Guarantee': '#722ed1',
  'Unknown': '#8c8c8c',
};

function getTransTypeColor(transType: string): string {
  return TRANS_TYPE_COLORS[transType] || TRANS_TYPE_COLORS['Unknown'];
}

// Line columns for the innermost table
const lineColumns: ColumnsType<InvoiceLine> = [
  {
    title: 'Line #',
    dataIndex: 'line_number',
    key: 'line_number',
    width: 70,
    render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>,
  },
  {
    title: 'Type',
    dataIndex: 'line_type',
    key: 'line_type',
    width: 70,
    render: (val) => (
      <Tag color={val === 'TAX' ? 'orange' : 'blue'} style={{ margin: 0 }}>
        {val}
      </Tag>
    ),
  },
  {
    title: 'Item',
    dataIndex: 'item_number',
    key: 'item_number',
    width: 120,
    render: (val) => val ? <code style={{ fontSize: '11px' }}>{val}</code> : '-',
  },
  {
    title: 'Product Group',
    dataIndex: 'productgrp',
    key: 'productgrp',
    width: 150,
    ellipsis: true,
    render: (val) => <span style={{ fontSize: '11px' }}>{val || '-'}</span>,
  },
  {
    title: 'Vendor',
    dataIndex: 'vendor',
    key: 'vendor',
    width: 120,
    ellipsis: true,
    render: (val) => <span style={{ fontSize: '11px' }}>{val || '-'}</span>,
  },
  {
    title: 'Style',
    dataIndex: 'style',
    key: 'style',
    width: 100,
    render: (val) => val ? <Tag color="geekblue" style={{ fontSize: '10px', margin: 0 }}>{val}</Tag> : '-',
  },
  {
    title: 'Qty',
    dataIndex: 'quantity_invoiced',
    key: 'quantity_invoiced',
    width: 80,
    align: 'right',
    render: (val) => <span>{val?.toLocaleString() ?? '-'}</span>,
  },
  {
    title: 'Unit Price',
    dataIndex: 'unit_selling_price',
    key: 'unit_selling_price',
    width: 100,
    align: 'right',
    render: (val) => val ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-',
  },
  {
    title: 'Amount',
    dataIndex: 'extended_amount',
    key: 'extended_amount',
    width: 110,
    align: 'right',
    render: (val) => (
      <span style={{ fontWeight: 600, color: '#1890ff' }}>
        ${val?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
      </span>
    ),
  },
  {
    title: 'Sales Order',
    dataIndex: 'sales_order',
    key: 'sales_order',
    width: 110,
    render: (val, record) => val ? `${val}/${record.sales_order_line || ''}` : '-',
  },
  {
    title: 'Tax Name',
    dataIndex: 'tax_name',
    key: 'tax_name',
    width: 100,
    render: (val) => <span style={{ fontSize: '10px' }}>{val || '-'}</span>,
  },
  {
    title: 'Tax Rate',
    dataIndex: 'tax_rate',
    key: 'tax_rate',
    width: 80,
    align: 'right',
    render: (val) => val ? `${val}%` : '-',
  },
];

// Component for rendering invoice lines table
function InvoiceLinesTable({ lines }: { lines: InvoiceLine[] }) {
  return (
    <div className="invoice-lines-container">
      <Table
        columns={lineColumns}
        dataSource={lines.map((line, idx) => ({
          ...line,
          key: `${line.customer_trx_line_id}-${idx}`,
        }))}
        size="small"
        pagination={false}
        className="invoice-lines-table"
        rowClassName={(record) => record.line_type === 'TAX' ? 'tax-row' : 'line-row'}
      />
    </div>
  );
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Component for rendering invoices within a transaction type group
function InvoiceCollapse({ invoices }: { invoices: Invoice[] }) {
  const items = invoices.map((invoice, idx) => ({
    key: `inv-${invoice.customer_trx_id}-${idx}`,
    label: (
      <div className="invoice-header">
        <FileTextOutlined className="invoice-icon" />
        <span className="invoice-number">{invoice.trx_number}</span>
        <Tooltip title={invoice.billcustname} placement="top">
          <span className="invoice-customer">{invoice.billcustname}</span>
        </Tooltip>
        {invoice.shipcustname && invoice.shipcustname !== invoice.billcustname && (
          <Tooltip title={`Ship To: ${invoice.shipcustname}`} placement="top">
            <span className="invoice-shipto">→ {invoice.shipcustname}</span>
          </Tooltip>
        )}
        {invoice.shiploc && (
          <Tag color="cyan" style={{ margin: 0 }}>{invoice.shiploc}</Tag>
        )}
        {invoice.shipmethod && (
          <Tag color="geekblue" style={{ margin: 0 }}>{invoice.shipmethod}</Tag>
        )}
        <span className="invoice-date">{formatDate(invoice.trx_date)}</span>
        <div className="invoice-badges">
          {invoice.ordertype && <Tag color="default">{invoice.ordertype}</Tag>}
          <Tag color="blue">{invoice.lineCount} lines</Tag>
          <Tag color="green">
            ${invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Tag>
        </div>
      </div>
    ),
    children: <InvoiceLinesTable lines={invoice.lines} />,
  }));

  return (
    <Collapse
      className="invoice-collapse"
      items={items}
      size="small"
    />
  );
}

// Filter state interface
interface InvoiceFilters {
  shiploc: string | null;
  billcustname: string | null;
  shipcustname: string | null;
  invtranstype: string | null;
  ordertype: string | null;
  shipmethod: string | null;
}

const initialFilters: InvoiceFilters = {
  shiploc: null,
  billcustname: null,
  shipcustname: null,
  invtranstype: null,
  ordertype: null,
  shipmethod: null,
};

export function Invoices() {
  const { selectedDC: _selectedDC } = useDCContext();
  // Uses shared context - data fetched once on app load
  const { invoiceGroups, stats, isLoading, error, refresh, rawData } = useInvoiceContext();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters);

  // Extract distinct values for filter dropdowns
  const filterOptions = useMemo(() => {
    const shiplocSet = new Set<string>();
    const billcustSet = new Set<string>();
    const shipcustSet = new Set<string>();
    const transTypeSet = new Set<string>();
    const orderTypeSet = new Set<string>();
    const shipMethodSet = new Set<string>();

    for (const line of rawData) {
      if (line.shiploc) shiplocSet.add(line.shiploc);
      if (line.billcustname) billcustSet.add(line.billcustname);
      if (line.shipcustname) shipcustSet.add(line.shipcustname);
      if (line.invtranstype) transTypeSet.add(line.invtranstype);
      if (line.ordertype) orderTypeSet.add(line.ordertype);
      if (line.shipmethod) shipMethodSet.add(line.shipmethod);
    }

    return {
      shiploc: Array.from(shiplocSet).sort(),
      billcustname: Array.from(billcustSet).sort(),
      shipcustname: Array.from(shipcustSet).sort(),
      invtranstype: Array.from(transTypeSet).sort(),
      ordertype: Array.from(orderTypeSet).sort(),
      shipmethod: Array.from(shipMethodSet).sort(),
    };
  }, [rawData]);

  // Check if any filters are active
  const hasActiveFilters = filters.shiploc || filters.billcustname || filters.shipcustname || filters.invtranstype || filters.ordertype || filters.shipmethod;

  // Clear all filters
  const clearFilters = () => {
    setFilters(initialFilters);
  };

  // Apply filters and search
  const filteredGroups = useMemo(() => {
    let result = invoiceGroups;

    // Apply dropdown filters
    if (hasActiveFilters) {
      result = result.map((group: InvoiceGroup) => {
        // Filter by transaction type at group level
        if (filters.invtranstype && group.invtranstype !== filters.invtranstype) {
          return { ...group, invoices: [] };
        }

        // Filter invoices within group
        const filteredInvoices = group.invoices.filter((inv: Invoice) => {
          if (filters.shiploc && inv.shiploc !== filters.shiploc) return false;
          if (filters.billcustname && inv.billcustname !== filters.billcustname) return false;
          if (filters.shipcustname && inv.shipcustname !== filters.shipcustname) return false;
          if (filters.ordertype && inv.ordertype !== filters.ordertype) return false;
          if (filters.shipmethod && inv.shipmethod !== filters.shipmethod) return false;
          return true;
        });

        return { ...group, invoices: filteredInvoices };
      }).filter((group: InvoiceGroup) => group.invoices.length > 0);
    }

    // Apply search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      result = result.map((group: InvoiceGroup) => ({
        ...group,
        invoices: group.invoices.filter((inv: Invoice) =>
          inv.trx_number.toLowerCase().includes(searchLower) ||
          inv.billcustname.toLowerCase().includes(searchLower) ||
          (inv.shipcustname?.toLowerCase().includes(searchLower)) ||
          (inv.ordertype?.toLowerCase().includes(searchLower)) ||
          // Also search in lines
          inv.lines.some((line: InvoiceLine) =>
            line.item_number?.toLowerCase().includes(searchLower) ||
            line.productgrp?.toLowerCase().includes(searchLower) ||
            line.vendor?.toLowerCase().includes(searchLower) ||
            line.sales_order?.toLowerCase().includes(searchLower)
          )
        ),
      })).filter((group: InvoiceGroup) => group.invoices.length > 0);
    }

    return result;
  }, [invoiceGroups, filters, searchText, hasActiveFilters]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const distinctInvoices = new Set<number>();
    const distinctCustomers = new Set<string>();
    let totalLines = 0;
    let totalAmount = 0;

    for (const group of filteredGroups) {
      for (const invoice of group.invoices) {
        distinctInvoices.add(invoice.customer_trx_id);
        if (invoice.billcustname) {
          distinctCustomers.add(invoice.billcustname);
        }
        totalLines += invoice.lineCount;
        totalAmount += invoice.totalAmount;
      }
    }

    return {
      totalInvoices: distinctInvoices.size,
      totalLines,
      totalCustomers: distinctCustomers.size,
      totalAmount,
    };
  }, [filteredGroups]);

  // Build collapse items for transaction type groups
  const groupItems = filteredGroups.map((group: InvoiceGroup) => ({
    key: `group-${group.invtranstype}`,
    label: (
      <div className="transtype-header">
        <div
          className="transtype-indicator"
          style={{ backgroundColor: getTransTypeColor(group.invtranstype) }}
        />
        <FolderOutlined className="transtype-icon" />
        <span className="transtype-name">{group.invtranstype}</span>
        <div className="transtype-badges">
          <Tag color="purple">{group.invoiceCount} invoices</Tag>
          <Tag color="blue">{group.lineCount} lines</Tag>
          <Tag color="green">
            ${group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Tag>
        </div>
      </div>
    ),
    children: <InvoiceCollapse invoices={group.invoices} />,
  }));

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="invoices-loading">
          <Spin size="large" />
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <Alert
          message="Error Loading Invoices"
          description={error.message}
          type="error"
          showIcon
          action={
            <button onClick={refresh} className="retry-button">
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header with Search */}
      <div className="invoices-header">
        <h2 className="invoices-title">
          <FileTextOutlined /> Invoices
        </h2>
        <div className="invoices-search">
          <Input
            placeholder="Search invoices, customers, items, vendors..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="middle"
          />
          {(searchText || hasActiveFilters) && (
            <span className="search-results-count">
              {filteredStats.totalInvoices} of {stats.totalInvoices} invoices
            </span>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="invoices-filters">
        <Space wrap size="middle">
          <FilterOutlined className="filter-icon" />
          <Select
            placeholder="Ship Location"
            value={filters.shiploc}
            onChange={(value) => setFilters(prev => ({ ...prev, shiploc: value }))}
            allowClear
            style={{ width: 150 }}
            options={filterOptions.shiploc.map(val => ({ value: val, label: val }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Bill To Customer"
            value={filters.billcustname}
            onChange={(value) => setFilters(prev => ({ ...prev, billcustname: value }))}
            allowClear
            style={{ width: 180 }}
            options={filterOptions.billcustname.map(val => ({ value: val, label: val }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Ship To Customer"
            value={filters.shipcustname}
            onChange={(value) => setFilters(prev => ({ ...prev, shipcustname: value }))}
            allowClear
            style={{ width: 180 }}
            options={filterOptions.shipcustname.map(val => ({ value: val, label: val }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Transaction Type"
            value={filters.invtranstype}
            onChange={(value) => setFilters(prev => ({ ...prev, invtranstype: value }))}
            allowClear
            style={{ width: 160 }}
            options={filterOptions.invtranstype.map(val => ({ value: val, label: val }))}
          />
          <Select
            placeholder="Order Type"
            value={filters.ordertype}
            onChange={(value) => setFilters(prev => ({ ...prev, ordertype: value }))}
            allowClear
            style={{ width: 140 }}
            options={filterOptions.ordertype.map(val => ({ value: val, label: val }))}
          />
          <Select
            placeholder="Ship Method"
            value={filters.shipmethod}
            onChange={(value) => setFilters(prev => ({ ...prev, shipmethod: value }))}
            allowClear
            style={{ width: 140 }}
            options={filterOptions.shipmethod.map(val => ({ value: val, label: val }))}
          />
          {hasActiveFilters && (
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          )}
        </Space>
      </div>

      {/* Summary Stats */}
      <div className="invoices-stats">
        <Card size="small" className="stat-card">
          <Statistic
            title="Invoices"
            value={filteredStats.totalInvoices}
            prefix={<FileTextOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Lines"
            value={filteredStats.totalLines}
            prefix={<UnorderedListOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Customers"
            value={filteredStats.totalCustomers}
            prefix={<TeamOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Total Amount"
            value={filteredStats.totalAmount}
            precision={2}
            prefix={<DollarOutlined />}
            formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
        </Card>
      </div>

      {/* Invoice Groups (Transaction Types) */}
      {invoiceGroups.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No invoices found"
        />
      ) : filteredGroups.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No invoices match your search"
        />
      ) : (
        <Collapse
          className="transtype-collapse"
          items={groupItems}
          size="large"
          defaultActiveKey={filteredGroups.length === 1 ? [`group-${filteredGroups[0].invtranstype}`] : []}
        />
      )}
    </div>
  );
}

export default Invoices;
