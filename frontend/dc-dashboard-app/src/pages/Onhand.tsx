import { useMemo, useState } from 'react';
import { Collapse, Spin, Alert, Table, Tag, Empty, Statistic, Card, Input } from 'antd';
import {
  DatabaseOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  InboxOutlined,
  SearchOutlined,
  ContainerOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useOnhand } from '../hooks';
import { useDCContext } from '../contexts';
import type { Subinventory, Aisle, Locator, ProductGroup, OnhandItem } from '../hooks/useOnhand';
import './Onhand.css';

// Item columns for the innermost table
const itemColumns: ColumnsType<OnhandItem> = [
  {
    title: 'Item',
    dataIndex: 'itemnumber',
    key: 'itemnumber',
    width: 140,
    render: (val) => <code style={{ fontSize: '11px', fontWeight: 600 }}>{val || '-'}</code>,
  },
  {
    title: 'Description',
    dataIndex: 'item_description',
    key: 'item_description',
    width: 150,
    ellipsis: true,
    render: (val) => <span style={{ fontSize: '11px' }}>{val || '-'}</span>,
  },
  {
    title: 'Vendor',
    dataIndex: 'vendor_display',
    key: 'vendor_display',
    width: 100,
    ellipsis: true,
    render: (val, record) => (
      <span style={{ fontSize: '11px' }}>{val || record.vendor || '-'}</span>
    ),
  },
  {
    title: 'Style',
    dataIndex: 'style',
    key: 'style',
    width: 150,
    render: (val) => (
      val ? <Tag color="geekblue" style={{ fontSize: '10px', margin: 0 }}>{val}</Tag> : '-'
    ),
  },
  {
    title: 'Qty',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
    render: (val) => (
      <span style={{ fontWeight: 600, color: '#1890ff' }}>
        {val?.toLocaleString() ?? '-'}
      </span>
    ),
  },
  {
    title: 'Custom Subinv',
    dataIndex: 'CustomSubinventory',
    key: 'CustomSubinventory',
    width: 120,
    render: (val) => <span style={{ fontSize: '10px', color: '#666' }}>{val || '-'}</span>,
  },
];

// Component for rendering items table within a product group
function ItemsTable({ items }: { items: OnhandItem[] }) {
  return (
    <div className="items-table-container">
      <Table
        columns={itemColumns}
        dataSource={items.map((item, idx) => ({
          ...item,
          key: `${item.inventory_item_id}-${idx}`,
        }))}
        size="small"
        pagination={false}
        className="items-table"
      />
    </div>
  );
}

// Component for rendering product groups within a locator
function ProductGroupCollapse({ productGroups }: { productGroups: ProductGroup[] }) {
  const items = productGroups.map((pg, idx) => ({
    key: `pg-${pg.product_group}-${idx}`,
    label: (
      <div className="productgroup-header">
        <TagsOutlined className="productgroup-icon" />
        <span className="productgroup-code">{pg.product_group}</span>
        {pg.productgrp_display && pg.productgrp_display !== pg.product_group && (
          <span className="productgroup-name">({pg.productgrp_display})</span>
        )}
        <div className="productgroup-badges">
          <Tag color="blue">{pg.itemCount} items</Tag>
          <Tag color="cyan">{pg.totalQty.toLocaleString()} qty</Tag>
        </div>
      </div>
    ),
    children: <ItemsTable items={pg.items} />,
  }));

  return (
    <Collapse
      className="productgroup-collapse"
      items={items}
      size="small"
    />
  );
}

// Component for rendering locators within an aisle
function LocatorCollapse({ locators }: { locators: Locator[] }) {
  const items = locators.map((loc, idx) => ({
    key: `loc-${loc.locator}-${idx}`,
    label: (
      <div className="locator-header">
        <EnvironmentOutlined className="locator-icon" />
        <span className="locator-code">{loc.locator}</span>
        <div className="locator-badges">
          <Tag color="purple">{loc.productGroupCount} groups</Tag>
          <Tag color="blue">{loc.itemCount} items</Tag>
          <Tag color="cyan">{loc.totalQty.toLocaleString()} qty</Tag>
        </div>
      </div>
    ),
    children: <ProductGroupCollapse productGroups={loc.productGroups} />,
  }));

  return (
    <Collapse
      className="locator-collapse"
      items={items}
      size="small"
    />
  );
}

// Component for rendering aisles within a subinventory
function AisleCollapse({ aisles }: { aisles: Aisle[] }) {
  const items = aisles.map((aisle, idx) => ({
    key: `aisle-${aisle.aisle}-${idx}`,
    label: (
      <div className="aisle-header">
        <ContainerOutlined className="aisle-icon" />
        <span className="aisle-code">Aisle {aisle.aisle}</span>
        <div className="aisle-badges">
          <Tag color="green">{aisle.locatorCount} locators</Tag>
          <Tag color="blue">{aisle.itemCount} items</Tag>
          <Tag color="cyan">{aisle.totalQty.toLocaleString()} qty</Tag>
        </div>
      </div>
    ),
    children: <LocatorCollapse locators={aisle.locators} />,
  }));

  return (
    <Collapse
      className="aisle-collapse"
      items={items}
      size="small"
    />
  );
}

// Helper function to safely convert value to lowercase string for search
function toLowerStr(val: unknown): string {
  if (val == null) return '';
  return String(val).toLowerCase();
}

// Check if an item matches the search term
function itemMatchesSearch(item: OnhandItem, searchLower: string): boolean {
  return (
    toLowerStr(item.itemnumber).includes(searchLower) ||
    toLowerStr(item.item_description).includes(searchLower) ||
    toLowerStr(item.vendor).includes(searchLower) ||
    toLowerStr(item.vendor_display).includes(searchLower) ||
    toLowerStr(item.style).includes(searchLower)
  );
}

// Deep filter the hierarchy to only include matching items and recalculate counts
function filterSubinventories(subinventories: Subinventory[], searchLower: string): Subinventory[] {
  const result: Subinventory[] = [];

  for (const subinv of subinventories) {
    // Check if subinventory name matches - if so, include everything
    if (toLowerStr(subinv.subinventory_code).includes(searchLower)) {
      result.push(subinv);
      continue;
    }

    const filteredAisles: Aisle[] = [];
    let subinvTotalQty = 0;
    const subinvDistinctItems = new Set<number>();

    for (const aisle of subinv.aisles) {
      // Check if aisle name matches - if so, include entire aisle
      if (toLowerStr(aisle.aisle).includes(searchLower)) {
        filteredAisles.push(aisle);
        aisle.locators.forEach(loc =>
          loc.productGroups.forEach(pg =>
            pg.items.forEach(item => {
              subinvDistinctItems.add(item.inventory_item_id);
              subinvTotalQty += item.quantity || 0;
            })
          )
        );
        continue;
      }

      const filteredLocators: Locator[] = [];
      let aisleTotalQty = 0;
      const aisleDistinctItems = new Set<number>();

      for (const locator of aisle.locators) {
        // Check if locator name matches - if so, include entire locator
        if (toLowerStr(locator.locator).includes(searchLower)) {
          filteredLocators.push(locator);
          locator.productGroups.forEach(pg =>
            pg.items.forEach(item => {
              aisleDistinctItems.add(item.inventory_item_id);
              aisleTotalQty += item.quantity || 0;
            })
          );
          continue;
        }

        const filteredProductGroups: ProductGroup[] = [];
        let locatorTotalQty = 0;
        const locatorDistinctItems = new Set<number>();

        for (const pg of locator.productGroups) {
          // Check if product group name matches - if so, include entire group
          if (toLowerStr(pg.product_group).includes(searchLower) || toLowerStr(pg.productgrp_display).includes(searchLower)) {
            filteredProductGroups.push(pg);
            pg.items.forEach(item => {
              locatorDistinctItems.add(item.inventory_item_id);
              locatorTotalQty += item.quantity || 0;
            });
            continue;
          }

          // Filter individual items
          const filteredItems = pg.items.filter(item => itemMatchesSearch(item, searchLower));

          if (filteredItems.length > 0) {
            const pgDistinctItems = new Set(filteredItems.map(i => i.inventory_item_id));
            const pgTotalQty = filteredItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

            filteredProductGroups.push({
              ...pg,
              items: filteredItems,
              itemCount: pgDistinctItems.size,
              totalQty: pgTotalQty,
            });

            filteredItems.forEach(item => {
              locatorDistinctItems.add(item.inventory_item_id);
              locatorTotalQty += item.quantity || 0;
            });
          }
        }

        if (filteredProductGroups.length > 0) {
          filteredLocators.push({
            ...locator,
            productGroups: filteredProductGroups,
            productGroupCount: filteredProductGroups.length,
            itemCount: locatorDistinctItems.size,
            totalQty: locatorTotalQty,
          });

          locatorDistinctItems.forEach(id => aisleDistinctItems.add(id));
          aisleTotalQty += locatorTotalQty;
        }
      }

      if (filteredLocators.length > 0) {
        filteredAisles.push({
          ...aisle,
          locators: filteredLocators,
          locatorCount: filteredLocators.length,
          itemCount: aisleDistinctItems.size,
          totalQty: aisleTotalQty,
        });

        aisleDistinctItems.forEach(id => subinvDistinctItems.add(id));
        subinvTotalQty += aisleTotalQty;
      }
    }

    if (filteredAisles.length > 0) {
      result.push({
        ...subinv,
        aisles: filteredAisles,
        aisleCount: filteredAisles.length,
        itemCount: subinvDistinctItems.size,
        totalQty: subinvTotalQty,
      });
    }
  }

  return result;
}

export function Onhand() {
  const { selectedDC } = useDCContext();
  const { subinventories, isLoading, error, refresh } = useOnhand(selectedDC);
  const [searchText, setSearchText] = useState('');

  // Filter subinventories based on search text (deep filtering at all levels)
  const filteredSubinventories = useMemo(() => {
    if (!searchText.trim()) return subinventories;
    const searchLower = searchText.toLowerCase().trim();
    return filterSubinventories(subinventories, searchLower);
  }, [subinventories, searchText]);

  // Calculate filtered stats with DISTINCT counts
  const filteredStats = useMemo(() => {
    const distinctAisles = new Set<string>();
    const distinctLocators = new Set<string>();
    const distinctProductGroups = new Set<string>();
    const distinctItems = new Set<number>();
    let totalQty = 0;

    for (const subinv of filteredSubinventories) {
      for (const aisle of subinv.aisles) {
        distinctAisles.add(aisle.aisle);
        for (const locator of aisle.locators) {
          distinctLocators.add(locator.locator);
          for (const pg of locator.productGroups) {
            distinctProductGroups.add(pg.product_group);
            for (const item of pg.items) {
              distinctItems.add(item.inventory_item_id);
              totalQty += item.quantity || 0;
            }
          }
        }
      }
    }

    return {
      totalSubinventories: filteredSubinventories.length,
      totalAisles: distinctAisles.size,
      totalLocators: distinctLocators.size,
      totalProductGroups: distinctProductGroups.size,
      totalItems: distinctItems.size,
      totalQty,
    };
  }, [filteredSubinventories]);

  // Build collapse items for subinventories
  const subinventoryItems = filteredSubinventories.map((subinv) => ({
    key: `subinv-${subinv.subinventory_code}`,
    label: (
      <div className="subinventory-header">
        <div className="subinventory-header-main">
          <InboxOutlined className="subinventory-icon" />
          <span className="subinventory-code">{subinv.subinventory_code}</span>
        </div>
        <div className="subinventory-badges">
          <Tag color="purple">{subinv.aisleCount} aisles</Tag>
          <Tag color="blue">{subinv.itemCount} items</Tag>
          <Tag color="cyan">{subinv.totalQty.toLocaleString()} units</Tag>
        </div>
      </div>
    ),
    children: <AisleCollapse aisles={subinv.aisles} />,
  }));

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="onhand-loading">
          <Spin size="large" />
          <p>Loading onhand inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <Alert
          message="Error Loading Onhand Inventory"
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
      {/* Search Bar */}
      <div className="onhand-search">
        <Input
          placeholder="Search subinventories, aisles, locators, items, vendors, styles..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="middle"
        />
        {searchText && (
          <span className="search-results-count">
            {filteredSubinventories.length} of {subinventories.length} subinventories
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="onhand-stats">
        <Card size="small" className="stat-card">
          <Statistic
            title="Subinventories"
            value={filteredStats.totalSubinventories}
            prefix={<InboxOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Aisles"
            value={filteredStats.totalAisles}
            prefix={<ContainerOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Locators"
            value={filteredStats.totalLocators}
            prefix={<EnvironmentOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Product Groups"
            value={filteredStats.totalProductGroups}
            prefix={<AppstoreOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Items"
            value={filteredStats.totalItems}
            prefix={<TagsOutlined />}
          />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic
            title="Total Qty"
            value={filteredStats.totalQty}
            prefix={<DatabaseOutlined />}
          />
        </Card>
      </div>

      {/* Subinventories Drilldown */}
      {subinventories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No onhand inventory found"
        />
      ) : (
        <Collapse
          className="subinventory-collapse"
          items={subinventoryItems}
          size="large"
        />
      )}
    </div>
  );
}

export default Onhand;
