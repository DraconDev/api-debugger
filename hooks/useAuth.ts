/**
 * useAuth Hook
 * 
 * React hook for managing authentication state.
 * Reuses the starter-layer hook from wxt-shared.
 */

import { hooks } from "@/utils/api";
import type { UseAuthReturn } from "@dracon/wxt-shared";

/**
 * Hook to manage auth state
 * 
 * Thin wrapper around the starter-layer hook to keep local imports stable.
 */
export function useAuth(): UseAuthReturn {
  return hooks.useAuth();
}

export default useAuth;
