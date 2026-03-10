/**
 * useAsync Hook
 * 
 * React hook for handling async operations with loading and error states.
 */

import { useState, useCallback, useRef } from "react";

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
}

interface UseAsyncReturn<T, Args extends any[]> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  execute: (...args: Args) => Promise<T | undefined>;
  reset: () => void;
}

export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const { onSuccess, onError, initialData } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to prevent state updates after unmount
  const isMounted = useRef(true);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        
        if (isMounted.current) {
          setData(result);
          onSuccess?.(result);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (isMounted.current) {
          setError(error);
          onError?.(error);
        }
        
        return undefined;
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  };
}

export default useAsync;
