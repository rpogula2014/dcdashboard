"""Service for trip exception operations."""

import time

from loguru import logger

from app.models.trip_exception import OpenTripException, OpenTripExceptionListResponse
from app.services.database import get_oracle_connection


class TripExceptionService:
    """Service class for trip exception queries."""

    def __init__(self, request_id: str = "unknown"):
        """Initialize the service with a request ID for logging."""
        self.request_id = request_id

    def get_open_trip_exceptions(
        self,
        org_id: int,
    ) -> OpenTripExceptionListResponse:
        """
        Get open trip exceptions for an organization.

        Retrieves trips that have not been successfully processed (status not 'S')
        from the past 2 days, including associated open order lines and route information.

        Args:
            org_id: Organization ID to query

        Returns:
            OpenTripExceptionListResponse with list of open trip exception records
        """
        logger.info(
            f"[{self.request_id}] Fetching open trip exceptions for org_id={org_id}"
        )
        start_time = time.time()

        sql = """
            WITH opentrips AS (
                SELECT route_id,
                       trip_id,
                       PROCESS_MESSAGE,
                       process_status
                FROM xxatdwsh_mds_trip_Data_tab
                WHERE organization_id = :org_id
                  AND TRUNC(creation_date) = TRUNC(SYSDATE)
                  AND PROCESS_STATUS NOT IN ('S')
            ),
            openlinetrips AS (
                SELECT COUNT(1) openlines,
                       xts.trip_id,
                       LISTAGG(DISTINCT order_number || '-' || line_number || '.' || shipment_number, ', ')
                           WITHIN GROUP (ORDER BY order_number, line_number, shipment_number) issueorder
                FROM oe_order_lines_v oel,
                     xxatdwms.xxatdwms_trip_seq_hist xts,
                     opentrips
                WHERE oel.header_id = xts.header_id
                  AND oel.line_id = xts.line_id
                  AND oel.flow_status_code <> 'CLOSED'
                  AND NOT EXISTS (
                      SELECT 'X'
                      FROM oe_transaction_types ott
                      WHERE ott.transaction_type_id = oel.line_type_id
                        AND NVL(attribute1, 'x1x') IN ('G', 'W', 'B', 'N')
                  )
                  AND opentrips.trip_id = xts.trip_id
                GROUP BY xts.trip_id
            )
            SELECT NVL(openlines, 0) AS noofopenlines,
                   b.route_id,
                   b.trip_id,
                   issueorder,
                   b.process_status AS mdsprocessstatus,
                   b.PROCESS_MESSAGE AS mdsprocessmsg,
                   xsi.ROUTE_DESCRIPTION,
                   DRIVER1,
                   xsi.PROCESS_STATUS AS tractionstatus,
                   xsi.PROCESS_MESSAGE AS tractionmsg
            FROM openlinetrips a,
                 opentrips b,
                 xxatdwsh_staged_route xsi
            WHERE a.trip_id(+) = b.trip_id
              AND xsi.trip_id(+) = b.trip_id
              AND xsi.PROCESS_STATUS(+) LIKE '%E'
        """

        records: list[OpenTripException] = []

        with get_oracle_connection(self.request_id) as connection:
            with connection.cursor() as cursor:
                logger.debug(
                    f"[{self.request_id}] Executing open trip exceptions query "
                    f"with org_id={org_id}"
                )
                cursor.execute(sql, {"org_id": org_id})

                columns = [col[0].lower() for col in cursor.description]
                logger.debug(f"[{self.request_id}] Query columns: {columns}")

                for row in cursor:
                    row_dict = dict(zip(columns, row))
                    records.append(OpenTripException(**row_dict))

        elapsed_time = time.time() - start_time
        logger.info(
            f"[{self.request_id}] Fetched {len(records)} open trip exception records "
            f"for org_id={org_id} in {elapsed_time:.3f}s"
        )

        return OpenTripExceptionListResponse(
            data=records,
            total=len(records),
            org_id=org_id,
        )
