# Optimized Prompt (Clavix Enhanced)

Build an **Exception Alerts System** for the DC Dashboard with two pages:

## 1. Alerts Page
- Display exceptions **grouped by rule** (e.g., "Stuck at Descartes: 5 orders")
- **Expandable groups** to drill into matching order details
- **Severity indicators** (critical=red, warning=orange, info=blue)
- **Manual refresh button** with loading state
- **View-only** - no write actions; users resolve in source systems
- Show "No exceptions" state when all rules pass

## 2. Configuration Page
- **Simple rule builder**: Dropdown-based field/operator/value selection
- **Advanced mode**: Custom expression editor for complex logic
- **Per-rule settings**:
  - Severity level (critical | warning | info)
  - Refresh interval (seconds)
  - Enabled/disabled toggle
- **Rule validation** with error messages for invalid expressions

## Technical Requirements
- **Data source (v1)**: Orders only (`dc_order_lines` table via DuckDB)
- **Extensible architecture**: Support future sources (Descartes trips, onhand)
- **Pattern**: "X happened but Y didn't" (detect stuck/blocked transactions)
- **Stack**: React components matching existing DC Dashboard patterns

## Example Rules (v1)
| Rule | Condition |
|------|-----------|
| Stuck at Descartes | `routed='Y' AND planned='N'` |
| Ready but not routed | `reserved_qty > 0 AND hold_applied='N' AND routed='N'` |

## Success Criteria
- Rules can be created via simple builder OR advanced expressions
- Alerts page loads grouped exceptions within 2 seconds
- Severity levels are visually distinct
- Architecture supports adding new data sources without major refactor

---

## Optimization Improvements Applied

1. **[Structure]** - Reorganized into clear sections: Alerts Page, Config Page, Technical, Examples
2. **[Clarity]** - Specified exact UI behaviors (expandable groups, loading states, color coding)
3. **[Completeness]** - Added rule validation, enabled/disabled toggle, empty state handling
4. **[Actionability]** - Provided concrete SQL-like condition examples
5. **[Efficiency]** - Condensed conversational content into scannable bullet format

---
*Optimized by Clavix on 2025-12-04. This version is ready for implementation.*
