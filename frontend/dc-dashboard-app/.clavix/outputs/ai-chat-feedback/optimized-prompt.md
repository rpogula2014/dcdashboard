# Optimized Prompt (Clavix Enhanced)

Add a feedback feature to the existing Talk to AI page. Display thumbs up/down buttons on every AI response. After clicking a rating, show an optional text input for additional comments. Submit feedback asynchronously without page reload.

**Data to capture per feedback submission:**
- User's original question
- AI's full response as JSON including:
  - Content/explanation text
  - Generated SQL query
  - Display type and chart type
  - Query results (columns, row count, execution time, first 10 rows)
  - Token usage (input/output tokens, cache tokens)
  - Calculated cost in USD
- dcid (organization identifier)
- Rating: 'good' or 'bad'
- Optional text feedback
- Timestamp (auto-generated)
- User email (hardcoded value, mandatory field)

**Database:** PostgreSQL connection `postgres://cocoindex:cocoindex@localhost/cocoindex`. Create a feedback table if it doesn't exist. Use appropriate data types (TEXT for question/response, VARCHAR for dcid/email, ENUM or VARCHAR for rating, TIMESTAMP for created_at).

**Technical requirements:**
- Integrate with existing Talk to AI chat component
- Each AI response message needs a unique identifier to associate feedback
- Feedback submission should be non-blocking (async)
- Visual feedback on successful submission (e.g., button state change)

**Out of scope:** Admin UI for reviewing feedback (will query database directly).

---

## Optimization Improvements Applied

1. **[ADDED]** - Specified async submission requirement and visual feedback on success
2. **[CLARIFIED]** - Explicitly listed all data fields in structured format
3. **[STRUCTURED]** - Organized into UI requirements, data model, database, and technical constraints
4. **[EXPANDED]** - Added database schema hints (data types) and unique identifier requirement
5. **[SCOPED]** - Explicitly marked admin UI as out of scope to prevent scope creep

---
*Optimized by Clavix on 2025-12-05. This version is ready for implementation.*
