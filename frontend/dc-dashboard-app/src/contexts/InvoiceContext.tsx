/* eslint-disable react-refresh/only-export-components */
/**
 * InvoiceContext
 * Provides invoice data from API to all components via React Context
 * Data is fetched once when app loads and shared between Invoices and Analytics pages
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import type { UseInvoicesResult } from '../types';

// Create context with undefined default
const InvoiceContext = createContext<UseInvoicesResult | undefined>(undefined);

// Provider props
interface InvoiceProviderProps {
  children: ReactNode;
  dcid?: number;
}

/**
 * InvoiceProvider component
 * Wraps app with invoice data from API - fetched once on app load
 */
export function InvoiceProvider({ children, dcid }: InvoiceProviderProps) {
  const invoiceData = useInvoices(dcid);

  return (
    <InvoiceContext.Provider value={invoiceData}>
      {children}
    </InvoiceContext.Provider>
  );
}

/**
 * useInvoiceContext hook
 * Access invoice data from context
 */
export function useInvoiceContext(): UseInvoicesResult {
  const context = useContext(InvoiceContext);

  if (context === undefined) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }

  return context;
}

export { InvoiceContext };
