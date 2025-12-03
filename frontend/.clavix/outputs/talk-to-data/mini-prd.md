# Requirements: Talk to Data

*Generated from conversation on 2025-12-02*
*Updated: 2025-12-02 - Backend API implemented, chart fixes, schema updates*
*Updated: 2025-12-02 - Added prompt caching, token usage tracking, cost display, date formatting*
*Updated: 2025-12-03 - Auto-refresh polling, compact UI, improved charts, timezone fix*
*Updated: 2025-12-03 - Inventory section (Onhand/Cycle Counts), NL-to-SQL refactoring, build fixes*
*Updated: 2025-12-03 - Added DC Onhand inventory table to DuckDB for Talk to Data queries*

## Objective

Build an AI-powered "Talk to Data" feature for the DC Dashboard that enables users to query dashboard data using natural language. The system converts natural language to SQL, executes queries in-browser using DuckDB, and presents results in user-friendly formats (text, tables, charts).

## Core Requirements

### Must Have (High Priority)

- [HIGH] Natural language to SQL conversion via backend API (LLM calls on server) ✅
- [HIGH] In-browser SQL execution using DuckDB-WASM for fast local queries ✅
- [HIGH] Query three main datasets: DC Order Lines, Route Plans, and DC Onhand Inventory ✅
- [HIGH] Output results as text explanations, data tables, and charts ✅
- [HIGH] Display generated SQL for transparency (users are data-comfortable) ✅
- [HIGH] Dedicated "Talk to Data" page for comprehensive exploration ✅
- [HIGH] Contextual access via right-click on table rows ⬜
- [HIGH] Error handling: show errors, suggest example questions ✅
- [HIGH] Mock mode for development (pattern-matching without LLM backend) ✅

### Should Have (Medium Priority)

- [MEDIUM] Contextual queries for single row selection ("Tell me about this order") ⬜
- [MEDIUM] Contextual queries for multiple row selection ("What do these have in common?") ⬜
- [MEDIUM] Contextual queries for filtered views ("Summarize what I'm looking at") ⬜
- [MEDIUM] Ability to trigger API calls when detailed/fresh data is needed ⬜
- [MEDIUM] Smart agent behavior to decide: query local DuckDB vs call API ⬜

### Could Have (Low Priority / Future)

- [LOW] Follow-up question context memory (build on previous questions in session)
- [LOW] Saved queries / favorites
- [LOW] Query history

## Technical Architecture

### Key Architectural Decision: Server-Side LLM

**Problem:** BAML has native Node.js bindings that cannot run in the browser (Vite/esbuild cannot bundle `.node` files).

**Solution:** Split architecture with LLM processing on server:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│  User Query  →  [Mock Mode OR Backend API]  →  SQL Query        │
│                         ↓                                        │
│              DuckDB-WASM executes SQL locally                   │
│                         ↓                                        │
│              Results displayed (table/chart/text)               │
└─────────────────────────────────────────────────────────────────┘
                          ↕ (when mock mode disabled)
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND (Python/FastAPI + BAML)                  │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/nl-to-sql (port 8001)                                │
│    - Receives: query, schema_context                            │
│    - Uses BAML to call LLM (Claude/GPT)                         │
│    - Returns: SQL, confidence, display_type, explanation        │
│                                                                  │
│  POST /api/correct-sql                                          │
│    - Receives: original_query, error_message, schema_context    │
│    - Returns: corrected_sql, confidence                         │
└─────────────────────────────────────────────────────────────────┘
```

### Prompt Caching (Anthropic)

**Implementation:** System prompt with static content (instructions, schema, rules) is cached using Anthropic's prompt caching feature.

**BAML Configuration:**
```baml
client<llm> CustomHaiku {
  provider anthropic
  options {
    model "claude-haiku-4-5-20251001"
    allowed_role_metadata ["cache_control"]
    headers {
      "anthropic-beta" "prompt-caching-2024-07-31"
    }
  }
}
```

**Prompt Structure:**
```baml
prompt #"
  {{ _.role("system", cache_control={"type": "ephemeral"}) }}
  [Static content - instructions, schema, rules]  ← CACHED

  {{ _.role("user") }}
  [Variable content - user question]              ← NOT CACHED
"#
```

**Cache Limitations by Model:**
| Model | Minimum Tokens |
|-------|---------------|
| Claude Opus 4.5 | 4096 |
| Claude Sonnet 4/4.5 | 1024 |
| Claude Haiku 4.5 | 4096 |
| Claude Haiku 3.5/3 | 2048 |

**Current Status:** Haiku 4.5 requires 4096 tokens minimum; current prompt is ~1614 tokens, below threshold.

### Token Usage & Cost Tracking

**Backend:** Returns token usage in API response via BAML Collector:
```python
class TokenUsage(BaseModel):
    input_tokens: int
    output_tokens: int
    cache_creation_input_tokens: int
    cache_read_input_tokens: int
```

**Frontend:** Displays in chat message footer:
- Token counts: `1614 in / 276 out`
- Cache status: `(cached)` in green when cache hit
- Cost: `$0.00299` calculated from Haiku 4.5 pricing

**Pricing (Claude Haiku 4.5):**
| Token Type | Cost per MTok |
|------------|---------------|
| Input | $1.00 |
| Output | $5.00 |
| Cache Read | $0.10 |
| Cache Write | $1.25 |

### Operating Modes

| Mode | Config | Use Case |
|------|--------|----------|
| **Mock** | `VITE_USE_MOCK_NL_TO_SQL=true` | Development without backend, demos |
| **API** | `VITE_USE_MOCK_NL_TO_SQL=false` | Production with full LLM capabilities |

Mock mode recognizes 12+ common query patterns and returns pre-built SQL.

### Environment Configuration

```env
# Frontend (.env)
VITE_USE_MOCK_NL_TO_SQL=false
VITE_LLM_API_URL=http://localhost:8001    # LLM backend
VITE_API_BASE_URL=http://localhost:8000   # Data API

# Backend (.env)
ANTHROPIC_API_KEY=your-key    # For Claude models
OPENAI_API_KEY=your-key       # For GPT models
```

## Technical Constraints

- **Frontend Stack:** React + Vite (existing dashboard)
- **LLM Integration:** Backend API (BAML runs server-side only)
- **In-Browser Database:** DuckDB-WASM for client-side SQL execution
- **Data Sources:**
  - `fetchOpenDCOrderLines` - DC order lines (bulk dataset)
  - `fetchRoutePlans` - Route plans (bulk dataset)
  - `fetchDCOnhand` - DC onhand inventory (bulk dataset)
  - Supporting detail APIs (hold history, Descartes routing, network inventory, exceptions)
- **Performance:** DuckDB queries are fast (<100ms) since data is local
- **LLM Timeout:** 60 seconds for complex queries

### Data Type Handling

DuckDB-WASM returns special types that need conversion:
- **BigInt** (COUNT results) → Convert to Number
- **Uint32Array** (SUM/aggregates) → Extract first element
- **DATETIME columns** → Use `CAST(column AS DATE)` for date comparisons
- **Timestamps** → Detected by value range (2000-2100) or column name containing "date"
- **Date Format** → Displayed as `DD-MMM-YYYY` (e.g., `01-DEC-2025`)

## User Context

**Target Users:**

- Managers
- Operations folks
- Support analysts

**User Characteristics:**

- Comfortable with data and technical concepts
- Appreciate seeing the generated SQL for transparency and learning
- Need quick answers without writing SQL themselves

**Primary Use Cases:**

1. Explore loaded data freely on dedicated page
2. Quick contextual queries while viewing orders/routes (right-click)
3. Get summaries and insights from current filtered views
4. Understand why specific orders are delayed/on hold

## UI/UX Requirements

### Dedicated Page

- Full "Talk to Data" view for power users
- Free-form natural language input
- Results displayed as text, tables, or charts (context-appropriate)
- SQL query visible for transparency

### Contextual Access

- Right-click menu on table rows
- Selection-aware queries (single row, multiple rows, current filter)
- Quick answers without leaving current view

### Output Presentation

- Text explanations for insights (COUNT, single values)
- Data tables for result sets
- Charts for aggregations and trends (bar, line, pie, area)
- Show generated SQL query (collapsible)

## Edge Cases & Considerations

- What happens when DuckDB query fails? Show error + suggest rephrasing
- What if LLM generates invalid SQL? Show error (retry removed for simplicity)
- How to handle ambiguous questions? Suggest example questions
- When to use API vs local DuckDB? LLM decides based on query type
- Large result sets? Consider pagination or summarization
- Backend unavailable? Fallback to mock mode automatically

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Setup & Infrastructure | ✅ Complete | DuckDB-WASM, data loaders, types |
| Phase 2: NL-to-SQL Engine | ✅ Complete | Mock mode + API, validation |
| Phase 3: Result Presentation | ✅ Complete | Table, Chart, Text, SQL display |
| Phase 4: Dedicated Chat Page | ✅ Complete | Full chat UI with examples |
| Phase 5: Contextual Access | ⬜ Pending | Right-click menu integration |
| Phase 6: Smart Query Routing | 🟡 Partial | Backend API done, routing logic pending |
| Phase 7: Polish & Edge Cases | ✅ Complete | BigInt/TypedArray fixes, date formatting |
| Phase 8: Cost & Usage Tracking | ✅ Complete | Token usage, cost display, caching setup |

## Recent Changes (2025-12-02)

### Prompt Caching Setup
- Configured BAML client with `cache_control` and `anthropic-beta` header
- Structured prompts with system role (cached) and user role (variable)
- Note: Haiku 4.5 requires 4096 tokens minimum (current prompt ~1614 tokens)

### Token Usage & Cost Display
- Backend returns `TokenUsage` with input/output/cache tokens via BAML Collector
- Frontend displays in chat: `• 1614 in / 276 out • $0.00299`
- Shows `(cached)` indicator when cache hits occur

### Date Formatting
- Fixed timestamp display (were showing as large numbers)
- Added `isTimestamp()` detection for Unix timestamps
- Custom `formatDate()` function: `DD-MMM-YYYY` format (e.g., `01-DEC-2025`)

## Recent Changes (2025-12-03)

### Auto-Refresh Polling
- Added 30-second auto-refresh interval for data freshness
- Maximum duration: 30 minutes (stops automatically to save resources)
- Visual countdown indicator in header showing time until next refresh
- Toggle control to pause/resume auto-refresh
- Spinning sync icon during active refresh
- Fetches both Order Lines and Route Plans APIs in parallel
- Duplicate call prevention using ref-based locking

### APIs Called During Auto-Refresh
| API | Endpoint | Description |
|-----|----------|-------------|
| Health Check | `GET /docs` | Checks API availability |
| Order Lines | `GET /api/v1/dc-order-lines/open` | Fetches DC order data |
| Route Plans | `GET /api/v1/descartes/route-plans` | Fetches Descartes route data |
| DC Onhand | `GET /api/v1/inventory/dc-onhand` | Fetches DC onhand inventory |

### DuckDB Timezone Fix
- DuckDB-WASM defaults to UTC, causing `CURRENT_DATE` to return wrong day
- Added `getUserTimezone()` to detect browser's local timezone
- Set DuckDB timezone on connection: `SET TimeZone = '{timezone}'`
- Now `CURRENT_DATE` returns correct local date

### Compact UI
- Reduced table cell padding (6px→3px) and font sizes (12px→10px)
- Reduced chart heights (350px→220px for charts, 400px→250px for tables)
- Smaller chat message bubbles, avatars, and input fields
- Compact header and data freshness indicators
- ~30-40% more content fits on screen

### Improved Chart Visualizations
**Bar Charts:**
- Data labels on top of each bar showing values (e.g., "1.4K")
- `minPointSize={3}` ensures small bars are visible even with skewed data
- Rounded corners on bars for modern aesthetics
- Lighter grid lines for less visual clutter

**Pie Charts:**
- Donut style (inner radius) for modern look
- Values shown in labels (e.g., "ATD Route Truck: 1.4K")
- Legend shows percentages (e.g., "ATD Route Truck (95.2%)")
- Small slices (<2%) hidden to avoid label clutter

### Date/Timestamp Display Fix
- Added `isDateColumn()` to detect date columns by name
- Added `isTimestamp()` to detect Unix timestamps (2000-2100 range)
- `formatValue()` function formats dates as human-readable strings
- Fixed Quick Stats showing timestamps as large numbers
- Now displays: "Wednesday, December 3, 2025" instead of "1,764,806,400,000"

### API Call Optimization
- Fixed duplicate API calls in ExceptionsCard (open-trips called 3x → 1x)
- Added `isLoadingRef` to prevent concurrent duplicate fetches
- Used refs instead of state in useCallback dependencies
- Removed problematic dependencies from useEffect arrays

### DC Onhand Inventory Integration
- Added `dc_onhand` table to DuckDB for inventory queries
- New data source: `fetchDCOnhand` API loads into DuckDB on page init
- Schema context updated with dc_onhand column descriptions
- DataFreshness component shows Onhand status alongside Orders and Routes

**dc_onhand Table Schema:**
| Column | Type | Description |
|--------|------|-------------|
| inventory_item_id | INTEGER | Unique item identifier |
| itemnumber | VARCHAR | Item number/SKU code |
| item_description | VARCHAR | Description of the item |
| subinventory_code | VARCHAR | Subinventory (STOCK, QUICKPICK, STAGE, etc.) |
| quantity | INTEGER | Quantity on hand at this location |
| locator | VARCHAR | Storage locator code |
| aisle | VARCHAR | Aisle identifier within warehouse |
| CustomSubinventory | VARCHAR | Custom subinventory classification |
| vendor | VARCHAR | Vendor/supplier name |
| vendor_display | VARCHAR | Vendor display name |
| product_group | VARCHAR | Product group code |
| productgrp | VARCHAR | Product group description |
| style | VARCHAR | Product style identifier |

**Example Queries Now Supported:**
- "What items are in STOCK subinventory?"
- "How much total quantity is in aisle A1?"
- "Show me items by vendor"
- "What product groups have the most inventory?"
- "List items in locator A1-01-01"

---
*This PRD was generated by Clavix from conversational requirements gathering.*
*Architecture updated to reflect browser compatibility constraints.*
*Backend API implemented with BAML integration.*
