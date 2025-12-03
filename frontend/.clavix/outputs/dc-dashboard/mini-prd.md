# Requirements: DC Dashboard

*Generated from conversation on 2025-11-30*
*Updated: 2025-12-03 - Added Inventory section (Onhand page with drill-down)*

## Objective
[HIGH] Build a centralized operations dashboard for Distribution Centers (DCs) to track open orders, daily shipments, ship methods, and integration status - providing a single tool for DC staff to monitor and manage their order fulfillment workflow.

## Core Requirements

### Must Have (High Priority)
- [HIGH] **Summary Dashboard** - Main view showing KPIs, alerts, and recent orders overview
- [HIGH] **Route Truck Page** - Dedicated page for Route Truck ship method orders (high volume)
- [HIGH] **Others Page** - Grouped view for all non-Route Truck ship methods (low volume)
- [HIGH] **Exceptions Page** - Orders requiring attention (holds, late, integration issues)
- [HIGH] **ISOs Page** - Dedicated page for Internal Service Orders (order_category = "INTERNAL ORDER")
- [HIGH] **Orders Table** - Sortable, filterable table with exception highlighting
- [HIGH] **Routing Status Display** - View-only integration status from external routing system
- [HIGH] **Auto-Refresh** - User-selectable refresh interval (30s, 1min, 5min, etc.)
- [HIGH] **Collapsible Sidebar** - Navigation between pages with badge counts

### Should Have (Medium Priority)
- [MEDIUM] **KPI Cards** - Visual metrics with progress bars (specific KPIs TBD)
- [MEDIUM] **Alert Banners** - Critical/warning notifications for exceptions
- [MEDIUM] **Row Highlighting** - Visual distinction for critical/warning orders
- [MEDIUM] **Status Icons** - Success/fail/pending/N/A indicators for integrations

### Could Have (Low Priority / Future)
- [LOW] ~~**Inventory Pages** - Onhand and Cycle Count views~~ ✅ **IMPLEMENTED** (Onhand complete, Cycle Count placeholder)
- [LOW] **Analytics/Traction** - Performance metrics and trends (v2)
- [LOW] **Page-level Filters** - Additional filtering within each page

### Inventory Section (Added 2025-12-03)
- [HIGH] **Onhand Page** - 5-level drill-down view of DC inventory ✅
  - Hierarchy: Subinventory → Aisle → Locator → Product Group → Items
  - API: `GET /api/v1/inventory/dc-onhand?dcid={dcid}`
  - Features: Search, stats cards (distinct counts), responsive layout
- [MEDIUM] **Cycle Counts Page** - Placeholder for future implementation ⬜

## Technical Constraints
- **Framework/Stack:** React 18 + TypeScript + Ant Design (antd)
- **Data Source:** Python API returning `DCOpenOrderLine` model
- **Architecture:** Single DC per deployment (no multi-DC filter needed)
- **Styling:** Ant Design components + custom CSS for row highlighting
- **State:** Fresh project - build from scratch

## Design Requirements
- **Theme:** Light theme (Ant Design `defaultAlgorithm`) - white backgrounds, standard Ant Design colors
- **Layout:** Compact/data-dense layout optimized for viewing maximum data per screen
- **Typography:** System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Colors:**
  - Primary: #1890ff (Ant Design blue)
  - Success: #52c41a (green)
  - Warning: #faad14 (orange)
  - Error: #ff4d4f (red)
- **Spacing:** Minimal padding/margins to maximize data visibility
  - Table rows: 6px vertical padding
  - KPI cards: 12px padding
  - Header height: 48px
- **Row Highlighting:**
  - Critical exceptions: Light red background (#fff1f0)
  - Warning exceptions: Light yellow background (#fffbe6)

## Data Model (from Python API)

Key fields from `DCOpenOrderLine`:
| Field | UI Usage |
|-------|----------|
| `order_number` | Order # column |
| `sold_to` / `ship_to` | Customer column |
| `ordered_item` | Item/SKU |
| `shipping_method_code` | Ship method filter & display |
| `original_line_status` | Status column (Ready to Release, Backordered, etc.) |
| `routed` (Y/N) | Routing status icon |
| `schedule_ship_date` | Due date column |
| `ordered_quantity` / `reserved_qty` | Quantity columns |
| `hold_applied` / `hold_released` | Exception detection |
| `delivery_id` | Delivery tracking |
| `order_category` | ISOs page filter (INTERNAL ORDER) |

## Exception Rules (Placeholder - expand later)
- `hold_applied = 'Y'` AND `hold_released = 'N'` → Order on hold
- `routed = 'N'` for Route Truck orders → Not routed yet
- `schedule_ship_date` in the past → Late/overdue order
- `reserved_qty < ordered_quantity` → Potential inventory short
- Orders stuck in integration layers (criteria TBD)

## User Context
**Target Users:** [HIGH] All DC staff (warehouse workers, supervisors, managers)
**Primary Use Case:** [HIGH] Single source of truth for daily order fulfillment tracking
**User Flow:**
1. Open dashboard → See summary with alerts
2. Click into ship method page → View filtered orders
3. Identify exceptions → Take action
4. Monitor routing status → Ensure orders are ready to ship

## File Structure (per LAYOUT_REFERENCE.md)
```
src/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx      # Collapsible navigation (includes Inventory section)
│   │   ├── Header.tsx       # Page header with refresh controls
│   │   └── index.ts
│   ├── Dashboard/
│   │   ├── KPICard.tsx      # KPI card with progress bar
│   │   ├── OrdersTable.tsx  # Reusable orders table
│   │   └── index.ts
│   └── common/
│       ├── StatusIcon.tsx   # Integration status icons
│       └── index.ts
├── pages/
│   ├── Summary.tsx          # Main summary dashboard
│   ├── RouteTruck.tsx       # Route truck orders view
│   ├── OtherShipMethods.tsx # Non-route truck orders
│   ├── Exceptions.tsx       # Exception orders view
│   ├── ISOs.tsx             # Internal Service Orders view
│   ├── Onhand.tsx           # Inventory onhand drill-down (NEW)
│   ├── Onhand.css           # Onhand page styles (NEW)
│   ├── CycleCount.tsx       # Cycle count placeholder (NEW)
│   └── index.ts
├── hooks/
│   ├── useOnhand.ts         # Onhand data hook with hierarchy transform (NEW)
│   └── index.ts
├── types/
│   └── index.ts             # TypeScript definitions
├── services/
│   ├── api.ts               # API integration (includes fetchDCOnhand)
│   └── nlToSql/             # NL-to-SQL service (refactored into modules)
│       ├── index.ts
│       ├── config.ts
│       ├── schemaContext.ts
│       ├── validation.ts
│       ├── mockQueries.ts
│       ├── llmClient.ts
│       ├── queryExecutor.ts
│       ├── errors.ts
│       └── typeMappers.ts
├── mock/
│   └── data.ts              # Mock data for development
└── App.tsx                  # Main app with routing
```

## Success Criteria
How we know this is complete and working:
- [ ] Sidebar collapses/expands correctly with badge counts
- [ ] Summary page displays KPI cards and recent orders
- [ ] Route Truck and Others pages filter by ship method
- [ ] Exceptions page shows only orders with issues
- [ ] Orders table supports sorting, row highlighting, pagination
- [ ] Status icons display correctly for routing status
- [ ] Auto-refresh works with user-selectable intervals
- [ ] Layout matches LAYOUT_REFERENCE.md specifications
- [ ] Data loads from Python API correctly
- [ ] ISOs page filters orders by order_category = "INTERNAL ORDER"

## Out of Scope (v1)
- ~~Inventory pages (Onhand, Cycle Count)~~ ✅ **NOW IN SCOPE** - Onhand implemented
- Analytics/Traction page
- Multi-DC support
- Role-based access control
- Write operations (view-only dashboard)

## Next Steps
1. Review this PRD for accuracy and completeness
2. Set up React project with Vite + TypeScript + Ant Design
3. Build core layout (Sidebar, Header, App shell)
4. Create reusable components (KPICard, OrdersTable, StatusIcon)
5. Implement pages one by one (Summary → Route Truck → Others → Exceptions)
6. Connect to Python API

---
*This PRD was generated by Clavix from conversational requirements gathering.*

---

## Refinement History

### 2025-11-30 - Added ISOs Page

**Changes Made:**
- [ADDED] **ISOs Page** to Core Requirements (Must Have) - Dedicated page for Internal Service Orders filtered by `order_category = "INTERNAL ORDER"`
- [ADDED] `order_category` field to Data Model table for ISOs filtering
- [ADDED] `ISOs.tsx` to File Structure under pages/
- [ADDED] Success criteria for ISOs page filtering

**Reason:** User requested a dedicated sidebar page for Internal Orders to separate them from other order types for easier tracking and management.

### 2025-12-03 - Added Inventory Section (Onhand Page)

**Changes Made:**
- [ADDED] **Inventory Section** to sidebar navigation with Onhand and Cycle Counts tabs
- [ADDED] **Onhand Page** with 5-level drill-down hierarchy:
  - Subinventory → Aisle → Locator → Product Group → Items table
- [ADDED] `fetchDCOnhand()` API function to `api.ts`
  - Endpoint: `GET /api/v1/inventory/dc-onhand?dcid={dcid}`
- [ADDED] `useOnhand` hook (`src/hooks/useOnhand.ts`)
  - Transforms flat API data into hierarchical structure
  - Calculates distinct counts for stats cards
- [ADDED] `Onhand.tsx` page with collapsible drill-down UI
- [ADDED] `Onhand.css` for styling (5 levels of nested collapses)
- [ADDED] `CycleCount.tsx` placeholder page
- [REFACTORED] `nlToSqlService.ts` (648 lines) into 8 smaller modules:
  - config.ts, schemaContext.ts, validation.ts, mockQueries.ts
  - llmClient.ts, queryExecutor.ts, errors.ts, typeMappers.ts
- [FIXED] Multiple TypeScript build errors across codebase

**Data Model (DCOnhandItem):**
| Field | Description |
|-------|-------------|
| `inventory_item_id` | Inventory item ID |
| `itemnumber` | Item number (segment1) |
| `item_description` | Item description |
| `subinventory_code` | Subinventory code |
| `quantity` | Onhand quantity |
| `locator` | Locator concatenated segments |
| `aisle` | Aisle (segment1) |
| `CustomSubinventory` | Locator CustomSubinventory |
| `vendor` | Vendor code |
| `product_group` | Product group code |
| `productgrp` | Product group with description |
| `vendor_display` | Vendor with description |
| `style` | Style from VGS_TRIPLE_SEGMENT category |

**Onhand Page Features:**
- Search across all levels (subinventory, aisle, locator, item, vendor, style)
- Stats cards showing DISTINCT counts (not cumulative)
- Responsive layout with collapsible panels
- DC-aware (uses selected DC from context)

**Reason:** User requested Inventory section with Onhand drill-down view similar to Descartes page for warehouse inventory visibility.
