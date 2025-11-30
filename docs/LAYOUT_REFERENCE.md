# DC Dashboard - Layout Reference

This document contains all UI components, patterns, and design specifications used in the DC Dashboard.

---

## Table of Contents

1. [Layout Structure](#layout-structure)
2. [KPI Cards](#kpi-cards)
3. [Statistic Cards](#statistic-cards)
4. [Alert Banners](#alert-banners)
5. [Filter Bar Patterns](#filter-bar-patterns)
6. [Data Tables](#data-tables)
7. [Status Icons](#status-icons)
8. [Color Reference](#color-reference)
9. [Sidebar Navigation](#sidebar-navigation)

---

## Layout Structure

### Overall Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────┐  ┌─────────────────────────────────────────────────────────┐  │
│  │          │  │                      HEADER                             │  │
│  │          │  │  Title                        Auto-refresh | Last sync  │  │
│  │          │  ├─────────────────────────────────────────────────────────┤  │
│  │          │  │                                                         │  │
│  │  SIDE    │  │                                                         │  │
│  │  BAR     │  │                      CONTENT                            │  │
│  │          │  │                                                         │  │
│  │  240px   │  │                                                         │  │
│  │  (64px   │  │                                                         │  │
│  │  when    │  │                                                         │  │
│  │  collapsed)│  │                                                         │  │
│  │          │  │                                                         │  │
│  └──────────┘  └─────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Files
- `src/components/Layout/Sidebar.tsx` - Collapsible sidebar navigation
- `src/components/Layout/Header.tsx` - Page header with auto-refresh controls
- `src/App.tsx` - Main layout wrapper

---

## KPI Cards

### Design
```
┌─────────────────────┐
│ Open Orders         │  ← Label (gray, 13px)
│                     │
│ 172                 │  ← Value (28px, bold)
│                     │
│ ████████░░░░░░░░░░  │  ← Progress bar
│                     │
│ 68% of daily target │  ← Footer (gray, 12px)
└─────────────────────┘
```

### Usage
```tsx
import { KPICard } from '../components/Dashboard';

<KPICard
  title="Open Orders"
  value={172}
  progress={68}
  footer="68% of daily target (250)"
  color="blue"  // blue | green | orange | red
  onClick={() => {}}  // Optional click handler
/>
```

### Grid Layout (6 cards)
```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} lg={4}>
    <KPICard {...props} />
  </Col>
  {/* Repeat for each card */}
</Row>
```

---

## Statistic Cards

### Design
```
┌─────────────────────┐
│  📦 Route Truck     │
│       Orders        │
│                     │
│      127            │
└─────────────────────┘
```

### Usage (Ant Design Statistic)
```tsx
import { Card, Statistic } from 'antd';
import { TruckOutlined, CheckCircleOutlined } from '@ant-design/icons';

<Card>
  <Statistic
    title="Route Truck Orders"
    value={127}
    prefix={<TruckOutlined />}
    valueStyle={{ color: '#52c41a' }}  // Optional color
  />
</Card>
```

---

## Alert Banners

### Types
| Type | Use Case | Color |
|------|----------|-------|
| `error` | Critical issues requiring immediate action | Red |
| `warning` | Issues needing attention | Yellow |
| `info` | Informational messages | Blue |
| `success` | Confirmation of successful actions | Green |

### Design
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠ Critical: 4 orders require immediate attention                    [X] │
│   These orders are blocked and cannot ship until exceptions resolved.   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Usage
```tsx
import { Alert } from 'antd';

<Alert
  message="Critical: 4 orders require immediate attention"
  description="These orders are blocked and cannot ship until exceptions are resolved."
  type="error"
  showIcon
  closable
/>
```

---

## Filter Bar Patterns

### Chip-style Filters
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [All] [Open] [Reserved] [Routed] [Shipped]  |  [🚚 Route] [📦 UPS]     │
└─────────────────────────────────────────────────────────────────────────┘
```

```tsx
import { Tag } from 'antd';

<Tag.CheckableTag checked={true}>All</Tag.CheckableTag>
<Tag.CheckableTag checked={false}>Open</Tag.CheckableTag>
```

### Dropdown Filters
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Today ▼]  [All Statuses ▼]  [All Ship Methods ▼]  [🔍 Search...]      │
└─────────────────────────────────────────────────────────────────────────┘
```

```tsx
import { Select, Input, Button, Space } from 'antd';

<Space wrap>
  <Select defaultValue="today" style={{ width: 150 }}>
    <Select.Option value="today">Today</Select.Option>
    <Select.Option value="week">Last 7 Days</Select.Option>
  </Select>
  <Input.Search placeholder="Search..." style={{ width: 200 }} />
  <Button icon={<FilterOutlined />}>More Filters</Button>
</Space>
```

---

## Data Tables

### Standard Table Layout
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Recent Orders                              [🔍 Search] [Filter] [Export] [↻]   │
├────┬────────┬─────────────┬───────┬────────────┬────────┬────────┬─────┬──────┤
│    │ Order# │ Customer    │ Lines │ Ship Method│ Status │ Routing│Track│ Due  │
├────┼────────┼─────────────┼───────┼────────────┼────────┼────────┼─────┼──────┤
│ 🔴 │ 78234  │ ABC Motors  │   4   │ Route Truck│ [Open] │   ✗    │  —  │2:00PM│
│ 🟠 │ 78241  │ XYZ Tire Co │   2   │ Route Truck│[Reserv]│   ⏳   │  —  │3:30PM│
│    │ 78245  │ Gary's Tire │   2   │ UPS Ground │[Reserv]│   ✓    │  ✓  │4:00PM│
├────┴────────┴─────────────┴───────┴────────────┴────────┴────────┴─────┴──────┤
│ Showing 1-25 of 172 orders              [< Prev] [1] [2] [3] ... [Next >]      │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Row Highlighting
| Exception | Background Color | Hover Color |
|-----------|-----------------|-------------|
| Critical | `#fff1f0` | `#ffccc7` |
| Warning | `#fffbe6` | `#fff1b8` |
| None | Default | Default |

### CSS for Row Highlighting
```css
.row-critical {
  background-color: #fff1f0 !important;
}
.row-critical:hover > td {
  background-color: #ffccc7 !important;
}
.row-warning {
  background-color: #fffbe6 !important;
}
.row-warning:hover > td {
  background-color: #fff1b8 !important;
}
```

### Table Features
- **Row Selection** - Checkbox selection for bulk actions
- **Sorting** - Click column headers to sort
- **Filtering** - Built-in column filters
- **Pagination** - Page size selector (10, 25, 50, 100)
- **Actions** - View, Edit, More menu per row

### Usage
```tsx
import { Table, Tag, Badge } from 'antd';
import { StatusIcon } from '../components/common';

const columns = [
  {
    title: '',
    dataIndex: 'exception',
    width: 40,
    render: (exception) => exception && (
      <Badge status={exception === 'critical' ? 'error' : 'warning'} />
    ),
  },
  {
    title: 'Order #',
    dataIndex: 'orderNumber',
    sorter: (a, b) => a.orderNumber.localeCompare(b.orderNumber),
    render: (text) => <strong>{text}</strong>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    filters: [
      { text: 'Open', value: 'Open' },
      { text: 'Reserved', value: 'Reserved' },
    ],
    onFilter: (value, record) => record.status === value,
    render: (status) => <Tag color={colors[status]}>{status}</Tag>,
  },
  {
    title: 'Routing',
    dataIndex: 'routing',
    render: (status) => <StatusIcon status={status} />,
  },
];

<Table
  columns={columns}
  dataSource={orders}
  rowClassName={(record) => {
    if (record.exception === 'critical') return 'row-critical';
    if (record.exception === 'warning') return 'row-warning';
    return '';
  }}
  pagination={{
    pageSize: 25,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
  }}
/>
```

---

## Status Icons

### Integration Status Icons
| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| `success` | ✓ CheckCircleOutlined | `#52c41a` | Completed successfully |
| `fail` | ✗ CloseCircleOutlined | `#ff4d4f` | Failed |
| `pending` | ⏳ ClockCircleOutlined | `#faad14` | In progress |
| `na` | — MinusOutlined | `#d9d9d9` | Not applicable |

### Usage
```tsx
import { StatusIcon } from '../components/common';

<StatusIcon status="success" size={16} />
<StatusIcon status="fail" size={16} />
<StatusIcon status="pending" size={16} />
<StatusIcon status="na" size={16} />
```

### Exception Badges
| Severity | Badge Status | Color |
|----------|-------------|-------|
| Critical | `error` | Red |
| Warning | `warning` | Yellow |
| Processing | `processing` | Blue |
| Success | `success` | Green |

```tsx
import { Badge } from 'antd';

<Badge status="error" text="Critical" />
<Badge status="warning" text="Warning" />
```

---

## Color Reference

### Primary Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary Blue | `#1890ff` | Primary actions, links, highlights |
| Success Green | `#52c41a` | Success states, completed items |
| Warning Yellow | `#faad14` | Warnings, pending items |
| Error Red | `#ff4d4f` | Errors, critical exceptions |
| Purple | `#722ed1` | Secondary highlights |

### Neutral Palette
| Name | Hex | Usage |
|------|-----|-------|
| Title | `#262626` | Main headings |
| Text | `#595959` | Body text |
| Secondary | `#8c8c8c` | Secondary text, labels |
| Disabled | `#bfbfbf` | Disabled states |
| Border | `#d9d9d9` | Borders, dividers |
| Background | `#f0f2f5` | Page background |

### Row Highlight Colors
| State | Background | Hover |
|-------|------------|-------|
| Critical | `#fff1f0` | `#ffccc7` |
| Warning | `#fffbe6` | `#fff1b8` |

---

## Sidebar Navigation

### Structure
```
┌──────────────────────┐
│ 📦 DC Dashboard      │  ← Logo (64px height)
├──────────────────────┤
│ ◀ Collapse           │  ← Toggle button
├──────────────────────┤
│ 📊 Summary           │  ← Nav item (selected)
├──────────────────────┤
│ BY SHIP METHOD       │  ← Group label
│   🚚 Route Truck [6] │  ← With badge count
│   📬 Others      [4] │
├──────────────────────┤
│ EXCEPTIONS           │
│   ⚠️ Exceptions  [3] │  ← Red badge for critical
├──────────────────────┤
│ INVENTORY            │
│   📋 Onhand          │
│   🔄 Cycle Count     │
├──────────────────────┤
│ ANALYTICS            │
│   📈 Traction        │
└──────────────────────┘
```

### States
| State | Width | Shows |
|-------|-------|-------|
| Expanded | 240px | Icon + Label + Badge |
| Collapsed | 64px | Icon only |

### Badge Colors
- Default (blue): Standard counts
- Red (`backgroundColor: '#ff4d4f'`): Critical/exception counts

---

## Component File Reference

```
src/
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx      # Collapsible sidebar navigation
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
│   ├── LayoutReference.tsx  # This reference page (interactive)
│   ├── Placeholder.tsx      # Placeholder for future pages
│   └── index.ts
├── types/
│   └── index.ts             # TypeScript type definitions
├── mock/
│   └── data.ts              # Mock data for development
└── App.tsx                  # Main app with routing
```

---

## Quick Start

### Adding a New Page

1. Create page in `src/pages/NewPage.tsx`
2. Export from `src/pages/index.ts`
3. Add to `PageKey` type in `src/types/index.ts`
4. Add to sidebar in `src/components/Layout/Sidebar.tsx`
5. Add to `pageTitles` and `renderPage()` in `src/App.tsx`

### Using Components

```tsx
// KPI Cards
import { KPICard } from '../components/Dashboard';

// Orders Table
import { OrdersTable } from '../components/Dashboard';

// Status Icons
import { StatusIcon } from '../components/common';

// Layout
import { Sidebar, Header } from '../components/Layout';
```

---

*Last Updated: November 29, 2025*
