import { useState, useCallback } from "react";
import {
  UrlEditor,
  HeadersEditor,
  BodyEditor,
  AuthEditor,
  CodeGenerator,
  ResponseViewer,
  TimingBreakdown,
  VariableExtractor,
  AIAnalysisPanel,
} from "@/components/request";
import { ScriptEditor } from "@/components/request/ScriptEditorPanel";
import { TestRunner } from "@/components/testing";
import { useRuntimeVariables, interpolateVariables } from "@/hooks/useRuntimeVariables";
import { executePreRequestScript, executePostResponseScript, applyScriptModifications } from "@/lib/scriptExecutor";
import type { RequestConfig, CapturedResponse, VariableExtraction, ScriptExecutionResult } from "@/types";

const DEFAULT_CONFIG: RequestConfig = {
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyType: "none",
  body: {},
  auth: { type: "none" },
  extractions: [],
  preRequestScript: "",
  postResponseScript: "",
};

export function RequestBuilderView() {
  const [config, setConfig] = useState<RequestConfig>(DEFAULT_CONFIG);
  const [response, setResponse] = useState<CapturedResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "body" | "auth" | "scripts" | "extractions">("headers");
  const [responseTab, setResponseTab] = useState<"body" | "headers" | "timing" | "tests" | "code" | "ai">("body");
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [scriptError, setScriptError] = useState<string | null>(null);
  
  const { variables, extractFromResponse, clearVariables, setVariables } = useRuntimeVariables();

  const sendRequest = async () => {
    if (!config.url) return;

    setIsSending(true);
    setError(null);
    setResponse(null);
    setScriptLogs([]);
    setScriptError(null);

    try {
      let finalConfig = interpolateConfigVariables(config, variables);
      
      if (config.preRequestScript) {
        const preResult = executePreRequestScript(
          config.preRequestScript,
          config,
          variables,
          {}
        );
        setScriptLogs(preResult.logs);
        
        if (!preResult.success) {
          setScriptError(preResult.error || "Pre-request script failed");
          setIsSending(false);
          return;
        }
        
        setVariables(preResult.variables);
        
        if (preResult.modifiedRequest) {
          finalConfig = applyScriptModifications(finalConfig, preResult.modifiedRequest);
        }
      }

      const result = await chrome.runtime.sendMessage({
        type: "SEND_REQUEST",
        payload: { config: finalConfig },
      });

      if (result.success) {
        setResponse(result.response);
        
        if (config.extractions && config.extractions.length > 0) {
          extractFromResponse(
            result.response.body,
            result.response.headers,
            config.extractions
          );
        }
        
        if (config.postResponseScript) {
          const postResult = executePostResponseScript(
            config.postResponseScript,
            finalConfig,
            result.response,
            variables,
            {}
          );
          setScriptLogs((prev) => [...prev, ...postResult.logs]);
          
          if (!postResult.success) {
            setScriptError(postResult.error || "Post-response script failed");
          } else {
            setVariables(postResult.variables);
          }
        }
      } else {
        setError(result.error || "Request failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  };

  const updateConfig = <K extends keyof RequestConfig>(key: K, value: RequestConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const statusColor = response
    ? response.status >= 400
      ? "text-red-500"
      : response.status >= 300
      ? "text-amber-500"
      : "text-emerald-500"
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="p-3 border-b border-border">
        <UrlEditor
          method={config.method}
          url={config.url}
          params={config.params}
          onMethodChange={(method) => updateConfig("method", method)}
          onUrlChange={(url) => updateConfig("url", url)}
          onParamsChange={(params) => updateConfig("params", params)}
          onSend={sendRequest}
          isSending={isSending}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Request Panel */}
        <div className="w-1/2 flex flex-col border-r border-border">
          {/* Request Tabs */}
          <div className="flex border-b border-border">
            {(["params", "headers", "body", "auth", "extractions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs capitalize ${
                  activeTab === tab
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "extractions" ? "Vars" : tab}
                {tab === "params" && config.params.filter((p) => p.enabled !== false).length > 0 && (
                  <span className="ml-1 text-xs">({config.params.filter((p) => p.enabled !== false).length})</span>
                )}
                {tab === "headers" && config.headers.filter((h) => h.enabled !== false).length > 0 && (
                  <span className="ml-1 text-xs">({config.headers.filter((h) => h.enabled !== false).length})</span>
                )}
                {tab === "extractions" && config.extractions?.filter((e) => e.enabled !== false).length > 0 && (
                  <span className="ml-1 text-xs">({config.extractions.filter((e) => e.enabled !== false).length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Request Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "params" && (
              <div className="p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Query parameters will be appended to the URL
                </div>
                <div className="space-y-2">
                  {config.params.map((param, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.enabled !== false}
                        onChange={(e) => {
                          const newParams = [...config.params];
                          newParams[index] = { ...param, enabled: e.target.checked };
                          updateConfig("params", newParams);
                        }}
                        className="w-3 h-3"
                      />
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => {
                          const newParams = [...config.params];
                          newParams[index] = { ...param, name: e.target.value };
                          updateConfig("params", newParams);
                        }}
                        placeholder="Parameter name"
                        className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => {
                          const newParams = [...config.params];
                          newParams[index] = { ...param, value: e.target.value };
                          updateConfig("params", newParams);
                        }}
                        placeholder="Value"
                        className="flex-1 px-2 py-1.5 text-xs bg-input border border-border rounded"
                      />
                      <button
                        onClick={() => {
                          updateConfig(
                            "params",
                            config.params.filter((_, i) => i !== index)
                          );
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      updateConfig("params", [...config.params, { name: "", value: "", enabled: true }]);
                    }}
                    className="w-full py-1.5 text-xs text-primary hover:bg-primary/10 rounded border border-dashed border-border"
                  >
                    + Add Parameter
                  </button>
                </div>
              </div>
            )}

            {activeTab === "headers" && (
              <HeadersEditor
                headers={config.headers}
                onChange={(headers) => updateConfig("headers", headers)}
              />
            )}

            {activeTab === "body" && (
              <BodyEditor
                bodyType={config.bodyType}
                body={config.body}
                onBodyTypeChange={(bodyType) => updateConfig("bodyType", bodyType)}
                onBodyChange={(body) => updateConfig("body", body)}
              />
            )}

            {activeTab === "auth" && (
              <AuthEditor auth={config.auth} onChange={(auth) => updateConfig("auth", auth)} />
            )}

            {activeTab === "extractions" && (
              <VariableExtractor
                extractions={config.extractions || []}
                onChange={(extractions) => updateConfig("extractions", extractions)}
              />
            )}
            
            {activeTab === "extractions" && Object.keys(variables).length > 0 && (
              <div className="border-t border-border">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Runtime Variables</span>
                    <button
                      onClick={clearVariables}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(variables).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-primary">{"{{" + key + "}}"}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="font-mono text-muted-foreground truncate flex-1">
                          {value.length > 50 ? value.slice(0, 50) + "..." : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Response Status */}
          {response && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <span className={`font-mono text-sm font-semibold ${statusColor}`}>
                  {response.status}
                </span>
                <span className="text-xs text-muted-foreground">{response.statusText}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{response.duration.toFixed(0)}ms</span>
                <span>{(response.size / 1024).toFixed(1)}KB</span>
              </div>
            </div>
          )}

          {/* Response Tabs */}
          <div className="flex border-b border-border">
            {(["body", "headers", "timing", "tests", "code", "ai"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setResponseTab(tab)}
                className={`px-4 py-2 text-xs capitalize ${
                  responseTab === tab
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Response Content */}
          <div className="flex-1 overflow-hidden">
            {!response && !error && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <SendIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Send a request to see the response</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ErrorIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            {response && responseTab === "body" && (
              <ResponseViewer 
                body={response.body} 
                statusCode={response.status}
                headers={Object.fromEntries(response.headers)}
              />
            )}

            {response && responseTab === "headers" && (
              <div className="p-3 overflow-auto">
                <div className="space-y-1">
                  {response.headers.map(([name, value], i) => (
                    <div key={i} className="flex text-xs">
                      <span className="text-primary w-40 flex-shrink-0 truncate">{name}</span>
                      <span className="text-muted-foreground truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {responseTab === "timing" && (
              response?.timing ? (
                <div className="overflow-auto">
                  <TimingBreakdown timing={response.timing} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-sm">No timing data available</p>
                    <p className="text-xs mt-1">Timing data is only available for manually sent requests</p>
                  </div>
                </div>
              )
            )}

            {responseTab === "tests" && (
              <TestRunner response={response} />
            )}

            {responseTab === "code" && (
              <CodeGenerator request={config} />
            )}

            {responseTab === "ai" && response && (
              <AIAnalysisPanel
                request={{
                  ...config,
                  id: "current",
                  url: config.url,
                  statusCode: response.status,
                  tabId: -1,
                  startTime: Date.now() - response.duration,
                  timeStamp: Date.now(),
                  duration: response.duration,
                  requestHeaders: config.headers,
                  requestBody: null,
                  requestBodyText: config.body.json || config.body.raw || null,
                  responseBodyText: response.body,
                  responseHeaders: response.headers.map(([name, value]) => ({ name, value })),
                }}
                response={response}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function interpolateConfigVariables(
  config: RequestConfig,
  variables: Record<string, string>
): RequestConfig {
  return {
    ...config,
    url: interpolateVariables(config.url, variables),
    params: config.params.map((p) => ({
      ...p,
      name: interpolateVariables(p.name, variables),
      value: interpolateVariables(p.value, variables),
    })),
    headers: config.headers.map((h) => ({
      ...h,
      name: interpolateVariables(h.name, variables),
      value: interpolateVariables(h.value, variables),
    })),
    body: {
      ...config.body,
      json: config.body.json ? interpolateVariables(config.body.json, variables) : undefined,
      raw: config.body.raw ? interpolateVariables(config.body.raw, variables) : undefined,
      urlEncoded: config.body.urlEncoded?.map((f) => ({
        ...f,
        name: interpolateVariables(f.name, variables),
        value: interpolateVariables(f.value, variables),
      })),
    },
    auth: {
      ...config.auth,
      bearer: config.auth.bearer ? {
        token: interpolateVariables(config.auth.bearer.token, variables),
      } : undefined,
      basic: config.auth.basic ? {
        username: interpolateVariables(config.auth.basic.username, variables),
        password: interpolateVariables(config.auth.basic.password, variables),
      } : undefined,
      apiKey: config.auth.apiKey ? {
        ...config.auth.apiKey,
        key: interpolateVariables(config.auth.apiKey.key, variables),
        value: interpolateVariables(config.auth.apiKey.value, variables),
      } : undefined,
    },
  };
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
