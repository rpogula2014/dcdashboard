import { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, Layout, theme, Spin, Alert } from 'antd';
import { Sidebar, Header } from './components/Layout';
import { Summary, RouteTruck, OtherShipMethods, ISOs, Analytics, Descartes, TalkToData, Onhand, CycleCount } from './pages';
import { OrderProvider, useOrderContext, DCProvider, useDCContext, RefreshProvider, useRefreshContext } from './contexts';
import type { PageKey } from './types';
import './App.css';

const { Content } = Layout;

// Light theme configuration for clean dashboard aesthetic
const dcDashboardTheme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  algorithm: theme.defaultAlgorithm,
};

const pageTitles: Record<PageKey, { title: string; subtitle?: string }> = {
  summary: { title: 'Summary', subtitle: 'Overview' },
  routeTruck: { title: 'Route Truck', subtitle: 'Local Delivery' },
  otherShipMethods: { title: 'Other Ship Methods', subtitle: 'UPS, FedEx, LTL, Pickup' },
  isos: { title: 'ISOs', subtitle: 'Internal Service Orders' },
  onhand: { title: 'On Hand', subtitle: 'Inventory' },
  cycleCount: { title: 'Cycle Count', subtitle: 'Inventory' },
  traction: { title: 'Traction', subtitle: 'Analytics' },
  analytics: { title: 'Analytics', subtitle: 'Reports & Insights' },
  descartes: { title: 'Descartes Planned', subtitle: 'Route Plans' },
  talkToData: { title: 'Talk to Data', subtitle: 'AI-Powered Queries' },
};

/**
 * Inner App component that uses OrderContext
 */
function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageKey>('summary');

  // Get refresh settings from context
  const {
    autoRefresh: refreshEnabled,
    refreshInterval,
    setAutoRefresh: setRefreshEnabled,
    setRefreshInterval,
    triggerManualRefresh,
  } = useRefreshContext();

  // Get order data from context
  const {
    isLoading,
    isRefreshing,
    lastSynced,
    error,
    isUsingMockData,
    refresh,
  } = useOrderContext();

  const handleManualRefresh = useCallback(() => {
    refresh();
    triggerManualRefresh(); // Also trigger refresh for other components (e.g., ExceptionsCard)
  }, [refresh, triggerManualRefresh]);

  const renderPage = () => {
    switch (currentPage) {
      case 'summary':
        return <Summary />;
      case 'routeTruck':
        return <RouteTruck />;
      case 'otherShipMethods':
        return <OtherShipMethods />;
      case 'isos':
        return <ISOs />;
      case 'analytics':
        return <Analytics />;
      case 'descartes':
        return <Descartes />;
      case 'talkToData':
        return <TalkToData />;
      case 'onhand':
        return <Onhand />;
      case 'cycleCount':
        return <CycleCount />;
      default:
        return <Summary />;
    }
  };

  const pageInfo = pageTitles[currentPage];

  // Show loading spinner on initial load
  if (isLoading) {
    return (
      <Layout className="app-layout">
        <div className="loading-container">
          <Spin size="large">Loading orders...</Spin>
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="app-layout">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Layout className="main-layout">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          refreshEnabled={refreshEnabled}
          refreshInterval={refreshInterval}
          lastSynced={lastSynced}
          isRefreshing={isRefreshing}
          onRefreshToggle={setRefreshEnabled}
          onIntervalChange={setRefreshInterval}
          onManualRefresh={handleManualRefresh}
        />
        <Content className="main-content">
          {/* Show mock data warning if API is unavailable */}
          {isUsingMockData && (
            <Alert
              message="Using Demo Data"
              description="API server is unavailable. Displaying sample data for demonstration."
              type="info"
              showIcon
              closable
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Show error if any */}
          {error && (
            <Alert
              message="Error Loading Data"
              description={error.message}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 16 }}
            />
          )}

          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  );
}

/**
 * Wrapper component that provides OrderContext with selected DC and refresh settings
 */
function OrderProviderWithDC({ children }: { children: React.ReactNode }) {
  const { selectedDC } = useDCContext();
  const { autoRefresh, refreshInterval } = useRefreshContext();

  // Memoize options to prevent unnecessary re-renders
  const orderOptions = useMemo(() => ({
    autoRefresh,
    refreshInterval,
    useMockDataFallback: true,
    dc: selectedDC,
  }), [selectedDC, autoRefresh, refreshInterval]);

  return (
    <OrderProvider options={orderOptions}>
      {children}
    </OrderProvider>
  );
}

/**
 * Main App component with DCProvider, RefreshProvider, and OrderProvider wrappers
 */
function App() {
  return (
    <ConfigProvider theme={dcDashboardTheme}>
      <DCProvider>
        <RefreshProvider>
          <OrderProviderWithDC>
            <AppContent />
          </OrderProviderWithDC>
        </RefreshProvider>
      </DCProvider>
    </ConfigProvider>
  );
}

export default App;
