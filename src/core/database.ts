// Database abstraction for configurable backends

export interface QueryResult<T = Record<string, unknown>> {
    result?: T[];
    data?: T[];
    error?: string;
    rowsAffected?: number;
}

export interface TableInfo {
    name: string;
    type: string;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable?: boolean;
    primaryKey?: boolean;
    defaultValue?: unknown;
}

export interface DatabaseClient {
    /**
     * Execute a SQL query and return results
     */
    executeSQL(query: string, params?: unknown[]): Promise<QueryResult>;

    /**
     * Get list of tables in the database
     */
    getTables(): Promise<string[]>;

    /**
     * Get schema information for a specific table
     */
    getTableSchema(tableName: string): Promise<ColumnInfo[]>;

    /**
     * Execute multiple queries in a transaction
     */
    transaction?(queries: string[]): Promise<QueryResult[]>;
}

export interface DatabaseConfig {
    type: 'sqlite' | 'postgres' | 'mysql' | 'custom';
    connectionString?: string;
    database?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
}

// Helper to normalize query results from different backends
export function normalizeQueryResult<T = Record<string, unknown>>(
    response: QueryResult<T> | T[] | { rows?: T[]; data?: T[]; result?: T[] }
): T[] {
    if (Array.isArray(response)) {
        return response;
    }
    if ('rows' in response && Array.isArray(response.rows)) {
        return response.rows;
    }
    if ('data' in response && Array.isArray(response.data)) {
        return response.data;
    }
    if ('result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    return [];
}

// Create a database client from window.api (common pattern)
export function createWindowApiDatabaseClient(api: {
    executeSQL?: (params: { query: string }) => Promise<QueryResult>;
    getTables?: () => Promise<string[]>;
    getTableSchema?: (table: string) => Promise<ColumnInfo[]>;
}): DatabaseClient {
    return {
        async executeSQL(query: string, _params?: unknown[]): Promise<QueryResult> {
            if (!api.executeSQL) {
                return { error: 'executeSQL not available' };
            }
            return api.executeSQL({ query });
        },
        async getTables(): Promise<string[]> {
            if (api.getTables) {
                return api.getTables();
            }
            // Fallback: try to query sqlite_master
            const result = await this.executeSQL(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            return normalizeQueryResult(result).map((r: { name?: string }) => r.name || '');
        },
        async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
            if (api.getTableSchema) {
                return api.getTableSchema(tableName);
            }
            // Fallback: PRAGMA for SQLite
            const result = await this.executeSQL(`PRAGMA table_info(${tableName})`);
            return normalizeQueryResult(result).map((r: { name?: string; type?: string; notnull?: number; pk?: number; dflt_value?: unknown }) => ({
                name: r.name || '',
                type: r.type || 'unknown',
                nullable: !r.notnull,
                primaryKey: !!r.pk,
                defaultValue: r.dflt_value
            }));
        }
    };
}
