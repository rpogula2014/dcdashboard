/**
 * DuckDB Service Module
 * Exports all DuckDB-related functionality for "Talk to Data" feature
 */

// Core DuckDB service
export {
  initializeDuckDB,
  getConnection,
  executeQuery,
  executeQueryRaw,
  insertData,
  tableExists,
  getTableSchema,
  listTables,
  closeDuckDB,
  getDuckDB,
  isInitialized,
  downloadTableAsCSV,
  downloadTableAsJSON,
} from './duckdbService';

// Data loaders
export {
  TABLE_NAMES,
  loadDCOrderLines,
  loadRoutePlans,
  loadAllData,
  getDataLoadState,
  isDataReady,
  getDataSummary,
  refreshData,
  createIndexes,
  getTableSchemas,
  generateSchemaDescription,
} from './dataLoaders';
