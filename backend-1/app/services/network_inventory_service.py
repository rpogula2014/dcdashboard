import time

from loguru import logger

from app.models.network_inventory import NetworkInventoryItem, NetworkInventoryListResponse
from app.services.database import get_oracle_connection


class NetworkInventoryService:
    """Service for network inventory database operations."""

    def __init__(self, request_id: str):
        """
        Initialize the service with request correlation ID.

        Args:
            request_id: Request correlation ID for logging
        """
        self.request_id = request_id

    def get_network_inventory(
        self,
        dcid: int,
        itemid: int,
    ) -> NetworkInventoryListResponse:
        """
        Retrieve network inventory for a specific DC and item.

        This query retrieves inventory quantities from two sources:
        1. Local DC inventory from xxatdont_network_inventory joined with mtl_parameters
        2. LocalPlus DC inventory from xxatdont_network_inventory joined with xxatdont_localplus_dc

        Args:
            dcid: The DC/organization ID to filter by
            itemid: The inventory item ID to filter by

        Returns:
            NetworkInventoryListResponse containing list of network inventory records
        """
        logger.info(
            f"[{self.request_id}] Fetching network inventory: dcid={dcid}, itemid={itemid}"
        )

        sql = self._build_network_inventory_query()
        params = {
            "dcid": dcid,
            "itemid": itemid,
        }

        with get_oracle_connection(self.request_id) as conn:
            with conn.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing network inventory query")
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
                inventory_items = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    inventory_item = self._map_row_to_model(row_dict)
                    inventory_items.append(inventory_item)

        logger.info(
            f"[{self.request_id}] Returning {len(inventory_items)} network inventory records"
        )

        return NetworkInventoryListResponse(
            data=inventory_items,
            total=len(inventory_items),
            dcid=dcid,
            itemid=itemid,
        )

    def _build_network_inventory_query(self) -> str:
        """
        Build the SQL query for network inventory.

        The query uses a UNION to combine:
        1. Local DC inventory (from xxatdont_network_inventory + mtl_parameters)
        2. LocalPlus DC inventory (from xxatdont_network_inventory + xxatdont_localplus_dc)

        Returns:
            Complete SQL query string
        """
        sql = """
SELECT 'Local' AS dc,
       location_code organization_code,
       local_qty
  FROM xxatdont_network_inventory a,
       hr_locations_all mp
 WHERE a.organization_id = :dcid
   AND a.organization_id = mp.inventory_organization_id
   AND inventory_item_id = :itemid
UNION
SELECT 'Local+' AS dc,
       location_code AS organization_code,
       local_qty
  FROM xxatdont_network_inventory a,
       xxatdont_localplus_dc b,hr_locations_all hla
 WHERE LOCAL_DC_ID = :dcid
   AND LOCALPLUS_DC_ID = organization_id
   and organization_id = hla.inventory_organization_id
   AND LOCAL_QTY > 0
   AND inventory_item_id = :itemid
"""
        logger.debug(f"[{self.request_id}] Network inventory query: {sql}")
        return sql

    def _map_row_to_model(self, row_dict: dict) -> NetworkInventoryItem:
        """
        Map a database row dictionary to NetworkInventoryItem model.

        Args:
            row_dict: Dictionary with column names as keys

        Returns:
            NetworkInventoryItem instance
        """
        return NetworkInventoryItem(
            dc=row_dict.get("dc"),
            organization_code=row_dict.get("organization_code"),
            local_qty=row_dict.get("local_qty"),
        )
