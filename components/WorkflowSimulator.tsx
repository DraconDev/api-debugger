import { useState, useCallback, useRef } from "react";
import type { SavedRequest, CapturedResponse } from "@/types";
import { interpolateVariables } from "@/hooks/useRuntimeVariables";

interface WorkflowSimulatorProps {
  requests: SavedRequest[];
  onRequestSend: (
    config: SavedRequest["requestConfig"],
  ) => Promise<CapturedResponse>;
}

export interface WorkflowConfig {
  iterations: number;
  concurrency: number;
  rampUp: number;
  thinkTime: number;
  stopOnError: boolean;
  assertions: WorkflowAssertion[];
}

export interface WorkflowAssertion {
  id: string;
  type: "responseTime" | "statusCode" | "body" | "header";
  operator: "equals" | "contains" | "lessThan" | "greaterThan" | "matches";
  value: string;
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  requestId: string;
  condition?: WorkflowCondition;
  retryCount: number;
  retryDelay: number;
}

export interface WorkflowCondition {
  type: "status" | "body" | "variable";
  operator: "equals" | "contains" | "exists";
  value: string;
  thenStep?: string;
  elseStep?: string;
}

export interface WorkflowResult {
  iteration: number;
  stepId: string;
  requestId: string;
  requestName: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  response?: CapturedResponse;
  error?: string;
  startTime?: number;
  endTime?: number;
  assertions?: AssertionResult[];
}

export interface AssertionResult {
  assertion: WorkflowAssertion;
  passed: boolean;
  actual?: string;
}

export interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  bytesReceived: number;
  startTime: number;
  endTime?: number;
  duration: number;
}

export function WorkflowSimulator({
  requests,
  onRequestSend,
}: WorkflowSimulatorProps) {
  const [config, setConfig] = useState<WorkflowConfig>({
    iterations: 1,
    concurrency: 1,
    rampUp: 0,
    thinkTime: 0,
    stopOnError: false,
    assertions: [],
  });
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<WorkflowResult[]>([]);
  const [metrics, setMetrics] = useState<LoadTestMetrics | null>(null);
  const [runtimeVariables, setRuntimeVariables] = useState<
    Record<string, string>
  >({});
  const [currentIteration, setCurrentIteration] = useState(0);
  const abortRef = useRef(false);
  const startTimeRef = useRef(0);
  const responseTimesRef = useRef<number[]>([]);

  const runLoadTest = useCallback(async () => {
    if (requests.length === 0) return;

    abortRef.current = false;
    setIsRunning(true);
    setResults([]);
    setMetrics(null);
    setRuntimeVariables({});
    startTimeRef.current = Date.now();
    responseTimesRef.current = [];

    const allResults: WorkflowResult[] = [];
    const vars: Record<string, string> = {};

    const executeRequest = async (
      request: SavedRequest,
      iteration: number,
    ): Promise<WorkflowResult> => {
      const result: WorkflowResult = {
        iteration,
        stepId: `${iteration}-${request.id}`,
        requestId: request.id,
        requestName: request.name,
        status: "running",
        startTime: Date.now(),
      };

      try {
        let requestConfig = request.requestConfig;
        if (requestConfig) {
          requestConfig = {
            ...requestConfig,
            url: interpolateVariables(requestConfig.url, vars),
            headers: requestConfig.headers.map((h) => ({
              ...h,
              name: interpolateVariables(h.name, vars),
              value: interpolateVariables(h.value, vars),
            })),
            body: {
              ...requestConfig.body,
              json: requestConfig.body.json
                ? interpolateVariables(requestConfig.body.json, vars)
                : undefined,
              raw: requestConfig.body.raw
                ? interpolateVariables(requestConfig.body.raw, vars)
                : undefined,
            },
          };
        }

        const response = await onRequestSend(requestConfig);

        responseTimesRef.current.push(response.duration);

        if (
          requestConfig?.extractions &&
          requestConfig.extractions.length > 0
        ) {
          for (const extraction of requestConfig.extractions) {
            if (extraction.enabled === false) continue;
            try {
              let value: string | undefined;
              if (extraction.source === "body") {
                const parsed = JSON.parse(response.body);
                value = getValueByPath(parsed, extraction.path);
              } else if (extraction.source === "header") {
                const header = response.headers.find(
                  ([name]) =>
                    name.toLowerCase() === extraction.path.toLowerCase(),
                );
                value = header?.[1];
              }
              if (value !== undefined) {
                vars[extraction.variableName] = value;
              }
            } catch (e) {
              console.warn(`Failed to extract ${extraction.variableName}:`, e);
            }
          }
          setRuntimeVariables({ ...vars });
        }

        const assertionResults = runAssertions(response, config.assertions);

        result.status = assertionResults.every((a) => a.passed)
          ? "success"
          : "error";
        result.response = response;
        result.assertions = assertionResults;
        result.endTime = Date.now();
      } catch (error) {
        result.status = "error";
        result.error =
          error instanceof Error ? error.message : "Request failed";
        result.endTime = Date.now();
      }

      return result;
    };

    const runIteration = async (iterationNum: number) => {
      if (abortRef.current) return [];

      setCurrentIteration(iterationNum);
      const iterationResults: WorkflowResult[] = [];

      if (config.rampUp > 0 && iterationNum > 0) {
        const delayPerIteration = config.rampUp / config.iterations;
        await sleep(delayPerIteration * iterationNum);
      }

      for (let i = 0; i < requests.length; i++) {
        if (abortRef.current) break;

        const request = requests[i];

        if (config.concurrency > 1 && i % config.concurrency === 0) {
          const batch = requests.slice(
            i,
            Math.min(i + config.concurrency, requests.length),
          );
          const batchResults = await Promise.all(
            batch.map((req) => executeRequest(req, iterationNum)),
          );
          iterationResults.push(...batchResults);
          i += batch.length - 1;
        } else {
          const result = await executeRequest(request, iterationNum);
          iterationResults.push(result);

          if (result.status === "error" && config.stopOnError) {
            abortRef.current = true;
            break;
          }
        }

        if (config.thinkTime > 0 && i < requests.length - 1) {
          await sleep(config.thinkTime);
        }
      }

      return iterationResults;
    };

    for (let i = 0; i < config.iterations; i++) {
      if (abortRef.current) break;

      const iterationResults = await runIteration(i + 1);
      allResults.push(...iterationResults);
      setResults([...allResults]);

      if (
        config.stopOnError &&
        iterationResults.some((r) => r.status === "error")
      ) {
        break;
      }
    }

    const endTime = Date.now();
    const finalMetrics = calculateMetrics(
      allResults,
      startTimeRef.current,
      endTime,
    );
    setMetrics(finalMetrics);
    setIsRunning(false);
  }, [requests, onRequestSend, config]);

  const stopTest = useCallback(() => {
    abortRef.current = true;
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setMetrics(null);
    setRuntimeVariables({});
    setCurrentIteration(0);
  }, []);

  const addAssertion = useCallback(() => {
    const newAssertion: WorkflowAssertion = {
      id: `assertion-${Date.now()}`,
      type: "statusCode",
      operator: "equals",
      value: "200",
      enabled: true,
    };
    setConfig((c) => ({
      ...c,
      assertions: [...c.assertions, newAssertion],
    }));
  }, []);

  const updateAssertion = useCallback(
    (id: string, updates: Partial<WorkflowAssertion>) => {
      setConfig((c) => ({
        ...c,
        assertions: c.assertions.map((a) =>
          a.id === id ? { ...a, ...updates } : a,
        ),
      }));
    },
    [],
  );

  const removeAssertion = useCallback((id: string) => {
    setConfig((c) => ({
      ...c,
      assertions: c.assertions.filter((a) => a.id !== id),
    }));
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-4">Workflow Simulator</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Iterations
            </label>
            <input
              type="number"
              value={config.iterations}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  iterations: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded"
              disabled={isRunning}
              min={1}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Concurrency
            </label>
            <input
              type="number"
              value={config.concurrency}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  concurrency: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded"
              disabled={isRunning}
              min={1}
              max={100}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Ramp Up (ms)
            </label>
            <input
              type="number"
              value={config.rampUp}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  rampUp: Math.max(0, parseInt(e.target.value) || 0),
                }))
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded"
              disabled={isRunning}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Think Time (ms)
            </label>
            <input
              type="number"
              value={config.thinkTime}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  thinkTime: Math.max(0, parseInt(e.target.value) || 0),
                }))
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded"
              disabled={isRunning}
              min={0}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.stopOnError}
              onChange={(e) =>
                setConfig((c) => ({ ...c, stopOnError: e.target.checked }))
              }
              disabled={isRunning}
              className="rounded border-border"
            />
            Stop on error
          </label>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={runLoadTest}
              disabled={requests.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
            >
              Start Load Test ({requests.length} requests x {config.iterations}{" "}
              iterations)
            </button>
          ) : (
            <button
              onClick={stopTest}
              className="px-4 py-2 bg-destructive text-destructive-foreground text-sm rounded hover:bg-destructive/90"
            >
              Stop
            </button>
          )}
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {metrics && <MetricsPanel metrics={metrics} />}

      {Object.keys(runtimeVariables).length > 0 && (
        <div className="p-3 border-b border-border bg-card">
          <div className="text-xs font-medium mb-2">Runtime Variables</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(runtimeVariables).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
              >
                <span className="font-mono text-primary">{key}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-muted-foreground truncate max-w-24">
                  {value.length > 20 ? value.slice(0, 20) + "..." : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Assertions</span>
          <button
            onClick={addAssertion}
            disabled={isRunning}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            + Add Assertion
          </button>
        </div>
        {config.assertions.length > 0 && (
          <div className="mt-2 space-y-2">
            {config.assertions.map((assertion) => (
              <div
                key={assertion.id}
                className="flex items-center gap-2 p-2 bg-background rounded border border-border text-xs"
              >
                <input
                  type="checkbox"
                  checked={assertion.enabled}
                  onChange={(e) =>
                    updateAssertion(assertion.id, { enabled: e.target.checked })
                  }
                  disabled={isRunning}
                  className="rounded"
                />
                <select
                  value={assertion.type}
                  onChange={(e) =>
                    updateAssertion(assertion.id, {
                      type: e.target.value as WorkflowAssertion["type"],
                    })
                  }
                  disabled={isRunning}
                  className="bg-input border border-border rounded px-2 py-1"
                >
                  <option value="statusCode">Status Code</option>
                  <option value="responseTime">Response Time</option>
                  <option value="body">Body</option>
                  <option value="header">Header</option>
                </select>
                <select
                  value={assertion.operator}
                  onChange={(e) =>
                    updateAssertion(assertion.id, {
                      operator: e.target.value as WorkflowAssertion["operator"],
                    })
                  }
                  disabled={isRunning}
                  className="bg-input border border-border rounded px-2 py-1"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="matches">Matches</option>
                  <option value="lessThan">Less Than</option>
                  <option value="greaterThan">Greater Than</option>
                </select>
                <input
                  type="text"
                  value={assertion.value}
                  onChange={(e) =>
                    updateAssertion(assertion.id, { value: e.target.value })
                  }
                  disabled={isRunning}
                  className="flex-1 bg-input border border-border rounded px-2 py-1"
                  placeholder="Value"
                />
                <button
                  onClick={() => removeAssertion(assertion.id)}
                  disabled={isRunning}
                  className="text-destructive hover:text-destructive disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isRunning && (
        <div className="p-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm">
              Running iteration {currentIteration} of {config.iterations}...
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Configure and run a load test</p>
              {requests.length === 0 && (
                <p className="text-xs mt-2 text-warning">
                  No requests in collection
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {results.map((result) => (
              <ResultRow key={result.stepId} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricsPanel({ metrics }: { metrics: LoadTestMetrics }) {
  return (
    <div className="p-4 border-b border-border bg-card">
      <h3 className="text-sm font-medium mb-3">Load Test Results</h3>
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Requests"
          value={metrics.totalRequests.toString()}
          subLabel={`${metrics.successfulRequests} success, ${metrics.failedRequests} failed`}
        />
        <MetricCard
          label="Requests/sec"
          value={metrics.requestsPerSecond.toFixed(2)}
          subLabel={`${(metrics.duration / 1000).toFixed(1)}s duration`}
        />
        <MetricCard
          label="Avg Response"
          value={`${metrics.avgResponseTime.toFixed(0)}ms`}
          subLabel={`Min: ${metrics.minResponseTime}ms, Max: ${metrics.maxResponseTime}ms`}
        />
        <MetricCard
          label="P95 / P99"
          value={`${metrics.p95ResponseTime}ms / ${metrics.p99ResponseTime}ms`}
          subLabel={`P50: ${metrics.p50ResponseTime}ms`}
        />
      </div>
      <div className="mt-3 flex items-center gap-6 text-xs">
        <div>
          <span className="text-muted-foreground">Error Rate: </span>
          <span
            className={
              metrics.errorRate > 0 ? "text-destructive" : "text-success"
            }
          >
            {(metrics.errorRate * 100).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Data Received: </span>
          <span>{formatBytes(metrics.bytesReceived)}</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subLabel,
}: {
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
    </div>
  );
}

function ResultRow({ result }: { result: WorkflowResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${result.status === "running" ? "bg-primary/5" : ""}`}>
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-6 text-center">
          {result.status === "pending" && (
            <span className="text-muted-foreground text-xs">
              {result.iteration}
            </span>
          )}
          {result.status === "running" && (
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          )}
          {result.status === "success" && (
            <span className="text-success">✓</span>
          )}
          {result.status === "error" && <span className="text-destructive">✗</span>}
          {result.status === "skipped" && (
            <span className="text-muted-foreground">○</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              #{result.iteration}
            </span>
            <span className="font-medium text-sm">{result.requestName}</span>
            {result.response && (
              <span
                className={`text-xs font-mono ${
                  result.response.status >= 400
                    ? "text-destructive"
                    : "text-success"
                }`}
              >
                {result.response.status}
              </span>
            )}
          </div>
          {result.error && (
            <p className="text-xs text-destructive mt-1">{result.error}</p>
          )}
        </div>
        {result.response && (
          <div className="text-xs text-muted-foreground">
            {result.response.duration.toFixed(0)}ms
          </div>
        )}
        {result.assertions && result.assertions.length > 0 && (
          <div className="text-xs">
            {result.assertions.filter((a) => a.passed).length}/
            {result.assertions.length} passed
          </div>
        )}
      </div>
      {expanded && result.response && (
        <div className="px-3 pb-3 pl-12">
          <div className="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
            {result.response.body.slice(0, 500)}
            {result.response.body.length > 500 && "..."}
          </div>
        </div>
      )}
    </div>
  );
}

function runAssertions(
  response: CapturedResponse,
  assertions: WorkflowAssertion[],
): AssertionResult[] {
  return assertions
    .filter((a) => a.enabled)
    .map((assertion) => {
      let actual: string;
      let passed = false;

      switch (assertion.type) {
        case "statusCode":
          actual = response.status.toString();
          passed = compareValues(actual, assertion.operator, assertion.value);
          break;
        case "responseTime":
          actual = response.duration.toString();
          passed = compareValues(
            actual,
            assertion.operator,
            assertion.value,
            true,
          );
          break;
        case "body":
          actual = response.body;
          passed = compareValues(actual, assertion.operator, assertion.value);
          break;
        case "header":
          const header = response.headers.find(
            ([name]) =>
              name.toLowerCase() ===
              assertion.value.split(":")[0]?.toLowerCase(),
          );
          actual = header?.[1] || "";
          passed = compareValues(
            actual,
            assertion.operator,
            assertion.value.split(":")[1] || "",
          );
          break;
        default:
          actual = "";
      }

      return { assertion, passed, actual };
    });
}

function compareValues(
  actual: string,
  operator: WorkflowAssertion["operator"],
  expected: string,
  numeric = false,
): boolean {
  if (numeric) {
    const actualNum = parseFloat(actual);
    const expectedNum = parseFloat(expected);
    if (isNaN(actualNum) || isNaN(expectedNum)) return false;

    switch (operator) {
      case "equals":
        return actualNum === expectedNum;
      case "lessThan":
        return actualNum < expectedNum;
      case "greaterThan":
        return actualNum > expectedNum;
      default:
        return false;
    }
  }

  switch (operator) {
    case "equals":
      return actual === expected;
    case "contains":
      return actual.includes(expected);
    case "matches":
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function calculateMetrics(
  results: WorkflowResult[],
  startTime: number,
  endTime: number,
): LoadTestMetrics {
  const successful = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "error");
  const responseTimes = results
    .filter((r) => r.response)
    .map((r) => r.response!.duration)
    .sort((a, b) => a - b);

  const duration = endTime - startTime;

  return {
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    requestsPerSecond: duration > 0 ? (results.length / duration) * 1000 : 0,
    avgResponseTime:
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
    minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
    maxResponseTime:
      responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
    p50ResponseTime: percentile(responseTimes, 50),
    p95ResponseTime: percentile(responseTimes, 95),
    p99ResponseTime: percentile(responseTimes, 99),
    errorRate: results.length > 0 ? failed.length / results.length : 0,
    bytesReceived: results.reduce((acc, r) => acc + (r.response?.size || 0), 0),
    startTime,
    endTime,
    duration,
  };
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function getValueByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".").flatMap((part) => {
    const match = part.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (match) {
      return match[2] ? [match[1], parseInt(match[2], 10)] : [match[1]];
    }
    return [part];
  });

  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    if (typeof part === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (typeof current !== "object" || Array.isArray(current))
        return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }

  if (current === null || current === undefined) return undefined;
  return typeof current === "object"
    ? JSON.stringify(current)
    : String(current);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
