/* eslint-disable react-refresh/only-export-components */
/**
 * OrderContext
 * Provides order data from API to all components via React Context
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useOrders, type UseOrdersResult, type UseOrdersOptions } from '../hooks/useOrders';

// Create context with undefined default
const OrderContext = createContext<UseOrdersResult | undefined>(undefined);

// Provider props
interface OrderProviderProps {
  children: ReactNode;
  options?: UseOrdersOptions;
}

/**
 * OrderProvider component
 * Wraps app with order data from API
 */
export function OrderProvider({ children, options }: OrderProviderProps) {
  const ordersData = useOrders(options);

  return (
    <OrderContext.Provider value={ordersData}>
      {children}
    </OrderContext.Provider>
  );
}

/**
 * useOrderContext hook
 * Access order data from context
 */
export function useOrderContext(): UseOrdersResult {
  const context = useContext(OrderContext);

  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }

  return context;
}

export { OrderContext };
