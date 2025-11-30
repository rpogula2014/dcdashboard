import { Layout, Select, Switch, Typography } from 'antd';
import { SyncOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { RefreshInterval } from '../../types';
import './Header.css';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  title: string;
  subtitle?: string;
  refreshEnabled: boolean;
  refreshInterval: RefreshInterval;
  lastSynced: Date | null;
  isRefreshing: boolean;
  onRefreshToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: RefreshInterval) => void;
  onManualRefresh: () => void;
}

const intervalOptions = [
  { value: 30000, label: '30s' },
  { value: 60000, label: '1 min' },
  { value: 300000, label: '5 min' },
];

function formatLastSynced(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function Header({
  title,
  subtitle,
  refreshEnabled,
  refreshInterval,
  lastSynced,
  isRefreshing,
  onRefreshToggle,
  onIntervalChange,
  onManualRefresh,
}: HeaderProps) {
  return (
    <AntHeader className="dc-header">
      <div className="header-left">
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="header-right">
        <div className="sync-status">
          <ClockCircleOutlined className="sync-icon" />
          <Text className="sync-text">
            Last synced: {formatLastSynced(lastSynced)}
          </Text>
        </div>

        <div className="refresh-controls">
          <button
            className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
            onClick={onManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <SyncOutlined spin={isRefreshing} />
          </button>

          <div className="refresh-toggle-group">
            <Switch
              checked={refreshEnabled}
              onChange={onRefreshToggle}
              size="small"
              className="refresh-switch"
            />
            <Text className="refresh-label">Auto</Text>
          </div>

          {refreshEnabled && (
            <Select
              value={refreshInterval}
              onChange={onIntervalChange}
              options={intervalOptions}
              size="small"
              className="interval-select"
              popupMatchSelectWidth={false}
            />
          )}
        </div>
      </div>
    </AntHeader>
  );
}

export default Header;
