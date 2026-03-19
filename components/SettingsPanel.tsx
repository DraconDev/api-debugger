import { useState, useEffect } from "react";
import { createAI } from "@/lib/ai-client";
import { getModels, type ModelInfo } from "@/lib/modelRegistry";
import {
  getActiveProfileId,
  getProfileData,
  saveProfileData,
} from "@/lib/profiles";

interface AISettings {
  apiKey: string;
  model: string;
  fallbacks: string[];
}

const DEFAULT_SETTINGS: AISettings = {
  apiKey: "",
  model: "openrouter/auto",
  fallbacks: [
    "meta-llama/llama-4-scout:free",
    "google/gemini-2.0-flash-001:free",
  ],
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
  const [fallbackSearch, setFallbackSearch] = useState("");
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
        const saved = result[STORAGE_KEY];
        setSettings({
          apiKey: saved.apiKey || "",
          model: saved.model || DEFAULT_SETTINGS.model,
          fallbacks: saved.fallbacks || [],
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: settings });

      // Also save to active profile so it syncs with GitHub
      const activeId = await getActiveProfileId();
      const profileData = await getProfileData(activeId);
      profileData.aiSettings = settings;
      await saveProfileData(activeId, profileData);
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

  const availableFallbacks = allModels.filter(
    (m) =>
      m.id !== settings.model &&
      !settings.fallbacks.includes(m.id) &&
      (!fallbackSearch ||
        m.name.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
        m.id.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
        m.provider.toLowerCase().includes(fallbackSearch.toLowerCase())),
  );

  const addFallback = (modelId: string) => {
    if (settings.fallbacks.length >= 3) return;
    setSettings({
      ...settings,
      fallbacks: [...settings.fallbacks, modelId],
    });
  };

  const removeFallback = (modelId: string) => {
    setSettings({
      ...settings,
      fallbacks: settings.fallbacks.filter((id) => id !== modelId),
    });
  };

  const moveFallback = (fromIndex: number, toIndex: number) => {
    const newFallbacks = [...settings.fallbacks];
    const [item] = newFallbacks.splice(fromIndex, 1);
    newFallbacks.splice(toIndex, 0, item);
    setSettings({ ...settings, fallbacks: newFallbacks });
  };

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
              Fallback Models{" "}
              <span className="text-muted-foreground font-normal">
                (up to 3)
              </span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              If primary model fails, try these in order:
            </p>

            {/* Selected fallbacks */}
            {settings.fallbacks.length > 0 && (
              <div className="space-y-1 mb-2">
                {settings.fallbacks.map((modelId, index) => {
                  const model = allModels.find((m) => m.id === modelId);
                  return (
                    <div
                      key={modelId}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                    >
                      <span className="text-muted-foreground font-mono text-xs w-4">
                        {index + 1}.
                      </span>
                      <span className="flex-1 truncate">
                        {model?.provider} / {model?.name || modelId}
                      </span>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            onClick={() => moveFallback(index, index - 1)}
                            className="text-muted-foreground hover:text-foreground text-xs"
                            title="Move up"
                          >
                            ↑
                          </button>
                        )}
                        {index < settings.fallbacks.length - 1 && (
                          <button
                            onClick={() => moveFallback(index, index + 1)}
                            className="text-muted-foreground hover:text-foreground text-xs"
                            title="Move down"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => removeFallback(modelId)}
                          className="text-destructive hover:text-destructive/80 text-xs ml-1"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add fallback */}
            {settings.fallbacks.length < 3 && (
              <>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={fallbackSearch}
                    onChange={(e) => setFallbackSearch(e.target.value)}
                    placeholder="Search models to add as fallback..."
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
                  />
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addFallback(e.target.value);
                      setFallbackSearch("");
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
                  size={5}
                >
                  <option value="" disabled>
                    Select a fallback model...
                  </option>
                  {availableFallbacks.length === 0 ? (
                    <option disabled>No models found</option>
                  ) : (
                    availableFallbacks.map((m: ModelInfo) => (
                      <option key={m.id} value={m.id}>
                        {m.provider} / {m.name}
                      </option>
                    ))
                  )}
                </select>
              </>
            )}
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
