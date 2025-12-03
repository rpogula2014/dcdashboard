# Optimized Prompt (Clavix Enhanced)

## Objective
Build a DC Dashboard - a centralized operations tool for Distribution Centers to track daily order fulfillment. This React application provides real-time visibility into open orders, shipping status, routing integration, and exceptions requiring attention.

## Technical Stack
- React 18 with TypeScript
- Ant Design (antd) component library
- Vite for build tooling
- Python API backend (existing) returning `DCOpenOrderLine` data

## v1 Scope

### Pages to Build
1. **Summary** - Main dashboard with KPI cards, alert banners, and recent orders table
2. **Route Truck** - Dedicated page for Route Truck ship method (high volume)
3. **Others** - Grouped page for all other ship methods (low volume)
4. **Exceptions** - Orders requiring attention (holds, late, integration stuck)

### Core Components
1. **Sidebar** - Collapsible navigation (240px expanded, 64px collapsed) with badge counts
2. **Header** - Page title, auto-refresh toggle with interval selector, last sync timestamp
3. **KPICard** - Metric display with progress bar, color variants (blue/green/orange/red)
4. **OrdersTable** - Sortable columns, row highlighting (critical=red, warning=yellow), pagination
5. **StatusIcon** - Integration status indicators (success/fail/pending/N/A)

### Data Model Fields (from Python API)
| Display | API Field |
|---------|-----------|
| Order # | `order_number` |
| Customer | `sold_to` / `ship_to` |
| Item | `ordered_item` |
| Ship Method | `shipping_method_code` |
| Status | `original_line_status` |
| Routing | `routed` (Y/N) |
| Due | `schedule_ship_date` |
| Qty | `ordered_quantity`, `reserved_qty` |
| Hold | `hold_applied`, `hold_released` |

### Exception Detection Rules
- Order on hold: `hold_applied='Y'` AND `hold_released='N'`
- Not routed: `routed='N'` for Route Truck orders
- Late: `schedule_ship_date` < today
- Short: `reserved_qty` < `ordered_quantity`

## Design Requirements
Follow LAYOUT_REFERENCE.md specifications:
- Colors: Primary #1890ff, Success #52c41a, Warning #faad14, Error #ff4d4f
- Row highlighting: Critical (#fff1f0), Warning (#fffbe6)
- Responsive grid: KPI cards at xs=24, sm=12, lg=4

## Constraints
- Single DC per deployment (no DC filter)
- View-only routing status (no write operations)
- All users see same data (no role-based access in v1)

## Out of Scope (v1)
- Inventory pages (Onhand, Cycle Count)
- Analytics/Traction page
- Page-level filters (add per page as needed later)
- KPI definitions (placeholder for now)

## Success Criteria
- [ ] Collapsible sidebar with navigation and badge counts
- [ ] Auto-refresh with user-selectable intervals
- [ ] Orders table with sorting, pagination, row highlighting
- [ ] Status icons for routing integration display
- [ ] Exception detection and display
- [ ] Matches LAYOUT_REFERENCE.md visual specifications

---

## Optimization Improvements Applied

1. **[STRUCTURED]** - Reorganized from conversational paragraphs into clear sections: Objective, Stack, Scope, Components, Data, Design, Constraints
2. **[CLARIFIED]** - Made exception rules explicit with specific field conditions instead of vague descriptions
3. **[ADDED]** - Included data model mapping table showing API fields to UI display
4. **[SCOPED]** - Clearly separated v1 scope from out-of-scope items to prevent scope creep
5. **[ACTIONABILITY]** - Added concrete success criteria checklist for implementation verification
6. **[EFFICIENCY]** - Removed conversational language ("I am planning to", "I want to") for direct requirements

---
*Optimized by Clavix on 2025-11-30. This version is ready for implementation.*
