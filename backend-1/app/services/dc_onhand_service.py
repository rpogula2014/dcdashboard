import time

from loguru import logger

from app.models.dc_onhand import DCOnhandItem, DCOnhandListResponse
from app.services.database import get_oracle_connection


class DCOnhandService:
    """Service for DC onhand inventory database operations."""

    def __init__(self, request_id: str):
        """
        Initialize the service with request correlation ID.

        Args:
            request_id: Request correlation ID for logging
        """
        self.request_id = request_id

    def get_dc_onhand(self, dcid: int) -> DCOnhandListResponse:
        """
        Retrieve DC onhand inventory for a specific DC.

        This query retrieves onhand quantities with item details, locators,
        product group and vendor descriptions, and style information.

        Args:
            dcid: The DC/organization ID to filter by

        Returns:
            DCOnhandListResponse containing list of onhand inventory records
        """
        logger.info(f"[{self.request_id}] Fetching DC onhand inventory: dcid={dcid}")

        sql = self._build_dc_onhand_query()
        params = {"dcid": dcid}

        with get_oracle_connection(self.request_id) as conn:
            with conn.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing DC onhand query")
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
                onhand_items = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    onhand_item = self._map_row_to_model(row_dict)
                    onhand_items.append(onhand_item)

        logger.info(
            f"[{self.request_id}] Returning {len(onhand_items)} DC onhand records"
        )

        return DCOnhandListResponse(
            data=onhand_items,
            total=len(onhand_items),
            dcid=dcid,
        )

    def _build_dc_onhand_query(self) -> str:
        """
        Build the SQL query for DC onhand inventory.

        The query uses CTEs to:
        1. Get item info from flex values (GROUP_VS and VENDOR_VS)
        2. Get onhand quantities with item details and locator info
        3. Join to get product group/vendor descriptions and style

        Returns:
            Complete SQL query string
        """
        sql = """
WITH iteminfo AS (
    SELECT flex_value_set_name, flex_value, ffvt.description
    FROM apps.fnd_flex_values_vl ffvt, apps.fnd_flex_value_sets ffvs
    WHERE ffvs.flex_value_set_name IN ('GROUP_VS', 'VENDOR_VS')
      AND ffvs.flex_value_set_id = ffvt.flex_value_set_id
      AND ffvt.enabled_flag = 'Y'
      AND TRUNC(SYSDATE) BETWEEN TRUNC(NVL(ffvt.start_date_active, SYSDATE))
          AND TRUNC(NVL(ffvt.end_date_active, SYSDATE + 1))
),
onhand AS (
    SELECT xie.inventory_item_id,
           msi.segment1 itemnumber,
           msi.description item_description,
           moq.subinventory_code,
           SUM(primary_transaction_quantity) quantity,
           concatenated_segments locator,
           mil.segment1 aisle,
           mil.attribute7,
           vendor,
           product_group
    FROM mtl_onhand_quantities_detail moq,
         mtl_item_locations_kfv mil,
         mtl_system_items_b msi,
         xxatdmrp_item_elements_v xie
    WHERE moq.inventory_item_id = xie.inventory_item_id
      AND msi.organization_id = :dcid
      AND moq.organization_id = mil.organization_id
      AND mil.inventory_location_id = moq.locator_id
      AND mil.organization_id = msi.organization_id
      AND NVL(mil.enabled_flag, 'N') = 'Y'
      AND msi.inventory_item_id = moq.inventory_item_id
      AND msi.organization_id = moq.organization_id
    GROUP BY msi.segment1,
             msi.description,
             moq.subinventory_code,
             concatenated_segments,
             mil.segment1,
             xie.inventory_item_id,
             mil.attribute7,
             vendor,
             product_group
)
SELECT onhand.inventory_item_id,
       onhand.itemnumber,
       onhand.item_description,
       onhand.subinventory_code,
       onhand.quantity,
       onhand.locator,
       onhand.aisle,
       onhand.attribute7,
       onhand.vendor,
       onhand.product_group,
       onhand.product_group || '-' || (
           SELECT description
           FROM iteminfo
           WHERE flex_value_set_name = 'GROUP_VS'
             AND flex_value = onhand.product_group
       ) productgrp_display,
       onhand.vendor || '-' || (
           SELECT description
           FROM iteminfo
           WHERE flex_value_set_name = 'VENDOR_VS'
             AND flex_value = onhand.vendor
       ) vendor_display,
       (
           SELECT mc.description
           FROM apps.mtl_item_categories mic,
                apps.mtl_categories mc,
                apps.mtl_category_sets_vl mcst
           WHERE mcst.category_set_name = 'VGS_TRIPLE_SEGMENT'
             AND mic.inventory_item_id = onhand.inventory_item_id
             AND mic.organization_id = 83
             AND mc.category_id = mic.category_id
             AND mic.category_set_id = mcst.category_set_id
       ) style
FROM onhand
"""
        logger.debug(f"[{self.request_id}] DC onhand query: {sql}")
        return sql

    def _map_row_to_model(self, row_dict: dict) -> DCOnhandItem:
        """
        Map a database row dictionary to DCOnhandItem model.

        Args:
            row_dict: Dictionary with column names as keys

        Returns:
            DCOnhandItem instance
        """
        return DCOnhandItem(
            inventory_item_id=row_dict.get("inventory_item_id"),
            itemnumber=row_dict.get("itemnumber"),
            item_description=row_dict.get("item_description"),
            subinventory_code=row_dict.get("subinventory_code"),
            quantity=row_dict.get("quantity"),
            locator=row_dict.get("locator"),
            aisle=row_dict.get("aisle"),
            attribute7=row_dict.get("attribute7"),
            vendor=row_dict.get("vendor"),
            product_group=row_dict.get("product_group"),
            productgrp_display=row_dict.get("productgrp_display"),
            vendor_display=row_dict.get("vendor_display"),
            style=row_dict.get("style"),
        )
