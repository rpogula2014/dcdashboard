# Optimized Prompt (Clavix Enhanced)

## Objective

Build a "Talk to Data" AI chat feature for the DC Dashboard that enables natural language querying of operational data. Users ask questions in plain English, the system generates SQL via LLM, executes it client-side with DuckDB-WASM, and displays results as text, tables, or charts.

## Technical Architecture

**Stack:**
- BAML for LLM prompt engineering and structured outputs
- DuckDB-WASM for in-browser SQL execution
- React components for chat UI and result visualization

**Data Layer:**
- Primary datasets loaded into DuckDB: DC Order Lines, Route Plans
- Detail APIs available on-demand: hold history, Descartes routing, network inventory, exceptions
- LLM agent decides: local DuckDB query vs API call based on question type

## Core Features

**1. Dedicated Chat Page**
- Full-page "Talk to Data" interface
- Natural language input with example prompts
- Results rendered as: text summaries, data tables, interactive charts
- Generated SQL displayed for transparency

**2. Contextual Access**
- Right-click menu on table rows: "Ask about this order"
- Multi-select support: "Compare these" / "What do they have in common?"
- Filter-aware queries: "Summarize this view" / "Any patterns here?"

**3. Smart Query Routing**
- Local DuckDB for data already loaded (fast, <1s response)
- API calls for fresh data or detailed records
- Hybrid: query local, enrich with API details

**4. Error Handling**
- Display error with plain-language explanation
- Auto-retry once with clarified prompt
- Suggest 3-5 example questions relevant to current context
- Never show raw SQL errors to users

## User Context

**Target Users:** Managers, operations staff, support analysts
**Expertise Level:** Data-comfortable, appreciate seeing SQL
**Primary Goals:** Quick answers without writing SQL, spot issues fast, understand order status

## Constraints

- Standalone questions only (v1) - no conversation memory
- Must work with existing React dashboard architecture
- SQL generation must prevent injection (parameterized or sanitized)
- Charts should use existing charting library if available

## Success Criteria

1. User asks "Show me orders on hold over $10k" and gets accurate table in <2 seconds
2. Right-click on order row, select "Why is this delayed?" and get relevant explanation
3. Invalid questions show helpful error with 3 suggested alternatives
4. Generated SQL is syntactically valid for DuckDB 95%+ of the time
5. Support analysts can answer customer questions faster using this feature

---

## Optimization Improvements Applied

1. **[ADDED]** - Explicit technical stack (DuckDB-WASM, BAML) and architecture section for implementation clarity
2. **[CLARIFIED]** - "talk to the data" made concrete: natural language → SQL → execute → visualize pipeline
3. **[STRUCTURED]** - Reorganized into Objective → Architecture → Features → Context → Constraints → Success flow
4. **[EXPANDED]** - Added smart query routing logic (when to use DuckDB vs API)
5. **[SCOPED]** - Explicitly marked v1 boundaries (no conversation memory) and security requirement (injection prevention)
6. **[ACTIONABILITY]** - Success criteria now measurable: <2s response, 95% valid SQL, specific user scenarios

---
*Optimized by Clavix on 2025-12-02. This version is ready for implementation.*
