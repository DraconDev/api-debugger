import { useState, useEffect } from "react";
import type { RequestRecord, Diagnostic } from "@/types";
import { createAIClient, type AIProvider } from "@/utils/ai-client";

interface DiagnosticsPanelProps {
  request: RequestRecord;
}

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

const AI_STORAGE_KEY = "sync:ai_settings";

function analyzeRequest(request: RequestRecord): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // 401 - Authentication issues
  if (request.statusCode === 401) {
    const authHeader = request.requestHeaders.find(
      (h) => h.name.toLowerCase() === "authorization",
    );

    if (!authHeader) {
      diagnostics.push({
        type: "auth_missing",
        severity: "error",
        title: "Missing authentication",
        explanation:
          "The request was rejected because no authentication credentials were provided.",
        evidence: [
          {
            source: "response",
            field: "statusCode",
            value: "401",
            description: "Unauthorized status code",
          },
          {
            source: "headers",
            field: "Authorization",
            value: "(missing)",
            description: "No Authorization header in request",
          },
        ],
        suggestions: [
          "Add an Authorization header with a valid token",
          "Check if the endpoint requires Bearer token or Basic authentication",
          "Verify you are logged in or have a valid API key",
        ],
        confidence: 0.95,
      });
    } else {
      diagnostics.push({
        type: "auth_invalid",
        severity: "error",
        title: "Invalid or expired authentication",
        explanation:
          "Authentication credentials were provided but were rejected by the server.",
        evidence: [
          {
            source: "response",
            field: "statusCode",
            value: "401",
            description: "Unauthorized status code",
          },
          {
            source: "headers",
            field: "Authorization",
            value: "(present)",
            description: "Authorization header was sent",
          },
        ],
        suggestions: [
          "Check if the token has expired",
          "Verify the token format is correct (Bearer vs Basic)",
          "Ensure the token has the required scopes/permissions",
          "Try refreshing or re-obtaining the token",
        ],
        confidence: 0.85,
      });
    }
  }

  // 403 - Permission issues
  if (request.statusCode === 403) {
    diagnostics.push({
      type: "permission_denied",
      severity: "error",
      title: "Permission denied",
      explanation:
        "The server understood the request but refuses to authorize it.",
      evidence: [
        {
          source: "response",
          field: "statusCode",
          value: "403",
          description: "Forbidden status code",
        },
      ],
      suggestions: [
        "Check if you have the required permissions for this resource",
        "Verify your account has access to this endpoint",
        "Check if the resource requires specific roles or scopes",
        "Ensure the request is coming from an allowed origin/IP",
      ],
      confidence: 0.9,
    });
  }

  // 404 - Not found
  if (request.statusCode === 404) {
    diagnostics.push({
      type: "not_found",
      severity: "error",
      title: "Resource not found",
      explanation: "The requested resource could not be found on the server.",
      evidence: [
        {
          source: "response",
          field: "statusCode",
          value: "404",
          description: "Not Found status code",
        },
      ],
      suggestions: [
        "Verify the URL is correct",
        "Check if the resource ID in the path exists",
        "Ensure the API endpoint path is valid",
        "The resource may have been deleted or moved",
      ],
      confidence: 0.95,
    });
  }

  // 500-504 - Server errors
  if (request.statusCode >= 500 && request.statusCode < 600) {
    diagnostics.push({
      type: "server_error",
      severity: "error",
      title: "Server error",
      explanation:
        "The server encountered an error while processing the request.",
      evidence: [
        {
          source: "response",
          field: "statusCode",
          value: String(request.statusCode),
          description: "Server error status code",
        },
      ],
      suggestions: [
        "This is a server-side issue, not a problem with your request",
        "Try the request again later",
        "Check if there are known issues with the API service",
        "Contact API support if the error persists",
      ],
      confidence: 0.95,
    });
  }

  return diagnostics;
}

export function DiagnosticsPanel({ request }: DiagnosticsPanelProps) {
  const diagnostics = analyzeRequest(request);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);

  useEffect(() => {
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const result = await chrome.storage.sync.get(AI_STORAGE_KEY);
      if (result[AI_STORAGE_KEY]?.apiKey) {
        setAiSettings(result[AI_STORAGE_KEY]);
      }
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    }
  };

  const getAIExplanation = async () => {
    if (!aiSettings) return;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const client = createAIClient({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
      });

      const prompt = `Analyze this failed HTTP request and provide a brief, actionable explanation:

Method: ${request.method}
URL: ${request.url}
Status Code: ${request.statusCode}
Response Headers: ${JSON.stringify(request.responseHeaders?.slice(0, 5) || [], null, 2)}
${request.responseBodyText ? `Response Body: ${request.responseBodyText.slice(0, 500)}` : ""}

Provide:
1. Most likely cause (1 sentence)
2. Specific fix suggestion (1-2 sentences)
3. Related debugging tips (1 sentence)

Keep response under 150 words.`;

      const response = await client.complete(
        prompt,
        "You are an API debugging expert. Provide concise, actionable advice.",
      );
      setAiExplanation(response.content);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Failed to get AI explanation",
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (diagnostics.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-destructive bg-destructive/10";
      case "warning":
        return "border-warning bg-warning/10";
      default:
        return "border-primary bg-primary/10";
    }
  };

  return (
    <div className="p-3 border-b border-border">
      <h3 className="text-xs font-medium mb-2">Diagnostics</h3>
      <div className="space-y-2">
        {diagnostics.map((diag, index) => (
          <div
            key={index}
            className={`p-2 border-l-2 rounded ${getSeverityColor(diag.severity)}`}
          >
            <div className="font-medium text-xs">{diag.title}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {diag.explanation}
            </div>
            {diag.suggestions.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                {diag.suggestions.slice(0, 3).map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              Confidence: {Math.round(diag.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>

      {/* AI Explanation Section */}
      {aiSettings && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium">AI Analysis</h4>
            {!aiExplanation && !isLoadingAI && (
              <button
                onClick={getAIExplanation}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80"
              >
                Get AI Insight
              </button>
            )}
          </div>

          {isLoadingAI && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full" />
              Analyzing...
            </div>
          )}

          {aiError && (
            <div className="text-xs text-destructive p-2 bg-destructive/10 rounded-md">
              {aiError}
            </div>
          )}

          {aiExplanation && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded whitespace-pre-wrap">
              {aiExplanation}
            </div>
          )}
        </div>
      )}

      {/* Prompt to configure AI if not set up */}
      {!aiSettings && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={() => {
              /* Navigate to settings */
            }}
          >
            Configure AI settings
          </span>{" "}
          to get AI-powered insights.
        </div>
      )}
    </div>
  );
}
