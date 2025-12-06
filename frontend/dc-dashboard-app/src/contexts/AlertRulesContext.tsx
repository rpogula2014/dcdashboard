/* eslint-disable react-refresh/only-export-components */
/**
 * AlertRulesContext
 * Manages alert rules configuration with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AlertRule, RuleCondition } from '../types';

// LocalStorage key for persisting rules
const STORAGE_KEY = 'dc-dashboard-alert-rules';

// Default example rules
const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'default-stuck-descartes',
    name: 'Stuck at Descartes',
    description: 'Orders sent to Descartes but not planned',
    advancedExpression: "routed = 'Y' AND planned = 'N'",
    severity: 'warning',
    dataSource: 'dc_order_lines',
    refreshInterval: 60,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-ready-not-routed',
    name: 'Ready but not routed',
    description: 'Orders with reservations, no holds, but not sent to Descartes',
    advancedExpression: "reserved_qty > 0 AND hold_applied = 'N' AND routed = 'N'",
    severity: 'info',
    dataSource: 'dc_order_lines',
    refreshInterval: 120,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Context state interface
interface AlertRulesContextState {
  // Data
  rules: AlertRule[];

  // Actions
  addRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => AlertRule;
  updateRule: (id: string, updates: Partial<AlertRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  getRule: (id: string) => AlertRule | undefined;

  // Utility
  generateId: () => string;
  buildWhereClause: (rule: AlertRule) => string;
}

// Create context
const AlertRulesContext = createContext<AlertRulesContextState | undefined>(undefined);

// Provider props
interface AlertRulesProviderProps {
  children: ReactNode;
}

/**
 * Load rules from localStorage
 */
function loadRulesFromStorage(): AlertRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load alert rules from localStorage:', err);
  }
  return DEFAULT_RULES;
}

/**
 * Save rules to localStorage
 */
function saveRulesToStorage(rules: AlertRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save alert rules to localStorage:', err);
  }
}

/**
 * Generate unique ID for new rules
 */
function generateRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert relative date placeholder to actual date string (YYYY-MM-DD format)
 */
function resolveRelativeDate(value: string | number | null): string | number | null {
  if (typeof value !== 'string' || !value.startsWith('@')) {
    return value;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let targetDate = new Date(today);

  if (value === '@TODAY') {
    // targetDate is already today
  } else if (value === '@TOMORROW') {
    targetDate.setDate(today.getDate() + 1);
  } else if (value === '@YESTERDAY') {
    targetDate.setDate(today.getDate() - 1);
  } else if (value.startsWith('@TODAY+')) {
    const days = parseInt(value.replace('@TODAY+', ''), 10);
    if (!isNaN(days)) {
      targetDate.setDate(today.getDate() + days);
    }
  } else if (value.startsWith('@TODAY-')) {
    const days = parseInt(value.replace('@TODAY-', ''), 10);
    if (!isNaN(days)) {
      targetDate.setDate(today.getDate() - days);
    }
  } else {
    // Unknown format, return as-is
    return value;
  }

  // Format as YYYY-MM-DD
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build SQL WHERE clause from rule conditions
 */
function buildWhereClauseFromConditions(conditions: RuleCondition[]): string {
  if (!conditions || conditions.length === 0) return '1=1';

  return conditions
    .map((cond) => {
      const { field, operator } = cond;
      // Resolve relative dates to actual date strings
      const value = resolveRelativeDate(cond.value);

      // Handle NULL operators
      if (operator === 'IS NULL') {
        return `${field} IS NULL`;
      }
      if (operator === 'IS NOT NULL') {
        return `${field} IS NOT NULL`;
      }

      // Handle LIKE operator
      if (operator === 'LIKE') {
        return `${field} LIKE '%${value}%'`;
      }

      // Handle string vs number values
      const formattedValue = typeof value === 'string' ? `'${value}'` : value;
      return `${field} ${operator} ${formattedValue}`;
    })
    .join(' AND ');
}

/**
 * AlertRulesProvider component
 */
export function AlertRulesProvider({ children }: AlertRulesProviderProps) {
  const [rules, setRules] = useState<AlertRule[]>(() => loadRulesFromStorage());

  // Save to localStorage whenever rules change
  useEffect(() => {
    saveRulesToStorage(rules);
  }, [rules]);

  // Add a new rule
  const addRule = useCallback((ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule => {
    const now = new Date().toISOString();
    const newRule: AlertRule = {
      ...ruleData,
      id: generateRuleId(),
      createdAt: now,
      updatedAt: now,
    };
    setRules((prev) => [...prev, newRule]);
    return newRule;
  }, []);

  // Update an existing rule
  const updateRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
          : rule
      )
    );
  }, []);

  // Delete a rule
  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  }, []);

  // Toggle rule enabled/disabled
  const toggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? { ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() }
          : rule
      )
    );
  }, []);

  // Get a single rule by ID
  const getRule = useCallback((id: string): AlertRule | undefined => {
    return rules.find((rule) => rule.id === id);
  }, [rules]);

  // Build WHERE clause from a rule (handles both simple and advanced modes)
  const buildWhereClause = useCallback((rule: AlertRule): string => {
    if (rule.advancedExpression) {
      return rule.advancedExpression;
    }
    if (rule.conditions && rule.conditions.length > 0) {
      return buildWhereClauseFromConditions(rule.conditions);
    }
    return '1=1'; // Default: match all (shouldn't happen in practice)
  }, []);

  const value: AlertRulesContextState = {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRule,
    generateId: generateRuleId,
    buildWhereClause,
  };

  return (
    <AlertRulesContext.Provider value={value}>
      {children}
    </AlertRulesContext.Provider>
  );
}

/**
 * useAlertRules hook
 * Access alert rules context
 */
export function useAlertRules(): AlertRulesContextState {
  const context = useContext(AlertRulesContext);

  if (context === undefined) {
    throw new Error('useAlertRules must be used within an AlertRulesProvider');
  }

  return context;
}

export { AlertRulesContext };
