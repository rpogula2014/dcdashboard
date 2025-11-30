import { useState, useMemo } from 'react';
import { Layout, Menu, Badge } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  TruckOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { PageKey } from '../../types';
import { useOrderContext } from '../../contexts';
import { getSidebarCounts } from '../../hooks/useOrders';
import './Sidebar.css';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

interface SidebarProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
}

// Helper to create menu item with badge
function createMenuItem(
  key: string,
  label: string,
  icon: React.ReactNode,
  badge?: number,
  badgeColor?: string,
  collapsed?: boolean
): MenuItem {
  return {
    key,
    icon,
    label: (
      <span className="sidebar-menu-label">
        <span className="sidebar-menu-text">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge
            count={badge}
            size="small"
            style={{
              backgroundColor: badgeColor || '#1890ff',
              marginLeft: collapsed ? 0 : 8,
            }}
            className="sidebar-badge"
          />
        )}
      </span>
    ),
  };
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Get order data from context and compute badge counts
  const { orderRows } = useOrderContext();
  const badgeCounts = useMemo(() => getSidebarCounts(orderRows), [orderRows]);

  // Build grouped menu items
  const menuItems: MenuItem[] = useMemo(() => [
    // Summary Section
    createMenuItem('summary', 'Summary', <DashboardOutlined />, badgeCounts.summary, undefined, collapsed),

    // Divider
    { type: 'divider' },

    // By Ship Method Section
    {
      type: 'group',
      label: !collapsed ? 'By Ship Method' : null,
      children: [
        createMenuItem('routeTruck', 'Route Truck', <TruckOutlined />, badgeCounts.routeTruck, undefined, collapsed),
        createMenuItem('otherShipMethods', 'Others', <InboxOutlined />, badgeCounts.otherShipMethods, undefined, collapsed),
        createMenuItem('isos', 'ISOs', <ShopOutlined />, badgeCounts.isos, undefined, collapsed),
      ],
    },

    // Divider
    { type: 'divider' },

    // Exceptions Section
    createMenuItem(
      'exceptions',
      'Exceptions',
      <ExclamationCircleOutlined />,
      badgeCounts.exceptions,
      badgeCounts.exceptions > 0 ? '#ff4d4f' : undefined,
      collapsed
    ),

    // Divider
    { type: 'divider' },

    // Analytics Section
    createMenuItem('analytics', 'Analytics', <BarChartOutlined />, undefined, undefined, collapsed),
  ], [badgeCounts, collapsed]);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={240}
      collapsedWidth={64}
      className="dc-sidebar"
      trigger={null}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {collapsed ? (
            <span className="logo-collapsed">DC</span>
          ) : (
            <span className="logo-full">DC Dashboard</span>
          )}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[currentPage]}
        items={menuItems}
        onClick={({ key }) => onPageChange(key as PageKey)}
        className="sidebar-menu"
      />

      <div className="sidebar-footer">
        {!collapsed && (
          <span className="dc-label">DC-PHX</span>
        )}
      </div>
    </Sider>
  );
}

export default Sidebar;
