/**
 * ExceptionAlerts Page
 * Displays active alerts grouped by rule with drill-down capability
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Tag,
  Table,
  Collapse,
  Space,
  Spin,
  Empty,
  Badge,
  Tooltip,
  Alert as AntAlert,
} from 'antd';
import {
  ReloadOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAlertRules } from '../contexts';
import { executeAllAlertRules } from '../services/alertRuleExecutor';
import type { AlertResult, AlertSeverity, QueryResultRow } from '../types';

// Severity configuration
const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  critical: {
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    icon: <ExclamationCircleOutlined />,
    label: 'Critical',
  },
  warning: {
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: <WarningOutlined />,
    label: 'Warning',
  },
  info: {
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: <InfoCircleOutlined />,
    label: 'Info',
  },
};

// Hook for executing alert rules and managing results
function useAlertResults() {
  const { rules, buildWhereClause } = useAlertRules();
  const [results, setResults] = useState<AlertResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const executeRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newResults = await executeAllAlertRules(rules, buildWhereClause);
      setResults(newResults);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute rules');
      console.error('Error executing alert rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rules, buildWhereClause]);

  // Initial load
  useEffect(() => {
    executeRules();
  }, [executeRules]);

  // Auto-refresh based on individual rule intervals
  useEffect(() => {
    const enabledRules = rules.filter((r) => r.enabled && r.refreshInterval > 0);
    if (enabledRules.length === 0) return;

    // Find the minimum refresh interval
    const minInterval = Math.min(...enabledRules.map((r) => r.refreshInterval)) * 1000;
    if (minInterval <= 0) return;

    const interval = setInterval(() => {
      executeRules();
    }, minInterval);

    return () => clearInterval(interval);
  }, [rules, executeRules]);

  return {
    results,
    isLoading,
    error,
    lastRefreshed,
    refresh: executeRules,
  };
}

// Alert Rule Group Component - collapsible card showing rule summary
function AlertRuleGroup({
  result,
  isExpanded,
  onToggle,
}: {
  result: AlertResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityConfig = SEVERITY_CONFIG[result.severity];
  const hasMatches = result.matchCount > 0;

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        borderLeft: `4px solid ${hasMatches ? severityConfig.color : '#52c41a'}`,
        backgroundColor: hasMatches ? severityConfig.bgColor : '#f6ffed',
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
          <span style={{ fontWeight: 500 }}>{result.ruleName}</span>
          <Tag color={hasMatches ? severityConfig.color : 'success'} icon={hasMatches ? severityConfig.icon : <CheckCircleOutlined />}>
            {hasMatches ? severityConfig.label : 'OK'}
          </Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Badge
            count={result.matchCount}
            showZero
            style={{
              backgroundColor: hasMatches ? severityConfig.color : '#52c41a',
            }}
          />
          {result.error && (
            <Tooltip title={result.error}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          <span style={{ fontSize: 11, color: '#999' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {result.lastChecked.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {isExpanded && hasMatches && (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          <AlertDetails result={result} />
        </div>
      )}

      {isExpanded && !hasMatches && !result.error && (
        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', textAlign: 'center', color: '#52c41a' }}>
          <CheckCircleOutlined style={{ marginRight: 8 }} />
          No exceptions found
        </div>
      )}

      {isExpanded && result.error && (
        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
          <AntAlert message={result.error} type="error" showIcon />
        </div>
      )}
    </Card>
  );
}

// Alert Details Component - expandable table showing matching orders
function AlertDetails({ result }: { result: AlertResult }) {
  // Dynamically build columns based on the data
  const columns = useMemo<ColumnsType<QueryResultRow>>(() => {
    if (result.matchingOrders.length === 0) return [];

    // Get all keys from first row
    const firstRow = result.matchingOrders[0];
    const keys = Object.keys(firstRow);

    // Priority columns to show first
    const priorityColumns = [
      'order_number',
      'line_id',
      'ordered_item',
      'ordered_quantity',
      'reserved_qty',
      'sold_to',
      'ship_to',
      'routed',
      'planned',
      'hold_applied',
    ];

    // Sort keys with priority columns first
    const sortedKeys = [
      ...priorityColumns.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !priorityColumns.includes(k)),
    ].slice(0, 10); // Limit to 10 columns for readability

    return sortedKeys.map((key) => ({
      title: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      dataIndex: key,
      key,
      ellipsis: true,
      width: key.includes('quantity') || key.includes('qty') ? 80 : 120,
      render: (value: unknown) => {
        if (value === null || value === undefined) {
          return <span style={{ color: '#ccc' }}>-</span>;
        }
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        if (value === 'Y') {
          return <Tag color="green">Y</Tag>;
        }
        if (value === 'N') {
          return <Tag color="default">N</Tag>;
        }
        return String(value);
      },
    }));
  }, [result.matchingOrders]);

  return (
    <Table
      dataSource={result.matchingOrders}
      columns={columns}
      rowKey={(record, index) => `${record.order_number || index}-${record.line_id || index}`}
      size="small"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `${total} records`,
      }}
      scroll={{ x: 'max-content' }}
      style={{ margin: '0 16px 16px' }}
    />
  );
}

// Summary Stats Component
function AlertSummary({ results }: { results: AlertResult[] }) {
  const stats = useMemo(() => {
    const bysSeverity = {
      critical: { count: 0, matches: 0 },
      warning: { count: 0, matches: 0 },
      info: { count: 0, matches: 0 },
    };

    results.forEach((r) => {
      bysSeverity[r.severity].count++;
      bysSeverity[r.severity].matches += r.matchCount;
    });

    const totalExceptions = results.reduce((sum, r) => sum + r.matchCount, 0);
    const rulesWithExceptions = results.filter((r) => r.matchCount > 0).length;

    return { bysSeverity, totalExceptions, rulesWithExceptions, totalRules: results.length };
  }, [results]);

  return (
    <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#666' }}>Total Exceptions:</span>
        <span style={{ fontWeight: 600, fontSize: 18 }}>{stats.totalExceptions}</span>
      </div>
      <div style={{ width: 1, background: '#f0f0f0' }} />
      {(Object.entries(SEVERITY_CONFIG) as [AlertSeverity, typeof SEVERITY_CONFIG.critical][]).map(
        ([severity, config]) => (
          <div key={severity} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {config.icon}
            <span style={{ color: config.color, fontWeight: 500 }}>
              {stats.bysSeverity[severity].matches}
            </span>
            <span style={{ color: '#999', fontSize: 12 }}>
              ({stats.bysSeverity[severity].count} rules)
            </span>
          </div>
        )
      )}
    </div>
  );
}

export function ExceptionAlerts() {
  const { results, isLoading, error, lastRefreshed, refresh } = useAlertResults();
  const { rules } = useAlertRules();
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Auto-expand rules with critical exceptions
  useEffect(() => {
    const criticalRuleIds = results
      .filter((r) => r.severity === 'critical' && r.matchCount > 0)
      .map((r) => r.ruleId);
    setExpandedRules(new Set(criticalRuleIds));
  }, [results]);

  const toggleExpand = useCallback((ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  // Separate results by whether they have exceptions
  const { withExceptions, withoutExceptions } = useMemo(() => {
    return {
      withExceptions: results.filter((r) => r.matchCount > 0),
      withoutExceptions: results.filter((r) => r.matchCount === 0 && !r.error),
    };
  }, [results]);

  const enabledRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="page-content">
      <Card
        title={
          <Space>
            <span>Exception Alerts</span>
            {isLoading && <Spin size="small" />}
          </Space>
        }
        extra={
          <Space>
            {lastRefreshed && (
              <span style={{ fontSize: 12, color: '#999' }}>
                Last checked: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <Button
              icon={<ReloadOutlined spin={isLoading} />}
              onClick={refresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Tooltip title="Use sidebar to access Configure Rules">
              <Button icon={<SettingOutlined />} disabled>Configure Rules</Button>
            </Tooltip>
          </Space>
        }
      >
        {error && (
          <AntAlert
            message="Error loading alerts"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {enabledRulesCount === 0 ? (
          <Empty
            description="No alert rules configured. Use the sidebar to access Configure Rules."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : results.length === 0 && isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#999' }}>Checking alert rules...</div>
          </div>
        ) : (
          <>
            <AlertSummary results={results} />

            {withExceptions.length === 0 && withoutExceptions.length > 0 && (
              <AntAlert
                message="All Clear!"
                description={`All ${enabledRulesCount} alert rules passed. No exceptions found.`}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Rules with exceptions */}
            {withExceptions.map((result) => (
              <AlertRuleGroup
                key={result.ruleId}
                result={result}
                isExpanded={expandedRules.has(result.ruleId)}
                onToggle={() => toggleExpand(result.ruleId)}
              />
            ))}

            {/* Rules without exceptions (collapsed by default) */}
            {withoutExceptions.length > 0 && (
              <Collapse
                size="small"
                style={{ marginTop: 16 }}
                items={[
                  {
                    key: 'passing',
                    label: (
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <span>Passing Rules ({withoutExceptions.length})</span>
                      </Space>
                    ),
                    children: (
                      <div>
                        {withoutExceptions.map((result) => (
                          <AlertRuleGroup
                            key={result.ruleId}
                            result={result}
                            isExpanded={expandedRules.has(result.ruleId)}
                            onToggle={() => toggleExpand(result.ruleId)}
                          />
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default ExceptionAlerts;
