/**
 * DuckDB-WASM Service
 * Provides in-browser SQL database for "Talk to Data" feature
 */

import * as duckdb from '@duckdb/duckdb-wasm';

// Singleton instance
let db: duckdb.AsyncDuckDB | null = null;
let connection: duckdb.AsyncDuckDBConnection | null = null;
let initializationPromise: Promise<duckdb.AsyncDuckDB> | null = null;

/**
 * Initialize DuckDB-WASM with web workers
 * Uses singleton pattern to ensure only one instance exists
 */
export async function initializeDuckDB(): Promise<duckdb.AsyncDuckDB> {
  // Return existing instance if available
  if (db) {
    return db;
  }

  // Return pending initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Select the best bundle for the current browser
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      // Create worker URL
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: 'text/javascript',
        })
      );

      // Instantiate the async worker
      const worker = new Worker(workerUrl);
      const logger = new duckdb.ConsoleLogger();
      db = new duckdb.AsyncDuckDB(logger, worker);

      // Instantiate the database
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      console.log('[DuckDB] Initialized successfully');
      return db;
    } catch (error) {
      console.error('[DuckDB] Initialization failed:', error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Get the user's timezone name (e.g., 'America/New_York')
 */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Get or create a database connection
 */
export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (connection) {
    return connection;
  }

  const database = await initializeDuckDB();
  connection = await database.connect();

  // Set timezone to user's local timezone so CURRENT_DATE matches local time
  const timezone = getUserTimezone();
  try {
    await connection.query(`SET TimeZone = '${timezone}'`);
    console.log(`[DuckDB] Connection established, timezone set to ${timezone}`);
  } catch (error) {
    console.warn(`[DuckDB] Could not set timezone to ${timezone}, using UTC:`, error);
    console.log('[DuckDB] Connection established');
  }

  return connection;
}

/**
 * Execute a SQL query and return results as an array of objects
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const conn = await getConnection();

  try {
    const result = await conn.query(sql);
    // Convert Arrow table to array of objects
    const rows = result.toArray().map((row) => {
      const obj: Record<string, unknown> = {};
      for (const key of Object.keys(row)) {
        obj[key] = row[key];
      }
      return obj as T;
    });
    return rows;
  } catch (error) {
    console.error('[DuckDB] Query execution failed:', error);
    throw error;
  }
}

/**
 * Execute a SQL query and return the Arrow table directly
 * Useful for large result sets
 */
export async function executeQueryRaw(sql: string): Promise<ReturnType<Awaited<ReturnType<typeof getConnection>>['query']>> {
  const conn = await getConnection();
  return conn.query(sql);
}

/**
 * Insert data into a table from an array of objects
 * Creates the table if it doesn't exist
 */
export async function insertData<T extends Record<string, unknown>>(
  tableName: string,
  data: T[],
  dropExisting: boolean = true
): Promise<void> {
  if (data.length === 0) {
    console.warn(`[DuckDB] No data to insert into ${tableName}`);
    return;
  }

  const conn = await getConnection();
  const database = await initializeDuckDB();

  try {
    // Drop existing table if requested
    if (dropExisting) {
      await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
    }

    // Register data as a table using Arrow
    // First, we need to convert to JSON and use DuckDB's JSON parsing
    const jsonData = JSON.stringify(data);

    // Create a temporary JSON file in DuckDB's virtual file system
    await database.registerFileText(`${tableName}.json`, jsonData);

    // Create table from JSON
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} AS
      SELECT * FROM read_json_auto('${tableName}.json')
    `);

    const countResult = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = countResult.toArray()[0]?.count;
    console.log(`[DuckDB] Inserted ${count} rows into ${tableName}`);
  } catch (error) {
    console.error(`[DuckDB] Failed to insert data into ${tableName}:`, error);
    throw error;
  }
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await executeQuery<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
    );
    return result.length > 0;
  } catch {
    // Try DuckDB-specific way
    try {
      const result = await executeQuery<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${tableName}'`
      );
      return result.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Get the schema of a table
 */
export async function getTableSchema(
  tableName: string
): Promise<{ column_name: string; data_type: string }[]> {
  return executeQuery<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`
  );
}

/**
 * Get list of all tables in the database
 */
export async function listTables(): Promise<string[]> {
  const result = await executeQuery<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'`
  );
  return result.map((r) => r.table_name);
}

/**
 * Close the database connection and clean up
 */
export async function closeDuckDB(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
  if (db) {
    await db.terminate();
    db = null;
  }
  initializationPromise = null;
  console.log('[DuckDB] Connection closed');
}

/**
 * Get database instance (for advanced usage)
 */
export function getDuckDB(): duckdb.AsyncDuckDB | null {
  return db;
}

/**
 * Check if DuckDB is initialized
 */
export function isInitialized(): boolean {
  return db !== null;
}

/**
 * Download table data as CSV file
 */
export async function downloadTableAsCSV(tableName: string, filename?: string): Promise<void> {
  const rows = await executeQuery(`SELECT * FROM ${tableName}`);

  if (rows.length === 0) {
    console.warn(`[DuckDB] No data to download from ${tableName}`);
    return;
  }

  // Get column headers
  const headers = Object.keys(rows[0]);

  // Build CSV content
  const csvLines = [
    headers.join(','), // Header row
    ...rows.map(row =>
      headers.map(h => {
        const val = (row as Record<string, unknown>)[h];
        // Escape commas and quotes in values
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ];

  const csvContent = csvLines.join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`[DuckDB] Downloaded ${rows.length} rows from ${tableName}`);
}

/**
 * Download table data as JSON file
 */
export async function downloadTableAsJSON(tableName: string, filename?: string): Promise<void> {
  const rows = await executeQuery(`SELECT * FROM ${tableName}`);

  if (rows.length === 0) {
    console.warn(`[DuckDB] No data to download from ${tableName}`);
    return;
  }

  const jsonContent = JSON.stringify(rows, null, 2);

  // Create and trigger download
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${tableName}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`[DuckDB] Downloaded ${rows.length} rows from ${tableName}`);
}

// Expose download functions globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).downloadDuckDBTable = downloadTableAsCSV;
  (window as unknown as Record<string, unknown>).downloadDuckDBTableJSON = downloadTableAsJSON;
}
