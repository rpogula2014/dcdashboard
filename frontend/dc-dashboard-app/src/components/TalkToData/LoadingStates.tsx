/**
 * Loading States Components
 * Skeleton loaders and spinners for query execution
 */

import { Spin, Skeleton } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { ResultDisplayType } from '../../types';
import './TalkToData.css';

interface QueryLoadingProps {
  message?: string;
}

interface ResultSkeletonProps {
  type?: ResultDisplayType;
}

/**
 * Main loading spinner for query execution
 */
export function QueryLoading({ message = 'Processing your question...' }: QueryLoadingProps) {
  return (
    <div className="query-loading-container">
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
        size="large"
      />
      <span className="query-loading-text">{message}</span>
    </div>
  );
}

/**
 * Skeleton loader for table results
 */
export function TableSkeleton() {
  return (
    <div className="result-skeleton-table">
      {/* Header row */}
      <div className="result-skeleton-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="result-skeleton-cell">
            <Skeleton.Input active size="small" style={{ width: '100%' }} />
          </div>
        ))}
      </div>
      {/* Data rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="result-skeleton-row">
          {[1, 2, 3, 4, 5].map((col) => (
            <div key={col} className="result-skeleton-cell">
              <Skeleton.Input
                active
                size="small"
                style={{
                  width: `${60 + Math.random() * 40}%`,
                  opacity: 0.6,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for chart results
 */
export function ChartSkeleton() {
  return (
    <div className="result-skeleton-chart">
      <div style={{ marginBottom: 8 }}>
        <Skeleton.Input active size="small" style={{ width: 150 }} />
      </div>
      <div className="result-skeleton-chart-area" />
    </div>
  );
}

/**
 * Skeleton loader for text results
 */
export function TextSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <Skeleton
        active
        title={{ width: '60%' }}
        paragraph={{
          rows: 3,
          width: ['100%', '90%', '70%'],
        }}
      />
    </div>
  );
}

/**
 * Skeleton loader for SQL display
 */
export function SQLSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 4 }} />
      <div
        style={{
          background: '#282c34',
          borderRadius: 6,
          padding: '12px 16px',
          minHeight: 60,
        }}
      >
        <Skeleton
          active
          title={false}
          paragraph={{
            rows: 2,
            width: ['80%', '60%'],
          }}
          style={{ opacity: 0.3 }}
        />
      </div>
    </div>
  );
}

/**
 * Combined result skeleton based on expected type
 */
export function ResultSkeleton({ type = 'table' }: ResultSkeletonProps) {
  return (
    <div>
      <SQLSkeleton />
      {type === 'table' && <TableSkeleton />}
      {type === 'chart' && <ChartSkeleton />}
      {type === 'text' && <TextSkeleton />}
    </div>
  );
}

/**
 * Loading stages for multi-step query process
 */
const LOADING_STAGES = [
  { key: 'analyzing', message: 'Analyzing your question...', duration: 800 },
  { key: 'generating', message: 'Generating SQL query...', duration: 1200 },
  { key: 'executing', message: 'Executing query...', duration: 500 },
  { key: 'formatting', message: 'Formatting results...', duration: 300 },
];

interface StageLoadingProps {
  currentStage: number;
}

/**
 * Multi-stage loading indicator
 */
export function StageLoading({ currentStage }: StageLoadingProps) {
  const stage = LOADING_STAGES[Math.min(currentStage, LOADING_STAGES.length - 1)];

  return (
    <div className="query-loading-container">
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
        size="large"
      />
      <span className="query-loading-text">{stage.message}</span>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
        }}
      >
        {LOADING_STAGES.map((s, index) => (
          <div
            key={s.key}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: index <= currentStage ? '#1890ff' : '#d9d9d9',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Get loading stage durations
 */
export function getLoadingStages() {
  return LOADING_STAGES;
}

export default {
  QueryLoading,
  TableSkeleton,
  ChartSkeleton,
  TextSkeleton,
  SQLSkeleton,
  ResultSkeleton,
  StageLoading,
  getLoadingStages,
};
