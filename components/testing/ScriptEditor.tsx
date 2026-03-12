import { useState } from "react";

interface ScriptEditorProps {
  type: "pre-request" | "post-response";
  script: string;
  onChange: (script: string) => void;
}

const EXAMPLE_PRE_REQUEST = `// Pre-request script
// Available: pm.request, pm.environment, pm.variables

// Set a variable
pm.variables.set("timestamp", Date.now());

// Get environment variable
const baseUrl = pm.environment.get("baseUrl");
console.log("Base URL:", baseUrl);

// Modify request header
pm.request.headers.add({
  key: "X-Request-ID",
  value: Math.random().toString(36).substr(2, 9)
});
`;

const EXAMPLE_POST_RESPONSE = `// Post-response script
// Available: pm.response, pm.environment, pm.variables, pm.test

// Parse response
const data = pm.response.json();
console.log("Response:", data);

// Extract and save a value
pm.environment.set("authToken", data.token);

// Run a test
pm.test("Status is 200", () => {
  pm.expect(pm.response.status).to.equal(200);
});

pm.test("Response has data", () => {
  pm.expect(data).to.have.property("id");
});
`;

const HELP_TEXT = `
Available APIs:
- pm.request (pre-request only)
- pm.response (post-response only)
- pm.environment.get(name)
- pm.environment.set(name, value)
- pm.variables.get(name)
- pm.variables.set(name, value)
- pm.test(name, fn)
- pm.expect(value).to.equal(expected)
- console.log(...args)
`;

export function ScriptEditor({ type, script, onChange }: ScriptEditorProps) {
  const [showHelp, setShowHelp] = useState(false);

  const insertExample = () => {
    onChange(type === "pre-request" ? EXAMPLE_PRE_REQUEST : EXAMPLE_POST_RESPONSE);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">
          {type === "pre-request" ? "Pre-request Script" : "Post-response Script"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Help
          </button>
          <button
            onClick={insertExample}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Example
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {showHelp && (
          <div className="p-3 bg-muted/50 border-b border-border text-xs font-mono whitespace-pre-wrap">
            {HELP_TEXT}
          </div>
        )}

        <textarea
          value={script}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`// ${type === "pre-request" ? "Runs before the request is sent" : "Runs after receiving the response"}`}
          className="flex-1 w-full p-2 text-xs font-mono bg-transparent resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
