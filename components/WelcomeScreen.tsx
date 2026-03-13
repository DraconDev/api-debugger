import { useState } from "react";

interface WelcomeScreenProps {
  onCreateRequest: () => void;
  onImportFile: () => void;
  onLoadSample: (sampleId: string) => void;
}

export function WelcomeScreen({ onCreateRequest, onImportFile, onLoadSample }: WelcomeScreenProps) {
  const [showSamples, setShowSamples] = useState(false);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <img
              src={chrome.runtime.getURL("/icon/48.png")}
              alt="API Debugger"
              className="w-12 h-12"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to API Debugger</h1>
          <p className="text-muted-foreground">
            A privacy-first, browser-native API debugging tool. No account needed.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={onCreateRequest}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PlusIcon className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium">New Request</span>
            <span className="text-xs text-muted-foreground">Create a new API request</span>
          </button>

          <button
            onClick={onImportFile}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ImportIcon className="w-6 h-6 text-blue-500" />
            </div>
            <span className="font-medium">Import</span>
            <span className="text-xs text-muted-foreground">OpenAPI, Postman, HAR</span>
          </button>
        </div>

        {/* Sample Collections */}
        <div className="mb-8">
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <SampleIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <span className="font-medium">Try Sample APIs</span>
                <p className="text-xs text-muted-foreground">Explore with example requests</p>
              </div>
            </div>
            <ChevronIcon className={`w-5 h-5 text-muted-foreground transition-transform ${showSamples ? "rotate-180" : ""}`} />
          </button>

          {showSamples && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SampleCard
                title="REST API"
                description="JSONPlaceholder - Fake REST API"
                onClick={() => onLoadSample("rest")}
              />
              <SampleCard
                title="GraphQL"
                description="Countries API - GraphQL endpoint"
                onClick={() => onLoadSample("graphql")}
              />
              <SampleCard
                title="WebSocket"
                description="Echo server - Real-time messaging"
                onClick={() => onLoadSample("websocket")}
              />
              <SampleCard
                title="SSE"
                description="Server-Sent Events demo"
                onClick={() => onLoadSample("sse")}
              />
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <FeatureItem
            icon={<PrivacyIcon className="w-5 h-5" />}
            title="Privacy First"
            description="No account, no cloud"
          />
          <FeatureItem
            icon={<AIIcon className="w-5 h-5" />}
            title="BYOK AI"
            description="Use your own API keys"
          />
          <FeatureItem
            icon={<SyncIcon className="w-5 h-5" />}
            title="Git Sync"
            description="Backup to your repo"
          />
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">?</kbd> for keyboard shortcuts
        </div>
      </div>
    </div>
  );
}

function SampleCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-left transition-colors"
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </button>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4">
      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function SampleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PrivacyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export const SAMPLE_COLLECTIONS = {
  rest: {
    name: "REST API Examples",
    requests: [
      {
        name: "Get Users",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/users",
        description: "Fetch all users",
      },
      {
        name: "Get User by ID",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/users/1",
        description: "Fetch single user",
      },
      {
        name: "Create Post",
        method: "POST",
        url: "https://jsonplaceholder.typicode.com/posts",
        headers: [{ name: "Content-Type", value: "application/json" }],
        body: { raw: JSON.stringify({ title: "Test Post", body: "This is a test", userId: 1 }) },
        description: "Create a new post",
      },
      {
        name: "Update Post",
        method: "PUT",
        url: "https://jsonplaceholder.typicode.com/posts/1",
        headers: [{ name: "Content-Type", value: "application/json" }],
        body: { raw: JSON.stringify({ id: 1, title: "Updated Post", body: "Updated content", userId: 1 }) },
        description: "Update an existing post",
      },
      {
        name: "Delete Post",
        method: "DELETE",
        url: "https://jsonplaceholder.typicode.com/posts/1",
        description: "Delete a post",
      },
    ],
  },
  graphql: {
    name: "GraphQL Examples",
    endpoint: "https://countries.trevorblades.com/",
    queries: [
      {
        name: "All Countries",
        query: `{
  countries {
    code
    name
    continent {
      name
    }
  }
}`,
      },
      {
        name: "Country by Code",
        query: `query ($code: ID!) {
  country(code: $code) {
    name
    native
    capital
    currency
    languages {
      name
    }
  }
}`,
        variables: `{ "code": "US" }`,
      },
      {
        name: "Continents",
        query: `{
  continents {
    code
    name
    countries {
      name
    }
  }
}`,
      },
    ],
  },
  websocket: {
    name: "WebSocket Examples",
    connections: [
      {
        name: "Echo Server",
        url: "wss://echo.websocket.org",
        description: "Echoes back any message you send",
      },
      {
        name: "WebSocket Test",
        url: "wss://ws.postman-echo.com/raw",
        description: "Postman WebSocket echo server",
      },
    ],
  },
  sse: {
    name: "SSE Examples",
    endpoints: [
      {
        name: "Server-Sent Events Demo",
        url: "https://httpbin.org/drip?duration=5&numbytes=5&code=200&delay=1",
        description: "HTTPBin drip endpoint (simulates streaming)",
      },
    ],
  },
};
