/**
 * ChatMessage Component
 * Displays user questions and AI responses with results
 */

import { Typography, Avatar, Collapse } from 'antd';
import { UserOutlined, RobotOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ChatMessage as ChatMessageType, ChartType, TokenUsage } from '../../types';
import { ResultTable } from './ResultTable';
import { ResultChart } from './ResultChart';
import { ResultText } from './ResultText';
import { SQLDisplay } from './SQLDisplay';
import { QueryLoading } from './LoadingStates';
import { detectResultType } from './resultTypeDetector';
import './TalkToData.css';

const { Text, Paragraph } = Typography;

/**
 * Calculate cost based on Claude Haiku 4.5 pricing
 * Input: $1/MTok, Output: $5/MTok
 * Cache read: $0.10/MTok, Cache write: $1.25/MTok
 */
function calculateCost(usage: TokenUsage): number {
  const inputCost = (usage.input_tokens / 1_000_000) * 1.0;
  const outputCost = (usage.output_tokens / 1_000_000) * 5.0;
  const cacheReadCost = (usage.cache_read_input_tokens / 1_000_000) * 0.10;
  const cacheWriteCost = (usage.cache_creation_input_tokens / 1_000_000) * 1.25;
  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/**
 * Check if a column name suggests it contains a date value
 */
function isDateColumn(colName: string): boolean {
  const lowerName = colName.toLowerCase();
  return lowerName.includes('date') ||
         lowerName.includes('time') ||
         lowerName.includes('timestamp') ||
         lowerName.includes('created') ||
         lowerName.includes('updated') ||
         lowerName.includes('_at');
}

/**
 * Check if a number looks like a timestamp (milliseconds since epoch)
 * Valid range: 2000-01-01 to 2100-01-01
 */
function isTimestamp(value: number): boolean {
  const minTimestamp = 946684800000; // 2000-01-01
  const maxTimestamp = 4102444800000; // 2100-01-01
  return value >= minTimestamp && value <= maxTimestamp;
}

/**
 * Format a value for display, detecting dates/timestamps
 */
function formatValue(value: unknown, colName: string): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  // Handle Date objects directly
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Handle numbers that might be timestamps
  if (typeof value === 'number') {
    // Check if this looks like a timestamp based on column name or value range
    if (isDateColumn(colName) || isTimestamp(value)) {
      const date = new Date(value);
      // Verify it's a valid date
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
    return value.toLocaleString();
  }

  // Handle ISO date strings
  if (typeof value === 'string') {
    // Check for ISO date format or if column suggests date
    if (isDateColumn(colName) || /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
  }

  return String(value);
}

/**
 * Format single-value results (like COUNT) into readable text
 */
function formatSingleValueResult(result: ChatMessageType['queryResult']): string {
  if (!result || result.rowCount === 0) return 'No results found.';

  const row = result.rows[0];
  const columns = result.columns;

  // For single value results, format nicely
  if (columns.length === 1 && result.rowCount === 1) {
    const colName = columns[0];
    const value = row[colName];
    const formattedName = colName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `**${formattedName}:** ${formatValue(value, colName)}`;
  }

  // For multiple columns in single row, list them
  if (result.rowCount === 1) {
    const parts = columns.map(col => {
      const value = row[col];
      const formattedName = col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `**${formattedName}:** ${formatValue(value, col)}`;
    });
    return parts.join('\n');
  }

  return `Found ${result.rowCount} results.`;
}

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render the appropriate result visualization
 */
function renderResult(message: ChatMessageType) {
  if (!message.queryResult) return null;

  // Detect or use suggested display type
  const detection = detectResultType(
    message.queryResult,
    message.displayType,
    message.chartType
  );

  const { displayType, chartType } = detection;

  // Show table view
  if (displayType === 'table') {
    return <ResultTable result={message.queryResult} />;
  }

  // Show chart view
  if (displayType === 'chart' && chartType) {
    return (
      <ResultChart
        result={message.queryResult}
        chartType={chartType}
      />
    );
  }

  // Show text view for single-value results (like COUNT)
  if (displayType === 'text') {
    // Always show the result value, plus explanation if available
    const resultValue = formatSingleValueResult(message.queryResult);
    const textContent = message.content
      ? `${resultValue}\n\n${message.content}`
      : resultValue;
    return (
      <ResultText
        content={textContent}
        result={message.queryResult}
      />
    );
  }

  // Default to table
  return <ResultTable result={message.queryResult} />;
}

/**
 * User message component
 */
function UserMessage({ message }: { message: ChatMessageType }) {
  return (
    <div className="chat-message chat-message-user">
      <div className="chat-message-content">
        <Paragraph className="chat-message-text">{message.content}</Paragraph>
        <Text type="secondary" className="chat-message-time">
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {formatTimestamp(message.timestamp)}
        </Text>
      </div>
      <Avatar icon={<UserOutlined />} className="chat-avatar chat-avatar-user" />
    </div>
  );
}

/**
 * Assistant message component
 */
function AssistantMessage({
  message,
  isLoading,
}: {
  message: ChatMessageType;
  isLoading?: boolean;
}) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="chat-message chat-message-assistant">
        <Avatar icon={<RobotOutlined />} className="chat-avatar chat-avatar-assistant" />
        <div className="chat-message-content">
          <QueryLoading message="Thinking..." />
        </div>
      </div>
    );
  }

  // Show error state
  if (message.error) {
    return (
      <div className="chat-message chat-message-assistant">
        <Avatar icon={<RobotOutlined />} className="chat-avatar chat-avatar-assistant" />
        <div className="chat-message-content">
          <div className="chat-message-error">
            <Text type="danger">{message.error}</Text>
          </div>
          <Text type="secondary" className="chat-message-time">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {formatTimestamp(message.timestamp)}
          </Text>
        </div>
      </div>
    );
  }

  // Show result
  return (
    <div className="chat-message chat-message-assistant">
      <Avatar icon={<RobotOutlined />} className="chat-avatar chat-avatar-assistant" />
      <div className="chat-message-content">
        {/* Explanation text if no result */}
        {message.content && !message.queryResult && (
          <Paragraph className="chat-message-text">{message.content}</Paragraph>
        )}

        {/* Query result */}
        {message.queryResult && (
          <div className="chat-message-result">
            {renderResult(message)}
          </div>
        )}

        {/* SQL Display (collapsible) */}
        {message.sql && (
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'sql',
                label: <Text type="secondary" style={{ fontSize: 12 }}>View SQL Query</Text>,
                children: <SQLDisplay sql={message.sql} collapsible={false} />,
              },
            ]}
            className="chat-message-sql-collapse"
          />
        )}

        <Text type="secondary" className="chat-message-time">
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {formatTimestamp(message.timestamp)}
          {message.queryResult && (
            <span style={{ marginLeft: 8 }}>
              {message.queryResult.rowCount} result
              {message.queryResult.rowCount !== 1 ? 's' : ''} in{' '}
              {message.queryResult.executionTime.toFixed(0)}ms
            </span>
          )}
          {message.usage && (message.usage.input_tokens > 0 || message.usage.output_tokens > 0) && (
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>
              • {message.usage.input_tokens} in / {message.usage.output_tokens} out
              {message.usage.cache_read_input_tokens > 0 && (
                <span style={{ color: '#52c41a' }}> (cached)</span>
              )}
              {' '}• ${calculateCost(message.usage).toFixed(5)}
            </span>
          )}
        </Text>
      </div>
    </div>
  );
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  return <AssistantMessage message={message} isLoading={isLoading} />;
}

export default ChatMessage;
