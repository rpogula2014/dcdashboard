/* eslint-disable react-refresh/only-export-components */
/**
 * DCContext
 * Manages the selected DC location across the application
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { fetchDCLocations, type DCLocation, DEFAULT_DC } from '../services/api';

// DC Context state
interface DCContextState {
  // Data
  locations: DCLocation[];
  selectedDC: number;
  selectedLocation: DCLocation | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedDC: (organizationId: number) => void;
  refreshLocations: () => Promise<void>;
}

// Create context with undefined default
const DCContext = createContext<DCContextState | undefined>(undefined);

// Provider props
interface DCProviderProps {
  children: ReactNode;
}

/**
 * DCProvider component
 * Manages DC location selection and provides it to all components
 */
export function DCProvider({ children }: DCProviderProps) {
  const [locations, setLocations] = useState<DCLocation[]>([]);
  const [selectedDC, setSelectedDCState] = useState<number>(DEFAULT_DC);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load DC locations on mount
  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDCLocations();
      setLocations(data);

      // If current selection is not in the list, use the first available or default
      if (data.length > 0 && !data.some(loc => loc.organization_id === selectedDC)) {
        setSelectedDCState(data[0].organization_id);
      }
    } catch (err) {
      console.error('Failed to load DC locations:', err);
      setError('Failed to load DC locations');
      // Keep default DC on error
    } finally {
      setIsLoading(false);
    }
  }, [selectedDC]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Get selected location object
  const selectedLocation = locations.find(loc => loc.organization_id === selectedDC) || null;

  // Set selected DC
  const setSelectedDC = useCallback((organizationId: number) => {
    setSelectedDCState(organizationId);
  }, []);

  const value: DCContextState = {
    locations,
    selectedDC,
    selectedLocation,
    isLoading,
    error,
    setSelectedDC,
    refreshLocations: loadLocations,
  };

  return (
    <DCContext.Provider value={value}>
      {children}
    </DCContext.Provider>
  );
}

/**
 * useDCContext hook
 * Access DC location data from context
 */
export function useDCContext(): DCContextState {
  const context = useContext(DCContext);

  if (context === undefined) {
    throw new Error('useDCContext must be used within a DCProvider');
  }

  return context;
}

export { DCContext };
