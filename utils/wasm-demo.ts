/**
 * WASM Demo - Using Rust in Browser Extension
 * 
 * This demonstrates how to use the @dracon/wxt-shared/wasm module
 * which provides shared Rust code between Momo backend and extensions.
 */

import init, { 
  extract_json, 
  extract_json_from_markdown,
  validate_email,
  RateLimiter 
} from '../wasm/dracon_wasm';

let wasmReady = false;

export async function initWasm(): Promise<void> {
  if (!wasmReady) {
    await init();
    wasmReady = true;
    console.log('[WASM] Dracon WASM initialized');
  }
}

export function isWasmReady(): boolean {
  return wasmReady;
}

export function demoExtractJson(text: string): any {
  if (!wasmReady) throw new Error('WASM not initialized');
  return extract_json(text);
}

export function demoExtractFromMarkdown(markdown: string): any {
  if (!wasmReady) throw new Error('WASM not initialized');
  return extract_json_from_markdown(markdown);
}

export function demoValidateEmail(email: string): boolean {
  if (!wasmReady) throw new Error('WASM not initialized');
  return validate_email(email);
}

export function createWasmRateLimiter(minIntervalMs: number, maxPerHour: number): RateLimiter {
  if (!wasmReady) throw new Error('WASM not initialized');
  return new RateLimiter(minIntervalMs, maxPerHour);
}

// Example usage in background.ts:
// 
// import { initWasm, createWasmRateLimiter } from './wasm-demo';
// 
// export default defineBackground(async () => {
//   await initWasm();
//   
//   const limiter = createWasmRateLimiter(10000, 30);
//   
//   browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.type === 'apiRequest') {
//       try {
//         limiter.check();
//         // Make API request...
//       } catch (e) {
//         sendResponse({ error: (e as Error).message });
//       }
//     }
//   });
// });
