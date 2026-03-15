import { useState, useEffect } from "react";
import {
  createAI,
  FALLBACK_CHAINS,
  type FallbackChainName,
} from "@/lib/ai-client";
import { getModels, type ModelInfo } from "@/lib/modelRegistry";

interface AISettings {
  apiKey: string;
  model: string;
  fallbackChain: FallbackChainName;
}

const DEFAULT_SETTINGS: AISettings = {
  apiKey: "",
  model: "openai/gpt-4.1-mini",
  fallbackChain: "fast-and-cheap",
};

const STORAGE_KEY = "sync:ai_settings";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<
    "valid" | "invalid" | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const modelList = await getModels();
      setAllModels(modelList);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        setSettings({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateKey = async () => {
    if (!settings.apiKey) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const client = createAI({ apiKey: settings.apiKey });
      const valid = await client.validate();
      setValidationResult(valid ? "valid" : "invalid");
    } catch {
      setValidationResult("invalid");
    } finally {
      setIsValidating(false);
    }
  };

  const filteredModels = allModels.filter(
    (m) =>
      !modelSearch ||
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(modelSearch.toLowerCase()),
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">AI Integration</h2>
        <p className="text-sm text-muted-foreground">
          One key, {allModels.length || "300+"} models
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="font-medium">Powered by OpenRouter</span>
            </div>
            <p className="text-sm text-muted-foreground">
              One API key gives you access to OpenAI, Anthropic, Google,
              DeepSeek, Meta, Mistral, and 47 more providers. No need to manage
              multiple keys.
            </p>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              className="inline-block mt-2 text-sm text-primary hover:underline"
            >
              Get an OpenRouter key →
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => {
                  setSettings({ ...settings, apiKey: e.target.value });
                  setValidationResult(null);
                }}
                placeholder="sk-or-..."
                className="w-full px-3 py-2 pr-10 text-sm bg-input border border-border rounded-lg font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Primary Model
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search 300+ models..."
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
              />
            </div>
            <select
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
              size={8}
            >
              {isLoadingModels ? (
                <option disabled>Loading models...</option>
              ) : filteredModels.length === 0 ? (
                <option disabled>No models found</option>
              ) : (
                filteredModels.map((m: ModelInfo) => (
                  <option key={m.id} value={m.id}>
                    {m.provider} / {m.name} (
                    {(m.contextLength / 1000).toFixed(0)}k)
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Fallback Chain
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              If primary model fails, automatically try these:
            </p>
            <select
              value={settings.fallbackChain}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  fallbackChain: e.target.value as FallbackChainName,
                })
              }
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
            >
              {(Object.keys(FALLBACK_CHAINS) as FallbackChainName[]).map(
                (name) => (
                  <option key={name} value={name}>
                    {name} — {FALLBACK_CHAINS[name].join(" → ")}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleValidateKey}
              disabled={!settings.apiKey || isValidating}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50"
            >
              {isValidating ? "Testing..." : "Test Key"}
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          {validationResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                validationResult === "valid"
                  ? "bg-success/10 border border-success/20 text-success"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}
            >
              {validationResult === "valid"
                ? "✓ API key is valid"
                : "✗ API key validation failed"}
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Privacy</h4>
            <p className="text-sm text-muted-foreground">
              Your key is stored in Chrome sync storage. It syncs across your
              devices if Chrome sync is enabled. We never see your key or AI
              conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
