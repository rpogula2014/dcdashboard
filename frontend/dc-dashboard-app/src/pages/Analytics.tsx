import { useState, useMemo } from 'react';
import { Card, Row, Col, Select, Empty, Collapse, Statistic } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  BarChartOutlined as UnitsIcon,
  CarOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useOrderContext } from '../contexts';
import {
  BackorderLinesChart,
  BackorderUnitsChart,
  BackorderDetailsModal,
  ShippedTripsChart,
  ShippedProductChart,
  type GroupBy,
  type GroupedData,
  type ShippedTripData,
  type ShippedProductData,
} from '../components/Analytics';

export function Analytics() {
  const { orderRows } = useOrderContext();
  const [groupBy, setGroupBy] = useState<GroupBy>('item');
  const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter to backorder only (reserved_qty < ordered_quantity)
  const backorderRows = useMemo(() => {
    return orderRows.filter((order) => {
      const orderedQty = order.raw.ordered_quantity ?? 0;
      const reservedQty = order.raw.reserved_qty ?? 0;
      return reservedQty < orderedQty;
    });
  }, [orderRows]);

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

  // Handle bar click
  const handleBarClick = (data: GroupedData) => {
    setSelectedGroup(data);
    setModalVisible(true);
  };

  return (
    <div className="page-content">
      {/* Shipped Summary Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              Shipped Summary (Today)
            </span>
            <span style={{ marginLeft: 12, color: '#666' }}>
              {shippedRows.length} lines shipped
            </span>
          </Col>
          <Col>
            <Row gutter={32}>
              <Col>
                <Statistic title="Total Trips" value={shippedStats.totalTrips} prefix={<CarOutlined />} />
              </Col>
              <Col>
                <Statistic title="Total Units" value={shippedStats.totalUnits} prefix={<ShoppingOutlined />} />
              </Col>
              <Col>
                <Statistic title="Lines" value={shippedStats.totalLines} prefix={<BarChartOutlined />} />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Shipped Charts */}
      <Collapse
        defaultActiveKey={['shipped-trips', 'shipped-product', 'shipped-vendor']}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'shipped-trips',
            label: (
              <span>
                <CarOutlined style={{ marginRight: 8 }} />
                Shipped Trips by Ship Method ({shippedTripData.length} methods)
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedTripsChart data={shippedTripData} />
            ) : (
              <Empty description="No shipped orders today" />
            ),
          },
          {
            key: 'shipped-product',
            label: (
              <span>
                <ShoppingOutlined style={{ marginRight: 8 }} />
                Shipped Units by Product Group ({shippedByProductGroup.length} groups)
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedProductChart data={shippedByProductGroup} title="Product Group" />
            ) : (
              <Empty description="No shipped orders today" />
            ),
          },
          {
            key: 'shipped-vendor',
            label: (
              <span>
                <TeamOutlined style={{ marginRight: 8 }} />
                Shipped Units by Vendor ({shippedByVendor.length} vendors)
              </span>
            ),
            children: shippedRows.length > 0 ? (
              <ShippedProductChart data={shippedByVendor} title="Vendor" />
            ) : (
              <Empty description="No shipped orders today" />
            ),
          },
        ]}
      />

      {/* Backorder Summary Section */}
      {backorderRows.length > 0 && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  Backorder Summary
                </span>
                <span style={{ marginLeft: 12, color: '#666' }}>
                  {backorderRows.length} lines with backorders
                </span>
              </Col>
              <Col>
                <span style={{ marginRight: 8, color: '#666' }}>Group by:</span>
                <Select
                  value={groupBy}
                  onChange={setGroupBy}
                  style={{ width: 160 }}
                  options={[
                    { value: 'item', label: 'Item' },
                    { value: 'productGroup', label: 'Product Group' },
                    { value: 'vendor', label: 'Vendor' },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          {/* Backorder Charts */}
          <Collapse
            defaultActiveKey={['lines', 'units']}
            style={{ marginBottom: 16 }}
            items={[
              {
                key: 'lines',
                label: (
                  <span>
                    <LineChartOutlined style={{ marginRight: 8 }} />
                    Backorder Lines by Count
                  </span>
                ),
                children: (
                  <BackorderLinesChart data={groupedData} onBarClick={handleBarClick} />
                ),
              },
              {
                key: 'units',
                label: (
                  <span>
                    <UnitsIcon style={{ marginRight: 8 }} />
                    Backorder Units by Sum
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
    </div>
  );
}

export default Analytics;
