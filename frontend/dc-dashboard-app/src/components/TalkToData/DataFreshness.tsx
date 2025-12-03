/**
 * DataFreshness Component
 * Shows when data was last loaded into DuckDB
 */

import { Typography, Tooltip, Tag, Space } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { DataFreshness as DataFreshnessType } from '../../types';
import './TalkToData.css';

const { Text } = Typography;

interface DataFreshnessProps {
  freshness: DataFreshnessType;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Get freshness status color
 */
function getFreshnessColor(date: Date | null): 'success' | 'warning' | 'error' {
  if (!date) return 'error';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes < 5) return 'success';
  if (diffMinutes < 30) return 'warning';
  return 'error';
}

/**
 * Single dataset status
 */
function DatasetStatus({
  name,
  loaded,
  count,
  lastLoaded,
}: {
  name: string;
  loaded: boolean;
  count: number;
  lastLoaded: Date | null;
}) {
  const color = loaded ? getFreshnessColor(lastLoaded) : 'error';
  const statusIcon = loaded ? (
    <CheckCircleFilled style={{ color: color === 'success' ? '#52c41a' : color === 'warning' ? '#faad14' : '#ff4d4f' }} />
  ) : (
    <CloseCircleFilled style={{ color: '#ff4d4f' }} />
  );

  return (
    <Tooltip
      title={
        loaded
          ? `${count.toLocaleString()} records loaded at ${lastLoaded?.toLocaleTimeString()}`
          : 'Not loaded'
      }
    >
      <Tag
        icon={statusIcon}
        color={loaded ? undefined : 'error'}
        className="data-freshness-tag"
      >
        {name}: {loaded ? `${count.toLocaleString()} rows` : 'Not loaded'}
      </Tag>
    </Tooltip>
  );
}

export function DataFreshness({
  freshness,
  onRefresh,
  isRefreshing = false,
}: DataFreshnessProps) {
  const { dcOrderLines, routePlans, dcOnhand } = freshness;

  // Determine overall status
  const isLoaded = dcOrderLines.loaded || routePlans.loaded || dcOnhand.loaded;
  const lastUpdated = [dcOrderLines.lastLoaded, routePlans.lastLoaded, dcOnhand.lastLoaded]
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0))[0];

  return (
    <div className="data-freshness-container">
      <div className="data-freshness-header">
        <DatabaseOutlined style={{ marginRight: 6 }} />
        <Text type="secondary">Data Status</Text>
        {isLoaded && lastUpdated && (
          <Text type="secondary" style={{ marginLeft: 8 }}>
            Updated {formatRelativeTime(lastUpdated)}
          </Text>
        )}
        {onRefresh && (
          <Tooltip title="Refresh data">
            <SyncOutlined
              spin={isRefreshing}
              onClick={isRefreshing ? undefined : onRefresh}
              style={{
                marginLeft: 8,
                cursor: isRefreshing ? 'default' : 'pointer',
                color: isRefreshing ? '#999' : '#1890ff',
              }}
            />
          </Tooltip>
        )}
      </div>
      <Space size={8} className="data-freshness-datasets">
        <DatasetStatus
          name="Orders"
          loaded={dcOrderLines.loaded}
          count={dcOrderLines.count}
          lastLoaded={dcOrderLines.lastLoaded}
        />
        <DatasetStatus
          name="Routes"
          loaded={routePlans.loaded}
          count={routePlans.count}
          lastLoaded={routePlans.lastLoaded}
        />
        <DatasetStatus
          name="Onhand"
          loaded={dcOnhand.loaded}
          count={dcOnhand.count}
          lastLoaded={dcOnhand.lastLoaded}
        />
      </Space>
    </div>
  );
}

/**
 * Compact inline version for header
 */
export function DataFreshnessCompact({
  freshness,
}: {
  freshness: DataFreshnessType;
}) {
  const { dcOrderLines, routePlans, dcOnhand } = freshness;
  const isLoaded = dcOrderLines.loaded || routePlans.loaded || dcOnhand.loaded;
  const totalCount = dcOrderLines.count + routePlans.count + dcOnhand.count;

  if (!isLoaded) {
    return (
      <Tooltip title="No data loaded">
        <Tag color="error" icon={<CloseCircleFilled />}>
          No Data
        </Tag>
      </Tooltip>
    );
  }

  const lastUpdated = [dcOrderLines.lastLoaded, routePlans.lastLoaded, dcOnhand.lastLoaded]
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0))[0];

  const color = getFreshnessColor(lastUpdated);

  return (
    <Tooltip
      title={
        <div>
          <div>Orders: {dcOrderLines.count.toLocaleString()} rows</div>
          <div>Routes: {routePlans.count.toLocaleString()} rows</div>
          <div>Onhand: {dcOnhand.count.toLocaleString()} rows</div>
          <div>Updated: {formatRelativeTime(lastUpdated)}</div>
        </div>
      }
    >
      <Tag
        color={color}
        icon={<DatabaseOutlined />}
        className="data-freshness-compact"
      >
        {totalCount.toLocaleString()} records
      </Tag>
    </Tooltip>
  );
}

export default DataFreshness;
