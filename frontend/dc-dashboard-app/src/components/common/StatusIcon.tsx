import {
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  MinusCircleFilled,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { StatusType } from '../../types';
import './StatusIcon.css';

interface StatusIconProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'default' | 'large';
  showTooltip?: boolean;
}

const statusConfig: Record<StatusType, {
  icon: React.ReactNode;
  color: string;
  label: string;
  className: string;
}> = {
  success: {
    icon: <CheckCircleFilled />,
    color: '#3fb950',
    label: 'Completed',
    className: 'status-success',
  },
  fail: {
    icon: <CloseCircleFilled />,
    color: '#f85149',
    label: 'Failed',
    className: 'status-fail',
  },
  pending: {
    icon: <SyncOutlined spin />,
    color: '#d29922',
    label: 'Pending',
    className: 'status-pending',
  },
  na: {
    icon: <MinusCircleFilled />,
    color: '#484f58',
    label: 'N/A',
    className: 'status-na',
  },
};

const sizeMap = {
  small: 14,
  default: 18,
  large: 22,
};

export function StatusIcon({
  status,
  label,
  size = 'default',
  showTooltip = true,
}: StatusIconProps) {
  const config = statusConfig[status];
  const fontSize = sizeMap[size];
  const displayLabel = label || config.label;

  const iconElement = (
    <span
      className={`status-icon ${config.className}`}
      style={{
        color: config.color,
        fontSize,
      }}
      aria-label={displayLabel}
    >
      {config.icon}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip title={displayLabel} placement="top">
        {iconElement}
      </Tooltip>
    );
  }

  return iconElement;
}

export default StatusIcon;
