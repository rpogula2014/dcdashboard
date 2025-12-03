/**
 * ResultText Component
 * Displays text explanations and insights from query results
 */

import { Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { QueryResult } from '../../types';
import './TalkToData.css';

const { Text, Paragraph } = Typography;

interface ResultTextProps {
  content: string;
  result?: QueryResult;
  showMeta?: boolean;
}

/**
 * Parse and format text content with markdown-like syntax
 */
function formatContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} style={{ marginLeft: 16 }}>
          {formatInlineText(line.substring(2))}
        </li>
      );
      continue;
    }

    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <li key={i} style={{ marginLeft: 16 }}>
          {formatInlineText(numberedMatch[2])}
        </li>
      );
      continue;
    }

    // Handle headers (##)
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} strong style={{ display: 'block', marginTop: 8, marginBottom: 4 }}>
          {line.substring(3)}
        </Text>
      );
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      elements.push(<br key={i} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <Paragraph key={i} style={{ marginBottom: 8 }}>
        {formatInlineText(line)}
      </Paragraph>
    );
  }

  return elements;
}

/**
 * Format inline text with bold, code, etc.
 */
function formatInlineText(text: string): React.ReactNode {
  // Split on bold markers (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    // Bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} strong>
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Check for inline code (`code`)
    const codeParts = part.split(/(`[^`]+`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((codePart, codeIndex) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return (
            <Text key={`${index}-${codeIndex}`} code>
              {codePart.slice(1, -1)}
            </Text>
          );
        }
        return codePart;
      });
    }

    // Check for numbers to highlight
    const numberParts = part.split(/(\d+(?:,\d{3})*(?:\.\d+)?)/g);
    if (numberParts.length > 1) {
      return numberParts.map((numPart, numIndex) => {
        if (/^\d+(?:,\d{3})*(?:\.\d+)?$/.test(numPart)) {
          return (
            <Text key={`${index}-${numIndex}`} strong style={{ color: '#1890ff' }}>
              {numPart}
            </Text>
          );
        }
        return numPart;
      });
    }

    return part;
  });
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
 * Format a date for display
 */
function formatDateValue(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Generate summary statistics from result
 */
function generateSummaryStats(result: QueryResult): string | null {
  if (result.rowCount === 0) return null;

  const stats: string[] = [];

  // Find numeric columns and calculate stats
  for (const col of result.columns) {
    const values = result.rows
      .map((row) => row[col])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Check if this is a date column (by name or value range)
      const isDateCol = isDateColumn(col) || values.every(v => isTimestamp(v));

      if (isDateCol) {
        // Format as date range for date columns
        const minDate = new Date(min);
        const maxDate = new Date(max);
        if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
          if (min === max) {
            stats.push(`**${formatColumnName(col)}**: ${formatDateValue(minDate)}`);
          } else {
            stats.push(
              `**${formatColumnName(col)}**: ${formatDateValue(minDate)} to ${formatDateValue(maxDate)}`
            );
          }
        }
      } else {
        // Regular numeric stats
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        stats.push(
          `**${formatColumnName(col)}**: Min ${min.toLocaleString()}, ` +
            `Max ${max.toLocaleString()}, Avg ${avg.toFixed(1)}`
        );
      }
    }
  }

  if (stats.length === 0) return null;
  return stats.join('\n');
}

/**
 * Format column name for display
 */
function formatColumnName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function ResultText({ content, result, showMeta = true }: ResultTextProps) {
  const formattedContent = formatContent(content);

  // Generate additional stats if result is provided
  const summaryStats = result ? generateSummaryStats(result) : null;

  return (
    <div className="result-text-container">
      <div className="result-text-content">{formattedContent}</div>

      {summaryStats && (
        <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 4 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 11 }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            Quick Stats
          </Text>
          {formatContent(summaryStats)}
        </div>
      )}

      {showMeta && result && (
        <div className="result-text-meta">
          <Text type="secondary">
            Based on {result.rowCount} result{result.rowCount !== 1 ? 's' : ''} &bull;{' '}
            Query took {result.executionTime.toFixed(0)}ms
          </Text>
        </div>
      )}
    </div>
  );
}

export default ResultText;
