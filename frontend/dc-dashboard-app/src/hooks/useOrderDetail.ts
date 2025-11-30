import { useState, useCallback } from 'react';
import type { OrderRow } from '../types';

export interface UseOrderDetailResult {
  selectedOrder: OrderRow | null;
  drawerOpen: boolean;
  openDrawer: (order: OrderRow) => void;
  closeDrawer: () => void;
}

/**
 * Custom hook for managing order detail drawer state
 * Use this hook in pages that need the order detail drawer
 */
export function useOrderDetail(): UseOrderDetailResult {
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback((order: OrderRow) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Delay clearing selected order to allow drawer close animation
    setTimeout(() => {
      setSelectedOrder(null);
    }, 300);
  }, []);

  return {
    selectedOrder,
    drawerOpen,
    openDrawer,
    closeDrawer,
  };
}

export default useOrderDetail;
