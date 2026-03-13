import type { RequestConfig, CapturedResponse, ScriptExecutionResult, ScriptContext } from "@/types";

export function executePreRequestScript(
  script: string,
  config: RequestConfig,
  variables: Record<string, string>,
  environment: Record<string, string>
): ScriptExecutionResult {
  const logs: string[] = [];
  const modifiedVars: Record<string, string> = { ...variables };
  let modifiedRequest: Partial<RequestConfig> | undefined;

  const context: ScriptContext = {
    request: {
      method: config.method,
      url: config.url,
      headers: Object.fromEntries(
        config.headers.filter((h) => h.enabled !== false).map((h) => [h.name, h.value])
      ),
      body: config.body.json || config.body.raw,
    },
    variables: modifiedVars,
    environment,
  };

  const pm = createPmApi(
    context,
    logs,
    (req) => { modifiedRequest = req; }
  );

  try {
    const fn = new Function("pm", "console", script);
    fn(pm, createConsole(logs));

    return {
      success: true,
      logs,
      variables: modifiedVars,
      modifiedRequest,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Script execution failed",
      logs,
      variables: modifiedVars,
    };
  }
}

export function executePostResponseScript(
  script: string,
  config: RequestConfig,
  response: CapturedResponse,
  variables: Record<string, string>,
  environment: Record<string, string>
): ScriptExecutionResult {
  const logs: string[] = [];
  const modifiedVars: Record<string, string> = { ...variables };

  const context: ScriptContext = {
    request: {
      method: config.method,
      url: config.url,
      headers: Object.fromEntries(
        config.headers.filter((h) => h.enabled !== false).map((h) => [h.name, h.value])
      ),
      body: config.body.json || config.body.raw,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: response.body,
      duration: response.duration,
    },
    variables: modifiedVars,
    environment,
  };

  const pm = createPmApi(context, logs);

  try {
    const fn = new Function("pm", "console", script);
    fn(pm, createConsole(logs));

    return {
      success: true,
      logs,
      variables: modifiedVars,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Script execution failed",
      logs,
      variables: modifiedVars,
    };
  }
}

function createPmApi(
  context: ScriptContext,
  logs: string[],
  onRequestModify?: (req: Partial<RequestConfig>) => void
) {
  return {
    variables: {
      get: (name: string) => context.variables[name],
      set: (name: string, value: string) => {
        context.variables[name] = value;
      },
      has: (name: string) => name in context.variables,
      unset: (name: string) => {
        delete context.variables[name];
      },
      clear: () => {
        context.variables = {};
      },
    },

    environment: {
      get: (name: string) => context.environment[name],
      set: (name: string, value: string) => {
        context.environment[name] = value;
      },
      has: (name: string) => name in context.environment,
      unset: (name: string) => {
        delete context.environment[name];
      },
    },

    request: {
      method: context.request.method,
      url: {
        get url() { return context.request.url; },
        set url(value: string) { 
          context.request.url = value;
          onRequestModify?.({ url: value });
        },
      },
      headers: {
        get: (name: string) => context.request.headers[name],
        add: (name: string, value: string) => {
          context.request.headers[name] = value;
          onRequestModify?.({ headers: { [name]: value } });
        },
        remove: (name: string) => {
          delete context.request.headers[name];
        },
        upsert: (name: string, value: string) => {
          context.request.headers[name] = value;
          onRequestModify?.({ headers: { [name]: value } });
        },
      },
      body: {
        get mode() { return "raw"; },
        get raw() { return context.request.body || ""; },
        set raw(value: string) { 
          context.request.body = value;
          onRequestModify?.({ body: { raw: value } });
        },
      },
    },

    response: context.response ? {
      code: context.response.status,
      status: context.response.statusText,
      headers: {
        get: (name: string) => context.response!.headers[name],
        has: (name: string) => name in context.response!.headers,
      },
      body: context.response.body,
      json: () => {
        try {
          return JSON.parse(context.response!.body);
        } catch {
          return null;
        }
      },
      text: () => context.response!.body,
      responseTime: context.response.duration,
    } : null,

    test: (name: string, fn: () => void) => {
      try {
        fn();
        logs.push(`✓ ${name}`);
      } catch (error) {
        logs.push(`✗ ${name}: ${error instanceof Error ? error.message : "Failed"}`);
      }
    },

    expect: (actual: unknown) => ({
      to: {
        equal: (expected: unknown) => {
          if (actual !== expected) {
            throw new Error(`Expected ${expected} but got ${actual}`);
          }
        },
        eql: (expected: unknown) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
          }
        },
        be: {
          true: () => {
            if (actual !== true) throw new Error(`Expected true but got ${actual}`);
          },
          false: () => {
            if (actual !== false) throw new Error(`Expected false but got ${actual}`);
          },
          null: () => {
            if (actual !== null) throw new Error(`Expected null but got ${actual}`);
          },
          undefined: () => {
            if (actual !== undefined) throw new Error(`Expected undefined but got ${actual}`);
          },
        },
        exist: () => {
          if (actual === undefined || actual === null) {
            throw new Error(`Expected value to exist`);
          }
        },
        beA: (type: string) => {
          if (typeof actual !== type) {
            throw new Error(`Expected ${type} but got ${typeof actual}`);
          }
        },
      },
    }),

    sendRequest: () => {
      logs.push("sendRequest() not supported in sandbox");
    },

    execution: {
      skipRequest: false,
    },
  };
}

function createConsole(logs: string[]) {
  return {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => 
        typeof a === "object" ? JSON.stringify(a) : String(a)
      ).join(" "));
    },
    info: (...args: unknown[]) => {
      logs.push("[INFO] " + args.map((a) => 
        typeof a === "object" ? JSON.stringify(a) : String(a)
      ).join(" "));
    },
    warn: (...args: unknown[]) => {
      logs.push("[WARN] " + args.map((a) => 
        typeof a === "object" ? JSON.stringify(a) : String(a)
      ).join(" "));
    },
    error: (...args: unknown[]) => {
      logs.push("[ERROR] " + args.map((a) => 
        typeof a === "object" ? JSON.stringify(a) : String(a)
      ).join(" "));
    },
  };
}

export function applyScriptModifications(
  config: RequestConfig,
  modifications: Partial<RequestConfig>
): RequestConfig {
  return {
    ...config,
    ...modifications,
    headers: modifications.headers || config.headers,
    params: modifications.params || config.params,
    body: modifications.body ? { ...config.body, ...modifications.body } : config.body,
  };
}
