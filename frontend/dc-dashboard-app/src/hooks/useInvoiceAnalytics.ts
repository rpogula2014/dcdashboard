/**
 * useInvoiceAnalytics Hook
 * Provides aggregation functions for invoice analytics charts
 * Consumes useInvoices data and groups by various dimensions
 */

import { useMemo } from 'react';
import type { InvoiceLineRaw, InvoiceStats } from '../types';

// =============================
// TYPES
// =============================

export type InvoiceGroupByAttribute = 'productgrp' | 'vendor' | 'style';
export type InvoiceGroupByField = 'ordertype' | 'invtranstype' | 'shipmethod';

export interface InvoiceChartData {
  name: string;
  count: number;        // Number of invoices
  amount: number;       // Sum of extended_amount
  lines: InvoiceLineRaw[];  // Raw lines for drill-down
}

export interface UseInvoiceAnalyticsResult {
  // Summary stats
  stats: InvoiceStats;
  // Grouped data for charts
  groupByAttribute: (attribute: InvoiceGroupByAttribute) => InvoiceChartData[];
  groupByField: (field: InvoiceGroupByField) => InvoiceChartData[];
}

// =============================
// HELPER FUNCTIONS
// =============================

/**
 * Group invoice lines by a specific attribute field
 */
function groupByAttributeField(
  rawData: InvoiceLineRaw[],
  attribute: InvoiceGroupByAttribute
): InvoiceChartData[] {
  const groups = new Map<string, { lines: InvoiceLineRaw[]; invoiceIds: Set<number> }>();

  for (const line of rawData) {
    const key = line[attribute] || 'Unknown';

    if (!groups.has(key)) {
      groups.set(key, { lines: [], invoiceIds: new Set() });
    }

    const group = groups.get(key)!;
    group.lines.push(line);
    if (line.customer_trx_id) {
      group.invoiceIds.add(line.customer_trx_id);
    }
  }

  const result: InvoiceChartData[] = [];

  for (const [name, data] of groups) {
    const amount = data.lines.reduce((sum, line) => sum + (line.extended_amount || 0), 0);
    result.push({
      name,
      count: data.invoiceIds.size,  // Distinct invoice count
      amount,
      lines: data.lines,
    });
  }

  // Sort by amount descending (largest first)
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Group invoice lines by a specific single field (ordertype, invtranstype, shipmethod)
 */
function groupBySingleField(
  rawData: InvoiceLineRaw[],
  field: InvoiceGroupByField
): InvoiceChartData[] {
  const groups = new Map<string, { lines: InvoiceLineRaw[]; invoiceIds: Set<number> }>();

  for (const line of rawData) {
    const key = line[field] || 'Unknown';

    if (!groups.has(key)) {
      groups.set(key, { lines: [], invoiceIds: new Set() });
    }

    const group = groups.get(key)!;
    group.lines.push(line);
    if (line.customer_trx_id) {
      group.invoiceIds.add(line.customer_trx_id);
    }
  }

  const result: InvoiceChartData[] = [];

  for (const [name, data] of groups) {
    const amount = data.lines.reduce((sum, line) => sum + (line.extended_amount || 0), 0);
    result.push({
      name,
      count: data.invoiceIds.size,  // Distinct invoice count
      amount,
      lines: data.lines,
    });
  }

  // Sort by amount descending (largest first)
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate summary statistics from raw invoice data
 */
function calculateStats(rawData: InvoiceLineRaw[]): InvoiceStats {
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

export function useInvoiceAnalytics(rawData: InvoiceLineRaw[]): UseInvoiceAnalyticsResult {
  // Memoized stats calculation
  const stats = useMemo(() => calculateStats(rawData), [rawData]);

  // Pre-compute all attribute groupings upfront
  const attributeGroupings = useMemo(() => ({
    productgrp: groupByAttributeField(rawData, 'productgrp'),
    vendor: groupByAttributeField(rawData, 'vendor'),
    style: groupByAttributeField(rawData, 'style'),
  }), [rawData]);

  // Pre-compute all field groupings upfront
  const fieldGroupings = useMemo(() => ({
    ordertype: groupBySingleField(rawData, 'ordertype'),
    invtranstype: groupBySingleField(rawData, 'invtranstype'),
    shipmethod: groupBySingleField(rawData, 'shipmethod'),
  }), [rawData]);

  // Return functions that look up pre-computed values
  const groupByAttribute = (attribute: InvoiceGroupByAttribute): InvoiceChartData[] => {
    return attributeGroupings[attribute];
  };

  const groupByField = (field: InvoiceGroupByField): InvoiceChartData[] => {
    return fieldGroupings[field];
  };

  return {
    stats,
    groupByAttribute,
    groupByField,
  };
}

export default useInvoiceAnalytics;
