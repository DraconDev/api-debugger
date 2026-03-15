import { useState, useEffect } from "react";
import { validateApiKey, type AIProvider } from "@/utils/ai-client";
import { getModels, getProviders, type ModelInfo } from "@/lib/modelRegistry";

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "openai/gpt-4.1-mini",
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
  const [providers, setProviders] = useState<
    Array<{ id: string; name: string; modelCount: number }>
  >([]);
  const [modelSearch, setModelSearch] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const [modelList, providerList] = await Promise.all([
        getModels(),
        getProviders(),
      ]);
      setAllModels(modelList);
      setProviders(providerList);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        setSettings(result[STORAGE_KEY]);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
      setValidationResult(null);
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
      const isValid = await validateApiKey({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
      });
      setValidationResult(isValid ? "valid" : "invalid");
    } catch {
      setValidationResult("invalid");
    } finally {
      setIsValidating(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    const providerModels = allModels.filter(
      (m) => m.providerId === provider || (provider === "openrouter" && true),
    );
    const firstModel = providerModels[0]?.id || "";
    setSettings({
      ...settings,
      provider,
      model: firstModel,
      apiKey: "",
    });
    setValidationResult(null);
    setModelSearch("");
  };

  const filteredModels = modelSearch
    ? allModels.filter(
        (m) =>
          (settings.provider === "openrouter" ||
            m.providerId === settings.provider) &&
          (m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
            m.id.toLowerCase().includes(modelSearch.toLowerCase())),
      )
    : allModels.filter(
        (m) =>
          settings.provider === "openrouter" ||
          m.providerId === settings.provider,
      );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">AI Integration</h2>
        <p className="text-sm text-muted-foreground">Bring Your Own Key</p>
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
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <span className="font-medium">Your AI, Your Keys, Your Data</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We never see your AI requests. Use your own API keys - no
              subscription to us needed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium">Use Company Keys</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Works with enterprise OpenAI/Anthropic accounts
              </p>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium">Full Privacy</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Keys stored locally, calls go direct to AI
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    "openai",
                    "anthropic",
                    "gemini",
                    "openrouter",
                  ] as AIProvider[]
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleProviderChange(p)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      settings.provider === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent"
                    }`}
                  >
                    {p === "openai"
                      ? "OpenAI"
                      : p === "anthropic"
                        ? "Anthropic"
                        : p === "gemini"
                          ? "Gemini"
                          : "OpenRouter"}
                  </button>
                ))}
              </div>
              {settings.provider === "openrouter" && (
                <p className="text-xs text-muted-foreground mt-2">
                  OpenRouter gives you access to all models with one API key.{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Get a key
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={settings.model}
                onChange={(e) =>
                  setSettings({ ...settings, model: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
                  placeholder={`sk-...`}
                  className="w-full px-3 py-2 pr-10 text-sm bg-input border border-border rounded-lg font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.provider === "openai" &&
                  "Get your key from platform.openai.com/api-keys"}
                {settings.provider === "anthropic" &&
                  "Get your key from console.anthropic.com"}
                {settings.provider === "gemini" &&
                  "Get your key from aistudio.google.com/apikey"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleValidateKey}
                disabled={!settings.apiKey || isValidating}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50"
              >
                {isValidating ? "Validating..." : "Test Key"}
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
                  ? "✓ API key is valid and working"
                  : "✗ API key validation failed. Check the key and try again."}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">
              Where are my keys stored?
            </h4>
            <p className="text-sm text-muted-foreground">
              Keys are stored in Chrome's sync storage. They sync across your
              devices if Chrome sync is enabled. We never have access to your
              keys or AI conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
