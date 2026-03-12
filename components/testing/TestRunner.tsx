import { useState } from "react";
import type { CapturedResponse } from "@/types";

interface TestAssertion {
  id: string;
  type: "status" | "header" | "body" | "responseTime";
  operator: "equals" | "contains" | "matches" | "lessThan" | "greaterThan";
  target: string;
  value: string;
  passed?: boolean;
  actual?: string;
}

interface TestRunnerProps {
  response: CapturedResponse | null;
  onResponse?: (response: CapturedResponse) => void;
}

const ASSERTION_TYPES = [
  { value: "status", label: "Status Code" },
  { value: "header", label: "Header" },
  { value: "body", label: "Response Body" },
  { value: "responseTime", label: "Response Time" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "equals", label: "equals" },
    { value: "lessThan", label: "is less than" },
    { value: "greaterThan", label: "is greater than" },
  ],
  header: [
    { value: "equals", label: "equals" },
    { value: "contains", label: "contains" },
    { value: "matches", label: "matches regex" },
  ],
  body: [
    { value: "equals", label: "equals" },
    { value: "contains", label: "contains" },
    { value: "matches", label: "matches regex" },
  ],
  responseTime: [
    { value: "lessThan", label: "is less than (ms)" },
    { value: "greaterThan", label: "is greater than (ms)" },
  ],
};

export function TestRunner({ response }: TestRunnerProps) {
  const [assertions, setAssertions] = useState<TestAssertion[]>([]);
  const [results, setResults] = useState<TestAssertion[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const addAssertion = () => {
    setAssertions([
      ...assertions,
      {
        id: `test_${Date.now()}`,
        type: "status",
        operator: "equals",
        target: "",
        value: "",
      },
    ]);
  };

  const updateAssertion = (id: string, field: keyof TestAssertion, value: string) => {
    setAssertions(
      assertions.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAssertion = (id: string) => {
    setAssertions(assertions.filter((a) => a.id !== id));
  };

  const runTests = () => {
    if (!response) return;

    const testResults = assertions.map((assertion) => {
      const result = evaluateAssertion(assertion, response);
      return { ...assertion, ...result };
    });

    setResults(testResults);
    setHasRun(true);
  };

  const clearResults = () => {
    setResults([]);
    setHasRun(false);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Tests</span>
        <div className="flex items-center gap-2">
          {hasRun && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-emerald-500">{passedCount} passed</span>
              {failedCount > 0 && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-500">{failedCount} failed</span>
                </>
              )}
            </div>
          )}
          <button
            onClick={runTests}
            disabled={!response || assertions.length === 0}
            className="px-2 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded disabled:opacity-50"
          >
            Run Tests
          </button>
          <button
            onClick={clearResults}
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {assertions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No tests defined</p>
            <button
              onClick={addAssertion}
              className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded"
            >
              Add Test
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {assertions.map((assertion, index) => {
              const result = results.find((r) => r.id === assertion.id);
              const operators = OPERATORS[assertion.type] || [];

              return (
                <div
                  key={assertion.id}
                  className={`p-2 border rounded ${
                    result
                      ? result.passed
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-red-500/50 bg-red-500/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Test {index + 1}</span>
                    {result && (
                      <span className={`text-xs ${result.passed ? "text-emerald-500" : "text-red-500"}`}>
                        {result.passed ? "✓ Passed" : "✗ Failed"}
                      </span>
                    )}
                    <button
                      onClick={() => removeAssertion(assertion.id)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <select
                      value={assertion.type}
                      onChange={(e) => updateAssertion(assertion.id, "type", e.target.value)}
                      className="px-2 py-1 text-xs bg-input border border-border rounded"
                    >
                      {ASSERTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>

                    <select
                      value={assertion.operator}
                      onChange={(e) => updateAssertion(assertion.id, "operator", e.target.value)}
                      className="px-2 py-1 text-xs bg-input border border-border rounded"
                    >
                      {operators.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {assertion.type === "header" && (
                      <input
                        type="text"
                        value={assertion.target}
                        onChange={(e) => updateAssertion(assertion.id, "target", e.target.value)}
                        placeholder="Header name"
                        className="px-2 py-1 text-xs bg-input border border-border rounded w-24"
                      />
                    )}

                    <input
                      type="text"
                      value={assertion.value}
                      onChange={(e) => updateAssertion(assertion.id, "value", e.target.value)}
                      placeholder="Expected value"
                      className="px-2 py-1 text-xs bg-input border border-border rounded flex-1 min-w-[100px]"
                    />
                  </div>

                  {result && !result.passed && result.actual && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Actual: <code className="bg-muted px-1 rounded">{result.actual}</code>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={addAssertion}
              className="w-full py-1 text-xs text-primary hover:bg-primary/10 rounded border border-dashed border-border"
            >
              + Add Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function evaluateAssertion(
  assertion: TestAssertion,
  response: CapturedResponse
): { passed: boolean; actual?: string } {
  let actual: string;
  let passed = false;

  switch (assertion.type) {
    case "status": {
      actual = String(response.status);
      const target = parseInt(assertion.value, 10);
      switch (assertion.operator) {
        case "equals":
          passed = response.status === target;
          break;
        case "lessThan":
          passed = response.status < target;
          break;
        case "greaterThan":
          passed = response.status > target;
          break;
      }
      break;
    }

    case "header": {
      const header = response.headers.find(
        ([name]) => name.toLowerCase() === assertion.target.toLowerCase()
      );
      actual = header ? header[1] : "(not found)";
      const value = header ? header[1] : "";
      switch (assertion.operator) {
        case "equals":
          passed = value === assertion.value;
          break;
        case "contains":
          passed = value.includes(assertion.value);
          break;
        case "matches":
          passed = new RegExp(assertion.value).test(value);
          break;
      }
      break;
    }

    case "body": {
      actual = response.body.slice(0, 100) + (response.body.length > 100 ? "..." : "");
      switch (assertion.operator) {
        case "equals":
          passed = response.body === assertion.value;
          break;
        case "contains":
          passed = response.body.includes(assertion.value);
          break;
        case "matches":
          passed = new RegExp(assertion.value).test(response.body);
          break;
      }
      break;
    }

    case "responseTime": {
      actual = `${response.duration.toFixed(0)}ms`;
      const target = parseFloat(assertion.value);
      switch (assertion.operator) {
        case "lessThan":
          passed = response.duration < target;
          break;
        case "greaterThan":
          passed = response.duration > target;
          break;
      }
      break;
    }

    default:
      actual = "Unknown assertion type";
      passed = false;
  }

  return { passed, actual };
}
