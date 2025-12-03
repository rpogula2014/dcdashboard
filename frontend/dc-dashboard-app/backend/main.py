"""
Talk to Data Backend API

FastAPI server that exposes BAML functions for NL-to-SQL conversion.
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

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


# --- FastAPI App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("Starting Talk to Data Backend...")
    if not BAML_AVAILABLE:
        print("WARNING: BAML client not available - API will return errors")
    yield
    print("Shutting down...")


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
        "http://localhost:5174"
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
