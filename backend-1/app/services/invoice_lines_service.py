import time

from loguru import logger

from app.models.invoice_lines import InvoiceLine, InvoiceLineListResponse
from app.services.database import get_oracle_connection


class InvoiceLinesService:
    """Service for invoice lines database operations."""

    def __init__(self, request_id: str):
        """
        Initialize the service with request correlation ID.

        Args:
            request_id: Request correlation ID for logging
        """
        self.request_id = request_id

    def get_invoice_lines(self, dcid: int) -> InvoiceLineListResponse:
        """
        Retrieve invoice lines with tax information for a distribution center.

        Args:
            dcid: Distribution center ID (warehouse_id)

        Returns:
            InvoiceLineListResponse containing list of invoice lines
        """
        logger.info(f"[{self.request_id}] Fetching invoice lines for dcid={dcid}")

        sql = self._build_invoice_lines_query()
        params = {"dcid": dcid}

        with get_oracle_connection(self.request_id) as conn:
            with conn.cursor() as cursor:
                logger.debug(f"[{self.request_id}] Executing invoice lines query")
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
                invoice_lines = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    invoice_line = self._map_row_to_model(row_dict)
                    invoice_lines.append(invoice_line)

        return InvoiceLineListResponse(
            data=invoice_lines,
            total=len(invoice_lines),
            dcid=dcid,
        )

    def _build_invoice_lines_query(self) -> str:
        """
        Build the SQL query for invoice lines with tax information.

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
invlinedata AS (
    SELECT BS_BATCH_SOURCE_NAME batchsource,
           a.trx_number,
           CTT_TYPE_NAME invtranstype,
           SHIP_VIA shipmethod,
           trx_date,
           a.CUSTOMER_TRX_ID,
           a.INTERFACE_HEADER_ATTRIBUTE2 ordertype,
           a.RAC_BILL_TO_CUSTOMER_NAME billcustname,
           b.SHIP_TO_CUSTOMER_NAME shipcustname,
           b.SHIP_TO_LOCATION shiploc,
           b.LINE_NUMBER,
           b.LINE_TYPE,
           b.QUANTITY_INVOICED,
           b.EXTENDED_AMOUNT,
           b.UNIT_SELLING_PRICE,
           b.SALES_ORDER,
           b.SALES_ORDER_LINE,
           b.customer_trx_line_id,
           xie.item_number,
           product_group || '-' || (
               SELECT description
               FROM iteminfo
               WHERE flex_value_set_name = 'GROUP_VS'
                 AND flex_value = product_group
           ) productgrp,
           vendor || '-' || (
               SELECT description
               FROM iteminfo
               WHERE flex_value_set_name = 'VENDOR_VS'
                 AND flex_value = vendor
           ) vendor,
           (
               SELECT mc.description
               FROM apps.mtl_item_categories mic,
                    apps.mtl_categories mc,
                    apps.mtl_category_sets_vl mcst
               WHERE mcst.category_set_name = 'VGS_TRIPLE_SEGMENT'
                 AND mic.inventory_item_id = xie.inventory_item_id
                 AND mic.organization_id = 83
                 AND mc.category_id = mic.category_id
                 AND mic.category_set_id = mcst.category_set_id
           ) style,
           NULL tax_name,
           NULL tax_rate
    FROM RA_CUSTOMER_TRX_RA_V a,
         RA_CUSTOMER_TRX_LINES_V b,
         xxatdmrp_item_elements_v xie
    WHERE a.trx_date >= TRUNC(SYSDATE)
      AND a.CUSTOMER_TRX_ID = b.CUSTOMER_TRX_ID
      AND b.WAREHOUSE_ID = :dcid
      AND b.LINE_TYPE = 'LINE'
      AND b.inventory_item_id = xie.inventory_item_id
),
invlinetaxdata AS (
    SELECT a.BS_BATCH_SOURCE_NAME,
           a.trx_number,
           a.CTT_TYPE_NAME,
           a.SHIP_VIA,
           a.trx_date,
           a.CUSTOMER_TRX_ID,
           a.INTERFACE_HEADER_ATTRIBUTE2 ordertype,
           a.RAC_BILL_TO_CUSTOMER_NAME billcustname,
           c.shipcustname,
           c.shiploc,
           b.LINE_NUMBER,
           b.LINE_TYPE,
           b.QUANTITY_INVOICED,
           b.EXTENDED_AMOUNT,
           b.UNIT_SELLING_PRICE,
           b.SALES_ORDER,
           b.SALES_ORDER_LINE,
           LINK_TO_CUST_TRX_LINE_ID customer_trx_line_id,
           NULL item_number,
           NULL productgrp,
           NULL vendor,
           NULL style,
           zlv.TAX_FULL_NAME tax_name,
           zlv.TAX_RATE
    FROM RA_CUSTOMER_TRX_RA_V a,
         RA_CUSTOMER_TRX_LINES_V b,
         invlinedata c,
         ZX_LINES_V zlv
    WHERE a.CUSTOMER_TRX_ID = b.CUSTOMER_TRX_ID
      AND a.CUSTOMER_TRX_ID = c.CUSTOMER_TRX_ID
      AND a.trx_date >= TRUNC(SYSDATE)
      AND c.customer_trx_line_id = b.LINK_TO_CUST_TRX_LINE_ID
      AND b.LINE_TYPE <> 'LINE'
      AND b.tax_line_id = zlv.TAX_LINE_ID(+)
)
SELECT *
FROM (
    SELECT * FROM invlinedata
    UNION
    SELECT * FROM invlinetaxdata
)
ORDER BY trx_number, customer_trx_line_id, line_type
"""
        return sql

    def _map_row_to_model(self, row_dict: dict) -> InvoiceLine:
        """
        Map a database row dictionary to InvoiceLine model.

        Args:
            row_dict: Dictionary with column names as keys

        Returns:
            InvoiceLine instance
        """
        return InvoiceLine(
            batchsource=row_dict.get("batchsource"),
            trx_number=row_dict.get("trx_number"),
            invtranstype=row_dict.get("invtranstype"),
            shipmethod=row_dict.get("shipmethod"),
            trx_date=row_dict.get("trx_date"),
            customer_trx_id=row_dict.get("customer_trx_id"),
            ordertype=row_dict.get("ordertype"),
            billcustname=row_dict.get("billcustname"),
            shipcustname=row_dict.get("shipcustname"),
            shiploc=row_dict.get("shiploc"),
            line_number=row_dict.get("line_number"),
            line_type=row_dict.get("line_type"),
            quantity_invoiced=row_dict.get("quantity_invoiced"),
            extended_amount=row_dict.get("extended_amount"),
            unit_selling_price=row_dict.get("unit_selling_price"),
            sales_order=row_dict.get("sales_order"),
            sales_order_line=row_dict.get("sales_order_line"),
            customer_trx_line_id=row_dict.get("customer_trx_line_id"),
            item_number=row_dict.get("item_number"),
            productgrp=row_dict.get("productgrp"),
            vendor=row_dict.get("vendor"),
            style=row_dict.get("style"),
            tax_name=row_dict.get("tax_name"),
            tax_rate=row_dict.get("tax_rate"),
        )
