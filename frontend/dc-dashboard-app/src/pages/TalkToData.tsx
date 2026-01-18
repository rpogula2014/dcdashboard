/**
 * TalkToData Page
 * Main page for natural language querying of dashboard data
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Typography, Alert } from 'antd';
import { MessageOutlined, SyncOutlined } from '@ant-design/icons';
import {
  ChatInput,
  ChatHistory,
  ExampleQuestions,
  DataFreshness,
} from '../components/TalkToData';
import { useOrderContext } from '../contexts';
import { processNaturalLanguageQuery } from '../services/nlToSql/nlToSqlService';
import { logMetrics, calculateCost } from '../services/feedbackService';
import { loadDCOrderLines, loadRoutePlans, loadDCOnhand, loadInvoiceLines, getDataLoadState, isDataReady, syncLoadStateFromDuckDB } from '../services/duckdb/dataLoaders';
import { initializeDuckDB, isInitialized } from '../services/duckdb/duckdbService';
import { fetchRoutePlans, fetchDCOnhand, fetchInvoiceLines } from '../services/api';
import { useDCContext } from '../contexts';
import type { ChatMessage, DataFreshness as DataFreshnessType, RoutePlanRaw, FeedbackRating, AiResponseData } from '../types';
import '../components/TalkToData/TalkToData.css';

const { Title, Text } = Typography;

// Auto-refresh configuration
const AUTO_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds
const AUTO_REFRESH_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Hardcoded email for now - will be replaced with Okta auth later
const HARDCODED_USER_EMAIL = 'user@dcdashboard.local';

// Generate unique message ID
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function TalkToData() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  // Feedback state - tracks which messages have received feedback
  const [feedbackGiven, setFeedbackGiven] = useState<Map<string, FeedbackRating>>(new Map());

  // Data state
  const [dataFreshness, setDataFreshness] = useState<DataFreshnessType>({
    dcOrderLines: { loaded: false, count: 0, lastLoaded: null },
    routePlans: { loaded: false, count: 0, lastLoaded: null },
    dcOnhand: { loaded: false, count: 0, lastLoaded: null },
    invoiceLines: { loaded: false, count: 0, lastLoaded: null },
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Auto-refresh state (disabled by default)
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState(false);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL_MS / 1000);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRefreshStartTimeRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef(false); // Prevent duplicate refreshes

  // Route plans state
  const [_routePlans, setRoutePlans] = useState<RoutePlanRaw[]>([]);

  // Get order data from context
  const { orders, isLoading: ordersLoading, error: _ordersError, refresh: refreshOrders } = useOrderContext();
  const { selectedDC } = useDCContext();

  // Initialize DuckDB and load data (skip if already loaded)
  useEffect(() => {
    async function initializeData() {
      try {
        setIsInitializing(true);
        setInitError(null);

        // Initialize DuckDB (if not already)
        if (!isInitialized()) {
          await initializeDuckDB();
        }

        // Sync in-memory state with actual DuckDB tables (recovers state after page navigation)
        const syncedState = await syncLoadStateFromDuckDB();
        console.log('[TalkToData] Synced state from DuckDB:', syncedState);

        // Update freshness immediately with synced state
        setDataFreshness({
          dcOrderLines: syncedState.dcOrderLines,
          routePlans: syncedState.routePlans,
          dcOnhand: syncedState.dcOnhand,
          invoiceLines: syncedState.invoiceLines,
        });

        // Load order data if available and not already loaded (this is fast, keep sync)
        if (orders && orders.length > 0 && !syncedState.dcOrderLines.loaded) {
          await loadDCOrderLines(orders);
          console.log(`[TalkToData] Loaded ${orders.length} orders into DuckDB`);
        } else if (syncedState.dcOrderLines.loaded) {
          console.log('[TalkToData] dc_order_lines already loaded, skipping');
        }

        // Helper to update freshness state
        const updateFreshness = () => {
          const loadState = getDataLoadState();
          setDataFreshness({
            dcOrderLines: loadState.dcOrderLines,
            routePlans: loadState.routePlans,
            dcOnhand: loadState.dcOnhand,
            invoiceLines: loadState.invoiceLines,
          });
        };

        // Fetch and load remaining data in parallel (non-blocking)
        const loadPromises: Promise<void>[] = [];

        // Route plans (only if not already loaded)
        if (!syncedState.routePlans.loaded) {
          loadPromises.push(
            (async () => {
              try {
                console.log('[TalkToData] Fetching route plans...');
                const routes = await fetchRoutePlans();
                setRoutePlans(routes);
                if (routes.length > 0) {
                  await loadRoutePlans(routes);
                }
                console.log(`[TalkToData] Loaded ${routes.length} route plans`);
                updateFreshness();
              } catch (routeError) {
                console.warn('[TalkToData] Failed to load route plans:', routeError);
              }
            })()
          );
        } else {
          console.log('[TalkToData] route_plans already loaded, skipping');
        }

        // DC onhand inventory (only if not already loaded)
        if (!syncedState.dcOnhand.loaded) {
          loadPromises.push(
            (async () => {
              try {
                console.log('[TalkToData] Fetching DC onhand inventory...');
                const onhandData = await fetchDCOnhand(selectedDC);
                if (onhandData.length > 0) {
                  await loadDCOnhand(onhandData);
                }
                console.log(`[TalkToData] Loaded ${onhandData.length} onhand items`);
                updateFreshness();
              } catch (onhandError) {
                console.warn('[TalkToData] Failed to load onhand inventory:', onhandError);
              }
            })()
          );
        } else {
          console.log('[TalkToData] dc_onhand already loaded, skipping');
        }

        // Invoice lines (only if not already loaded)
        if (!syncedState.invoiceLines.loaded) {
          loadPromises.push(
            (async () => {
              try {
                console.log('[TalkToData] Fetching invoice lines...');
                const invoiceData = await fetchInvoiceLines(selectedDC);
                if (invoiceData.length > 0) {
                  await loadInvoiceLines(invoiceData);
                }
                console.log(`[TalkToData] Loaded ${invoiceData.length} invoice lines`);
                updateFreshness();
              } catch (invoiceError) {
                console.warn('[TalkToData] Failed to load invoice lines:', invoiceError);
              }
            })()
          );
        } else {
          console.log('[TalkToData] invoice_lines already loaded, skipping');
        }

        // Wait for all data to load in parallel
        await Promise.all(loadPromises);

        // Final update of freshness state
        updateFreshness();

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
  }, [orders, ordersLoading, selectedDC]);

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

      // Generate message ID for metrics tracking
      const messageId = generateMessageId();

      // Add assistant message with result
      const assistantMessage: ChatMessage = {
        id: messageId,
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

      // Log metrics to PostgreSQL (fire and forget - don't block UI)
      const usage = nlResult.usage || {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      };

      const aiResponseData: AiResponseData = {
        content: nlResult.explanation || '',
        sql: result.sql,
        displayType: nlResult.suggestedDisplayType,
        chartType: nlResult.suggestedChartType,
        queryResult: result ? {
          columns: result.columns,
          rowCount: result.rowCount,
          executionTime: result.executionTime,
          rows: result.rows.slice(0, 10) as Record<string, unknown>[],
        } : undefined,
      };

      const metricsPayload = {
        message_id: messageId,
        user_question: query,
        ai_response: aiResponseData,
        dcid: String(selectedDC),
        user_email: HARDCODED_USER_EMAIL,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cost_usd: calculateCost(usage),
      };

      console.log('[TalkToData] Logging metrics:', metricsPayload);

      logMetrics(metricsPayload).catch((err) => {
        // Don't fail the UI if metrics logging fails
        console.error('[TalkToData] Failed to log metrics:', err);
      });
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
    }
    // Refresh onhand data
    try {
      const onhandData = await fetchDCOnhand(selectedDC);
      if (onhandData.length > 0) {
        await loadDCOnhand(onhandData);
      }
    } catch (error) {
      console.warn('[TalkToData] Failed to refresh onhand:', error);
    }
    const loadState = getDataLoadState();
    setDataFreshness({
      dcOrderLines: loadState.dcOrderLines,
      routePlans: loadState.routePlans,
      dcOnhand: loadState.dcOnhand,
      invoiceLines: loadState.invoiceLines,
    });
  }, [orders, selectedDC]);

  // Handle feedback submission
  const handleFeedbackSubmitted = useCallback((messageId: string, rating: FeedbackRating) => {
    setFeedbackGiven((prev) => {
      const next = new Map(prev);
      next.set(messageId, rating);
      return next;
    });
  }, []);

  // Auto-refresh polling effect
  useEffect(() => {
    if (!isAutoRefreshActive || isInitializing) return;

    // Reset start time when activating
    autoRefreshStartTimeRef.current = Date.now();

    // Countdown timer (updates every second)
    const countdownInterval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          return AUTO_REFRESH_INTERVAL_MS / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    // Refresh function
    const doRefresh = async () => {
      // Prevent duplicate concurrent refreshes
      if (isRefreshingRef.current) {
        console.log('[TalkToData] Refresh already in progress, skipping');
        return;
      }

      // Check if max duration exceeded
      const elapsed = Date.now() - autoRefreshStartTimeRef.current;
      if (elapsed >= AUTO_REFRESH_MAX_DURATION_MS) {
        console.log('[TalkToData] Auto-refresh max duration reached, stopping');
        setIsAutoRefreshActive(false);
        return;
      }

      isRefreshingRef.current = true;
      setIsAutoRefreshing(true);
      console.log('[TalkToData] Auto-refreshing data...');

      try {
        // Refresh orders and route plans in parallel
        const [, routes] = await Promise.all([
          refreshOrders(),
          fetchRoutePlans().catch((err) => {
            console.warn('[TalkToData] Route plans fetch failed:', err);
            return [] as RoutePlanRaw[];
          }),
        ]);

        // Load route plans into DuckDB
        if (routes.length > 0) {
          await loadRoutePlans(routes);
          setRoutePlans(routes);
          console.log(`[TalkToData] Refreshed ${routes.length} route plans`);
        }

        // Refresh onhand data
        try {
          const onhandData = await fetchDCOnhand(selectedDC);
          if (onhandData.length > 0) {
            await loadDCOnhand(onhandData);
          }
        } catch (error) {
          console.warn('[TalkToData] Onhand refresh failed:', error);
        }

        // Update freshness state
        const loadState = getDataLoadState();
        setDataFreshness({
          dcOrderLines: loadState.dcOrderLines,
          routePlans: loadState.routePlans,
          dcOnhand: loadState.dcOnhand,
          invoiceLines: loadState.invoiceLines,
        });
      } catch (error) {
        console.error('[TalkToData] Auto-refresh failed:', error);
      } finally {
        isRefreshingRef.current = false;
        setIsAutoRefreshing(false);
      }
    };

    // Refresh interval (every 30 seconds)
    autoRefreshIntervalRef.current = setInterval(doRefresh, AUTO_REFRESH_INTERVAL_MS);

    // Max duration timeout (30 minutes)
    autoRefreshTimeoutRef.current = setTimeout(() => {
      console.log('[TalkToData] Auto-refresh max duration timeout');
      setIsAutoRefreshActive(false);
    }, AUTO_REFRESH_MAX_DURATION_MS);

    // Cleanup
    return () => {
      clearInterval(countdownInterval);
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, [isAutoRefreshActive, isInitializing, refreshOrders, selectedDC]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshActive((prev) => !prev);
    setAutoRefreshCountdown(AUTO_REFRESH_INTERVAL_MS / 1000);
  }, []);

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
          <MessageOutlined style={{ fontSize: 16, color: '#722ed1' }} />
          <Title level={4} style={{ margin: 0 }}>
            Talk to Data
          </Title>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            Ask questions about your orders and routes
          </Text>
        </div>
        <div
          className="talk-to-data-auto-refresh"
          onClick={toggleAutoRefresh}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 4,
            background: isAutoRefreshActive ? '#f6ffed' : '#fafafa',
            border: `1px solid ${isAutoRefreshActive ? '#b7eb8f' : '#d9d9d9'}`,
            fontSize: 11,
            userSelect: 'none',
          }}
          title={isAutoRefreshActive ? 'Click to disable auto-refresh' : 'Click to enable auto-refresh (30s interval, 30min max)'}
        >
          <SyncOutlined
            spin={isAutoRefreshActive && (ordersLoading || isAutoRefreshing)}
            style={{ color: isAutoRefreshActive ? '#52c41a' : '#999', fontSize: 12 }}
          />
          <Text style={{ fontSize: 11, color: isAutoRefreshActive ? '#52c41a' : '#999' }}>
            {isAutoRefreshActive ? `Refresh in ${autoRefreshCountdown}s` : 'Auto-refresh: Off'}
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
          <ChatHistory
            messages={messages}
            isLoading={isLoading}
            feedbackGiven={feedbackGiven}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
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
