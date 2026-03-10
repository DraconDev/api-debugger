/**
 * Development & Debugging Utilities
 * 
 * Tools to help with extension development.
 * Only active in development mode.
 */

const isDev = import.meta.env.DEV;

/**
 * Log with prefix and styling
 */
export function log(message: string, ...args: any[]): void {
  if (!isDev) return;
  console.log(`%c[Extension]%c ${message}`, "color: #4F46E5; font-weight: bold", "color: inherit", ...args);
}

/**
 * Log warning
 */
export function warn(message: string, ...args: any[]): void {
  if (!isDev) return;
  console.warn(`%c[Extension]%c ${message}`, "color: #F59E0B; font-weight: bold", "color: inherit", ...args);
}

/**
 * Log error
 */
export function error(message: string, ...args: any[]): void {
  // Always log errors, even in production
  console.error(`%c[Extension]%c ${message}`, "color: #EF4444; font-weight: bold", "color: inherit", ...args);
}

/**
 * Measure function execution time
 */
export function measure<T>(name: string, fn: () => T): T {
  if (!isDev) return fn();
  
  console.time(`[Measure] ${name}`);
  const result = fn();
  console.timeEnd(`[Measure] ${name}`);
  return result;
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isDev) return fn();
  
  console.time(`[Measure] ${name}`);
  const result = await fn();
  console.timeEnd(`[Measure] ${name}`);
  return result;
}

/**
 * Debug panel data (for popup debug view)
 */
export interface DebugInfo {
  version: string;
  environment: string;
  storage: {
    local: number;
    sync: number;
  };
  features: Record<string, boolean>;
  recentLogs: string[];
}

/**
 * Get debug information
 */
export async function getDebugInfo(): Promise<DebugInfo> {
  const manifest = browser.runtime.getManifest();
  
  // Get storage usage
  const localBytes = await browser.storage.local.getBytesInUse?.() ?? 0;
  const syncBytes = await browser.storage.sync.getBytesInUse?.() ?? 0;

  return {
    version: manifest.version,
    environment: import.meta.env.MODE,
    storage: {
      local: localBytes,
      sync: syncBytes,
    },
    features: {}, // Would be populated from feature flags
    recentLogs: [], // Would be populated from log buffer
  };
}

/**
 * Simulate a slow network request
 */
export function simulateDelay(ms: number): Promise<void> {
  if (!isDev) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock API response for testing
 */
export function mockResponse<T>(data: T, delay = 500): Promise<T> {
  if (!isDev) throw new Error("Mock responses only available in development");
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

export default {
  log,
  warn,
  error,
  measure,
  measureAsync,
  getDebugInfo,
  simulateDelay,
  mockResponse,
};
