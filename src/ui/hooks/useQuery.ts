import { useState, useEffect, useCallback } from 'react';
import type { DatabaseClient, QueryResult } from '../../core/database';
import { normalizeQueryResult } from '../../core/database';

export interface UseQueryOptions<T = Record<string, unknown>> {
    /** The database client to use */
    client: DatabaseClient;
    /** The SQL query to execute */
    query: string;
    /** Whether to execute immediately on mount */
    enabled?: boolean;
    /** Dependencies that trigger re-fetch when changed */
    deps?: unknown[];
    /** Transform the result before returning */
    transform?: (data: T[]) => T[];
    /** Callback when query succeeds */
    onSuccess?: (data: T[]) => void;
    /** Callback when query fails */
    onError?: (error: string) => void;
}

export interface UseQueryResult<T = Record<string, unknown>> {
    data: T[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useQuery<T = Record<string, unknown>>({
    client,
    query,
    enabled = true,
    deps = [],
    transform,
    onSuccess,
    onError
}: UseQueryOptions<T>): UseQueryResult<T> {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!query || !client) return;

        setLoading(true);
        setError(null);

        try {
            const response = await client.executeSQL(query);

            if (response.error) {
                setError(response.error);
                onError?.(response.error);
                return;
            }

            let result = normalizeQueryResult<T>(response as QueryResult<T>);

            if (transform) {
                result = transform(result);
            }

            setData(result);
            onSuccess?.(result);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Query failed';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [client, query, transform, onSuccess, onError]);

    useEffect(() => {
        if (enabled) {
            fetchData();
        }
    }, [enabled, fetchData, ...deps]);

    return { data, loading, error, refetch: fetchData };
}

// Hook for lazy queries (manual execution)
export function useLazyQuery<T = Record<string, unknown>>(
    client: DatabaseClient
): [(query: string) => Promise<QueryResult<T>>, UseQueryResult<T>] {
    const [state, setState] = useState<{
        data: T[] | null;
        loading: boolean;
        error: string | null;
    }>({
        data: null,
        loading: false,
        error: null
    });

    const execute = useCallback(async (query: string): Promise<QueryResult<T>> => {
        setState(s => ({ ...s, loading: true, error: null }));

        try {
            const response = await client.executeSQL(query);

            if (response.error) {
                setState(s => ({ ...s, loading: false, error: response.error || 'Unknown error' }));
                return response as QueryResult<T>;
            }

            const result = normalizeQueryResult<T>(response as QueryResult<T>);
            setState({ data: result, loading: false, error: null });
            return { result } as QueryResult<T>;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Query failed';
            setState(s => ({ ...s, loading: false, error: errorMsg }));
            return { error: errorMsg };
        }
    }, [client]);

    const refetch = useCallback(async () => {
        // No-op for lazy query, needs explicit execution
    }, []);

    return [execute, { ...state, refetch }];
}
