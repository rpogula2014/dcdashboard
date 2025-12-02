import { Card, Progress } from 'antd';
import type { KPIData } from '../../types';
import './KPICard.css';

interface KPICardProps extends KPIData {
  loading?: boolean;
}

const colorConfig = {
  blue: {
    gradient: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)',
    progressStroke: '#58a6ff',
    progressTrail: 'rgba(88, 166, 255, 0.15)',
    glow: 'rgba(88, 166, 255, 0.3)',
    accent: '#58a6ff',
  },
  green: {
    gradient: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
    progressStroke: '#3fb950',
    progressTrail: 'rgba(63, 185, 80, 0.15)',
    glow: 'rgba(63, 185, 80, 0.3)',
    accent: '#3fb950',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #9e6a03 0%, #d29922 100%)',
    progressStroke: '#d29922',
    progressTrail: 'rgba(210, 153, 34, 0.15)',
    glow: 'rgba(210, 153, 34, 0.3)',
    accent: '#d29922',
  },
  red: {
    gradient: 'linear-gradient(135deg, #da3633 0%, #f85149 100%)',
    progressStroke: '#f85149',
    progressTrail: 'rgba(248, 81, 73, 0.15)',
    glow: 'rgba(248, 81, 73, 0.3)',
    accent: '#f85149',
  },
  purple: {
    gradient: 'linear-gradient(135deg, #8957e5 0%, #a371f7 100%)',
    progressStroke: '#a371f7',
    progressTrail: 'rgba(163, 113, 247, 0.15)',
    glow: 'rgba(163, 113, 247, 0.3)',
    accent: '#a371f7',
  },
};

export function KPICard({
  title,
  value,
  progress,
  footer,
  color = 'blue',
  onClick,
  loading = false,
}: KPICardProps) {
  const colors = colorConfig[color];

  return (
    <Card
      className={`kpi-card kpi-card-${color} ${onClick ? 'kpi-card-clickable' : ''}`}
      loading={loading}
      onClick={onClick}
      style={{
        '--kpi-gradient': colors.gradient,
        '--kpi-glow': colors.glow,
        '--kpi-accent': colors.accent,
      } as React.CSSProperties}
    >
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        <div
          className="kpi-indicator"
          style={{ background: colors.gradient }}
        />
      </div>

      <div className="kpi-value-container">
        <span className="kpi-value">{value.toLocaleString()}</span>
      </div>

      {progress !== undefined && (
        <div className="kpi-progress">
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={colors.progressStroke}
            railColor={colors.progressTrail}
            size="small"
          />
          <span
            className="kpi-progress-label"
            style={{ color: colors.accent }}
          >
            {progress}%
          </span>
        </div>
      )}

      {footer && (
        <div className="kpi-footer">
          <span className="kpi-footer-text">{footer}</span>
        </div>
      )}
    </Card>
  );
}

export default KPICard;
