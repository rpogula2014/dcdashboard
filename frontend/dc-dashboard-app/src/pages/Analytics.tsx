import { useState, useMemo } from 'react';
import { Select, Empty, Collapse } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  BarChartOutlined as UnitsIcon,
  CarOutlined,
  ShoppingOutlined,
  TeamOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useOrderContext, useInvoiceContext } from '../contexts';
import {
  BackorderLinesChart,
  BackorderUnitsChart,
  BackorderDetailsModal,
  ShippedTripsChart,
  ShippedProductChart,
  InvoiceBarChart,
  InvoiceDetailsModal,
  type GroupBy,
  type GroupedData,
  type ShippedTripData,
  type ShippedProductData,
} from '../components/Analytics';
import {
  useInvoiceAnalytics,
  type InvoiceGroupByAttribute,
  type InvoiceChartData,
} from '../hooks/useInvoiceAnalytics';

export function Analytics() {
  const { orderRows } = useOrderContext();
  const [groupBy, setGroupBy] = useState<GroupBy>('item');
  const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Invoice state - uses shared context (fetched on app load)
  const { rawData: invoiceRawData, isLoading: invoicesLoading } = useInvoiceContext();
  const invoiceAnalytics = useInvoiceAnalytics(invoiceRawData);
  const [invoiceGroupBy, setInvoiceGroupBy] = useState<InvoiceGroupByAttribute>('productgrp');
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] = useState<InvoiceChartData | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceModalLabel, setInvoiceModalLabel] = useState('');

  // Filter to backorder only (reserved_qty < ordered_quantity)
  const backorderRows = useMemo(() => {
    return orderRows.filter((order) => {
      const orderedQty = order.raw.ordered_quantity ?? 0;
      const reservedQty = order.raw.reserved_qty ?? 0;
      return reservedQty < orderedQty;
    });
  }, [orderRows]);

  // Calculate total backorder units
  const totalBackorderUnits = useMemo(() => {
    return backorderRows.reduce((sum, order) => {
      const orderedQty = order.raw.ordered_quantity ?? 0;
      const reservedQty = order.raw.reserved_qty ?? 0;
      return sum + (orderedQty - reservedQty);
    }, 0);
  }, [backorderRows]);

  // Filter to shipped orders only
  const shippedRows = useMemo(() => {
    return orderRows.filter((order) => order.status === 'Shipped');
  }, [orderRows]);

  // Group backorders by selected dimension
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedData> = {};

    backorderRows.forEach((order) => {
      let groupKey: string;
      switch (groupBy) {
        case 'item':
          groupKey = order.raw.ordered_item || 'Unknown Item';
          break;
        case 'productGroup':
          groupKey = order.raw.productgrp || 'Unknown Product Group';
          break;
        case 'vendor':
          groupKey = order.raw.vendor || 'Unknown Vendor';
          break;
        default:
          groupKey = 'Unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey,
          lineCount: 0,
          unitCount: 0,
          orders: [],
        };
      }

      const orderedQty = order.raw.ordered_quantity ?? 0;
      const reservedQty = order.raw.reserved_qty ?? 0;
      const backorderUnits = orderedQty - reservedQty;

      groups[groupKey].lineCount += 1;
      groups[groupKey].unitCount += backorderUnits;
      groups[groupKey].orders.push(order);
    });

    // Convert to array and sort by unit count descending
    return Object.values(groups).sort((a, b) => b.unitCount - a.unitCount);
  }, [backorderRows, groupBy]);

  // Group shipped orders by ship method (trips) - using DISTINCT trip_id
  const shippedTripData = useMemo((): ShippedTripData[] => {
    const groups: Record<string, { orders: typeof shippedRows; totalUnits: number; tripIds: Set<string | number> }> = {};

    shippedRows.forEach((order) => {
      const shipMethod = order.shipMethod || 'Unknown';

      if (!groups[shipMethod]) {
        groups[shipMethod] = {
          orders: [],
          totalUnits: 0,
          tripIds: new Set(),
        };
      }

      const units = order.raw.ordered_quantity ?? 0;
      groups[shipMethod].orders.push(order);
      groups[shipMethod].totalUnits += units;

      // Count DISTINCT trip_id as trips
      const tripId = order.raw.trip_id;
      if (tripId !== null && tripId !== undefined) {
        groups[shipMethod].tripIds.add(tripId);
      }
    });

    return Object.entries(groups)
      .map(([shipMethod, data]) => {
        // Distinct trip count from trip_id
        const tripCount = data.tripIds.size;
        return {
          shipMethod,
          tripCount,
          totalUnits: data.totalUnits,
          avgUnitsPerTrip: tripCount > 0 ? Math.round((data.totalUnits / tripCount) * 10) / 10 : 0,
          orders: data.orders,
        };
      })
      .sort((a, b) => b.tripCount - a.tripCount);
  }, [shippedRows]);

  // Group shipped orders by product group
  const shippedByProductGroup = useMemo((): ShippedProductData[] => {
    const groups: Record<string, ShippedProductData> = {};

    shippedRows.forEach((order) => {
      const productGrp = order.raw.productgrp || 'Unknown';

      if (!groups[productGrp]) {
        groups[productGrp] = {
          name: productGrp,
          unitCount: 0,
          lineCount: 0,
          orders: [],
        };
      }

      groups[productGrp].unitCount += order.raw.ordered_quantity ?? 0;
      groups[productGrp].lineCount += 1;
      groups[productGrp].orders.push(order);
    });

    return Object.values(groups).sort((a, b) => b.unitCount - a.unitCount);
  }, [shippedRows]);

  // Group shipped orders by vendor
  const shippedByVendor = useMemo((): ShippedProductData[] => {
    const groups: Record<string, ShippedProductData> = {};

    shippedRows.forEach((order) => {
      const vendor = order.raw.vendor || 'Unknown';

      if (!groups[vendor]) {
        groups[vendor] = {
          name: vendor,
          unitCount: 0,
          lineCount: 0,
          orders: [],
        };
      }

      groups[vendor].unitCount += order.raw.ordered_quantity ?? 0;
      groups[vendor].lineCount += 1;
      groups[vendor].orders.push(order);
    });

    return Object.values(groups).sort((a, b) => b.unitCount - a.unitCount);
  }, [shippedRows]);

  // Calculate shipped summary stats - DISTINCT trip_id for trips
  const shippedStats = useMemo(() => {
    const totalUnits = shippedRows.reduce((sum, o) => sum + (o.raw.ordered_quantity ?? 0), 0);
    // Count only DISTINCT trip_ids
    const distinctTripIds = new Set(
      shippedRows
        .map(o => o.raw.trip_id)
        .filter(id => id !== null && id !== undefined)
    );
    return {
      totalLines: shippedRows.length,
      totalUnits,
      totalTrips: distinctTripIds.size,
    };
  }, [shippedRows]);

  // Handle bar click for backorders
  const handleBarClick = (data: GroupedData) => {
    setSelectedGroup(data);
    setModalVisible(true);
  };

  // Handle invoice bar click for drill-down
  const handleInvoiceBarClick = (data: InvoiceChartData, label: string) => {
    setSelectedInvoiceGroup(data);
    setInvoiceModalLabel(label);
    setInvoiceModalVisible(true);
  };

  // Get invoice chart data
  const invoiceByAttribute = invoiceAnalytics.groupByAttribute(invoiceGroupBy);
  const invoiceByOrderType = invoiceAnalytics.groupByField('ordertype');
  const invoiceByTransType = invoiceAnalytics.groupByField('invtranstype');
  const invoiceByShipMethod = invoiceAnalytics.groupByField('shipmethod');

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get label for current invoice attribute grouping
  const getAttributeLabel = (attr: InvoiceGroupByAttribute) => {
    switch (attr) {
      case 'productgrp': return 'Product Group';
      case 'vendor': return 'Vendor';
      case 'style': return 'Style';
      default: return attr;
    }
  };

  return (
    <div className="page-content">
      {/* Shipped Summary Section */}
      <div className="stats-bar" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
            Shipped Today
          </span>
          <div style={{ width: '1px', height: '14px', background: '#e8e8e8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CarOutlined style={{ fontSize: 12, color: '#1890ff' }} />
            <span style={{ color: '#999', fontSize: 11 }}>Trips:</span>
            <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>{shippedStats.totalTrips}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingOutlined style={{ fontSize: 12, color: '#52c41a' }} />
            <span style={{ color: '#999', fontSize: 11 }}>Units:</span>
            <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>{shippedStats.totalUnits.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChartOutlined style={{ fontSize: 12, color: '#722ed1' }} />
            <span style={{ color: '#999', fontSize: 11 }}>Lines:</span>
            <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>{shippedStats.totalLines}</span>
          </div>
        </div>
      </div>

      {/* Shipped Charts */}
      <Collapse
        defaultActiveKey={[]}
        size="small"
        style={{ marginBottom: 12 }}
        items={[
          {
            key: 'shipped-trips',
            label: (
              <span style={{ fontSize: 12 }}>
                <CarOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Trips by Ship Method ({shippedTripData.length})
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedTripsChart data={shippedTripData} />
            ) : (
              <Empty description="No shipped orders today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          },
          {
            key: 'shipped-product',
            label: (
              <span style={{ fontSize: 12 }}>
                <ShoppingOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Units by Product Group ({shippedByProductGroup.length})
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedProductChart data={shippedByProductGroup} title="Product Group" />
            ) : (
              <Empty description="No shipped orders today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          },
          {
            key: 'shipped-vendor',
            label: (
              <span style={{ fontSize: 12 }}>
                <TeamOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Units by Vendor ({shippedByVendor.length})
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedProductChart data={shippedByVendor} title="Vendor" />
            ) : (
              <Empty description="No shipped orders today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          },
        ]}
      />

      {/* Backorder Summary Section */}
      {backorderRows.length > 0 && (
        <>
          <div className="stats-bar" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                Backorders
              </span>
              <div style={{ width: '1px', height: '14px', background: '#e8e8e8' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#999', fontSize: 11 }}>Lines:</span>
                <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>{backorderRows.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#999', fontSize: 11 }}>Units:</span>
                <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 12 }}>{totalBackorderUnits.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#999', fontSize: 11 }}>Group by:</span>
              <Select
                value={groupBy}
                onChange={setGroupBy}
                size="small"
                style={{ width: 130 }}
                options={[
                  { value: 'item', label: 'Item' },
                  { value: 'productGroup', label: 'Product Group' },
                  { value: 'vendor', label: 'Vendor' },
                ]}
              />
            </div>
          </div>

          {/* Backorder Charts */}
          <Collapse
            defaultActiveKey={[]}
            size="small"
            style={{ marginBottom: 12 }}
            items={[
              {
                key: 'lines',
                label: (
                  <span style={{ fontSize: 12 }}>
                    <LineChartOutlined style={{ marginRight: 6, fontSize: 11 }} />
                    Lines by Count
                  </span>
                ),
                children: (
                  <BackorderLinesChart data={groupedData} onBarClick={handleBarClick} />
                ),
              },
              {
                key: 'units',
                label: (
                  <span style={{ fontSize: 12 }}>
                    <UnitsIcon style={{ marginRight: 6, fontSize: 11 }} />
                    Units by Sum
                  </span>
                ),
                children: (
                  <BackorderUnitsChart data={groupedData} onBarClick={handleBarClick} />
                ),
              },
            ]}
          />
        </>
      )}

      {/* Drill-down Modal */}
      <BackorderDetailsModal
        visible={modalVisible}
        selectedGroup={selectedGroup}
        onClose={() => setModalVisible(false)}
      />

      {/* Invoices Section */}
      {!invoicesLoading && invoiceRawData.length > 0 && (
        <>
          <div className="stats-bar" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                Invoices
              </span>
              <div style={{ width: '1px', height: '14px', background: '#e8e8e8' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileTextOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                <span style={{ color: '#999', fontSize: 11 }}>Invoices:</span>
                <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>
                  {invoiceAnalytics.stats.totalInvoices.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChartOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                <span style={{ color: '#999', fontSize: 11 }}>Lines:</span>
                <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>
                  {invoiceAnalytics.stats.totalLines.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingOutlined style={{ fontSize: 12, color: '#fa8c16' }} />
                <span style={{ color: '#999', fontSize: 11 }}>Units:</span>
                <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>
                  {invoiceAnalytics.stats.totalUnits.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarOutlined style={{ fontSize: 12, color: '#722ed1' }} />
                <span style={{ color: '#999', fontSize: 11 }}>Amount:</span>
                <span style={{ color: '#333', fontWeight: 600, fontSize: 12 }}>
                  {formatCurrency(invoiceAnalytics.stats.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Charts */}
          <Collapse
            defaultActiveKey={[]}
            size="small"
            style={{ marginBottom: 12 }}
            items={[
              {
                key: 'invoice-attribute',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: 12 }}>
                      <ShoppingOutlined style={{ marginRight: 6, fontSize: 11 }} />
                      By {getAttributeLabel(invoiceGroupBy)} ({invoiceByAttribute.length})
                    </span>
                  </div>
                ),
                extra: (
                  <Select
                    value={invoiceGroupBy}
                    onChange={(value) => setInvoiceGroupBy(value)}
                    size="small"
                    style={{ width: 130 }}
                    onClick={(e) => e.stopPropagation()}
                    options={[
                      { value: 'productgrp', label: 'Product Group' },
                      { value: 'vendor', label: 'Vendor' },
                      { value: 'style', label: 'Style' },
                    ]}
                  />
                ),
                children: invoiceByAttribute.length > 0 ? (
                  <InvoiceBarChart
                    data={invoiceByAttribute}
                    onBarClick={(data) => handleInvoiceBarClick(data, getAttributeLabel(invoiceGroupBy))}
                  />
                ) : (
                  <Empty description="No invoice data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: 'invoice-ordertype',
                label: (
                  <span style={{ fontSize: 12 }}>
                    <FileTextOutlined style={{ marginRight: 6, fontSize: 11 }} />
                    By Order Type ({invoiceByOrderType.length})
                  </span>
                ),
                children: invoiceByOrderType.length > 0 ? (
                  <InvoiceBarChart
                    data={invoiceByOrderType}
                    onBarClick={(data) => handleInvoiceBarClick(data, 'Order Type')}
                  />
                ) : (
                  <Empty description="No invoice data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: 'invoice-transtype',
                label: (
                  <span style={{ fontSize: 12 }}>
                    <LineChartOutlined style={{ marginRight: 6, fontSize: 11 }} />
                    By Transaction Type ({invoiceByTransType.length})
                  </span>
                ),
                children: invoiceByTransType.length > 0 ? (
                  <InvoiceBarChart
                    data={invoiceByTransType}
                    onBarClick={(data) => handleInvoiceBarClick(data, 'Transaction Type')}
                  />
                ) : (
                  <Empty description="No invoice data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: 'invoice-shipmethod',
                label: (
                  <span style={{ fontSize: 12 }}>
                    <CarOutlined style={{ marginRight: 6, fontSize: 11 }} />
                    By Ship Method ({invoiceByShipMethod.length})
                  </span>
                ),
                children: invoiceByShipMethod.length > 0 ? (
                  <InvoiceBarChart
                    data={invoiceByShipMethod}
                    onBarClick={(data) => handleInvoiceBarClick(data, 'Ship Method')}
                  />
                ) : (
                  <Empty description="No invoice data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
            ]}
          />
        </>
      )}

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        visible={invoiceModalVisible}
        selectedGroup={selectedInvoiceGroup}
        groupLabel={invoiceModalLabel}
        onClose={() => setInvoiceModalVisible(false)}
      />
    </div>
  );
}

export default Analytics;
