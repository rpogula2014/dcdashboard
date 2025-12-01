/* eslint-disable react-refresh/only-export-components */
/**
 * RefreshContext
 * Provides auto-refresh settings to all components via React Context
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { RefreshInterval } from '../types';

// Context value type
interface RefreshContextValue {
  autoRefresh: boolean;
  refreshInterval: RefreshInterval;
  refreshTrigger: number;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: RefreshInterval) => void;
  triggerManualRefresh: () => void;
}

// Create context with undefined default
const RefreshContext = createContext<RefreshContextValue | undefined>(undefined);

// Provider props
interface RefreshProviderProps {
  children: ReactNode;
  defaultAutoRefresh?: boolean;
  defaultInterval?: RefreshInterval;
}

/**
 * RefreshProvider component
 * Provides auto-refresh settings to all child components
 */
export function RefreshProvider({
  children,
  defaultAutoRefresh = false,
  defaultInterval = 60000,
}: RefreshProviderProps) {
  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(defaultInterval);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trigger manual refresh - increments counter to notify listeners
  const triggerManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <RefreshContext.Provider
      value={{
        autoRefresh,
        refreshInterval,
        refreshTrigger,
        setAutoRefresh,
        setRefreshInterval,
        triggerManualRefresh,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

/**
 * useRefreshContext hook
 * Access refresh settings from context
 */
export function useRefreshContext(): RefreshContextValue {
  const context = useContext(RefreshContext);

  if (context === undefined) {
    throw new Error('useRefreshContext must be used within a RefreshProvider');
  }

  return context;
}

export { RefreshContext };
