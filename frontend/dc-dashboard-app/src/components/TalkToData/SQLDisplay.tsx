/**
 * SQLDisplay Component
 * Shows generated SQL with syntax highlighting
 */

import { useState } from 'react';
import { Typography, Button, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined, CodeOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import './TalkToData.css';

const { Text } = Typography;

interface SQLDisplayProps {
  sql: string;
  label?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// SQL keywords for highlighting
const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'LIKE',
  'BETWEEN',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'ON',
  'AS',
  'ORDER',
  'BY',
  'ASC',
  'DESC',
  'GROUP',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'ALL',
  'DISTINCT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'WITH',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'CAST',
  'NULLIF',
];

// SQL functions for highlighting
const SQL_FUNCTIONS = [
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'NULLIF',
  'CAST',
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'DATE',
  'YEAR',
  'MONTH',
  'DAY',
  'NOW',
  'CURRENT_DATE',
  'CURRENT_TIMESTAMP',
  'STRFTIME',
  'ROUND',
  'ABS',
  'IFNULL',
  'IIF',
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
  'OVER',
  'PARTITION',
];

/**
 * Highlight SQL syntax
 */
function highlightSQL(sql: string): React.ReactNode[] {
  // Normalize whitespace while preserving structure
  const normalizedSQL = sql.trim();

  // Tokenize the SQL
  const tokens: Array<{ type: string; value: string }> = [];
  let remaining = normalizedSQL;

  while (remaining.length > 0) {
    // Skip whitespace
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ type: 'whitespace', value: wsMatch[1] });
      remaining = remaining.substring(wsMatch[1].length);
      continue;
    }

    // String literals (single quotes)
    const stringMatch = remaining.match(/^'([^']*(?:''[^']*)*)'/);
    if (stringMatch) {
      tokens.push({ type: 'string', value: stringMatch[0] });
      remaining = remaining.substring(stringMatch[0].length);
      continue;
    }

    // Numbers
    const numberMatch = remaining.match(/^-?\d+(?:\.\d+)?/);
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      remaining = remaining.substring(numberMatch[0].length);
      continue;
    }

    // Comments (-- style)
    const commentMatch = remaining.match(/^--[^\n]*/);
    if (commentMatch) {
      tokens.push({ type: 'comment', value: commentMatch[0] });
      remaining = remaining.substring(commentMatch[0].length);
      continue;
    }

    // Identifiers and keywords
    const wordMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const upperWord = word.toUpperCase();

      if (SQL_KEYWORDS.includes(upperWord)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (SQL_FUNCTIONS.includes(upperWord)) {
        tokens.push({ type: 'function', value: word });
      } else {
        // Could be a table or column name
        tokens.push({ type: 'identifier', value: word });
      }
      remaining = remaining.substring(word.length);
      continue;
    }

    // Operators
    const opMatch = remaining.match(/^(>=|<=|<>|!=|=|>|<|\+|-|\*|\/|%|\|\|)/);
    if (opMatch) {
      tokens.push({ type: 'operator', value: opMatch[0] });
      remaining = remaining.substring(opMatch[0].length);
      continue;
    }

    // Punctuation
    const punctMatch = remaining.match(/^[(),;.]/);
    if (punctMatch) {
      tokens.push({ type: 'punctuation', value: punctMatch[0] });
      remaining = remaining.substring(1);
      continue;
    }

    // Unknown character - just add it
    tokens.push({ type: 'unknown', value: remaining[0] });
    remaining = remaining.substring(1);
  }

  // Convert tokens to React elements
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'keyword':
        return (
          <span key={index} className="sql-keyword">
            {token.value}
          </span>
        );
      case 'function':
        return (
          <span key={index} className="sql-function">
            {token.value}
          </span>
        );
      case 'string':
        return (
          <span key={index} className="sql-string">
            {token.value}
          </span>
        );
      case 'number':
        return (
          <span key={index} className="sql-number">
            {token.value}
          </span>
        );
      case 'operator':
        return (
          <span key={index} className="sql-operator">
            {token.value}
          </span>
        );
      case 'comment':
        return (
          <span key={index} className="sql-comment">
            {token.value}
          </span>
        );
      default:
        return <span key={index}>{token.value}</span>;
    }
  });
}

/**
 * Format SQL with line breaks for readability
 */
function formatSQL(sql: string): string {
  // Add line breaks before major clauses
  let formatted = sql
    .replace(/\s+/g, ' ')
    .trim()
    // Add newlines before major keywords
    .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON|UNION)\b/gi, '\n$1')
    // Remove leading newline
    .replace(/^\n/, '');

  // Indent continuation lines
  const lines = formatted.split('\n');
  return lines
    .map((line, index) => {
      if (index === 0) return line.trim();
      // Indent all but first line
      const trimmed = line.trim();
      if (trimmed.match(/^(AND|OR|ON)\b/i)) {
        return '    ' + trimmed;
      }
      return '  ' + trimmed;
    })
    .join('\n');
}

export function SQLDisplay({
  sql,
  label = 'Generated SQL',
  collapsible = true,
  defaultCollapsed = false,
}: SQLDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      message.success('SQL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('Failed to copy SQL');
    }
  };

  const formattedSQL = formatSQL(sql);
  const highlightedSQL = highlightSQL(formattedSQL);

  return (
    <div className={`sql-display-container ${collapsed ? 'sql-display-collapsed' : ''}`}>
      <div className="sql-display-header">
        <Text type="secondary" className="sql-display-label">
          <CodeOutlined style={{ marginRight: 4 }} />
          {label}
        </Text>
        <div style={{ display: 'flex', gap: 4 }}>
          {collapsible && (
            <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
              <Button
                type="text"
                size="small"
                icon={collapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            </Tooltip>
          )}
          <Tooltip title={copied ? 'Copied!' : 'Copy SQL'}>
            <Button
              type="text"
              size="small"
              icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
              onClick={handleCopy}
            />
          </Tooltip>
        </div>
      </div>
      <div className="sql-display-code">
        <pre>{highlightedSQL}</pre>
      </div>
    </div>
  );
}

export default SQLDisplay;
