# Distribution Center Dashboard - Design Document

**Document Version:** 1.0
**Created:** November 28, 2025
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Chosen Approach](#chosen-approach)
4. [Detailed Wireframes](#detailed-wireframes)
5. [Component Breakdown](#component-breakdown)
6. [Data Requirements](#data-requirements)
7. [Integration Points](#integration-points)
8. [Open Decisions](#open-decisions)
9. [Alternative Approaches Considered](#alternative-approaches-considered)
10. [Next Steps](#next-steps)

---

## Executive Summary

A single-stop dashboard for tire distribution center operations to monitor:
- Order statuses (Open, Reserved, Backordered, Scheduled to Ship)
- Integration health with external systems (Routing, AfterShip Tracking)
- Exceptions and blockers preventing order fulfillment

**Chosen Design:** Command Center / Grid-First View (Option 3)
**Philosophy:** Data density for power users with full control and visibility

---

## Business Context

### Domain
- **Industry:** Tire Distribution
- **Item Types:** Tires, Wheels, Supplies (derived from product attributes)
- **ERP System:** Oracle EBS
- **Backend:** Python APIs connecting to Oracle EBS

### Scale
- ~500 order lines open at any point in time
- Multiple integration touchpoints
- Real-time monitoring requirements

### Key Pain Points to Solve
1. No single view of all order statuses
2. Integration failures block shipments silently
3. Difficult to identify why orders aren't shipping
4. Manual checking across multiple systems

### User Personas
| Persona | Role | Primary Need |
|---------|------|--------------|
| DC Manager | Oversees operations | High-level KPIs, exception summary |
| DC Operator | Processes orders | Order details, quick actions |
| IT Support | Troubleshoots integrations | Integration logs, error details |

---

## Chosen Approach

### Option 3: Command Center / Grid-First View

**Why This Approach:**
- High data density suits experienced DC users
- Familiar spreadsheet-like interface
- Full sorting, filtering, and search capabilities
- Expandable rows for deep-dive without leaving context
- Exceptions surface immediately via visual indicators

**Key Characteristics:**
- KPI tiles for at-a-glance metrics
- Powerful filter bar for quick data slicing
- Sortable data grid as primary interface
- Inline expansion for order details
- Color-coded status indicators throughout

---

## Detailed Wireframes

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              HEADER / KPI STRIP                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ TO SHIP     │ │ SHIPPED     │ │ ON-TIME %   │ │ EXCEPTIONS  │ │ BACKORDERS  │   │
│  │   TODAY     │ │   TODAY     │ │             │ │             │ │             │   │
│  │    127      │ │     89      │ │   96.2%     │ │     12      │ │      8      │   │
│  │  ▲ +15      │ │  70% done   │ │  ▼ -1.3%    │ │  🔴 4 crit  │ │  3 arriving │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              FILTER BAR                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  STATUS:  [All ▼]  [Open] [Reserved] [Routed] [Tracking] [Shipped]                 │
│                                                                                     │
│  TYPE:    [🛞 Tires] [🔘 Wheels] [📦 Supplies]      ☑️ Exceptions Only              │
│                                                                                     │
│  DATE:    [Today ▼]    SEARCH: [🔍 Order #, Customer, Item...           ]          │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              MAIN DATA GRID                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ↕│ 🚨 │ Order #  │ Customer      │ Lines│ Type │ Status   │ Route │ Track │ Due    │
│──┼────┼──────────┼───────────────┼──────┼──────┼──────────┼───────┼───────┼────────│
│ ▶│ 🔴 │ 78234    │ ABC Motors    │ 4    │ 🛞   │ Open     │ ❌    │ --    │ 2:00PM │
│ ▶│ 🔴 │ 78241    │ XYZ Tire Co   │ 2    │ 🛞   │ Reserved │ ❌    │ --    │ 3:30PM │
│ ▶│ 🟠 │ 78190    │ DEF Auto      │ 6    │ 🛞   │ Reserved │ --    │ --    │ Tmrw   │
│ ▶│ 🟠 │ 78201    │ Quick Lube    │ 3    │ 📦   │ Routed   │ ✅    │ ❌    │ 4:00PM │
│ ▶│    │ 78245    │ Gary's Tire   │ 2    │ 🛞   │ Reserved │ ✅    │ ✅    │ 4:00PM │
│ ▶│    │ 78244    │ Metro Auto    │ 4    │ 🛞   │ Routed   │ ✅    │ ✅    │ 3:45PM │
│ ▶│    │ 78243    │ City Wheels   │ 1    │ 🔘   │ Tracking │ ✅    │ ✅    │ 3:30PM │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              FOOTER                                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 500  │  [< Prev] [1] [2] [3] ... [20] [Next >]  │  Last sync: 30s │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Expanded Row Detail View

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ▼ EXPANDED: ORD-78234 ────────────────────────────────────────────────────────────  │
├──────────────────────────────────┬──────────────────────────────────────────────────┤
│ ORDER LINES                      │ TIMELINE                                         │
│ ────────────────────────────     │ ────────────────────────────                     │
│ 2x Michelin Defender 225/65R17   │ 08:30 Created in Oracle      ✅                  │
│    SKU: MICH-DEF-225   ✅ Avail  │ 08:32 Inventory reserved     ✅                  │
│ 2x Michelin Primacy 235/55R18    │ 08:35 Routing requested      ⏳                  │
│    SKU: MICH-PRI-235   ✅ Avail  │ 08:36 Routing FAILED         ❌                  │
│                                  │       "Invalid postal code"                      │
│ SHIP TO                          │ 08:36 Retry #1 FAILED        ❌                  │
│ ────────────────────────────     │ 08:40 Retry #2 FAILED        ❌                  │
│ ABC Motors                       │                                                  │
│ 123 Main Street                  │ EXCEPTION                                        │
│ Springfield, IL 6278 ⚠️          │ ────────────────────────────                     │
│ (Missing digit in ZIP)           │ 🔴 ROUTING_FAILED                                │
│                                  │ Postal code "6278" invalid                       │
│ [✏️ Edit Address]                │ [🔄 Retry Routing] [⏭️ Manual Override]          │
└──────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. KPI Strip (Top)

| KPI Card | Data Source | Calculation |
|----------|-------------|-------------|
| To Ship Today | Oracle EBS | Orders with scheduled_ship_date = TODAY and status != SHIPPED |
| Shipped Today | Oracle EBS | Orders shipped today |
| On-Time % | Oracle EBS | (Shipped on or before due) / (Total shipped) * 100 |
| Exceptions | Integration Logs | Count of orders with failed integrations |
| Backorders | Oracle EBS | Orders with backordered lines |

**Interaction:** Clicking a KPI card filters the grid to show relevant orders.

### 2. Filter Bar

| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select chips | Open, Reserved, Routed, Tracking, Shipped |
| Item Type | Toggle buttons | Tires, Wheels, Supplies |
| Date Range | Dropdown + picker | Today, Yesterday, Last 7 days, Custom |
| Exceptions Only | Checkbox | Show only orders with exceptions |
| Search | Text input | Order #, Customer name, SKU, PO # |

**Behavior:**
- Filters apply immediately (no "Apply" button needed)
- URL updates with filter state for shareability
- Filter count badge shows active filters

### 3. Main Data Grid

#### Columns (Priority Order)

| Column | Width | Sortable | Description |
|--------|-------|----------|-------------|
| Expand | 40px | No | Arrow to expand row details |
| Exception | 50px | Yes | Alert icon (🔴🟠 or blank) |
| Order # | 100px | Yes | Oracle Sales Order number |
| Customer | 150px | Yes | Customer name |
| Lines | 60px | Yes | Count of order lines |
| Type | 80px | Yes | Primary item type icon |
| Status | 100px | Yes | Order status |
| Routing | 70px | Yes | ✅❌⏳-- integration status |
| Tracking | 70px | Yes | ✅❌⏳-- integration status |
| Due | 100px | Yes | Due date/time |

#### Row Behavior
- **Default sort:** Exception (desc), then Due (asc)
- **Row colors:**
  - Red tint for critical exceptions
  - Yellow tint for warnings
  - Normal for healthy orders
- **Click:** Expand row to show details
- **Hover:** Show quick action buttons

### 4. Expanded Row Panel

| Section | Content |
|---------|---------|
| Order Lines | Line items with SKU, quantity, availability status |
| Ship To | Delivery address with edit capability |
| Timeline | Chronological event log from Oracle + integrations |
| Exception Details | Error message, suggested action |
| Actions | Edit, Retry, Override buttons |

### 5. Footer

- Pagination controls (25/50/100 per page)
- Total record count
- Last sync timestamp
- Auto-refresh indicator

---

## Data Requirements

### Primary Entities

#### Order Header
```
{
  order_id: string,
  order_number: string,
  customer_name: string,
  customer_id: string,
  status: enum[OPEN, RESERVED, ROUTED, TRACKING, SHIPPED],
  order_date: datetime,
  scheduled_ship_date: datetime,
  actual_ship_date: datetime | null,
  ship_to_address: Address,
  line_count: number,
  primary_item_type: enum[TIRE, WHEEL, SUPPLY],
  has_exception: boolean,
  exception_severity: enum[CRITICAL, WARNING, NONE]
}
```

#### Order Line
```
{
  line_id: string,
  order_id: string,
  item_sku: string,
  item_description: string,
  item_type: enum[TIRE, WHEEL, SUPPLY],
  quantity_ordered: number,
  quantity_reserved: number,
  quantity_shipped: number,
  availability_status: enum[AVAILABLE, BACKORDERED, PARTIAL],
  unit_price: decimal
}
```

#### Integration Status
```
{
  order_id: string,
  integration_type: enum[ROUTING, AFTERSHIP],
  status: enum[PENDING, SUCCESS, FAILED, NOT_APPLICABLE],
  last_attempt: datetime,
  retry_count: number,
  error_message: string | null,
  error_code: string | null
}
```

#### Integration Event Log
```
{
  event_id: string,
  order_id: string,
  event_type: string,
  event_timestamp: datetime,
  source_system: string,
  status: enum[SUCCESS, FAILED],
  details: string
}
```

### API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | GET | List orders with filters |
| `/api/orders/{id}` | GET | Single order with full details |
| `/api/orders/{id}/lines` | GET | Order lines |
| `/api/orders/{id}/events` | GET | Integration event timeline |
| `/api/orders/{id}/retry-routing` | POST | Retry routing integration |
| `/api/orders/{id}/retry-tracking` | POST | Retry tracking integration |
| `/api/orders/{id}/override` | POST | Manual override |
| `/api/kpis/summary` | GET | Dashboard KPIs |
| `/api/integrations/health` | GET | Integration system status |

---

## Integration Points

### 1. Oracle EBS (Source of Truth)

**Connection:** Python REST APIs
**Data:**
- Sales Orders (header + lines)
- Customer information
- Inventory availability
- Shipment confirmations

**Sync Frequency:** TBD (polling vs webhook)

### 2. Routing System

**Purpose:** Calculate delivery routes, assign carriers
**Integration Type:** API call after order reservation
**Failure Scenarios:**
- Invalid address
- No carrier available
- Service unavailable

### 3. AfterShip Tracking

**Purpose:** Create tracking numbers, monitor delivery
**Integration Type:** API call after routing complete
**Failure Scenarios:**
- Invalid tracking number
- API rate limit
- Service unavailable

---

## Open Decisions

### Must Decide Before Development

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | User Actions | View only vs. Edit/Retry/Override | TBD - based on user roles |
| 2 | Real-time Updates | Polling (30-60s) vs. WebSocket | Polling for simplicity |
| 3 | Frontend Framework | React / Vue / Angular | React + TypeScript |
| 4 | UI Component Library | Material UI / Ant Design / Tailwind | Ant Design (best tables) |
| 5 | Grid Columns | See column list above | Confirm with DC users |
| 6 | Display Environment | Desktop / Large monitors / Both | TBD |
| 7 | Concurrent Users | Few (<10) / Many (10-50) | TBD |
| 8 | Authentication | SSO / Local / None | TBD |

### Questions for Stakeholders

1. **Do users need to take actions** (edit, retry, override) or is this primarily **monitoring**?
2. **Any specific columns** from Oracle EBS required (SO number, warehouse, carrier)?
3. **Will this run on large warehouse monitors** or standard desktop screens?
4. **How many concurrent users** expected?
5. **What authentication method** should be used?
6. **Who owns exception resolution** - DC staff or IT support?

---

## Alternative Approaches Considered

### Option 1: Exception-First Dashboard
- Surfaces problems immediately, hides healthy orders
- Best for DCs where 80% of orders flow smoothly
- **Not chosen:** Less control over full data set

### Option 2: Kanban-Style Pipeline View
- Visualizes order flow through stages
- Best for understanding bottlenecks
- **Not chosen:** Lower data density, less suitable for 500+ orders

### Option 4: Split-Panel Monitor View
- Simultaneous monitoring of orders and integrations
- Best for combined ops + IT monitoring
- **Not chosen:** More complex, divided attention

### Option 5: Widget-Based Customizable Dashboard
- Drag-and-drop widgets, user configurable
- Best for multiple DCs with different priorities
- **Not chosen:** Higher complexity, longer development time

---



## Appendix

### Color Coding Reference

| Color | Meaning | Usage |
|-------|---------|-------|
| 🔴 Red | Critical exception | Orders blocked, immediate action needed |
| 🟠 Orange/Yellow | Warning | Attention needed, not critical |
| 🟢 Green | Success/Healthy | All systems go |
| ⚪ Gray | Not applicable | Feature not relevant for this order |
| 🔵 Blue | In progress | Action pending |

### Status Flow

```
OPEN → RESERVED → ROUTED → TRACKING → SHIPPED
  │        │          │         │
  └────────┴──────────┴─────────┴──→ EXCEPTION (at any point)
```

### Icon Reference

| Icon | Meaning |
|------|---------|
| 🛞 | Tires |
| 🔘 | Wheels |
| 📦 | Supplies |
| ✅ | Success |
| ❌ | Failed |
| ⏳ | Pending |
| -- | Not applicable |

---

*Document maintained by: [Your Team]*
*Last updated: November 28, 2025*
