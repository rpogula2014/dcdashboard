# Optimized Prompt (Clavix Enhanced)

## Objective
Implement a **Receivables > Invoices** feature in the dashboard following the existing Inventory section architecture pattern.

## Sidebar Structure
- Add new sidebar section: **Receivables**
- Add subsection: **Invoices** (Payments deferred for later)

## API Integration
- **Endpoint:** `/api/v1/invoice-lines/?dcid={dcid}`
- **Context:** `dcid` sourced from app context (same pattern as Inventory)

## View Architecture (3-Level Hierarchy)

### Level 1: Group by `invtranstype`
Group all invoices by transaction type (e.g., "Invoice", "Credit Memo")

### Level 2: Invoice Header Rows
Display as expandable rows with these columns:
| Column | Source |
|--------|--------|
| batchsource | API field |
| trx_number | API field |
| invtranstype | API field |
| shipmethod | API field |
| trx_date | API field |
| customer_trx_id | API field |
| ordertype | API field |
| billcustname | API field |
| shipcustname | API field |
| shiploc | API field |
| Line Count | **Computed** - count of lines per invoice |
| Total Amount | **Computed** - sum of extended_amount per invoice |

### Level 3: Expandable Line Details
When invoice row is expanded, show LINE and TAX entries **together in one table**:

| Column | Description |
|--------|-------------|
| line_number | Invoice line number |
| line_type | LINE or TAX |
| quantity_invoiced | Quantity |
| extended_amount | Amount |
| unit_selling_price | Unit price |
| sales_order | SO number |
| sales_order_line | SO line |
| customer_trx_line_id | Links LINE to TAX |
| item_number | Item (LINE only) |
| productgrp | Product group (LINE only) |
| vendor | Vendor (LINE only) |
| style | Style (LINE only) |
| tax_name | Tax name (TAX only) |
| tax_rate | Tax rate (TAX only) |

**Note:** TAX entries relate to their preceding LINE via `customer_trx_line_id`

## Filtering
Implement filter dropdowns for:
- `shiploc` (Ship to Location)
- `billcustname` (Customer)
- `invtranstype` (Transaction Type)
- `ordertype` (Order Type)

## Search
- Global search across **all fields**
- Include both header and line-level fields

## Sorting
- Default: `trx_date` descending (newest first)

## Technical Requirements
- Follow existing Inventory section architecture patterns
- Reuse shared components where applicable
- Client-side grouping of normalized API data
- Responsive design consistent with existing views

## Success Criteria
- [ ] Receivables section visible in sidebar
- [ ] Invoices subsection navigable
- [ ] Data grouped by invtranstype
- [ ] Invoice headers display all fields + computed totals
- [ ] Expandable rows show LINE and TAX together
- [ ] All 4 filters functional
- [ ] Search works across all fields
- [ ] Sort by trx_date (newest first) by default
- [ ] Architecture matches Inventory section patterns

---

## Optimization Improvements Applied

1. **[STRUCTURED]** - Reorganized from paragraph form into clear sections with headers and tables for easy scanning
2. **[CLARIFIED]** - Made the 3-level hierarchy explicit with dedicated sections for each level
3. **[COMPLETENESS]** - Added success criteria checklist for verification
4. **[ACTIONABILITY]** - Converted requirements into specific column tables that can be directly implemented
5. **[EFFICIENCY]** - Removed conversational phrases, increased information density
6. **[SCOPED]** - Explicitly noted deferred items (Payments) and technical patterns to follow

---
*Optimized by Clavix on 2025-12-08. This version is ready for implementation.*
