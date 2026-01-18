# Implementation Tasks

**Project**: receivables-invoices
**Generated**: 2025-12-08T13:30:00Z
**Updated**: 2025-12-08

**Progress**: 38/44 tasks complete (86%)

---

## Phase 1: Foundation & Types

- [x] Add 'invoices' to PageKey type in types/index.ts (ref: Technical Constraints)
  Task ID: phase-1-foundation-types-1

- [x] Create InvoiceLine interface with all line-level fields (line_number, line_type, quantity_invoiced, extended_amount, unit_selling_price, sales_order, sales_order_line, customer_trx_line_id, item_number, productgrp, vendor, style, tax_name, tax_rate) (ref: Data Model - Line Detail Fields)
  Task ID: phase-1-foundation-types-2

- [x] Create Invoice interface with header fields (batchsource, trx_number, invtranstype, shipmethod, trx_date, customer_trx_id, ordertype, billcustname, shipcustname, shiploc) plus lines array and computed fields (lineCount, totalAmount) (ref: Data Model - Invoice Header Fields)
  Task ID: phase-1-foundation-types-3

- [x] Create InvoiceGroup interface for grouping by invtranstype with invoices array and computed totals (invoiceCount, lineCount, totalAmount) (ref: UI/UX Pattern)
  Task ID: phase-1-foundation-types-4

- [x] Create UseInvoicesResult interface following useOnhand pattern (rawData, invoiceGroups, stats, isLoading, error, refresh) (ref: Technical Constraints)
  Task ID: phase-1-foundation-types-5

## Phase 2: API Service

- [x] Create fetchInvoiceLines function in api.ts that calls /api/v1/invoice-lines/?dcid={dcid} following existing fetchDCOnhand pattern (ref: Technical Constraints - API Endpoint)
  Task ID: phase-2-api-service-1

- [x] Add proper error handling and response parsing for invoice-lines endpoint (handle both array and {data: []} response formats) (ref: Technical Constraints)
  Task ID: phase-2-api-service-2

## Phase 3: Data Hook & Transformation

- [x] Create useInvoices.ts hook skeleton with state management (rawData, invoiceGroups, isLoading, error) and dcid parameter from context (ref: Core Requirements - dcid from context)
  Task ID: phase-3-data-hook-1

- [x] Implement transformToInvoiceHierarchy function: group flat API data by invtranstype → then by customer_trx_id (invoice) using nested Maps (ref: UI/UX Pattern - 3 levels)
  Task ID: phase-3-data-hook-2

- [x] Add computed field calculations in transformation: lineCount per invoice, totalAmount (sum of extended_amount) per invoice (ref: Core Requirements - computed totals)
  Task ID: phase-3-data-hook-3

- [x] Add group-level computed totals: invoiceCount, total lineCount, total amount per invtranstype group (ref: Should Have - Computed totals per group)
  Task ID: phase-3-data-hook-4

- [x] Implement sorting: invoices sorted by trx_date descending within each group (ref: Core Requirements - Default sort)
  Task ID: phase-3-data-hook-5

- [x] Add stats calculation using useMemo with distinct counts (total invoices, total lines, total customers, total amount) (ref: Data Grouping pattern)
  Task ID: phase-3-data-hook-6

## Phase 4: Page Component Structure

- [x] Create Invoices.tsx page component with basic structure (imports, state for search/filters, loading/error handling) following Onhand.tsx pattern (ref: Architecture)
  Task ID: phase-4-page-structure-1

- [x] Create Invoices.css with grid layout for stats section and hierarchy styling (ref: CSS patterns)
  Task ID: phase-4-page-structure-2

- [x] Implement stats cards section displaying: Total Invoices, Total Lines, Total Customers, Total Amount using Ant Design Statistic component (ref: Data Grouping pattern)
  Task ID: phase-4-page-structure-3

- [x] Add page header with title "Invoices" and search input (ref: Core Requirements - Search)
  Task ID: phase-4-page-structure-4

## Phase 5: Expandable Hierarchy Components

- [x] Create InvoiceGroupCollapse component for Level 1 (invtranstype groups) with expand/collapse, showing group name and badge with invoice count + total amount (ref: UI/UX Pattern - Level 1)
  Task ID: phase-5-hierarchy-1

- [x] Create InvoiceHeaderRow component for Level 2 displaying all header fields (trx_number, billcustname, trx_date, ordertype, etc.) plus computed line_count and total_amount badges (ref: Core Requirements - Invoice header rows)
  Task ID: phase-5-hierarchy-2

- [x] Make InvoiceHeaderRow expandable using Collapse component to reveal line details (ref: Core Requirements - Expandable rows)
  Task ID: phase-5-hierarchy-3

- [x] Create InvoiceLinesTable component for Level 3 showing LINE and TAX entries together with columns: line_number, line_type, quantity_invoiced, extended_amount, unit_selling_price, item_number, productgrp, vendor, style, tax_name, tax_rate (ref: Core Requirements - LINE and TAX together)
  Task ID: phase-5-hierarchy-4

- [x] Add visual distinction for LINE vs TAX rows in InvoiceLinesTable (different background color or icon) (ref: Should Have - Visual distinction)
  Task ID: phase-5-hierarchy-5

- [x] Add transaction type color coding for group headers (e.g., Invoice=blue, Credit Memo=red) (ref: Gemini suggestion - easy win)
  Task ID: phase-5-hierarchy-6

## Phase 6: Filtering Implementation

- [x] Add filter state variables for: shiploc, billcustname, shipcustname, invtranstype, ordertype, shipmethod (ref: Core Requirements - Filtering)
  Task ID: phase-6-filtering-1

- [x] Create filter dropdown components using Ant Design Select with options populated from distinct values in data (ref: Core Requirements - Filtering)
  Task ID: phase-6-filtering-2

- [x] Implement filter logic using useMemo to filter invoiceGroups based on selected filter values (ref: Filter pattern)
  Task ID: phase-6-filtering-3

- [x] Add filter UI row with 6 Select dropdowns (Ship Location, Bill To Customer, Ship To Customer, Transaction Type, Order Type, Ship Method) and Clear Filters button (ref: Core Requirements - Filtering)
  Task ID: phase-6-filtering-4

## Phase 7: Search Implementation

- [x] Implement deep search function that searches across all fields (header + line level) following Onhand's filterSubinventories pattern (ref: Core Requirements - Search all fields)
  Task ID: phase-7-search-1

- [x] Add recursive filtering: if invoice header matches, include all lines; if line matches, include parent invoice (ref: Deep filtering pattern)
  Task ID: phase-7-search-2

- [x] Recalculate group totals after search filtering (invoiceCount, lineCount, totalAmount) (ref: Stats recalculation pattern)
  Task ID: phase-7-search-3

- [x] Connect search input to filter function with debounce for performance (ref: Search UX)
  Task ID: phase-7-search-4

## Phase 8: Sidebar Integration

- [x] Add "Receivables" group to sidebar menu items in Sidebar.tsx with type: 'group' (ref: Core Requirements - Sidebar section)
  Task ID: phase-8-sidebar-1

- [x] Add "Invoices" menu item as child of Receivables group with appropriate icon (FileTextOutlined or similar) (ref: Core Requirements - Invoices subsection)
  Task ID: phase-8-sidebar-2

- [x] Add placeholder "Payments" menu item (disabled or with "Coming Soon" badge) under Receivables group (ref: Deferred - Payments)
  Task ID: phase-8-sidebar-3

- [x] Add route for /invoices in App.tsx or router configuration (ref: Navigation)
  Task ID: phase-8-sidebar-4

## Phase 9: Integration & Polish

- [x] Connect Invoices page to useInvoices hook with dcid from useDCContext() (ref: Core Requirements - dcid from context)
  Task ID: phase-9-integration-1

- [x] Add loading spinner/skeleton while data is fetching (ref: UX)
  Task ID: phase-9-integration-2

- [x] Add empty state component when no invoices match filters/search (ref: Edge Cases - Handle empty results)
  Task ID: phase-9-integration-3

- [x] Add error state display with retry button when API call fails (ref: Error handling)
  Task ID: phase-9-integration-4

- [x] Add sticky group headers so invtranstype header stays visible when scrolling (ref: Gemini suggestion - easy win)
  Task ID: phase-9-integration-5

- [x] Display shipmethod, shipcustname, shiploc tags in invoice header row (ref: Invoice header enhancement)
  Task ID: phase-9-integration-6

- [x] Add tooltips on customer names (billcustname, shipcustname) for full text visibility on hover (ref: UX enhancement)
  Task ID: phase-9-integration-7

## Phase 9.5: DuckDB & Context Integration

- [x] Create InvoiceContext to share invoice data between Invoices and Analytics pages (ref: Performance - single fetch)
  Task ID: phase-9-5-duckdb-context-1

- [x] Add InvoiceProvider to App.tsx to fetch invoice data on app load (ref: Async loading)
  Task ID: phase-9-5-duckdb-context-2

- [x] Update Invoices page to use useInvoiceContext instead of useInvoices directly (ref: Shared context)
  Task ID: phase-9-5-duckdb-context-3

- [x] Add loadInvoiceLines function to DuckDB dataLoaders.ts for Talk to Data feature (ref: DuckDB integration)
  Task ID: phase-9-5-duckdb-context-4

## Phase 10: Testing & Verification

- [ ] Manually test: Navigate to Receivables > Invoices via sidebar (ref: Success Criteria)
  Task ID: phase-10-testing-1

- [ ] Manually test: Verify invoices grouped by invtranstype correctly (ref: Success Criteria)
  Task ID: phase-10-testing-2

- [ ] Manually test: Expand invoice to see line details, verify LINE and TAX displayed together (ref: Success Criteria)
  Task ID: phase-10-testing-3

- [ ] Manually test: All 6 filters work correctly (shiploc, billcustname, shipcustname, invtranstype, ordertype, shipmethod) (ref: Success Criteria)
  Task ID: phase-10-testing-4

- [ ] Manually test: Search works across all fields (header and line level) (ref: Success Criteria)
  Task ID: phase-10-testing-5

- [ ] Manually test: Change DC in context and verify data reloads for new dcid (ref: Success Criteria)
  Task ID: phase-10-testing-6

---

*Generated by Clavix /clavix:plan*
