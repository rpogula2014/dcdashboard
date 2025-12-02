"""Service for Descartes info operations."""

import time

from loguru import logger

from app.models.descartes_info import (
    DescartesInfo,
    DescartesInfoListResponse,
    RoutePlan,
    RoutePlanListResponse,
)
from app.services.database import get_oracle_connection


class DescartesInfoService:
    """Service class for Descartes info queries."""

    def __init__(self, request_id: str = "unknown"):
        """Initialize the service with a request ID for logging."""
        self.request_id = request_id

    def get_descartes_info(
        self,
        order_number: int,
        line_id: int,
    ) -> DescartesInfoListResponse:
        """
        Get Descartes payload information for an order and line.

        Args:
            order_number: Order number to query
            line_id: Line ID to query

        Returns:
            DescartesInfoListResponse with list of Descartes info records
        """
        logger.info(
            f"[{self.request_id}] Fetching Descartes info for "
            f"order_number={order_number}, line_id={line_id}"
        )
        start_time = time.time()

        sql = """
                With descartdata
                As (Select payload_id
                    , msg_id
                    , Case
                    When json_value(NVL(xdo.payload_text, xdo.payload_clob)
                        , '$.DocFWImport.Request.DocMasterBOL.DocBOL."@MessagePurpose"') =
                        '1007'
                    Then
                    'Insert/Update'
                    Else
                    'Delete'
                    End
                    As message_purpose
                    , earliestdate
                    , latestdate
                    , profitvalue
                    , sendtime
                    , qty
                    , order_number
                    From xxatdmsa_dcartorder_obpayload xdo
                    , Json_Table(
                    NVL(xdo.payload_text, xdo.payload_clob)
                    , '$.DocFWImport.Request.DocMasterBOL.DocBOL.BOLLine[*]'
                    Columns (line_id1 Varchar2(100) Path '$."@ProductKey"'
                        , qty Number Path '$.UDF."@Measure1"')) jt
                    Where  1 = 1
                    And order_number = :order_number
                    And REGEXP_SUBSTR(line_id1, '^[^-]+') = TO_CHAR(:line_id)
                    And line_id Like '%' || TO_CHAR(:line_id) || '%')
                , exceptions
                As (Select xdo.payload_id
                    , xdo.msg_id
                    , Case
                    When json_value(NVL(xdo.payload_text, xdo.payload_clob)
                        , '$.DocFWImport.Request.DocMasterBOL.DocBOL."@MessagePurpose"') =
                        '1007'
                    Then
                    'Insert/Update'
                    Else
                    'Delete'
                    End
                    As message_purpose
                    , xdo.earliestdate
                    , xdo.latestdate
                    , xdo.profitvalue
                    , NVL(xdo.sendtime, creation_Date)
                    , Null
                    , xdo.order_number
                    From xxatdmsa_dcartorder_obpayload xdo, descartdata dd
                    Where  dd.msg_id = xdo.msg_id
                    And line_id Is Null
                    And xdo.order_number = :order_number)
                Select *
                From (Select * From descartdata
                    Union All
                    Select * From exceptions)
                Order By 1
        """

        records: list[DescartesInfo] = []

        with get_oracle_connection(self.request_id) as connection:
            with connection.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing Descartes info query")
                cursor.execute(
                    sql,
                    {
                        "order_number": order_number,
                        "line_id": line_id,
                    },
                )

                columns = [col[0].lower() for col in cursor.description]

                for row in cursor:
                    row_dict = dict(zip(columns, row))
                    records.append(DescartesInfo(**row_dict))

        elapsed_time = time.time() - start_time
        logger.info(
            f"[{self.request_id}] Fetched {len(records)} Descartes info records "
            f"in {elapsed_time:.3f}s"
        )

        return DescartesInfoListResponse(
            data=records,
            total=len(records),
            order_number=order_number,
            line_id=line_id,
        )

    def get_route_plans(self, dcid: int) -> RoutePlanListResponse:
        """
        Get route plan data for a specific DC/organization.

        Retrieves route plan information from Descartes route planning tables,
        including route details, stops, and order line information for routes
        created today.

        Args:
            dcid: DC/Organization ID (SHIP_FROM_ORG_ID)

        Returns:
            RoutePlanListResponse with list of route plan records
        """
        logger.info(
            f"[{self.request_id}] Fetching route plans for dcid={dcid}"
        )
        start_time = time.time()

        sql = """
            SELECT hdr.route_id,
                   route_name,
                   schedule_key,
                   driver_key,
                   truck_key,
                   hdr.process_code,
                   trip_id,
                   route_start_date,
                   location_key,
                   location_type,
                   location_name,
                   stop_number,
                   ool.order_number,
                   TO_CHAR(line_number) || '.' || TO_CHAR(shipment_number) AS linenum,
                   case when order_key like '%R' then 'Return' else 'Order' end as order_type,
                   to_char(delivery_id) delivery_id,
                   ordered_item,
                   quantity,
                   order_key,
                   product_key,
                   back_order_flag
              FROM Xxatdwms_routeplan_route_ib hdr,
                   XXATDWMS_ROUTEPLAN_ORDER_IB xro,
                   oe_order_lines_v ool,
                   XXATDWMS_ROUTEPLAN_STOP_IB xrs
             WHERE hdr.SHIP_FROM_ORG_ID = :dcid
               AND hdr.creation_date > TRUNC(SYSDATE)
               AND hdr.route_id = xro.route_id
               AND ool.line_id = order_line_id
               AND xrs.route_id = xro.route_id
               AND xrs.RP_STOP_ID = xro.RP_STOP_ID
             ORDER BY route_start_date, stop_number
        """

        records: list[RoutePlan] = []

        with get_oracle_connection(self.request_id) as connection:
            with connection.cursor() as cursor:
                logger.debug(
                    f"[{self.request_id}] Executing route plans query for dcid={dcid}"
                )
                cursor.execute(sql, {"dcid": dcid})

                columns = [col[0].lower() for col in cursor.description]
                #logger.debug(f"[{self.request_id}] Columns from Oracle: {columns}")

                for row in cursor:
                    #logger.debug(f"[{self.request_id}] Row data: {row}")
                    row_dict = dict(zip(columns, row))
                    records.append(RoutePlan(**row_dict))

        elapsed_time = time.time() - start_time
        logger.info(
            f"[{self.request_id}] Fetched {len(records)} route plan records "
            f"in {elapsed_time:.3f}s"
        )

        return RoutePlanListResponse(
            data=records,
            total=len(records),
            dcid=dcid,
        )
