# Optimized Prompt (Clavix Enhanced)

Add an **Invoices Analytics** section to the existing `Analytics.tsx` page, positioned after the Shipped/Backorders sections. Use the existing `useInvoices` hook for data.

## Structure

**Summary Stats Bar:**
- Display: Total Invoices (count), Total Lines, Total Amount (formatted as currency)
- Match styling of existing "Shipped Today" and "Backorders" stats bars

**4 Collapsible Chart Panels** (using Ant Design `<Collapse>`):

| Panel | Title Format | Grouping Field | Notes |
|-------|--------------|----------------|-------|
| 1 | "By [Attribute] (N)" | productgrp / vendor / style | Include `<Select>` LOV inside panel to switch attribute |
| 2 | "By Order Type (N)" | ordertype | - |
| 3 | "By Transaction Type (N)" | invtranstype | - |
| 4 | "By Ship Method (N)" | shipmethod | - |

**Chart Requirements:**
- Horizontal bar charts matching `ShippedProductChart` pattern
- Each bar shows: group name, invoice count, total amount (sum of extended_amount)
- Sort by count or amount descending (largest first)
- Handle null/empty values as "Unknown"
- **"Long Tail" aggregation:** Group items contributing <5% of total into "Other" category to keep charts readable
- **Click-to-drill-down:** Clicking a bar opens a modal showing filtered invoice details (similar to `BackorderDetailsModal`)

## Technical Implementation

- Follow existing Analytics.tsx component patterns
- Create reusable `InvoiceChart` component (or extend existing chart components)
- Use `useMemo` for grouping/aggregation calculations
- Match existing color scheme and responsive behavior

## Success Criteria

- [ ] Invoices section renders below existing sections
- [ ] Stats bar shows accurate totals from useInvoices data
- [ ] All 4 charts display correctly with count + sum
- [ ] Chart 1 LOV selector switches grouping dynamically
- [ ] Visual consistency with Shipped/Backorders charts
- [ ] Empty state handled gracefully
- [ ] Small contributors (<5%) grouped into "Other" category
- [ ] Clicking a bar opens drill-down modal with filtered invoices

---

## Optimization Improvements Applied

1. **[STRUCTURED]** - Organized into clear sections: Structure, Technical, Success Criteria
2. **[CLARIFIED]** - Specified exact field names (productgrp, ordertype, invtranstype, shipmethod)
3. **[ADDED]** - Added chart sorting requirement (descending by count/amount)
4. **[ADDED]** - Added null handling requirement ("Unknown" for empty values)
5. **[ACTIONABILITY]** - Added success criteria checklist for verification
6. **[COMPLETENESS]** - Specified panel title format with count indicator

---
*Optimized by Clavix on 2025-12-08. This version is ready for implementation.*
