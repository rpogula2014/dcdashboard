# DC Dashboard API

FastAPI-based backend service for viewing and managing DC (Distribution Center) order operations. Provides real-time access to open order lines from Oracle EBS.

## Features

- Retrieve active DC/warehouse locations
- Retrieve open DC order lines with comprehensive filtering options
- View reservation quantities and delivery status
- Track order hold status (applied/released)
- View detailed order hold history (applied, released, comments)
- Check routing status for orders
- Health check endpoints for service and database monitoring

## Prerequisites

- Python 3.11+
- Oracle Database access (Oracle EBS)
- Oracle Instant Client (if connecting to remote Oracle)
- uv package manager

## Project Structure

```
backend-1/
├── app/
│   ├── config/         # Configuration and settings
│   │   └── settings.py
│   ├── models/         # Pydantic request/response models
│   │   ├── common.py
│   │   ├── dc_location.py
│   │   ├── dc_order_line.py
│   │   └── order_hold_history.py
│   ├── routers/        # API route handlers
│   │   ├── health.py
│   │   ├── dc_locations.py
│   │   ├── dc_order_lines.py
│   │   └── order_hold_history.py
│   ├── services/       # Business logic and database operations
│   │   ├── database.py
│   │   ├── dc_location_service.py
│   │   ├── dc_order_line_service.py
│   │   └── order_hold_history_service.py
│   ├── exceptions/     # Error handlers
│   │   └── handlers.py
│   └── main.py         # Application entry point
├── tests/
│   └── conftest.py
├── pyproject.toml
├── gunicorn_config.py
├── Dockerfile
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
uv sync
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your Oracle database credentials:

```env
ORACLE_USER=your_username
ORACLE_PASSWORD=your_password
ORACLE_HOST=your_oracle_host
ORACLE_PORT=1521
ORACLE_SERVICE=your_service_name
DEBUG=false
```

### 3. Run the Application

```bash
# Development (with auto-reload)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uv run gunicorn app.main:app --config=gunicorn_config.py
```

## API Documentation

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/dbhealth` | Database connectivity and session validation |

### DC Locations Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dc-locations` | Get all active DC/warehouse locations |

### DC Order Lines Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dc-order-lines/open` | Get open DC order lines with filtering |

### Order Holds Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/order-holds/history` | Get order hold history for header and/or line |

## Endpoint Details

### GET `/health`

**Description**: Returns service health status and version information.

**Response**:
```json
{
  "status": "healthy",
  "service": "DC Dashboard API",
  "version": "1.0.0",
  "timestamp": "2024-11-29T10:30:00Z"
}
```

### GET `/dbhealth`

**Description**: Verifies Oracle database connectivity and session configuration.

**Response**:
```json
{
  "status": "healthy",
  "database_version": "Oracle Database 19c Enterprise Edition...",
  "connection_info": "oracle-host:1521",
  "session_context": "APPS",
  "timestamp": "2024-11-29T10:30:00Z"
}
```

### GET `/api/v1/dc-locations`

**Description**: Returns all active WMS-enabled DC/warehouse locations.

**Response**:
```json
{
  "data": [
    {
      "organization_code": "ATD",
      "location_code": "084 DENVER",
      "organization_id": 84
    }
  ],
  "total": 50
}
```

**Excluded Locations**:
- Locations containing: INACTIVE, WHEELS, EMPLOYEE, VIRTUAL, TIREBUYER
- Specific adjustment centers and special locations

---

### GET `/api/v1/dc-order-lines/open`

**Description**: Retrieves all open DC order lines from Oracle EBS.

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `dc` | int | **Yes** | - | DC/ship_from organization ID (e.g., 84) |
| `order_number` | int | No | - | Filter by specific order number |
| `ordered_item` | string | No | - | Filter by item (partial match, case-insensitive) |
| `days_back` | int | No | 60 | Number of days to look back (1-365) |

**Example Requests**:

```bash
# Get open order lines for DC 84 (last 60 days)
curl "http://localhost:8000/api/v1/dc-order-lines/open?dc=84"

# Filter by order number
curl "http://localhost:8000/api/v1/dc-order-lines/open?dc=84&order_number=100001"

# Filter by item
curl "http://localhost:8000/api/v1/dc-order-lines/open?dc=84&ordered_item=ABC123"

# Custom date range
curl "http://localhost:8000/api/v1/dc-order-lines/open?dc=84&days_back=30"

# Combined filters
curl "http://localhost:8000/api/v1/dc-order-lines/open?dc=84&ordered_item=TIRE&days_back=90"
```

**Response**:
```json
{
  "data": [
    {
      "ordered_date": "2024-11-15T10:30:00",
      "line_category_code": "ORDER",
      "ordered_item": "ABC123",
      "order_category": "CUSTOMER ORDER",
      "inventory_item_id": 12345,
      "orig_sys_document_ref": "REF001",
      "order_number": 100001,
      "line_id": 200001,
      "shipping_instructions": "Handle with care",
      "line": "1.1",
      "schedule_ship_date": "2024-11-20T00:00:00",
      "ordered_quantity": 10.0,
      "reserved_qty": 10.0,
      "shipping_method_code": "GROUND",
      "iso": null,
      "fulfillment_type": "STANDARD",
      "order_type": "ATD Standard ",
      "price_list": "STANDARD",
      "sold_to": "CUSTOMER001",
      "dc": "DC01",
      "ship_to": "LOCATION001",
      "ship_to_address1": "123 Main St",
      "ship_to_address5": "12345",
      "set_name": null,
      "header_id": 300001,
      "ship_to_addressee": "",
      "delivery_id": 400001,
      "original_line_status": "Ready to Release",
      "requested_quantity": 10.0,
      "hold_applied": "N",
      "hold_released": "N",
      "routed": "Y"
    }
  ],
  "total": 1,
  "days_back": 60
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 400 | Invalid query parameters |
| 500 | Database operation failed |

---

### GET `/api/v1/order-holds/history`

**Description**: Retrieves order hold history from Oracle EBS for a specific order header and optionally a line.

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `header_id` | int | **Yes** | - | Order header ID |
| `line_id` | int | No | - | Order line ID (includes line-level holds when provided) |

**Query Behavior**:
- When only `header_id` is provided: Returns header-level holds only (where `line_id IS NULL`)
- When both `header_id` and `line_id` are provided: Returns UNION of header-level holds AND line-level holds for the specified line
- Results are ordered by `APPLIED_DATE`

**Example Requests**:

```bash
# Get header-level holds only
curl "http://localhost:8000/api/v1/order-holds/history?header_id=342090586"

# Get both header-level and line-level holds
curl "http://localhost:8000/api/v1/order-holds/history?header_id=342090586&line_id=123456"
```

**Response**:
```json
{
  "data": [
    {
      "held_by": "SYSTEM",
      "hold_name": "Credit Check Hold",
      "hold_level": "ORDER",
      "applied_date": "2024-11-15T10:30:00",
      "applied_by": "ADMIN_USER",
      "released_flag": "Y",
      "released_date": "2024-11-16T14:00:00",
      "released_by": "CREDIT_MGR",
      "release_reason_code": "APPROVED",
      "release_comment": "Credit approved after review"
    }
  ],
  "total": 1,
  "header_id": 342090586,
  "line_id": null
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 400 | Invalid query parameters (e.g., missing header_id) |
| 500 | Database operation failed |

## Data Models

### DCLocation

| Field | Type | Description |
|-------|------|-------------|
| `organization_code` | string | Organization code |
| `location_code` | string | Location code/name (e.g., "084 DENVER") |
| `organization_id` | int | Organization ID |

### DCOpenOrderLine

| Field | Type | Description |
|-------|------|-------------|
| `ordered_date` | datetime | Date the order was placed |
| `line_category_code` | string | Line category code |
| `ordered_item` | string | Ordered item number/SKU |
| `order_category` | string | INTERNAL ORDER or CUSTOMER ORDER |
| `inventory_item_id` | int | Inventory item ID |
| `orig_sys_document_ref` | string | Original system document reference |
| `order_number` | int | Order number |
| `line_id` | int | Order line ID |
| `shipping_instructions` | string | Shipping instructions |
| `line` | string | Line number.shipment number |
| `schedule_ship_date` | datetime | Scheduled ship date |
| `ordered_quantity` | float | Ordered quantity |
| `reserved_qty` | float | Reserved quantity |
| `shipping_method_code` | string | Shipping method code |
| `iso` | string | ISO reference (attribute8) |
| `fulfillment_type` | string | Fulfillment type (attribute17) |
| `order_type` | string | Order type |
| `price_list` | string | Price list name |
| `sold_to` | string | Sold to customer |
| `dc` | string | DC/Ship from location |
| `ship_to` | string | Ship to customer |
| `ship_to_address1` | string | Ship to address line 1 |
| `ship_to_address5` | string | Ship to address line 5 |
| `set_name` | string | Ship set name |
| `header_id` | int | Order header ID |
| `ship_to_addressee` | string | Ship to addressee |
| `delivery_id` | int | Delivery ID |
| `original_line_status` | string | Ready to Release, Backordered, etc. |
| `requested_quantity` | float | WSH requested quantity |
| `hold_applied` | string | Y/N if hold was applied |
| `hold_released` | string | Y/N if hold was released |
| `routed` | string | Y/N if order is routed |

### OrderHoldHistory

| Field | Type | Description |
|-------|------|-------------|
| `held_by` | string | User or process that placed the hold |
| `hold_name` | string | Name/type of the hold |
| `hold_level` | string | Hold entity code value (ORDER/LINE) |
| `applied_date` | datetime | Date when the hold was applied |
| `applied_by` | string | User who applied the hold |
| `released_flag` | string | Y/N flag indicating if hold has been released |
| `released_date` | datetime | Date when the hold was released |
| `released_by` | string | User who released the hold |
| `release_reason_code` | string | Reason code for releasing the hold |
| `release_comment` | string | Comment provided when releasing the hold |

## Oracle Database Details

### Tables/Views Used

**DC Locations:**

| Table/View | Schema | Description |
|------------|--------|-------------|
| `mtl_parameters` | APPS | Inventory organization parameters |
| `hr_locations_all` | APPS | HR locations |

**DC Order Lines:**

| Table/View | Schema | Description |
|------------|--------|-------------|
| `oe_order_lines_v` | APPS | Order lines view |
| `mtl_reservations` | APPS | Material reservations |
| `wsh_Delivery_Details_oe_V` | APPS | Delivery details OE view |
| `wsh_Delivery_Details` | APPS | Delivery details |
| `OE_SETS` | APPS | Order sets |
| `OE_HOLDS_HISTORY_V` | APPS | Order holds history |
| `XXATDMSA_DCARTORDER_OBPAYLOAD` | APPS | DC ART order outbound payload |

**Order Hold History:**

| Table/View | Schema | Description |
|------------|--------|-------------|
| `OE_HOLDS_HISTORY_V` | APPS | Order holds history view |

### Session Configuration

This API automatically configures the Oracle session with:
- Schema: `APPS`
- Multi-org context via `XXATD_ORG_ACCESS_UTILS_PKG.SET_multi_ORG_CONTEXT`

### Query Filters

**DC Order Lines:**

The following line types are **excluded** from results:
- ATD Bill Only Line
- ATD Vendor Direct Ship Line
- ATD STHVendor Direct Ship Line

Only orders with `open_flag = 'Y'` are returned. The `dc` parameter filters by `ship_from_org_id`.

## Docker

### Build

```bash
docker build -t dc-dashboard-api:latest .
```

### Run

```bash
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name dc-dashboard-api \
  dc-dashboard-api:latest
```

### Environment Variables for Docker

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |
| `WORKERS` | 3 | Number of Gunicorn workers |
| `WORKER_TIMEOUT` | 300 | Worker timeout in seconds |
| `LOG_LEVEL` | info | Logging level |

## Interactive Documentation

When the server is running:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Development

### Run Tests

```bash
uv run pytest
```

### Code Quality

```bash
# Lint
uv run ruff check .

# Format
uv run ruff format .
```

## Request Tracing

All requests include a correlation ID (`X-Request-ID` header) for tracing through logs. This ID appears in all log entries for the request.

Example log output:
```
2024-11-29 10:30:00 | INFO | [abc12345] GET /api/v1/dc-order-lines/open
2024-11-29 10:30:00 | INFO | [abc12345] Connecting to Oracle: oracle-host:1521/service
2024-11-29 10:30:01 | INFO | [abc12345] Query returned 150 rows in 0.523s
2024-11-29 10:30:01 | INFO | [abc12345] Response: 200
```

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "Error description",
  "detail": "Additional details (optional)",
  "request_id": "abc12345"
}
```

Common error codes:
- `400`: Invalid input parameters
- `404`: Resource not found
- `500`: Database or server error
