# Implementation Tasks

**Project**: exception-alerts
**Generated**: 2025-12-04T13:55:00Z

---

## Phase 1: Data Layer & Types

- [x] Define TypeScript interfaces for AlertRule (id, name, condition, severity, refreshInterval, enabled, dataSource) (ref: Technical Constraints)
  Task ID: phase-1-data-layer-1

- [x] Define TypeScript interfaces for AlertResult (ruleId, ruleName, severity, matchCount, matchingOrders) (ref: Core Requirements)
  Task ID: phase-1-data-layer-2

- [x] Create alert rules context/store for managing rule state (localStorage persistence) (ref: Configuration Page)
  Task ID: phase-1-data-layer-3

- [x] Create DuckDB query executor function that takes a rule condition and returns matching orders (ref: Technical Constraints)
  Task ID: phase-1-data-layer-4

## Phase 2: Configuration Page - Rule Builder

- [x] Create AlertRulesConfig page component with route /alerts/config (ref: Configuration Page)
  Task ID: phase-2-config-page-1

- [x] Build SimpleRuleBuilder component with field/operator/value dropdowns for dc_order_lines columns (ref: Simple rule builder)
  Task ID: phase-2-config-page-2

- [x] Build AdvancedExpressionEditor component with textarea for custom SQL-like expressions (ref: Advanced expressions)
  Task ID: phase-2-config-page-3

- [x] Add severity level selector (critical/warning/info) with color preview (ref: Severity levels)
  Task ID: phase-2-config-page-4

- [x] Add refresh interval input field (seconds) per rule (ref: Configurable refresh interval)
  Task ID: phase-2-config-page-5

- [x] Build RulesList component showing all configured rules with edit/delete/toggle actions (ref: Configuration Page)
  Task ID: phase-2-config-page-6

- [x] Add rule validation with error messages for invalid expressions (ref: Edge Cases)
  Task ID: phase-2-config-page-7

## Phase 3: Alerts Page - Exception Display

- [x] Create ExceptionAlerts page component with route /alerts (ref: Alerts Page)
  Task ID: phase-3-alerts-page-1

- [x] Create useAlertResults hook that executes all enabled rules and returns grouped results (ref: Alerts Page)
  Task ID: phase-3-alerts-page-2

- [x] Build AlertRuleGroup component - collapsible card showing rule name, severity badge, and match count (ref: Drill-down capability)
  Task ID: phase-3-alerts-page-3

- [x] Build AlertDetails component - expandable table showing matching orders within a group (ref: Drill-down capability)
  Task ID: phase-3-alerts-page-4

- [x] Add severity color indicators (critical=red, warning=orange, info=blue) (ref: Visual severity indicators)
  Task ID: phase-3-alerts-page-5

- [x] Add manual refresh button with loading spinner (ref: Manual refresh button)
  Task ID: phase-3-alerts-page-6

- [x] Add "No exceptions" empty state when all rules pass (ref: Edge Cases)
  Task ID: phase-3-alerts-page-7

## Phase 4: Integration & Navigation

- [x] Add Alerts and Alert Config links to sidebar navigation (ref: Core Requirements)
  Task ID: phase-4-integration-1

- [x] Add default example rules (Stuck at Descartes, Ready but not routed) on first load (ref: Example Rules)
  Task ID: phase-4-integration-2

- [x] Add error boundary and error states for rule execution failures (ref: Edge Cases)
  Task ID: phase-4-integration-3

- [x] Test end-to-end: create rule, view alerts, expand details, refresh (ref: Success Criteria)
  Task ID: phase-4-integration-4

## Phase 5: Enhancements & Bug Fixes

- [x] Add fallback column definitions for Simple Builder when DuckDB table not yet loaded
  Task ID: phase-5-enhancements-1

- [x] Add relative date support in Simple Builder (Today, Tomorrow, Yesterday, etc.)
  Task ID: phase-5-enhancements-2

- [x] Fix SeveritySelector Form.Item integration for proper form state management
  Task ID: phase-5-bugfix-1

- [x] Load dc_order_lines into DuckDB automatically when API data is fetched (not just when Talk to Data opens)
  Task ID: phase-5-enhancements-3

- [x] Exclude mock data from DuckDB loading (alerts require real data only)
  Task ID: phase-5-enhancements-4

- [x] Load route_plans and dc_onhand into DuckDB asynchronously when orders are fetched
  Task ID: phase-5-enhancements-5

- [x] Skip re-loading data in TalkToData if already loaded into DuckDB
  Task ID: phase-5-enhancements-6

---

## Implementation Summary

**Files Created:**
- `src/pages/AlertRulesConfig.tsx` - Configuration page with rule builder
- `src/pages/ExceptionAlerts.tsx` - Alerts display page with drill-down

**Files Modified:**
- `src/pages/index.ts` - Export new pages
- `src/types/index.ts` - Add PageKey types for new routes
- `src/components/Layout/Sidebar.tsx` - Add Alerts navigation section
- `src/App.tsx` - Add pages, routes, and AlertRulesProvider
- `src/contexts/index.ts` - Export AlertRulesProvider
- `src/contexts/AlertRulesContext.tsx` - Add relative date resolution in WHERE clause builder
- `src/hooks/useOrders.ts` - Load dc_order_lines into DuckDB on API fetch

**Key Features:**
- Simple rule builder with field/operator/value dropdowns
- Advanced SQL expression editor with validation
- Relative date support (@TODAY, @TOMORROW, @YESTERDAY, etc.)
- Severity levels (critical/warning/info) with color coding
- Configurable refresh intervals per rule
- Collapsible alert groups with drill-down to matching records
- Auto-expand critical alerts
- "All Clear" state when no exceptions
- LocalStorage persistence for rules
- DuckDB auto-loading when order data is fetched

---

*Generated by Clavix /clavix:plan*
*Updated: 2025-12-04*
