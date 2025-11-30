# Requirements: DC Dashboard

*Generated from conversation on 2025-11-30*

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
- [LOW] **Inventory Pages** - Onhand and Cycle Count views (v2)
- [LOW] **Analytics/Traction** - Performance metrics and trends (v2)
- [LOW] **Page-level Filters** - Additional filtering within each page

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
│   │   ├── Sidebar.tsx      # Collapsible navigation
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
│   └── index.ts
├── types/
│   └── index.ts             # TypeScript definitions
├── services/
│   └── api.ts               # API integration
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
- Inventory pages (Onhand, Cycle Count)
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
