/**
 * TalkToData Page
 * Main page for natural language querying of dashboard data
 */

import { useState, useCallback, useEffect } from 'react';
import { Typography, Alert } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import {
  ChatInput,
  ChatHistory,
  ExampleQuestions,
  DataFreshness,
} from '../components/TalkToData';
import { useOrderContext } from '../contexts';
import { processNaturalLanguageQuery } from '../services/nlToSql/nlToSqlService';
import { loadDCOrderLines, getDataLoadState, isDataReady } from '../services/duckdb/dataLoaders';
import { initializeDuckDB } from '../services/duckdb/duckdbService';
import type { ChatMessage, DataFreshness as DataFreshnessType } from '../types';
import '../components/TalkToData/TalkToData.css';

const { Title, Text } = Typography;

// Generate unique message ID
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function TalkToData() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  // Data state
  const [dataFreshness, setDataFreshness] = useState<DataFreshnessType>({
    dcOrderLines: { loaded: false, count: 0, lastLoaded: null },
    routePlans: { loaded: false, count: 0, lastLoaded: null },
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Get order data from context
  const { orders, isLoading: ordersLoading, error: ordersError } = useOrderContext();

  // Initialize DuckDB and load data
  useEffect(() => {
    async function initializeData() {
      try {
        setIsInitializing(true);
        setInitError(null);

        // Initialize DuckDB
        await initializeDuckDB();

        // Load order data if available
        if (orders && orders.length > 0) {
          await loadDCOrderLines(orders);
        }

        // Update freshness state
        const loadState = getDataLoadState();
        setDataFreshness({
          dcOrderLines: loadState.dcOrderLines,
          routePlans: loadState.routePlans,
        });

        setIsInitializing(false);
      } catch (error) {
        console.error('[TalkToData] Initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize');
        setIsInitializing(false);
      }
    }

    if (!ordersLoading) {
      initializeData();
    }
  }, [orders, ordersLoading]);

  // Handle query submission
  const handleSubmit = useCallback(async (query: string) => {
    if (!isDataReady()) {
      // Add error message if no data
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        error: 'No data available. Please wait for data to load.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    // Hide examples after first query
    setShowExamples(false);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Start loading
    setIsLoading(true);

    try {
      // Process the query
      const { result, nlResult } = await processNaturalLanguageQuery(query);

      // Add assistant message with result
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: nlResult.explanation || '',
        timestamp: new Date(),
        queryResult: result,
        displayType: nlResult.suggestedDisplayType,
        chartType: nlResult.suggestedChartType,
        sql: result.sql,
        usage: nlResult.usage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[TalkToData] Query failed:', error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        error:
          error instanceof Error
            ? error.message
            : 'Sorry, I could not process your question. Please try rephrasing it.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle example question click
  const handleExampleClick = useCallback(
    (question: string) => {
      handleSubmit(question);
    },
    [handleSubmit]
  );

  // Handle data refresh
  const handleRefresh = useCallback(async () => {
    if (orders && orders.length > 0) {
      await loadDCOrderLines(orders);
      const loadState = getDataLoadState();
      setDataFreshness({
        dcOrderLines: loadState.dcOrderLines,
        routePlans: loadState.routePlans,
      });
    }
  }, [orders]);

  // Show initialization error
  if (initError) {
    return (
      <div className="talk-to-data-page">
        <Alert
          message="Initialization Error"
          description={initError}
          type="error"
          showIcon
          style={{ margin: 16 }}
        />
      </div>
    );
  }

  // Show loading during initialization
  if (isInitializing || ordersLoading) {
    return (
      <div className="talk-to-data-page">
        <div className="talk-to-data-header">
          <div className="talk-to-data-title">
            <MessageOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>
              Talk to Data
            </Title>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text type="secondary">Initializing data engine...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="talk-to-data-page">
      {/* Header with data freshness */}
      <div className="talk-to-data-header">
        <div className="talk-to-data-title">
          <MessageOutlined style={{ fontSize: 20, color: '#722ed1' }} />
          <Title level={4} style={{ margin: 0 }}>
            Talk to Data
          </Title>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            Ask questions about your orders and routes
          </Text>
        </div>
      </div>

      {/* Data freshness indicator */}
      <DataFreshness
        freshness={dataFreshness}
        onRefresh={handleRefresh}
        isRefreshing={ordersLoading}
      />

      {/* Main content area */}
      <div className="talk-to-data-main">
        {/* Show examples when chat is empty */}
        {showExamples && messages.length === 0 && (
          <div className="talk-to-data-examples">
            <ExampleQuestions onSelect={handleExampleClick} />
          </div>
        )}

        {/* Chat area */}
        <div className="talk-to-data-chat">
          <ChatHistory messages={messages} isLoading={isLoading} />
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            disabled={!isDataReady()}
            placeholder={
              isDataReady()
                ? 'Ask a question about your data...'
                : 'Waiting for data to load...'
            }
          />
        </div>
      </div>
    </div>
  );
}

export default TalkToData;
