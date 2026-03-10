/* tslint:disable */
/* eslint-disable */

export class RateLimiter {
    free(): void;
    [Symbol.dispose](): void;
    check(): void;
    get_status(): any;
    constructor(min_interval_ms: number, max_per_hour: number);
    reset(): void;
}

export function extract_json(text: string): any;

export function extract_json_from_markdown(markdown: string): any;

export function init(): void;

export function validate_email(email: string): boolean;

export function validate_form_data(fields_json: string, values_json: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_ratelimiter_free: (a: number, b: number) => void;
    readonly extract_json: (a: number, b: number) => [number, number, number];
    readonly extract_json_from_markdown: (a: number, b: number) => [number, number, number];
    readonly ratelimiter_check: (a: number) => [number, number];
    readonly ratelimiter_get_status: (a: number) => any;
    readonly ratelimiter_new: (a: number, b: number) => number;
    readonly ratelimiter_reset: (a: number) => void;
    readonly validate_email: (a: number, b: number) => number;
    readonly validate_form_data: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly init: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
