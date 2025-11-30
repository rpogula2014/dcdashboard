"""Service for DC location operations."""

import time

from loguru import logger

from app.models.dc_location import DCLocation, DCLocationListResponse
from app.services.database import get_oracle_connection


class DCLocationService:
    """Service class for DC location queries."""

    def __init__(self, request_id: str = "unknown"):
        """Initialize the service with a request ID for logging."""
        self.request_id = request_id

    def get_dc_locations(self) -> DCLocationListResponse:
        """
        Get all active WMS-enabled DC locations.

        Returns:
            DCLocationListResponse with list of DC locations
        """
        logger.info(f"[{self.request_id}] Fetching DC locations")
        start_time = time.time()

        sql = """
            SELECT mp.organization_code,
                   hl.location_code,
                   mp.organization_id
              FROM mtl_parameters mp,
                   hr_locations_all hl
             WHERE mp.organization_id = hl.inventory_organization_id
               AND wms_enabled_flag = 'Y'
               AND location_code NOT LIKE '%INACTIVE%'
               AND location_code NOT LIKE '%WHEELS%'
               AND location_code NOT LIKE '%EMPLOYEE%'
               AND location_code NOT LIKE '%VIRTUAL%'
               AND location_code NOT LIKE '%TIREBUYER%'
               AND location_code NOT IN (
                   '997 ADJUSTMENT CENTER POCONO',
                   '898 CUSTOMER DIRECT SHIPMENTS',
                   '733 ADJUSTMENT CENTER_MCDONOUGH',
                   '970 ADJUSTMENT CENTER_ALLIANCE',
                   '990 ADJUSTMENT CENTER_ORLANDO',
                   '978 ADJUSTMENT CTR_SHAFTER',
                   '975 ADJUSTMENT CENTER_East',
                   '977 STG COASTAL HOLDING',
                   'Y76 SHAFTER MW',
                   '972 ADJUSTMENT CTR (MID_WEST',
                   '998 HUNTERSVILLE FIELD SUPPORT'
               )
               AND style = 'US_GLB'
             ORDER BY mp.organization_code
        """

        locations: list[DCLocation] = []

        with get_oracle_connection(self.request_id) as connection:
            with connection.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing DC locations query")
                cursor.execute(sql)

                columns = [col[0].lower() for col in cursor.description]

                for row in cursor:
                    row_dict = dict(zip(columns, row))
                    locations.append(DCLocation(**row_dict))

        elapsed_time = time.time() - start_time
        logger.info(
            f"[{self.request_id}] Fetched {len(locations)} DC locations "
            f"in {elapsed_time:.3f}s"
        )

        return DCLocationListResponse(data=locations, total=len(locations))
