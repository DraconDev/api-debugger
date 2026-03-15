import { useState } from "react";

interface ScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
  title: string;
  description?: string;
  logs?: string[];
  error?: string;
}

export function ScriptEditor({ script, onChange, title, description, logs, error }: ScriptEditorProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
        >
          {showHelp ? "Hide Help" : "Show Help"}
        </button>
      </div>

      {showHelp && (
        <div className="p-3 border-b border-border bg-muted/30 text-xs space-y-2 max-h-64 overflow-auto">
          <div>
            <h4 className="font-medium mb-1">Variables</h4>
            <pre className="text-muted-foreground">
{`pm.variables.set("name", "value");
pm.variables.get("name");
pm.environment.set("key", "value");`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">Request (pre-request only)</h4>
            <pre className="text-muted-foreground">
{`pm.request.url = "https://api.example.com";
pm.request.headers.add("Authorization", "Bearer token");
pm.request.body.raw = JSON.stringify({key: "value"});`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">Response (post-response only)</h4>
            <pre className="text-muted-foreground">
{`const data = pm.response.json();
pm.variables.set("token", data.access_token);
pm.test("Status is 200", () => {
  pm.expect(pm.response.code).to.equal(200);
});`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-1">Assertions</h4>
            <pre className="text-muted-foreground">
{`pm.expect(value).to.equal(expected);
pm.expect(value).to.exist;
pm.expect(value).to.beA("string");`}
            </pre>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          value={script}
          onChange={(e) => onChange(e.target.value)}
          placeholder="// Write your script here...&#10;// pm.variables.set('timestamp', Date.now().toString());"
          className="flex-1 w-full p-3 bg-zinc-950 text-foreground font-mono text-xs resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="p-3 border-t border-border bg-destructive/10">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="border-t border-border max-h-32 overflow-auto bg-zinc-950">
          <div className="p-2 text-xs font-mono">
            {logs.map((log, i) => (
              <div key={i} className={`py-0.5 ${
                log.startsWith("✓") ? "text-success" :
                log.startsWith("✗") ? "text-destructive" :
                log.startsWith("[ERROR]") ? "text-destructive" :
                log.startsWith("[WARN]") ? "text-warning" :
                log.startsWith("[INFO]") ? "text-blue-400" :
                "text-muted-foreground"
              }`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
