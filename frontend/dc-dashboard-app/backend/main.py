"""
Talk to Data Backend API

FastAPI server that exposes BAML functions for NL-to-SQL conversion.
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Optional, Literal
from datetime import datetime

import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

# Add baml_client to path (nested structure from BAML generator)
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(backend_dir, "backend", "baml_client"))

# Import BAML client (generated from baml_src)
try:
    import baml_py
    from baml_client import b
    from baml_client.types import SQLErrorContext
    BAML_AVAILABLE = True
    print("BAML client loaded successfully")
except ImportError as e:
    print(f"Warning: BAML client not available: {e}")
    print("Run 'npx @boundaryml/baml generate' in the dc-dashboard-app directory")
    BAML_AVAILABLE = False


# --- Pydantic Models ---

class NLToSQLRequest(BaseModel):
    """Request body for NL to SQL conversion"""
    query: str = Field(..., description="Natural language query from user")
    schema_context: str = Field(..., description="Database schema information")
    context_info: str = Field(default="", description="Additional context (e.g., selected rows)")


class TokenUsage(BaseModel):
    """Token usage information"""
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0


class NLToSQLResponse(BaseModel):
    """Response from NL to SQL conversion"""
    sql: str
    confidence: float
    explanation: str
    display_type: str  # TABLE, CHART, TEXT
    chart_type: Optional[str] = None  # BAR, LINE, PIE, AREA
    tables_used: list[str] = []
    warning: Optional[str] = None
    usage: Optional[TokenUsage] = None


class CorrectSQLRequest(BaseModel):
    """Request body for SQL error correction"""
    original_query: str
    error_message: str
    error_type: str
    schema_context: str


class CorrectSQLResponse(BaseModel):
    """Response from SQL correction"""
    corrected_sql: str
    confidence: float
    explanation: str = ""


class ClassifyQueryRequest(BaseModel):
    """Request body for query classification"""
    query: str
    available_tables: list[str] = ["dc_order_lines", "route_plans"]


class ClassifyQueryResponse(BaseModel):
    """Response from query classification"""
    classification: str  # LOCAL_DATA, NEEDS_API, HYBRID
    primary_table: Optional[str] = None
    api_endpoints: list[str] = []
    reason: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    baml_available: bool
    version: str = "0.1.0"


class FeedbackRequest(BaseModel):
    """Request body for submitting AI chat feedback"""
    user_question: str = Field(..., description="The question the user asked")
    ai_response: str = Field(..., description="The AI response that was rated")
    dcid: str = Field(..., description="Organization/DC identifier")
    rating: Literal["good", "bad"] = Field(..., description="User rating")
    feedback_text: Optional[str] = Field(None, description="Optional text feedback")
    user_email: str = Field(..., description="User email address")


class FeedbackResponse(BaseModel):
    """Response from feedback submission"""
    success: bool
    id: int
    message: str


# --- New Metrics Models ---

class MetricsRequest(BaseModel):
    """Request body for logging AI chat metrics"""
    message_id: str = Field(..., description="Unique message ID from frontend (UUID)")
    user_question: str = Field(..., description="The question the user asked")
    ai_response: dict = Field(..., description="Full AI response as JSON object")
    dcid: str = Field(..., description="Organization/DC identifier")
    user_email: str = Field(..., description="User email address")
    input_tokens: int = Field(default=0, description="Input tokens used")
    output_tokens: int = Field(default=0, description="Output tokens generated")
    cache_read_input_tokens: int = Field(default=0, description="Tokens read from cache")
    cache_creation_input_tokens: int = Field(default=0, description="Tokens used to create cache")
    cost_usd: float = Field(default=0.0, description="Estimated cost in USD")


class MetricsResponse(BaseModel):
    """Response from metrics logging"""
    success: bool
    id: int
    message_id: str
    message: str


class FeedbackUpdateRequest(BaseModel):
    """Request body for updating feedback on existing metrics record"""
    rating: Literal["good", "bad"] = Field(..., description="User rating")
    feedback_text: Optional[str] = Field(None, description="Optional text feedback")


class FeedbackUpdateResponse(BaseModel):
    """Response from feedback update"""
    success: bool
    message_id: str
    message: str


# --- Database Connection Pool ---

db_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    """Get or create database connection pool"""
    global db_pool
    if db_pool is None:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
        db_pool = await asyncpg.create_pool(database_url, min_size=1, max_size=10)
    return db_pool


# --- FastAPI App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global db_pool
    print("Starting Talk to Data Backend...")
    if not BAML_AVAILABLE:
        print("WARNING: BAML client not available - API will return errors")
    yield
    print("Shutting down...")
    # Close database pool
    if db_pool:
        await db_pool.close()
        print("Database pool closed")


app = FastAPI(
    title="Talk to Data API",
    description="NL-to-SQL conversion API using BAML",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://localhost:4173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Endpoints ---

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        baml_available=BAML_AVAILABLE,
    )


@app.post("/api/nl-to-sql", response_model=NLToSQLResponse)
async def convert_nl_to_sql(request: NLToSQLRequest):
    """
    Convert natural language query to SQL using BAML/LLM.

    This is the main endpoint used by the frontend to generate SQL
    from user questions.
    """
    if not BAML_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="BAML client not available. Run 'npx baml-cli generate' to generate it.",
        )

    try:
        # Create collector to capture usage metrics
        collector = baml_py.Collector()

        # Call BAML function with collector
        result = await b.ConvertNLToSQL(
            user_query=request.query,
            schema_context=request.schema_context,
            context_info=request.context_info,
            baml_options={"collector": collector},
        )

        # Extract usage metrics from collector
        token_usage = TokenUsage()
        try:
            logs = collector.logs
            if logs:
                for log in logs:
                    if hasattr(log, 'usage') and log.usage:
                        usage = log.usage
                        token_usage.input_tokens = getattr(usage, 'input_tokens', 0) or 0
                        token_usage.output_tokens = getattr(usage, 'output_tokens', 0) or 0
                        token_usage.cache_creation_input_tokens = getattr(usage, 'cache_creation_input_tokens', 0) or 0
                        token_usage.cache_read_input_tokens = getattr(usage, 'cache_read_input_tokens', 0) or 0
                        print(f"[ConvertNLToSQL] Tokens - input: {token_usage.input_tokens}, output: {token_usage.output_tokens}, "
                              f"cache_creation: {token_usage.cache_creation_input_tokens}, cache_read: {token_usage.cache_read_input_tokens}")
        except Exception as e:
            print(f"[ConvertNLToSQL] Error reading collector: {e}")

        return NLToSQLResponse(
            sql=result.sql,
            confidence=result.confidence,
            explanation=result.explanation,
            display_type=result.display_type.value,
            chart_type=result.chart_type.value if result.chart_type else None,
            tables_used=result.tables_used,
            warning=result.warning,
            usage=token_usage,
        )
    except Exception as e:
        print(f"Error in ConvertNLToSQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/correct-sql", response_model=CorrectSQLResponse)
async def correct_sql_error(request: CorrectSQLRequest):
    """
    Attempt to correct a failed SQL query.

    Called by the frontend when a generated SQL query fails to execute.
    """
    if not BAML_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="BAML client not available",
        )

    try:
        error_context = SQLErrorContext(
            original_query=request.original_query,
            error_message=request.error_message,
            error_type=request.error_type,
        )

        result = await b.CorrectSQLError(
            error_context=error_context,
            schema_context=request.schema_context,
        )

        return CorrectSQLResponse(
            corrected_sql=result.corrected_sql,
            confidence=result.confidence,
            explanation=result.explanation,
        )
    except Exception as e:
        print(f"Error in CorrectSQLError: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/classify-query", response_model=ClassifyQueryResponse)
async def classify_query(request: ClassifyQueryRequest):
    """
    Classify a query to determine routing (local DuckDB vs API call).

    Used for smart query routing in Phase 6.
    """
    if not BAML_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="BAML client not available",
        )

    try:
        result = await b.ClassifyQuery(
            user_query=request.query,
            available_tables=request.available_tables,
        )

        return ClassifyQueryResponse(
            classification=result.classification.value,
            primary_table=result.primary_table,
            api_endpoints=result.api_endpoints,
            reason=result.reason,
        )
    except Exception as e:
        print(f"Error in ClassifyQuery: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback on an AI response.

    Stores feedback in PostgreSQL for review and analysis.
    """
    try:
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            # Insert feedback into database
            row = await conn.fetchrow(
                """
                INSERT INTO ai_chat_feedback
                    (user_question, ai_response, dcid, rating, feedback_text, user_email)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                request.user_question,
                request.ai_response,
                request.dcid,
                request.rating,
                request.feedback_text,
                request.user_email,
            )

            feedback_id = row["id"]
            print(f"[Feedback] Saved feedback #{feedback_id}: {request.rating} from {request.user_email}")

            return FeedbackResponse(
                success=True,
                id=feedback_id,
                message="Feedback submitted successfully",
            )

    except asyncpg.exceptions.CheckViolationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid rating. Must be 'good' or 'bad'.",
        )
    except Exception as e:
        print(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@app.post("/api/metrics", response_model=MetricsResponse)
async def log_metrics(request: MetricsRequest):
    """
    Log AI chat metrics immediately after AI response.

    Stores the question, response, and token metrics in PostgreSQL.
    User feedback (rating) is updated separately via PATCH endpoint.
    """
    import json

    try:
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            # Insert metrics into database
            row = await conn.fetchrow(
                """
                INSERT INTO ai_chat_metrics
                    (message_id, user_question, ai_response, dcid, user_email,
                     input_tokens, output_tokens, cache_read_input_tokens,
                     cache_creation_input_tokens, cost_usd)
                VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
                """,
                request.message_id,
                request.user_question,
                json.dumps(request.ai_response),
                request.dcid,
                request.user_email,
                request.input_tokens,
                request.output_tokens,
                request.cache_read_input_tokens,
                request.cache_creation_input_tokens,
                request.cost_usd,
            )

            metrics_id = row["id"]
            print(f"[Metrics] Logged metrics #{metrics_id} for message {request.message_id}: "
                  f"in={request.input_tokens}, out={request.output_tokens}, cost=${request.cost_usd:.6f}")

            return MetricsResponse(
                success=True,
                id=metrics_id,
                message_id=request.message_id,
                message="Metrics logged successfully",
            )

    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(
            status_code=409,
            detail=f"Metrics for message_id '{request.message_id}' already exist.",
        )
    except Exception as e:
        print(f"Error logging metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to log metrics: {str(e)}")


@app.patch("/api/metrics/{message_id}/feedback", response_model=FeedbackUpdateResponse)
async def update_feedback(message_id: str, request: FeedbackUpdateRequest):
    """
    Update user feedback for an existing metrics record.

    Called when user clicks thumbs up/down on an AI response.
    """
    try:
        pool = await get_db_pool()

        async with pool.acquire() as conn:
            # Update feedback on existing record
            result = await conn.execute(
                """
                UPDATE ai_chat_metrics
                SET rating = $1,
                    feedback_text = $2,
                    feedback_at = NOW()
                WHERE message_id = $3
                """,
                request.rating,
                request.feedback_text,
                message_id,
            )

            # Check if record was found
            if result == "UPDATE 0":
                raise HTTPException(
                    status_code=404,
                    detail=f"No metrics record found for message_id '{message_id}'",
                )

            print(f"[Feedback] Updated feedback for message {message_id}: {request.rating}")

            return FeedbackUpdateResponse(
                success=True,
                message_id=message_id,
                message="Feedback updated successfully",
            )

    except HTTPException:
        raise
    except asyncpg.exceptions.CheckViolationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid rating. Must be 'good' or 'bad'.",
        )
    except Exception as e:
        print(f"Error updating feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update feedback: {str(e)}")


# --- Main ---

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = 8001

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
    )
