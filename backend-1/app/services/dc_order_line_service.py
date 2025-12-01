import time
from typing import Optional

from loguru import logger

from app.models.dc_order_line import DCOpenOrderLine, DCOpenOrderLineListResponse
from app.services.database import get_oracle_connection


class DCOrderLineService:
    """Service for DC order line database operations."""

    def __init__(self, request_id: str):
        """
        Initialize the service with request correlation ID.

        Args:
            request_id: Request correlation ID for logging
        """
        self.request_id = request_id

    def get_open_order_lines(
        self,
        order_number: Optional[int] = None,
        ordered_item: Optional[str] = None,
        dc: int = None,
        days_back: int = 60,
    ) -> DCOpenOrderLineListResponse:
        """
        Retrieve open DC order lines with optional filtering.

        Args:
            order_number: Optional order number filter
            ordered_item: Optional item filter (partial match)
            dc: Optional DC/ship_from filter
            days_back: Number of days to look back (default 60)

        Returns:
            DCOpenOrderLineListResponse containing list of open order lines
        """
        logger.info(
            f"[{self.request_id}] Fetching open DC order lines: "
            f"order_number={order_number}, ordered_item={ordered_item}, "
            f"dc={dc}, days_back={days_back}"
        )

        # Build the SQL query with CTE
        sql = self._build_open_order_lines_query(order_number, ordered_item, dc)

        # Build parameters
        params = {"days_back": days_back}
        if order_number:
            params["order_number"] = order_number
        if ordered_item:
            params["ordered_item"] = f"%{ordered_item.upper()}%"
        if dc:
            params["dc"] = dc

        with get_oracle_connection(self.request_id) as conn:
            with conn.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing open order lines query")
                start = time.perf_counter()

                cursor.execute(sql, params)
                rows = cursor.fetchall()

                elapsed = time.perf_counter() - start
                logger.info(
                    f"[{self.request_id}] Query returned {len(rows)} rows in {elapsed:.3f}s"
                )

                # Get column names from cursor description
                columns = [desc[0].lower() for desc in cursor.description]

                # Map rows to model instances
                order_lines = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    order_line = self._map_row_to_model(row_dict)
                    order_lines.append(order_line)

        return DCOpenOrderLineListResponse(
            data=order_lines,
            total=len(order_lines),
            days_back=days_back,
        )

    def _build_open_order_lines_query(
        self,
        order_number: Optional[int],
        ordered_item: Optional[str],
        dc: Optional[str],
    ) -> str:
        """
        Build the SQL query for open DC order lines.

        Args:
            order_number: Optional order number filter
            ordered_item: Optional item filter
            dc: Optional DC filter

        Returns:
            Complete SQL query string
        """
        # Base CTE query
        sql = """
WITH iteminfo
  As (Select flex_value_set_name, flex_value, ffvt.description
     From apps.fnd_flex_values_vl ffvt, apps.fnd_flex_value_sets ffvs
    Where  ffvs.flex_value_set_name In ('GROUP_VS', 'VENDOR_VS')
    And ffvs.flex_value_set_id = ffvt.flex_value_set_id
    And ffvt.enabled_flag = 'Y'
    And TRUNC(SYSDATE) Between TRUNC(NVL(ffvt.start_date_active, SYSDATE))
            And TRUNC(NVL(ffvt.end_date_active, SYSDATE + 1)))
   ,
 opendcopenlines AS (
    SELECT ORDERED_DATE,
           LINE_CATEGORY_CODE,
           ORDERED_ITEM,
           CASE
               WHEN LINE_TYPE = 'ATD Internal Sales Line' THEN 'INTERNAL ORDER'
               ELSE 'CUSTOMER ORDER'
           END AS order_category,
           a.inventory_item_id,
           a.ORIG_SYS_DOCUMENT_REF,
           order_number,
           line_id,
           a.SHIPPING_INSTRUCTIONS,
           line_number || '.' || shipment_number AS line,
           A.schedule_ship_date,
           ordered_quantity,
           case when wdd1.released_Status = 'Y' then SUM(NVL(wdd1.requested_quantity, 0))  else SUM(NVL(RESERVATION_QUANTITY, 0)) end AS reservedqty,
           carrier_name SHIPPING_METHOD_CODE,
           a.attribute8 AS iso,
           ATTRIBUTE17 AS fullfilmenttype,
           REPLACE(LINE_TYPE, 'Line', '') AS ordertype,
           PRICE_LIST,
           SOLD_TO,
           ship_From AS DC,
           SHIP_TO,
           SHIP_TO_ADDRESS1,
           SHIP_TO_ADDRESS5,
           SET_NAME,
           A.header_id,
           '' AS shiptoaddressee,
           wdd.delivery_id,
           CASE
               WHEN ORIGINAL_LINE_STATUS IS NULL THEN
                   CASE
                       WHEN wdd1.released_Status = 'R' THEN 'Ready to Release'
                       WHEN wdd1.released_Status = 'B' THEN 'Backordered'
                       ELSE NULL
                   END
               ELSE ORIGINAL_LINE_STATUS
           END AS ORIGINAL_LINE_STATUS
           ,null trip_id
    FROM oe_order_lines_v a,
         mtl_reservations mr,
         apps.wsh_Delivery_Details_oe_V wdd,
         apps.wsh_Delivery_Details wdd1,
         OE_SETS
         ,wsh_Carriers_v wcv
    WHERE a.ship_from_org_id = :dc
      AND a.open_flag = 'Y'
      AND wdd.source_line_id(+) = a.line_id
      AND wdd1.source_line_id = a.line_id
      AND wdd1.delivery_Detail_id = wdd.delivery_Detail_id(+)
      AND wdd1.source_code = 'OE'
      AND A.SHIP_sET_ID = SET_ID(+)
                              and wcv.freight_code = a.freight_carrier_code
      AND a.line_id = mr.demand_source_line_id(+)
      AND a.line_type NOT IN (
          'ATD Bill Only Line',
          'ATD Vendor Direct Ship Line',
          'ATD STHVendor Direct Ship Line'
      )
      AND a.ordered_date > SYSDATE - :days_back
"""

        # Add optional filters to CTE
        if order_number:
            sql += "      AND order_number = :order_number\n"
        if ordered_item:
            sql += "      AND UPPER(ORDERED_ITEM) LIKE :ordered_item\n"

        # Group by clause
        sql += """    GROUP BY ORDERED_DATE,
             LINE_CATEGORY_CODE,
             ORDERED_ITEM,
             a.ORIG_SYS_DOCUMENT_REF,
             order_number,
             a.inventory_item_id,
             line_id,
             line_number || '.' || shipment_number,
             A.schedule_ship_date,
             ordered_quantity,
             carrier_name,
             ATTRIBUTE17,
             LINE_TYPE,
             PRICE_LIST,
             SOLD_TO,
             ship_From,
             SHIP_TO,
             SHIP_TO_ADDRESS1,
             SHIP_TO_ADDRESS5,
             SET_NAME,
             a.SHIPPING_INSTRUCTIONS,
             delivery_id,
             ORIGINAL_LINE_STATUS,
             a.attribute8,
             A.header_id,
             wdd1.released_Status 
             union all
             Select ORDERED_DATE
    , LINE_CATEGORY_CODE
    , ORDERED_ITEM
    , Case
       When LINE_TYPE = 'ATD Internal Sales Line' Then 'INTERNAL ORDER'
       Else 'CUSTOMER ORDER'
      End
       As order_category
    , a.inventory_item_id
    , a.ORIG_SYS_DOCUMENT_REF
    , order_number
    , line_id
    , a.SHIPPING_INSTRUCTIONS
    , line_number || '.' || shipment_number As line
    , A.schedule_ship_date
    , ordered_quantity
    , a.shipped_quantity reservedqty
    , carrier_name        SHIPPING_METHOD_CODE
    , a.attribute8        As iso
    , ATTRIBUTE17        As fullfilmenttype
    , REPLACE(LINE_TYPE, 'Line', '')   As ordertype
    , PRICE_LIST
    , SOLD_TO
    , ship_From         As DC
    , SHIP_TO
    , SHIP_TO_ADDRESS1
    , SHIP_TO_ADDRESS5
    , SET_NAME
    , A.header_id
    , ''          As shiptoaddressee
    , wdd.delivery_id
    , Case
       When ORIGINAL_LINE_STATUS Is Null
       Then
        Case
         When wdd1.released_Status = 'R' Then 'Ready to Release'
         When wdd1.released_Status = 'B' Then 'Backordered'
         Else Null
        End
       Else
        ORIGINAL_LINE_STATUS
      End
       As ORIGINAL_LINE_STATUS
    ,trip_id
    From oe_order_lines_v      a
    , apps.wsh_Delivery_Details_oe_V wdd
    , apps.wsh_Delivery_Details    wdd1
    , OE_SETS
    , wsh_Carriers_v      wcv
    , wsh_new_deliveries     wnd
    ,wsh_trip_deliveries_v wtd
   Where   a.ship_from_org_id = :dc
      And wdd.source_line_id = a.line_id
      And wdd1.source_line_id = a.line_id
      AND wdd1.delivery_Detail_id = wdd.delivery_Detail_id
      And wdd1.source_code = 'OE'
      And A.SHIP_sET_ID = SET_ID(+)
      And wnd.delivery_id = wdd.delivery_id
      And wcv.freight_code = a.freight_carrier_code
      And wnd.confirm_Date Between TRUNC(SYSDATE) And TRUNC(SYSDATE+1)
      and wnd.organization_id = :dc
      and wnd.delivery_id = wtd.delivery_id
      And a.line_type Not In
        ('ATD Bill Only Line'
       , 'ATD Vendor Direct Ship Line'
       , 'ATD STHVendor Direct Ship Line')
      And a.ordered_date > SYSDATE - :days_back
   Group By ORDERED_DATE
    , LINE_CATEGORY_CODE
    , ORDERED_ITEM
    , a.ORIG_SYS_DOCUMENT_REF
    , order_number
    , a.inventory_item_id
    , line_id
    , line_number || '.' || shipment_number
    , A.schedule_ship_date
    , ordered_quantity
    , carrier_name
    , ATTRIBUTE17
    , LINE_TYPE
    , PRICE_LIST
    ,a.shipped_quantity
    , SOLD_TO
    , ship_From
    , SHIP_TO
    , SHIP_TO_ADDRESS1
    , SHIP_TO_ADDRESS5
    , SET_NAME
    , a.SHIPPING_INSTRUCTIONS
    , wdd.delivery_id
    , ORIGINAL_LINE_STATUS
    , a.attribute8
    , A.header_id
    , wdd1.released_Status
    ,trip_id
)
SELECT c.*,
       CASE
           WHEN (SELECT COUNT(1)
                 FROM OE_HOLDS_HISTORY_V
                 WHERE header_id = c.header_id) > 0
           THEN 'Y'
           ELSE 'N'
       END AS holdapplied,
       CASE
           WHEN (SELECT COUNT(1)
                 FROM OE_HOLDS_HISTORY_V
                 WHERE header_id = c.header_id
                   AND RELEASED_FLAG = 'Y') > 0
           THEN 'Y'
           ELSE 'N'
       END AS holdreleased,
       CASE
           WHEN (SELECT COUNT(1)
                 FROM XXATDMSA_DCARTORDER_OBPAYLOAD
                 WHERE order_number = c.order_number
                   AND line_id LIKE '%' || c.line_id || '%') > 0
           THEN 'Y'
           ELSE 'N'
       END AS routed,	  product_group
	   || '-'
	   || (
			  Select description
				From iteminfo
			   Where	 flex_value_set_name = 'GROUP_VS'
					 And flex_value = product_group
		  )
		   productgrp
		   ,	  vendor
	   || '-'
	   || (
			  Select description
				From iteminfo
			   Where	 flex_value_set_name = 'VENDOR_VS'
					 And flex_value = vendor
		  )
		   vendor
	 , (
		   Select mc.description
			 From apps.mtl_item_categories	mic
				, apps.mtl_categories		mc
				, apps.mtl_category_sets_vl mcst
			Where	  mcst.category_set_name = 'VGS_TRIPLE_SEGMENT'
				  And mic.inventory_item_id = xie.inventory_item_id
				  And mic.organization_id = 83
				  And mc.category_id = mic.category_id
				  And mic.category_set_id = mcst.category_set_id
	   )
		   style
	 , DESCRIPTION item_description
     , Case
     When  ORIGINAL_LINE_STATUS In ('Backordered', 'Ready to Release')
    And reservedqty = 0
    And (
      Select COUNT(1)
        From xxatdont_network_inventory
       Where    inventory_item_id = c.inventory_item_id
          And organization_id = :dc
          And localplus_qty > 0
     ) > 0
     Then
      'Y'
     When  ORIGINAL_LINE_STATUS In ('Backordered', 'Ready to Release')
    And reservedqty = 0
    And (
      Select COUNT(1)
        From xxatdont_network_inventory
       Where    inventory_item_id = c.inventory_item_id
          And organization_id = :dc
          And localplus_qty > 0
     ) = 0
     Then
      'N'
     Else
      Null
    End
     As localplusqtyexists,
     (Select localplus_qty
        From xxatdont_network_inventory
       Where    inventory_item_id = c.inventory_item_id
          And organization_id = :dc
     ) As localplusqty
FROM opendcopenlines c, xxatdmrp_item_elements_v xie
Where c.inventory_item_id = xie.inventory_item_id
 
"""
        #logger.debug(sql)
        return sql

    def _map_row_to_model(self, row_dict: dict) -> DCOpenOrderLine:
        """
        Map a database row dictionary to DCOpenOrderLine model.

        Args:
            row_dict: Dictionary with column names as keys

        Returns:
            DCOpenOrderLine instance
        """
        return DCOpenOrderLine(
            ordered_date=row_dict.get("ordered_date"),
            line_category_code=row_dict.get("line_category_code"),
            ordered_item=row_dict.get("ordered_item"),
            order_category=row_dict.get("order_category"),
            inventory_item_id=row_dict.get("inventory_item_id"),
            orig_sys_document_ref=row_dict.get("orig_sys_document_ref"),
            order_number=row_dict.get("order_number"),
            line_id=row_dict.get("line_id"),
            shipping_instructions=row_dict.get("shipping_instructions"),
            line=row_dict.get("line"),
            schedule_ship_date=row_dict.get("schedule_ship_date"),
            ordered_quantity=row_dict.get("ordered_quantity"),
            reserved_qty=row_dict.get("reservedqty"),
            shipping_method_code=row_dict.get("shipping_method_code"),
            iso=row_dict.get("iso"),
            fulfillment_type=row_dict.get("fullfilmenttype"),
            order_type=row_dict.get("ordertype"),
            price_list=row_dict.get("price_list"),
            sold_to=row_dict.get("sold_to"),
            dc=row_dict.get("dc"),
            ship_to=row_dict.get("ship_to"),
            ship_to_address1=row_dict.get("ship_to_address1"),
            ship_to_address5=row_dict.get("ship_to_address5"),
            set_name=row_dict.get("set_name"),
            header_id=row_dict.get("header_id"),
            ship_to_addressee=row_dict.get("shiptoaddressee"),
            delivery_id=row_dict.get("delivery_id"),
            original_line_status=row_dict.get("original_line_status"),
            hold_applied=row_dict.get("holdapplied"),
            hold_released=row_dict.get("holdreleased"),
            routed=row_dict.get("routed"),
            productgrp=row_dict.get("productgrp"),
            vendor=row_dict.get("vendor"),
            style=row_dict.get("style"),
            item_description=row_dict.get("item_description"),
            trip_id=row_dict.get("trip_id"),
            localplusqtyexists=row_dict.get("localplusqtyexists"),
            localplusqty=row_dict.get("localplusqty")
        )
