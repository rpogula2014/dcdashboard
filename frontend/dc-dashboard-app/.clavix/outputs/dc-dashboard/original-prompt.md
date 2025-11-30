# Original Prompt (Extracted from Conversation)

I am planning to build a DC dashboard which will be the primary tool used by distribution centers to track what orders they have open, what they are supposed to ship on that day, various order types, categories, ship methods, and integration to routing systems for specific ship methods. I want to show all this info in one tool in a structured way so that DCs will find it easy to track. All the data will be fed via Python data APIs and I'm planning to build this in React 18, Ant Design, and TypeScript framework.

The dashboard will be used by all kinds of users at the DC. For v1, we want to focus on Summary, Ship Methods (Route Truck dedicated page, Others grouped), and Exceptions pages. Inventory and Analytics pages are out of scope for now. The routing integration is view-only - just displaying status from the external routing system, not triggering routes from the dashboard.

Exceptions include orders that are supposed to be shipped but aren't on track for that day, orders stuck in integration layers, orders on hold, and other use cases to be defined later. The auto-refresh feature should let users select their preferred refresh interval. The dashboard is for a single DC - no need for DC filtering since each deployment serves one DC.

The data comes from a Python API with the DCOpenOrderLine model containing fields like order_number, sold_to, ship_to, ordered_item, shipping_method_code, original_line_status, routed flag, schedule_ship_date, ordered_quantity, reserved_qty, hold_applied, hold_released, and more. The layout should follow the specifications in LAYOUT_REFERENCE.md including the sidebar navigation, KPI cards, orders table with row highlighting, and status icons.

---
*Extracted by Clavix on 2025-11-30. See optimized-prompt.md for enhanced version.*
