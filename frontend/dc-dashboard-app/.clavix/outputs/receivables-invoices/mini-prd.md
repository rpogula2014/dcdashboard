# Requirements: Receivables - Invoices

*Generated from conversation on 2025-12-08*

## Objective

Add a new "Receivables" section to the dashboard sidebar with an "Invoices" subsection that displays invoice data in a hierarchical, expandable view following the same architecture pattern as the existing Inventory section.

## Core Requirements

### Must Have (High Priority)

- [HIGH] New sidebar section "Receivables" with "Invoices" subsection
- [HIGH] Group invoices by `invtranstype` (Invoice, Credit Memo, etc.)
- [HIGH] Invoice header rows displaying all header fields plus computed line count and extended_amount sum
- [HIGH] Expandable rows to show line details (LINE and TAX entries together in one table)
- [HIGH] Filtering by: shiploc, billcustname, shipcustname, invtranstype, ordertype, shipmethod
- [HIGH] Search across all fields
- [HIGH] Default sort by trx_date descending (newest first)
- [HIGH] dcid parameter from app context (same pattern as Inventory)

### Should Have (Medium Priority)

- [MEDIUM] Visual distinction between LINE and TAX type rows in expanded view
- [MEDIUM] Computed totals per invoice group
- [MEDIUM] Display shipmethod, shipcustname, shiploc in invoice header row
- [MEDIUM] Tooltips on customer names for full text visibility

### Could Have (Low Priority / Deferred)

- [LOW] Payments subsection (explicitly deferred for later)

## Technical Constraints

- **API Endpoint:** `http://0.0.0.0:8000/api/v1/invoice-lines/?dcid={dcid}`
- **Architecture:** Follow existing Inventory section patterns
- **Framework/Stack:** Same as existing dashboard (React-based)
- **Data Structure:** Normalized flat data that needs client-side grouping/hierarchy

## Data Model

### Invoice Header Fields (Level 1 - Grouping Row)

| Field | Type | Description |
|-------|------|-------------|
| batchsource | string | Batch source name |
| trx_number | string | Transaction/invoice number |
| invtranstype | string | Transaction type name (grouping key) |
| shipmethod | string | Ship method |
| trx_date | datetime | Transaction date |
| customer_trx_id | int | Customer transaction ID |
| ordertype | string | Order type |
| billcustname | string | Bill to customer name |
| shipcustname | string | Ship to customer name |
| shiploc | string | Ship to location |
| **line_count** | computed | Count of lines per invoice |
| **total_amount** | computed | Sum of extended_amount per invoice |

### Line Detail Fields (Level 2 - Expandable Section)

| Field | Type | Description |
|-------|------|-------------|
| line_number | int | Invoice line number |
| line_type | string | LINE or TAX |
| quantity_invoiced | float | Quantity invoiced |
| extended_amount | float | Extended amount |
| unit_selling_price | float | Unit selling price |
| sales_order | string | Sales order number |
| sales_order_line | string | Sales order line number |
| customer_trx_line_id | int | Customer transaction line ID |

### Item Information (when line_type = LINE)

| Field | Type | Description |
|-------|------|-------------|
| item_number | string | Item number |
| productgrp | string | Product group with description |
| vendor | string | Vendor with description |
| style | string | Item style/category description |

### Tax Information (when line_type = TAX)

| Field | Type | Description |
|-------|------|-------------|
| tax_name | string | Tax name/full name |
| tax_rate | float | Tax rate percentage |

## User Context

**Target Users:** Dashboard users who need to view and analyze invoice data
**Primary Use Case:** View invoices grouped by type, drill down into line details, filter and search to find specific invoices
**User Flow:**

1. Navigate to Receivables > Invoices in sidebar
2. See invoices grouped by transaction type
3. Expand individual invoices to see line details
4. Use filters/search to narrow down results

## UI/UX Pattern

The view follows the existing Trip > Deliveries expandable pattern:

- **Level 1:** Group headers by invtranstype
- **Level 2:** Invoice header rows with summary columns
- **Level 3:** Expandable line details showing LINE and TAX entries together

## Edge Cases & Considerations

- [HIGH] LINE and TAX entries are linked by customer_trx_line_id - TAX applies to preceding LINE
- [MEDIUM] Handle empty results gracefully
- [MEDIUM] Handle large datasets with many invoices

## Success Criteria

How we know this is complete and working:

- Receivables section appears in sidebar with Invoices subsection
- Invoices are grouped by invtranstype
- Invoice headers show all required fields plus computed totals
- Clicking an invoice expands to show line details
- LINE and TAX entries display together in expanded view
- All six filters work correctly (shiploc, billcustname, shipcustname, invtranstype, ordertype, shipmethod)
- Search works across all fields
- Data loads from API with dcid from context
- Follows same architecture patterns as Inventory section

## Next Steps

1. Review this PRD for accuracy and completeness
2. If anything is missing or unclear, continue the conversation
3. Use `/clavix:plan` to generate implementation tasks
4. When ready, use the optimized prompt for implementation

---
*This PRD was generated by Clavix from conversational requirements gathering.*
