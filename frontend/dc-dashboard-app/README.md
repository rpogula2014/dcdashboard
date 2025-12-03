# DC Dashboard

A React-based dashboard for Distribution Center operations with AI-powered natural language data querying.

## Features

- **Orders Dashboard**: View and manage DC order lines
- **Talk to Data**: AI-powered natural language querying using DuckDB-WASM
- **Route Planning**: Descartes route plan integration
- **Exceptions Tracking**: Traction and ship set exceptions

---

## Talk to Data Architecture

The "Talk to Data" feature allows users to query dashboard data using natural language. The system converts questions to SQL, executes them in-browser using DuckDB-WASM, and presents results as tables, charts, or text.

### Component Architecture

```mermaid
flowchart TB
    subgraph Page["TalkToData Page"]
        direction TB
        Init["Initialize"]
        AR["Auto-Refresh Timer<br/>(30s interval, 30min max)"]
        Header["Header + Auto-Refresh Toggle"]
    end

    subgraph Components["TalkToData Components"]
        direction TB

        subgraph Input["User Input"]
            CI[ChatInput]
            EQ[ExampleQuestions]
        end

        subgraph Display["Chat Display"]
            CH[ChatHistory]
            CM[ChatMessage]
        end

        subgraph Results["Result Components"]
            RT[ResultTable]
            RC[ResultChart]
            RTx[ResultText]
            SQL[SQLDisplay]
        end

        subgraph State["State & Detection"]
            RTD[resultTypeDetector]
            DF[DataFreshness]
            LS[LoadingStates]
        end
    end

    subgraph Services["Services Layer"]
        direction TB
        NLS[nlToSqlService]
        DDB[duckdbService]
        DL[dataLoaders]
        API[api.ts]
    end

    subgraph Backend["Backend APIs"]
        direction LR
        LLM["POST /api/nl-to-sql<br/>(BAML + Claude)"]
        Orders["GET /api/v1/dc-order-lines/open"]
        Routes["GET /api/v1/descartes/route-plans"]
    end

    subgraph DuckDB["DuckDB-WASM (Browser)"]
        DCT["dc_order_lines table"]
        RPT["route_plans table"]
    end

    %% Initialization Flow
    Init -->|"1. Initialize"| DDB
    DDB -->|"2. SET TimeZone"| DuckDB
    Init -->|"3. Fetch Data"| API
    API --> Orders
    API --> Routes
    Orders -->|"Order Lines"| DL
    Routes -->|"Route Plans"| DL
    DL -->|"Load into DuckDB"| DCT
    DL -->|"Load into DuckDB"| RPT
    DL -->|"Update"| DF

    %% Auto-Refresh Flow
    AR -->|"Every 30s"| API
    AR -->|"Update countdown"| Header

    %% User Query Flow
    CI -->|"Submit query"| NLS
    EQ -->|"Select example"| CI
    NLS -->|"Mock mode?"| NLS
    NLS -->|"API mode"| LLM
    LLM -->|"SQL + metadata"| NLS
    NLS -->|"Validate SQL"| NLS
    NLS -->|"Execute"| DDB
    DDB -->|"Query"| DuckDB
    DuckDB -->|"Results"| NLS
    NLS -->|"QueryResult"| Page

    %% Result Display Flow
    Page -->|"Add message"| CH
    CH -->|"Render"| CM
    CM -->|"Detect type"| RTD

    RTD -->|"table"| RT
    RTD -->|"chart"| RC
    RTD -->|"text"| RTx
    CM -->|"Show SQL"| SQL

    CM -->|"Loading?"| LS

    classDef page fill:#e1f5fe,stroke:#01579b
    classDef component fill:#f3e5f5,stroke:#7b1fa2
    classDef service fill:#fff3e0,stroke:#ef6c00
    classDef backend fill:#e8f5e9,stroke:#2e7d32
    classDef db fill:#fce4ec,stroke:#c2185b

    class Page,Init,AR,Header page
    class CI,EQ,CH,CM,RT,RC,RTx,SQL,RTD,DF,LS component
    class NLS,DDB,DL,API service
    class LLM,Orders,Routes backend
    class DCT,RPT,DuckDB db
```

### Query Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant ChatInput
    participant TalkToData
    participant nlToSqlService
    participant Backend as Backend API
    participant DuckDB as DuckDB-WASM
    participant ChatHistory
    participant resultTypeDetector
    participant ResultComponent as Result*

    User->>ChatInput: Type question
    ChatInput->>TalkToData: onSubmit(query)
    TalkToData->>TalkToData: Add user message
    TalkToData->>nlToSqlService: processNaturalLanguageQuery()

    alt Mock Mode
        nlToSqlService->>nlToSqlService: mockConvertNLToSQL()
    else API Mode
        nlToSqlService->>Backend: POST /api/nl-to-sql
        Backend-->>nlToSqlService: {sql, confidence, display_type}
    end

    nlToSqlService->>nlToSqlService: validateSQL()
    nlToSqlService->>DuckDB: executeQuery(sql)
    DuckDB-->>nlToSqlService: QueryResult
    nlToSqlService-->>TalkToData: {result, nlResult}

    TalkToData->>TalkToData: Add assistant message
    TalkToData->>ChatHistory: messages[]
    ChatHistory->>ChatHistory: Render ChatMessage
    ChatHistory->>resultTypeDetector: detectResultType()
    resultTypeDetector-->>ChatHistory: {displayType, chartType}

    alt displayType = table
        ChatHistory->>ResultComponent: ResultTable
    else displayType = chart
        ChatHistory->>ResultComponent: ResultChart
    else displayType = text
        ChatHistory->>ResultComponent: ResultText
    end

    ResultComponent-->>User: Display results
```

### Auto-Refresh Flow

```mermaid
flowchart LR
    subgraph Trigger["Trigger (every 30s)"]
        Timer["setInterval"]
    end

    subgraph Check["Checks"]
        MaxDur{"Max duration<br/>reached?"}
        Loading{"Already<br/>refreshing?"}
    end

    subgraph Fetch["Parallel API Calls"]
        O["refreshOrders()"]
        R["fetchRoutePlans()"]
    end

    subgraph Load["Load into DuckDB"]
        LO["loadDCOrderLines()"]
        LR["loadRoutePlans()"]
    end

    subgraph Update["Update State"]
        DF["setDataFreshness()"]
        CD["Reset countdown"]
    end

    Timer --> MaxDur
    MaxDur -->|"Yes (>30min)"| Stop["Disable auto-refresh"]
    MaxDur -->|"No"| Loading
    Loading -->|"Yes"| Skip["Skip refresh"]
    Loading -->|"No"| Fetch
    O --> LO
    R --> LR
    LO --> DF
    LR --> DF
    DF --> CD
```

### Result Type Detection Logic

```mermaid
flowchart TD
    Start["detectResultType()"] --> Suggested{"LLM suggested<br/>type?"}

    Suggested -->|"Yes"| UseSuggested["Use suggested type"]
    Suggested -->|"No"| Empty{"rowCount = 0?"}

    Empty -->|"Yes"| Text1["TEXT: No results"]
    Empty -->|"No"| Single{"rowCount = 1<br/>columns = 1?"}

    Single -->|"Yes"| Text2["TEXT: Single aggregate"]
    Single -->|"No"| SingleRow{"rowCount = 1<br/>columns ≤ 5?"}

    SingleRow -->|"Yes"| Text3["TEXT: Single row detail"]
    SingleRow -->|"No"| Agg{"Aggregation<br/>score > 0.7?"}

    Agg -->|"Yes"| ChartType["Detect chart type"]
    Agg -->|"No"| Table["TABLE: Multiple rows"]

    ChartType --> HasDate{"Has date<br/>column?"}
    HasDate -->|"Yes"| Line["LINE chart"]
    HasDate -->|"No"| FewRows{"rows ≤ 8<br/>1 numeric col?"}
    FewRows -->|"Yes"| Pie["PIE chart"]
    FewRows -->|"No"| MultiNum{"Multiple<br/>numeric cols?"}
    MultiNum -->|"Yes"| Area["AREA chart"]
    MultiNum -->|"No"| Bar["BAR chart"]
```

### File Structure

```
src/components/TalkToData/
├── index.ts                 # Exports all components
├── TalkToData.css          # All component styles
│
├── ChatInput.tsx           # User query input + submit
├── ChatHistory.tsx         # Message list container
├── ChatMessage.tsx         # Individual message + result
│
├── ResultTable.tsx         # Table display (Ant Design)
├── ResultChart.tsx         # Chart display (Recharts)
├── ResultText.tsx          # Text/summary display
├── SQLDisplay.tsx          # SQL with syntax highlighting
│
├── ExampleQuestions.tsx    # Clickable example queries
├── DataFreshness.tsx       # Data load status indicator
├── LoadingStates.tsx       # Spinners, skeletons
└── resultTypeDetector.ts   # Auto-detect display type
```

### Environment Configuration

```env
# Frontend (.env)
VITE_USE_MOCK_NL_TO_SQL=false          # true for mock mode, false for API
VITE_LLM_API_URL=http://localhost:8001  # LLM backend
VITE_API_BASE_URL=http://localhost:8000 # Data API
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: Ant Design
- **Charts**: Recharts
- **In-Browser Database**: DuckDB-WASM
- **LLM Integration**: BAML + Claude (backend)
- **State Management**: React Context

---

## Original Vite Template Info

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
