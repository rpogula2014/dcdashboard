# Implementation Tasks

**Project**: dc-dashboard
**Generated**: 2025-11-30T12:30:00Z

---

## Phase 1: Project Setup

- [x] Initialize React 18 project with Vite and TypeScript (ref: Technical Constraints)
  Task ID: phase-1-project-setup-1

- [x] Install dependencies: antd, react-router-dom, axios (ref: Technical Constraints)
  Task ID: phase-1-project-setup-2

- [x] Create folder structure: components/, pages/, types/, services/, mock/ (ref: File Structure)
  Task ID: phase-1-project-setup-3

- [x] Set up Ant Design with ConfigProvider and theme customization (ref: Design Requirements)
  Task ID: phase-1-project-setup-4

## Phase 2: TypeScript Types & Mock Data

- [x] Create TypeScript interfaces for DCOpenOrderLine matching Python API model (ref: Data Model)
  Task ID: phase-2-types-mock-1

- [x] Define types for PageKey, KPIData, ExceptionType, StatusType (ref: Core Requirements)
  Task ID: phase-2-types-mock-2

- [x] Create mock data file with sample orders for all ship methods and statuses (ref: File Structure)
  Task ID: phase-2-types-mock-3

- [x] Add mock data for exception scenarios: holds, late orders, not routed (ref: Exception Rules)
  Task ID: phase-2-types-mock-4

## Phase 3: Core Layout Components

- [x] Create Sidebar component with collapsible navigation (240px/64px) (ref: Collapsible Sidebar)
  Task ID: phase-3-layout-1

- [x] Add sidebar navigation items: Summary, Route Truck, Others, Exceptions (ref: Must Have)
  Task ID: phase-3-layout-2

- [x] Implement badge counts on sidebar navigation items (ref: Collapsible Sidebar)
  Task ID: phase-3-layout-3

- [x] Create Header component with page title display (ref: File Structure)
  Task ID: phase-3-layout-4

- [x] Add auto-refresh toggle and interval selector to Header (ref: Auto-Refresh)
  Task ID: phase-3-layout-5

- [x] Add "Last synced" timestamp display to Header (ref: Auto-Refresh)
  Task ID: phase-3-layout-6

- [x] Create App.tsx with main layout structure: Sidebar + Header + Content (ref: File Structure)
  Task ID: phase-3-layout-7

- [x] Implement page routing with React Router (ref: User Flow)
  Task ID: phase-3-layout-8

## Phase 4: Reusable Components

- [x] Create StatusIcon component with success/fail/pending/na variants (ref: Status Icons)
  Task ID: phase-4-components-1

- [x] Create KPICard component with title, value, progress bar, footer (ref: KPI Cards)
  Task ID: phase-4-components-2

- [x] Add color variants to KPICard: blue, green, orange, red (ref: KPI Cards)
  Task ID: phase-4-components-3

- [x] Create OrdersTable component with Ant Design Table (ref: Orders Table)
  Task ID: phase-4-components-4

- [x] Add sortable columns to OrdersTable: Order#, Customer, Status, Due (ref: Orders Table)
  Task ID: phase-4-components-5

- [x] Implement row highlighting CSS: critical (red), warning (yellow) (ref: Row Highlighting)
  Task ID: phase-4-components-6

- [x] Add pagination to OrdersTable with page size selector (ref: Orders Table)
  Task ID: phase-4-components-7

- [x] Add exception badge column to OrdersTable (ref: Exception Rules)
  Task ID: phase-4-components-8

- [x] Integrate StatusIcon into OrdersTable for routing column (ref: Routing Status Display)
  Task ID: phase-4-components-9

## Phase 5: Summary Page

- [x] Create Summary page layout with KPI cards row (ref: Summary Dashboard)
  Task ID: phase-5-summary-1

- [x] Add 6 placeholder KPI cards with mock data (ref: KPI Cards)
  Task ID: phase-5-summary-2

- [x] Add Alert banner section for critical exceptions (ref: Alert Banners)
  Task ID: phase-5-summary-3

- [x] Add recent orders table showing all orders (ref: Summary Dashboard)
  Task ID: phase-5-summary-4

- [x] Wire up sidebar badge counts from mock data (ref: Collapsible Sidebar)
  Task ID: phase-5-summary-5

## Phase 6: Ship Method Pages

- [x] Create RouteTruck page with filtered OrdersTable (shipping_method_code = Route Truck) (ref: Route Truck Page)
  Task ID: phase-6-ship-methods-1

- [x] Create OtherShipMethods page with filtered OrdersTable (all non-Route Truck) (ref: Others Page)
  Task ID: phase-6-ship-methods-2

- [x] Add ship method breakdown or grouping to Others page (ref: Others Page)
  Task ID: phase-6-ship-methods-3

## Phase 7: Exceptions Page

- [x] Create Exceptions page layout (ref: Exceptions Page)
  Task ID: phase-7-exceptions-1

- [x] Implement exception detection logic: holds, late, not routed, short (ref: Exception Rules)
  Task ID: phase-7-exceptions-2

- [x] Display only exception orders in Exceptions page table (ref: Exceptions Page)
  Task ID: phase-7-exceptions-3

- [x] Add exception type indicator/filter on Exceptions page (ref: Exception Rules)
  Task ID: phase-7-exceptions-4

## Phase 8: Auto-Refresh & State Management

- [x] Implement auto-refresh interval selector (30s, 1min, 5min, off) (ref: Auto-Refresh)
  Task ID: phase-8-refresh-1

- [x] Create useAutoRefresh hook for data fetching with interval (ref: Auto-Refresh)
  Task ID: phase-8-refresh-2

- [x] Update "Last synced" timestamp on each refresh (ref: Auto-Refresh)
  Task ID: phase-8-refresh-3

- [x] Add loading states during refresh (ref: Auto-Refresh)
  Task ID: phase-8-refresh-4

## Phase 9: API Integration

- [x] Create API service module with axios configuration (ref: Data Source)
  Task ID: phase-9-api-1

- [x] Implement fetchOrders API call to Python backend (ref: Data Source)
  Task ID: phase-9-api-2

- [x] Replace mock data with real API calls across all pages (ref: Data Source)
  Task ID: phase-9-api-3

- [x] Add error handling and loading states for API calls (ref: Data Source)
  Task ID: phase-9-api-4

## Phase 10: Design & Styling

- [x] Configure light theme with Ant Design defaultAlgorithm (ref: Design Requirements)
  Task ID: phase-10-design-1

- [x] Implement compact/data-dense layout for maximum data visibility (ref: Design Requirements)
  Task ID: phase-10-design-2

- [x] Apply standard Ant Design color palette (blue #1890ff, green #52c41a, etc.) (ref: Design Requirements)
  Task ID: phase-10-design-3

- [x] Reduce table row padding to 6px for compact display (ref: Design Requirements)
  Task ID: phase-10-design-4

- [x] Reduce KPI card padding to 12px (ref: Design Requirements)
  Task ID: phase-10-design-5

- [x] Set header height to 48px (ref: Design Requirements)
  Task ID: phase-10-design-6

- [x] Configure row highlighting: critical (#fff1f0), warning (#fffbe6) (ref: Design Requirements)
  Task ID: phase-10-design-7

## Phase 11: Polish & Verification

- [ ] Verify sidebar collapse/expand works correctly (ref: Success Criteria)
  Task ID: phase-11-polish-1

- [ ] Verify all pages match LAYOUT_REFERENCE.md specifications (ref: Success Criteria)
  Task ID: phase-11-polish-2

- [ ] Test exception detection and row highlighting (ref: Success Criteria)
  Task ID: phase-11-polish-3

- [ ] Test auto-refresh functionality across all pages (ref: Success Criteria)
  Task ID: phase-11-polish-4

- [ ] Add responsive breakpoints for KPI card grid (xs=24, sm=12, lg=4) (ref: Design Requirements)
  Task ID: phase-11-polish-5

## Phase 12: ISOs Page (Internal Service Orders)

- [x] Create ISOs.tsx page component in src/pages/ (ref: ISOs Page)
  Task ID: phase-12-isos-1

- [x] Add ISOs page to React Router routes in App.tsx (ref: ISOs Page)
  Task ID: phase-12-isos-2

- [x] Add "ISOs" navigation item to Sidebar with icon (ref: Collapsible Sidebar)
  Task ID: phase-12-isos-3

- [x] Implement order filtering: order_category = "INTERNAL ORDER" (ref: Data Model)
  Task ID: phase-12-isos-4

- [x] Add badge count for ISOs in sidebar navigation (ref: Collapsible Sidebar)
  Task ID: phase-12-isos-5

- [x] Verify ISOs page displays only Internal Service Orders (ref: Success Criteria)
  Task ID: phase-12-isos-6

---

**Summary**: 12 phases, 56 tasks

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 4 | Project Setup |
| 2 | 4 | Types & Mock Data |
| 3 | 8 | Core Layout |
| 4 | 9 | Reusable Components |
| 5 | 5 | Summary Page |
| 6 | 3 | Ship Method Pages |
| 7 | 4 | Exceptions Page |
| 8 | 4 | Auto-Refresh |
| 9 | 4 | API Integration |
| 10 | 7 | Design & Styling |
| 11 | 5 | Polish & Verification |
| 12 | 6 | ISOs Page (Internal Service Orders) |

---

*Generated by Clavix /clavix:plan*
*Updated: 2025-11-30 - Added Phase 10 (Design & Styling) for light theme and compact layout*
*Updated: 2025-11-30 - Added Phase 12 (ISOs Page) for Internal Service Orders*
