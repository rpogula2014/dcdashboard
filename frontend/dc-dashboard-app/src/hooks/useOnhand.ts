/**
 * useOnhand Hook
 * Fetches and transforms DC onhand inventory data into hierarchical structure
 * Hierarchy: Subinventory → Aisle → Locator → Product Group → Items
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDCOnhand, type DCOnhandItem, type ApiError } from '../services/api';

// =============================
// TYPES
// =============================

export interface OnhandItem {
  inventory_item_id: number;
  itemnumber: string;
  item_description: string | null;
  quantity: number;
  CustomSubinventory: string | null;
  vendor: string | null;
  vendor_display: string | null;
  style: string | null;
}

export interface ProductGroup {
  product_group: string;
  productgrp_display: string | null;
  items: OnhandItem[];
  totalQty: number;
  itemCount: number;
}

export interface Locator {
  locator: string;
  productGroups: ProductGroup[];
  totalQty: number;
  itemCount: number;
  productGroupCount: number;
}

export interface Aisle {
  aisle: string;
  locators: Locator[];
  totalQty: number;
  itemCount: number;
  locatorCount: number;
}

export interface Subinventory {
  subinventory_code: string;
  aisles: Aisle[];
  totalQty: number;
  itemCount: number;
  aisleCount: number;
}

export interface UseOnhandResult {
  // Raw data
  rawData: DCOnhandItem[];
  // Hierarchical data
  subinventories: Subinventory[];
  // Stats
  stats: {
    totalSubinventories: number;
    totalAisles: number;
    totalLocators: number;
    totalProductGroups: number;
    totalItems: number;
    totalQty: number;
  };
  // State
  isLoading: boolean;
  error: ApiError | null;
  // Actions
  refresh: () => Promise<void>;
}

// =============================
// TRANSFORMATION FUNCTIONS
// =============================

/**
 * Transform flat onhand data into hierarchical structure
 */
function transformToHierarchy(data: DCOnhandItem[]): Subinventory[] {
  // Group by subinventory → aisle → locator → product_group
  const subinventoryMap = new Map<string, Map<string, Map<string, Map<string, OnhandItem[]>>>>();

  for (const item of data) {
    const subinv = item.subinventory_code || 'Unknown';
    const aisle = item.aisle || 'Unknown';
    const locator = item.locator || 'Unknown';
    const productGroup = item.product_group || 'Unknown';

    if (!subinventoryMap.has(subinv)) {
      subinventoryMap.set(subinv, new Map());
    }
    const aisleMap = subinventoryMap.get(subinv)!;

    if (!aisleMap.has(aisle)) {
      aisleMap.set(aisle, new Map());
    }
    const locatorMap = aisleMap.get(aisle)!;

    if (!locatorMap.has(locator)) {
      locatorMap.set(locator, new Map());
    }
    const productGroupMap = locatorMap.get(locator)!;

    if (!productGroupMap.has(productGroup)) {
      productGroupMap.set(productGroup, []);
    }
    productGroupMap.get(productGroup)!.push({
      inventory_item_id: item.inventory_item_id,
      itemnumber: item.itemnumber,
      item_description: item.item_description,
      quantity: item.quantity,
      CustomSubinventory: item.CustomSubinventory,
      vendor: item.vendor,
      vendor_display: item.vendor_display,
      style: item.style,
    });
  }

  // Convert maps to arrays with stats (using distinct item counts)
  const subinventories: Subinventory[] = [];

  for (const [subinvCode, aisleMap] of subinventoryMap) {
    const aisles: Aisle[] = [];
    let subinvTotalQty = 0;
    const subinvDistinctItems = new Set<number>();

    for (const [aisleCode, locatorMap] of aisleMap) {
      const locators: Locator[] = [];
      let aisleTotalQty = 0;
      const aisleDistinctItems = new Set<number>();

      for (const [locatorCode, productGroupMap] of locatorMap) {
        const productGroups: ProductGroup[] = [];
        let locatorTotalQty = 0;
        const locatorDistinctItems = new Set<number>();

        for (const [pgCode, items] of productGroupMap) {
          const pgTotalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
          // Count distinct items in this product group
          const pgDistinctItems = new Set(items.map(i => i.inventory_item_id));

          // Get productgrp_display display from first item (they should all be same for this group)
          const productgrpDisplay = data.find(d => d.product_group === pgCode)?.productgrp_display || null;

          productGroups.push({
            product_group: pgCode,
            productgrp_display: productgrpDisplay,
            items: items.sort((a, b) => a.itemnumber.localeCompare(b.itemnumber)),
            totalQty: pgTotalQty,
            itemCount: pgDistinctItems.size,
          });

          locatorTotalQty += pgTotalQty;
          items.forEach(i => locatorDistinctItems.add(i.inventory_item_id));
        }

        locators.push({
          locator: locatorCode,
          productGroups: productGroups.sort((a, b) => a.product_group.localeCompare(b.product_group)),
          totalQty: locatorTotalQty,
          itemCount: locatorDistinctItems.size,
          productGroupCount: productGroups.length,
        });

        aisleTotalQty += locatorTotalQty;
        locatorDistinctItems.forEach(id => aisleDistinctItems.add(id));
      }

      aisles.push({
        aisle: aisleCode,
        locators: locators.sort((a, b) => a.locator.localeCompare(b.locator)),
        totalQty: aisleTotalQty,
        itemCount: aisleDistinctItems.size,
        locatorCount: locators.length,
      });

      subinvTotalQty += aisleTotalQty;
      aisleDistinctItems.forEach(id => subinvDistinctItems.add(id));
    }

    subinventories.push({
      subinventory_code: subinvCode,
      aisles: aisles.sort((a, b) => a.aisle.localeCompare(b.aisle)),
      totalQty: subinvTotalQty,
      itemCount: subinvDistinctItems.size,
      aisleCount: aisles.length,
    });
  }

  return subinventories.sort((a, b) => a.subinventory_code.localeCompare(b.subinventory_code));
}

/**
 * Calculate summary statistics with DISTINCT counts from raw data
 */
function calculateStats(rawData: DCOnhandItem[], subinventories: Subinventory[]) {
  // Use Sets to get distinct counts
  const distinctAisles = new Set<string>();
  const distinctLocators = new Set<string>();
  const distinctProductGroups = new Set<string>();
  const distinctItems = new Set<number>();
  let totalQty = 0;

  for (const item of rawData) {
    if (item.aisle) distinctAisles.add(item.aisle);
    if (item.locator) distinctLocators.add(item.locator);
    if (item.product_group) distinctProductGroups.add(item.product_group);
    distinctItems.add(item.inventory_item_id);
    totalQty += item.quantity || 0;
  }

  return {
    totalSubinventories: subinventories.length,
    totalAisles: distinctAisles.size,
    totalLocators: distinctLocators.size,
    totalProductGroups: distinctProductGroups.size,
    totalItems: distinctItems.size,
    totalQty,
  };
}

// =============================
// HOOK
// =============================

export function useOnhand(dcid?: number): UseOnhandResult {
  const [rawData, setRawData] = useState<DCOnhandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchDCOnhand(dcid);
      setRawData(data);
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

  // Transform data to hierarchy
  const subinventories = useMemo(() => transformToHierarchy(rawData), [rawData]);

  // Calculate stats from raw data for distinct counts
  const stats = useMemo(() => calculateStats(rawData, subinventories), [rawData, subinventories]);

  return {
    rawData,
    subinventories,
    stats,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export default useOnhand;
