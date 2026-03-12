import { useState, useEffect } from "react";
import { createAIClient, type AIProvider } from "@/utils/ai-client";
import type { RequestRecord, CapturedResponse } from "@/types";

interface AIAnalysisPanelProps {
  request: RequestRecord;
  response?: CapturedResponse;
}

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

const AI_STORAGE_KEY = "sync:ai_settings";

export function AIAnalysisPanel({ request, response }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "explain" | "suggest">("analysis");

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

  const analyzeRequest = async () => {
    if (!aiSettings) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createAIClient({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
      });

      const prompt = buildAnalysisPrompt(request, response, activeTab);
      const systemPrompt = getSystemPrompt(activeTab);

      const result = await client.complete(prompt, systemPrompt);
      setAnalysis(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setIsLoading(false);
    }
  };

  if (!aiSettings) {
    return (
      <div className="p-4 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-medium mb-2">AI Analysis</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Configure your AI API key in Settings to enable intelligent request analysis.
        </p>
        <a
          href={chrome.runtime.getURL("/popup.html")}
          target="_blank"
          className="text-sm text-primary hover:underline"
        >
          Open Settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-medium">AI Analysis</span>
        </div>
        <div className="flex items-center gap-1">
          {(["analysis", "explain", "suggest"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setAnalysis(null);
              }}
              className={`px-2 py-1 text-xs rounded ${
                activeTab === tab
                  ? "bg-violet-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!analysis && !isLoading && (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {activeTab === "analysis" && "Get AI-powered analysis of this request"}
              {activeTab === "explain" && "Get a detailed explanation of this API endpoint"}
              {activeTab === "suggest" && "Get suggestions to improve this request"}
            </p>
            <button
              onClick={analyzeRequest}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-md flex items-center gap-2 mx-auto"
            >
              <SparklesIcon className="w-4 h-4" />
              Analyze
            </button>
          </div>
        )}

        {isLoading && (
          <div className="p-4 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <div className="text-sm text-destructive">{error}</div>
            <button
              onClick={analyzeRequest}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {analysis && (
          <div className="p-3">
            <div className="text-sm prose prose-invert prose-sm max-w-none">
              {formatAnalysis(analysis)}
            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                analyzeRequest();
              }}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getSystemPrompt(tab: string): string {
  switch (tab) {
    case "analysis":
      return `You are an API debugging expert. Analyze the HTTP request and response provided. 
Provide a structured analysis with:
1. **Summary**: What this request does
2. **Issues Found**: Any problems or concerns (or "None" if everything looks good)
3. **Recommendations**: Specific actionable suggestions

Keep your response concise and practical. Use markdown formatting.`;

    case "explain":
      return `You are an API educator. Explain this HTTP request and response in detail.
Cover:
1. **Purpose**: What this endpoint likely does
2. **Request Details**: Key headers, body structure, authentication
3. **Response Interpretation**: What the response means
4. **Best Practices**: Any relevant API conventions being used or violated

Use markdown formatting. Be educational but concise.`;

    case "suggest":
      return `You are an API optimization expert. Provide specific suggestions to improve this request.
Focus on:
1. **Performance**: Caching, pagination, optimization
2. **Security**: Best practices for auth, data handling
3. **Reliability**: Error handling, retries, idempotency
4. **Code Quality**: Clean URL patterns, proper headers

Be specific and actionable. Use markdown formatting.`;

    default:
      return "You are an API debugging assistant.";
  }
}

function buildAnalysisPrompt(
  request: RequestRecord,
  response?: CapturedResponse,
  _tab?: string
): string {
  let prompt = `## Request

**Method:** ${request.method}
**URL:** ${request.url}
**Status:** ${request.statusCode}
**Duration:** ${request.duration.toFixed(0)}ms

### Request Headers
\`\`\`
${request.requestHeaders?.map((h) => `${h.name}: ${h.value}`).join("\n") || "None"}
\`\`\`

`;

  if (request.requestBodyText) {
    prompt += `### Request Body
\`\`\`json
${request.requestBodyText.slice(0, 2000)}
\`\`\`

`;
  }

  if (request.responseHeaders?.length) {
    prompt += `### Response Headers
\`\`\`
${request.responseHeaders.map((h) => `${h.name}: ${h.value}`).join("\n")}
\`\`\`

`;
  }

  if (request.responseBodyText || response?.body) {
    const body = response?.body || request.responseBodyText || "";
    prompt += `### Response Body
\`\`\`
${body.slice(0, 3000)}
\`\`\`
`;
  }

  return prompt;
}

function formatAnalysis(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={index} className="font-semibold mt-4 mb-2 text-foreground">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={index} className="font-semibold mt-4 mb-2 text-foreground text-base">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={index} className="font-semibold text-foreground">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={index} className="ml-4 text-muted-foreground">
          {line.slice(2)}
        </li>
      );
    } else if (line.startsWith("```")) {
      // Skip code block markers
    } else if (line.trim()) {
      elements.push(
        <p key={index} className="text-muted-foreground">
          {line}
        </p>
      );
    }
  });

  return <>{elements}</>;
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}
