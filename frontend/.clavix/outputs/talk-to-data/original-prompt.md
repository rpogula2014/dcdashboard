# Original Prompt (Extracted from Conversation)

Build an AI chat feature called "Talk to Data" for the DC Dashboard. The idea is to let users talk to the data that's already rendered in the UI. Use BAML for prompt engineering and LLM interaction. The LLM should convert natural language questions to SQL queries, then execute those queries in the browser using DuckDB and show the output to the user.

The main data sources are the DC Order Lines and Route Plans which pull bulk data. There are also supporting APIs that fetch specific records like hold history, Descartes routing info, network inventory, and traction exceptions. The chat should be able to query both the local DuckDB data and trigger API calls when needed.

For the UI, there should be a dedicated "Talk to Data" page for free exploration, plus contextual access when viewing specific data - like right-clicking on a row to ask about it, selecting multiple rows to compare them, or asking about the current filtered view. The output should be user-friendly with text explanations, tables, and charts. The generated SQL should be shown since the users (managers, ops folks, support analysts) are comfortable with data.

For error handling, show the error and let the user rephrase, auto-retry with clarification, and suggest example questions. Questions should be standalone for v1, with follow-up context memory as a future enhancement.

---
*Extracted by Clavix on 2025-12-02. See optimized-prompt.md for enhanced version.*
