import { useState, useEffect, useRef } from "react";
import { createAI } from "@/lib/ai-client";
import type { RequestRecord, CapturedResponse } from "@/types";

interface AIAnalysisPanelProps {
  request: RequestRecord;
  response?: CapturedResponse;
}

interface AISettings {
  apiKey: string;
  model: string;
  fallbacks: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  fallback?: boolean;
}

const AI_STORAGE_KEY = "sync:ai_settings";

export function AIAnalysisPanel({ request, response }: AIAnalysisPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAISettings();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const getContext = (): string => {
    const parts: string[] = [];

    parts.push(
      `## Current Request\n**${request.method}** ${request.url}\nStatus: ${request.statusCode} | Duration: ${request.duration?.toFixed(0)}ms`,
    );

    if (request.requestHeaders?.length) {
      parts.push(
        `### Request Headers\n${request.requestHeaders.map((h) => `${h.name}: ${h.value}`).join("\n")}`,
      );
    }

    if (request.requestBodyText) {
      parts.push(
        `### Request Body\n\`\`\`\n${request.requestBodyText.slice(0, 2000)}\n\`\`\``,
      );
    }

    if (response?.body || request.responseBodyText) {
      const body = response?.body || request.responseBodyText || "";
      parts.push(`### Response Body\n\`\`\`\n${body.slice(0, 3000)}\n\`\`\``);
    }

    if (response?.headers?.length || request.responseHeaders?.length) {
      if (response?.headers?.length) {
        parts.push(
          `### Response Headers\n${response.headers.map((h) => `${h[0]}: ${h[1]}`).join("\n")}`,
        );
      } else if (request.responseHeaders?.length) {
        parts.push(
          `### Response Headers\n${request.responseHeaders.map((h) => `${h.name}: ${h.value}`).join("\n")}`,
        );
      }
    }

    return parts.join("\n\n");
  };

  const sendMessage = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage || !aiSettings) return;

    setInput("");
    setError(null);
    setIsLoading(true);

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);

    try {
      const client = createAI({ apiKey: aiSettings.apiKey });

      const systemMessage = {
        role: "system" as const,
        content: `You are an API debugging assistant embedded in a developer tool. You can see the user's current HTTP request and response.

Your job is to help them figure things out. Be practical and specific. If something looks wrong, say so and suggest a fix. If the request looks fine, confirm that.

You can suggest:
- Changes to headers, params, body, or auth
- What to try next
- What the error means and how to fix it
- Better ways to structure the request

Keep responses concise. Use code blocks for examples. No preamble - just help.

${getContext()}`,
      };

      const chatMessages = [
        systemMessage,
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const result = await client.chat(chatMessages, {
        model: aiSettings.model,
        fallbacks: aiSettings.fallbacks || [],
      });

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: result.content,
          model: result.model,
          fallback: result.fallback,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickActions = [
    {
      label: "What's wrong?",
      prompt:
        "What's wrong with this request? Look at the status code and response body. Suggest a specific fix.",
    },
    {
      label: "Explain response",
      prompt:
        "Explain this response in plain English. What does each field mean?",
    },
    {
      label: "Fix it",
      prompt:
        "This request isn't working. Figure out what's wrong and tell me exactly what to change.",
    },
    {
      label: "cURL",
      prompt:
        "Generate a cURL command for this exact request that I can copy and paste into my terminal.",
    },
    {
      label: "Test script",
      prompt:
        "Generate pm.test() assertions for this request/response that I can use in my post-response script.",
    },
  ];

  if (!aiSettings) {
    return (
      <div className="p-4">
        <div className="text-center mb-4">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <h3 className="font-medium mb-1 text-sm">AI Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Set up your OpenRouter key to get help
          </p>
        </div>
        <a
          href={chrome.runtime.getURL("/dashboard.html?view=settings")}
          target="_blank"
          className="block w-full py-2 text-center text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Configure AI
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-sm">🤖</span>
        <span className="text-xs font-medium">AI Assistant</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Ask me anything about this request. I can see the full context.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="px-2.5 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            </div>
            {msg.role === "assistant" && msg.model && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {msg.model}
                {msg.fallback && " (fallback)"}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive">
            {error}
            <button
              onClick={() => inputRef.current?.focus()}
              className="ml-2 text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this request..."
            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
