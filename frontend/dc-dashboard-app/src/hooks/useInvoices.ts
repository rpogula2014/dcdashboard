/**
 * useInvoices Hook
 * Fetches and transforms invoice lines data into hierarchical structure
 * Hierarchy: Transaction Type (invtranstype) → Invoice → Lines
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchInvoiceLines } from '../services/api';
import { loadInvoiceLines } from '../services/duckdb';
import type {
  InvoiceLineRaw,
  InvoiceLine,
  Invoice,
  InvoiceGroup,
  InvoiceStats,
  ApiError,
  UseInvoicesResult,
} from '../types';

// =============================
// TRANSFORMATION FUNCTIONS
// =============================

/**
 * Transform a raw invoice line to a display invoice line
 */
function transformLine(raw: InvoiceLineRaw): InvoiceLine {
  return {
    line_number: raw.line_number || 0,
    line_type: raw.line_type || 'LINE',
    quantity_invoiced: raw.quantity_invoiced || 0,
    extended_amount: raw.extended_amount || 0,
    unit_selling_price: raw.unit_selling_price || 0,
    sales_order: raw.sales_order,
    sales_order_line: raw.sales_order_line,
    customer_trx_line_id: raw.customer_trx_line_id || 0,
    item_number: raw.item_number,
    productgrp: raw.productgrp,
    vendor: raw.vendor,
    style: raw.style,
    tax_name: raw.tax_name,
    tax_rate: raw.tax_rate,
  };
}

/**
 * Transform flat invoice line data into hierarchical structure
 * Groups by invtranstype → customer_trx_id (invoice) → lines
 */
function transformToInvoiceHierarchy(data: InvoiceLineRaw[]): InvoiceGroup[] {
  // Level 1: Group by invtranstype
  // Level 2: Group by customer_trx_id (invoice)
  const groupMap = new Map<string, Map<number, InvoiceLineRaw[]>>();

  for (const line of data) {
    const transType = line.invtranstype || 'Unknown';
    const invoiceId = line.customer_trx_id || 0;

    if (!groupMap.has(transType)) {
      groupMap.set(transType, new Map());
    }
    const invoiceMap = groupMap.get(transType)!;

    if (!invoiceMap.has(invoiceId)) {
      invoiceMap.set(invoiceId, []);
    }
    invoiceMap.get(invoiceId)!.push(line);
  }

  // Convert maps to arrays with computed totals
  const invoiceGroups: InvoiceGroup[] = [];

  for (const [transType, invoiceMap] of groupMap) {
    const invoices: Invoice[] = [];
    let groupLineCount = 0;
    let groupTotalAmount = 0;

    for (const [invoiceId, lines] of invoiceMap) {
      // Get header info from first line (all lines share same header)
      const firstLine = lines[0];

      // Transform lines and calculate totals
      const transformedLines = lines
        .map(transformLine)
        .sort((a, b) => a.line_number - b.line_number);

      const lineCount = transformedLines.length;
      const totalAmount = transformedLines.reduce(
        (sum, line) => sum + (line.extended_amount || 0),
        0
      );

      invoices.push({
        batchsource: firstLine.batchsource,
        trx_number: firstLine.trx_number || 'Unknown',
        invtranstype: firstLine.invtranstype || 'Unknown',
        shipmethod: firstLine.shipmethod,
        trx_date: firstLine.trx_date || '',
        customer_trx_id: invoiceId,
        ordertype: firstLine.ordertype,
        billcustname: firstLine.billcustname || 'Unknown',
        shipcustname: firstLine.shipcustname,
        shiploc: firstLine.shiploc,
        lines: transformedLines,
        lineCount,
        totalAmount,
      });

      groupLineCount += lineCount;
      groupTotalAmount += totalAmount;
    }

    // Sort invoices by trx_date descending (newest first)
    invoices.sort((a, b) => {
      const dateA = a.trx_date ? new Date(a.trx_date).getTime() : 0;
      const dateB = b.trx_date ? new Date(b.trx_date).getTime() : 0;
      return dateB - dateA; // Descending
    });

    invoiceGroups.push({
      invtranstype: transType,
      invoices,
      invoiceCount: invoices.length,
      lineCount: groupLineCount,
      totalAmount: groupTotalAmount,
    });
  }

  // Sort groups alphabetically by transaction type
  return invoiceGroups.sort((a, b) => a.invtranstype.localeCompare(b.invtranstype));
}

/**
 * Calculate summary statistics with distinct counts
 */
function calculateStats(rawData: InvoiceLineRaw[], _invoiceGroups: InvoiceGroup[]): InvoiceStats {
  const distinctInvoices = new Set<number>();
  const distinctCustomers = new Set<string>();
  let totalLines = 0;
  let totalUnits = 0;
  let totalAmount = 0;

  for (const line of rawData) {
    if (line.customer_trx_id) {
      distinctInvoices.add(line.customer_trx_id);
    }
    if (line.billcustname) {
      distinctCustomers.add(line.billcustname);
    }
    // Exclude TAX lines from line count
    if (line.line_type !== 'TAX') {
      totalLines++;
    }
    totalUnits += line.quantity_invoiced || 0;
    totalAmount += line.extended_amount || 0;
  }

  return {
    totalInvoices: distinctInvoices.size,
    totalLines,
    totalUnits,
    totalCustomers: distinctCustomers.size,
    totalAmount,
  };
}

// =============================
// HOOK
// =============================

export function useInvoices(dcid?: number): UseInvoicesResult {
  const [rawData, setRawData] = useState<InvoiceLineRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchInvoiceLines(dcid);
      setRawData(data);

      // Load invoice data into DuckDB for querying
      if (data.length > 0) {
        loadInvoiceLines(data).catch((err) => {
          console.warn('[useInvoices] Failed to load invoice data into DuckDB:', err);
        });
      }
    } catch (err) {
      setError(err as ApiError);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  }, [dcid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform data to hierarchy (memoized)
  const invoiceGroups = useMemo(
    () => transformToInvoiceHierarchy(rawData),
    [rawData]
  );

  // Calculate stats from raw data for distinct counts (memoized)
  const stats = useMemo(
    () => calculateStats(rawData, invoiceGroups),
    [rawData, invoiceGroups]
  );

  return {
    rawData,
    invoiceGroups,
    stats,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export default useInvoices;
