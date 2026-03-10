/**
 * useStorage Hook
 * 
 * React hook for syncing with extension storage.
 * Automatically updates when storage changes.
 */

import { useState, useEffect, useCallback } from "react";
import type { WxtStorageItem } from "wxt/storage";

export function useStorage<T>(storageItem: WxtStorageItem<T, any>) {
  const [value, setValue] = useState<T>(storageItem.fallback ?? null as T);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial value
    storageItem.getValue().then((val) => {
      setValue(val);
      setIsLoading(false);
    });

    // Watch for changes
    const unsubscribe = storageItem.watch((newValue) => {
      setValue(newValue);
    });

    return () => unsubscribe();
  }, [storageItem]);

  const updateValue = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      const valueToStore =
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(value)
          : newValue;
      
      await storageItem.setValue(valueToStore);
      setValue(valueToStore);
    },
    [storageItem, value]
  );

  const removeValue = useCallback(async () => {
    await storageItem.remove();
    setValue(storageItem.fallback ?? null as T);
  }, [storageItem]);

  return {
    value,
    setValue: updateValue,
    removeValue,
    isLoading,
  };
}

export default useStorage;
