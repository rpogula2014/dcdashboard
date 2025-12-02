import { useState, useMemo } from 'react';
import { Select, Empty, Collapse } from 'antd';
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

  // Handle bar click
  const handleBarClick = (data: GroupedData) => {
    setSelectedGroup(data);
    setModalVisible(true);
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
        defaultActiveKey={['shipped-trips', 'shipped-product', 'shipped-vendor']}
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
            defaultActiveKey={['lines', 'units']}
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
    </div>
  );
}

export default Analytics;
