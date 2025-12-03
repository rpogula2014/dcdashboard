# Implementation Tasks

**Project**: talk-to-data
**Generated**: 2025-12-02
**Updated**: 2025-12-02 - Backend API implemented, chart fixes, schema updates
**Updated**: 2025-12-03 - Auto-refresh, compact UI, chart improvements, timezone fix

---

## Code Structure

```
dc-dashboard-app/
├── src/
│   ├── services/
│   │   ├── api.ts                          # Backend API calls
│   │   ├── duckdb/
│   │   │   ├── index.ts                    # DuckDB exports
│   │   │   ├── duckdbService.ts            # DuckDB initialization & queries
│   │   │   └── dataLoaders.ts              # Load data into DuckDB
│   │   └── nlToSql/
│   │       ├── index.ts                    # NL-to-SQL exports
│   │       └── nlToSqlService.ts           # Mock mode + Backend API calls
│   ├── components/
│   │   └── TalkToData/
│   │       ├── index.ts                    # Component exports
│   │       ├── ChatInput.tsx               # User query input
│   │       ├── ChatMessage.tsx             # Message display
│   │       ├── ChatHistory.tsx             # Conversation container
│   │       ├── ResultTable.tsx             # Query results as table
│   │       ├── ResultChart.tsx             # Query results as chart
│   │       ├── ResultText.tsx              # Text explanations
│   │       ├── SQLDisplay.tsx              # Show generated SQL
│   │       ├── ExampleQuestions.tsx        # Suggested questions
│   │       ├── DataFreshness.tsx           # Data load status
│   │       ├── LoadingStates.tsx           # Spinners and skeletons
│   │       ├── resultTypeDetector.ts       # Auto-detect display type
│   │       └── TalkToData.css              # Component styles
│   ├── pages/
│   │   └── TalkToData.tsx                  # Main Talk to Data page
│   └── types/
│       └── index.ts                        # TypeScript types
├── backend/                                # NEW: FastAPI backend
│   ├── main.py                             # FastAPI app with endpoints
│   ├── pyproject.toml                      # Python dependencies
│   ├── .env                                # API keys
│   └── baml_src/                           # BAML schemas & prompts
│       ├── talk_to_data.baml               # NL-to-SQL functions
│       ├── clients.baml                    # LLM client configs
│       └── generators.baml                 # Code generation config
└── .env                                    # Frontend config

# Environment Variables
VITE_USE_MOCK_NL_TO_SQL=false
VITE_LLM_API_URL=http://localhost:8001      # LLM backend
VITE_API_BASE_URL=http://localhost:8000     # Data API
```

---

## Phase 1: Setup & Infrastructure

- [x] Install DuckDB-WASM package and configure for browser usage
  Task ID: phase-1-setup-infrastructure-1

- [x] ~~Install and configure BAML for LLM prompt engineering~~ **MOVED TO BACKEND**
  Task ID: phase-1-setup-infrastructure-2
  Note: BAML has native Node.js bindings incompatible with browser

- [x] Create DuckDB service to initialize database and manage connections
  Task ID: phase-1-setup-infrastructure-3
  File: `src/services/duckdb/duckdbService.ts`

- [x] Create data loader to populate DuckDB with DC Order Lines on app load
  Task ID: phase-1-setup-infrastructure-4
  File: `src/services/duckdb/dataLoaders.ts`

- [x] Create data loader to populate DuckDB with Route Plans on app load
  Task ID: phase-1-setup-infrastructure-5
  File: `src/services/duckdb/dataLoaders.ts`

- [x] Add TypeScript types for DuckDB query results and chat messages
  Task ID: phase-1-setup-infrastructure-6
  File: `src/types/index.ts`

---

## Phase 2: NL-to-SQL Engine

**Architecture:** Mock mode (pattern-matching) + Backend API (BAML/LLM)

- [x] Column descriptions for DC Order Lines schema context
  Task ID: phase-2-nl-to-sql-engine-1
  File: `src/services/nlToSql/nlToSqlService.ts` (getColumnDescription function)

- [x] Column descriptions for Route Plans schema context
  Task ID: phase-2-nl-to-sql-engine-2
  File: `src/services/nlToSql/nlToSqlService.ts` (getColumnDescription function)

- [x] Mock mode with query pattern matching (12+ patterns)
  Task ID: phase-2-nl-to-sql-engine-3
  File: `src/services/nlToSql/nlToSqlService.ts` (mockConvertNLToSQL function)

- [x] Build NL-to-SQL service with mock mode + backend API fallback
  Task ID: phase-2-nl-to-sql-engine-4
  File: `src/services/nlToSql/nlToSqlService.ts` (convertNLToSQL)

- [x] Implement SQL execution function that runs generated SQL against DuckDB
  Task ID: phase-2-nl-to-sql-engine-5
  File: `src/services/nlToSql/nlToSqlService.ts` (executeNLQuery)

- [x] Add SQL sanitization/validation to prevent injection attacks
  Task ID: phase-2-nl-to-sql-engine-6
  File: `src/services/nlToSql/nlToSqlService.ts` (validateSQL, DANGEROUS_PATTERNS)

- [x] Implement error handling: catch SQL errors, format user-friendly messages
  Task ID: phase-2-nl-to-sql-engine-7
  File: `src/services/nlToSql/nlToSqlService.ts` (createQueryError, getSuggestions)

- [x] Add 60-second timeout for LLM API calls
  Task ID: phase-2-nl-to-sql-engine-8
  File: `src/services/nlToSql/nlToSqlService.ts` (LLM_API_TIMEOUT_MS)

- [x] Add environment configuration for mock vs API mode
  Task ID: phase-2-nl-to-sql-engine-9
  File: `.env` (VITE_USE_MOCK_NL_TO_SQL, VITE_LLM_API_URL)

---

## Phase 3: Result Presentation Components

- [x] Create ResultTable component to display query results as data table
  Task ID: phase-3-result-presentation-1
  File: `src/components/TalkToData/ResultTable.tsx`

- [x] Create ResultChart component for aggregation/trend visualizations
  Task ID: phase-3-result-presentation-2
  File: `src/components/TalkToData/ResultChart.tsx`
  Note: Fixed BigInt and Uint32Array handling for DuckDB results

- [x] Create ResultText component for text explanations and insights
  Task ID: phase-3-result-presentation-3
  File: `src/components/TalkToData/ResultText.tsx`

- [x] Create SQLDisplay component to show generated SQL with syntax highlighting
  Task ID: phase-3-result-presentation-4
  File: `src/components/TalkToData/SQLDisplay.tsx`

- [x] Build result type detector to choose appropriate display
  Task ID: phase-3-result-presentation-5
  File: `src/components/TalkToData/resultTypeDetector.ts`

- [x] Add loading spinner and skeleton states for query execution
  Task ID: phase-3-result-presentation-6
  File: `src/components/TalkToData/LoadingStates.tsx`

- [x] Fix single-value display (COUNT results now show value + explanation)
  Task ID: phase-3-result-presentation-7
  File: `src/components/TalkToData/ChatMessage.tsx` (formatSingleValueResult)

---

## Phase 4: Dedicated Chat Page

- [x] Create TalkToData page component with route `/talk-to-data`
  Task ID: phase-4-dedicated-chat-page-1
  File: `src/pages/TalkToData.tsx`

- [x] Add TalkToData page to sidebar navigation
  Task ID: phase-4-dedicated-chat-page-2
  Files: `src/components/Layout/Sidebar.tsx`, `src/App.tsx`

- [x] Build ChatInput component with text input and submit button
  Task ID: phase-4-dedicated-chat-page-3
  File: `src/components/TalkToData/ChatInput.tsx`

- [x] Create ChatMessage component to display user questions and AI responses
  Task ID: phase-4-dedicated-chat-page-4
  File: `src/components/TalkToData/ChatMessage.tsx`

- [x] Build ChatHistory container to manage conversation display
  Task ID: phase-4-dedicated-chat-page-5
  File: `src/components/TalkToData/ChatHistory.tsx`

- [x] Add example questions panel with clickable suggestions
  Task ID: phase-4-dedicated-chat-page-6
  File: `src/components/TalkToData/ExampleQuestions.tsx`

- [x] Integrate result components (table, chart, text, SQL) into chat responses
  Task ID: phase-4-dedicated-chat-page-7
  File: `src/components/TalkToData/ChatMessage.tsx`

- [x] Add data freshness indicator showing when data was last loaded
  Task ID: phase-4-dedicated-chat-page-8
  File: `src/components/TalkToData/DataFreshness.tsx`

---

## Phase 5: Contextual Access

- [ ] Create ContextMenu component for right-click actions on table rows
  Task ID: phase-5-contextual-access-1

- [ ] Add right-click handler to OrdersTable rows to show context menu
  Task ID: phase-5-contextual-access-2

- [ ] Implement single-row context query: "Tell me about this order"
  Task ID: phase-5-contextual-access-3

- [ ] Implement multi-row selection tracking in OrdersTable
  Task ID: phase-5-contextual-access-4

- [ ] Implement multi-row context query: "What do these have in common?"
  Task ID: phase-5-contextual-access-5

- [ ] Implement filter-aware context query: "Summarize what I'm looking at"
  Task ID: phase-5-contextual-access-6

- [ ] Create ContextualQueryModal to display results without leaving current view
  Task ID: phase-5-contextual-access-7

---

## Phase 6: Backend API & Smart Query Routing

- [x] Create FastAPI backend with BAML integration
  Task ID: phase-6-smart-query-routing-0
  File: `backend/main.py`

- [x] Implement `/api/nl-to-sql` endpoint
  Task ID: phase-6-smart-query-routing-1
  File: `backend/main.py` (convert_nl_to_sql)

- [x] Implement `/api/correct-sql` endpoint
  Task ID: phase-6-smart-query-routing-2
  File: `backend/main.py` (correct_sql_error)

- [x] Implement `/api/classify-query` endpoint
  Task ID: phase-6-smart-query-routing-3
  File: `backend/main.py` (classify_query)

- [x] Configure CORS for frontend access
  Task ID: phase-6-smart-query-routing-4
  File: `backend/main.py` (CORSMiddleware)

- [x] Create BAML schemas and prompts for NL-to-SQL
  Task ID: phase-6-smart-query-routing-5
  File: `backend/baml_src/talk_to_data.baml`

- [x] Add date handling rules to BAML prompt (CAST for DATETIME columns)
  Task ID: phase-6-smart-query-routing-6
  File: `backend/baml_src/talk_to_data.baml`

- [ ] Implement query router service to decide DuckDB vs API based on classification
  Task ID: phase-6-smart-query-routing-7

- [ ] Add API call capability for hold history when query needs detail data
  Task ID: phase-6-smart-query-routing-8

- [ ] Add API call capability for Descartes routing info when needed
  Task ID: phase-6-smart-query-routing-9

- [ ] Implement hybrid query flow: DuckDB query + API enrichment
  Task ID: phase-6-smart-query-routing-10

---

## Phase 7: Polish & Edge Cases

- [ ] Add pagination for large result sets (>100 rows)
  Task ID: phase-7-polish-edge-cases-1

- [ ] Handle ambiguous queries: detect uncertainty and suggest clarifications
  Task ID: phase-7-polish-edge-cases-2

- [x] Add keyboard shortcuts: Enter to submit, Escape to clear
  Task ID: phase-7-polish-edge-cases-3
  File: `src/components/TalkToData/ChatInput.tsx`

- [x] Write example questions specific to DC Order Lines and Route Plans data
  Task ID: phase-7-polish-edge-cases-4
  File: `src/components/TalkToData/ExampleQuestions.tsx` (12 questions in 4 categories)

- [x] Fix BigInt handling for COUNT results in charts
  Task ID: phase-7-polish-edge-cases-5
  File: `src/components/TalkToData/ResultChart.tsx` (extractNumericValue)

- [x] Fix Uint32Array handling for SUM/aggregate results in charts
  Task ID: phase-7-polish-edge-cases-6
  File: `src/components/TalkToData/ResultChart.tsx` (extractNumericValue)

- [x] Update schema descriptions to match backend data model
  Task ID: phase-7-polish-edge-cases-7
  File: `src/services/nlToSql/nlToSqlService.ts` (getColumnDescription)

- [ ] Add empty state messaging when no data is loaded
  Task ID: phase-7-polish-edge-cases-8

- [ ] Test with real data and tune BAML prompts for accuracy
  Task ID: phase-7-polish-edge-cases-9

- [x] Fix date/timestamp display (showing raw Unix timestamps)
  Task ID: phase-7-polish-edge-cases-10
  Files: `src/components/TalkToData/ChatMessage.tsx`, `ResultText.tsx`
  Note: Added isDateColumn(), isTimestamp(), formatValue() functions

- [x] Fix DuckDB timezone issue (CURRENT_DATE returning UTC date)
  Task ID: phase-7-polish-edge-cases-11
  File: `src/services/duckdb/duckdbService.ts` (getUserTimezone, SET TimeZone)

---

## Phase 8: Auto-Refresh & UI Improvements

- [x] Add auto-refresh polling (30 second interval)
  Task ID: phase-8-auto-refresh-ui-1
  File: `src/pages/TalkToData.tsx`
  Note: Uses setInterval with countdown timer

- [x] Add 30-minute max duration for auto-refresh
  Task ID: phase-8-auto-refresh-ui-2
  File: `src/pages/TalkToData.tsx`
  Note: Stops automatically to save resources

- [x] Add visual countdown indicator in header
  Task ID: phase-8-auto-refresh-ui-3
  File: `src/pages/TalkToData.tsx`
  Note: Shows "Auto-refresh in Xs" with toggle control

- [x] Include Route Plans API in auto-refresh
  Task ID: phase-8-auto-refresh-ui-4
  File: `src/pages/TalkToData.tsx`
  Note: Fetches both APIs in parallel using Promise.all()

- [x] Add duplicate API call prevention
  Task ID: phase-8-auto-refresh-ui-5
  Files: `src/pages/TalkToData.tsx`, `src/components/Dashboard/ExceptionsCard.tsx`
  Note: Added isRefreshingRef to prevent concurrent calls

- [x] Compact UI - reduce sizes for better data density
  Task ID: phase-8-auto-refresh-ui-6
  File: `src/components/TalkToData/TalkToData.css`
  Note: ~30-40% more compact (padding, fonts, heights)

- [x] Improve bar charts with data labels and minPointSize
  Task ID: phase-8-auto-refresh-ui-7
  File: `src/components/TalkToData/ResultChart.tsx`
  Note: Values displayed on bars, small bars visible with minPointSize={3}

- [x] Improve pie charts with donut style and percentages
  Task ID: phase-8-auto-refresh-ui-8
  File: `src/components/TalkToData/ResultChart.tsx`
  Note: Inner radius, legend with percentages, value labels

- [x] Fix ExceptionsCard duplicate API calls (open-trips)
  Task ID: phase-8-auto-refresh-ui-9
  File: `src/components/Dashboard/ExceptionsCard.tsx`
  Note: Added isLoadingRef, used selectedDCRef, fixed useEffect dependencies

---

## Summary

| Phase | Total | Complete | Remaining |
|-------|-------|----------|-----------|
| Phase 1: Setup | 6 | 6 | 0 |
| Phase 2: NL-to-SQL | 9 | 9 | 0 |
| Phase 3: Result Presentation | 7 | 7 | 0 |
| Phase 4: Chat Page | 8 | 8 | 0 |
| Phase 5: Contextual Access | 7 | 0 | 7 |
| Phase 6: Backend & Routing | 11 | 7 | 4 |
| Phase 7: Polish | 11 | 7 | 4 |
| Phase 8: Auto-Refresh & UI | 9 | 9 | 0 |
| **Total** | **68** | **53** | **15** |

**Progress: 78% complete (53/68 tasks)**

---

*Generated by Clavix /clavix:plan*
*Updated to reflect backend API implementation and chart fixes*
*Updated 2025-12-03: Auto-refresh, compact UI, chart improvements, timezone fix*
