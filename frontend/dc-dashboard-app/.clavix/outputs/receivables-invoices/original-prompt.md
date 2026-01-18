# Original Prompt (Extracted from Conversation)

Add a new section in the sidebar called Receivables with a subsection called Invoices (Payments will be added later). This should follow the same logic and architecture we have created for the Inventory section.

The API endpoint is http://0.0.0.0:8000/api/v1/invoice-lines/?dcid=84 where dcid comes from the app context. The data is normalized but has multiple levels. Level 1 is the Invoice Header with fields like batchsource, trx_number, invtranstype, shipmethod, trx_date, customer_trx_id, ordertype, billcustname, shipcustname, and shiploc. Level 2 is the line details including line_number, line_type, quantity_invoiced, extended_amount, unit_selling_price, sales_order, sales_order_line, and customer_trx_line_id. When line_type is LINE, show item information (item_number, productgrp, vendor, style). When line_type is TAX, show tax information (tax_name, tax_rate). LINE and TAX entries are linked by customer_trx_line_id.

For the display, group by invtranstype and within each group show the invoice headers as rows with all header fields plus a line count and extended_amount sum. Each invoice row should have an expandable section that shows the line details with LINE and TAX entries together in one table. Need filtering on shiploc, billcustname, invtranstype, and ordertype. Search should work across all fields. Default sort should be by trx_date with newest first.

---
*Extracted by Clavix on 2025-12-08. See optimized-prompt.md for enhanced version.*
