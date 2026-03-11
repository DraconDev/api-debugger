import { useState, useEffect } from "react";
import { createAIClient, getAvailableModels, validateApiKey, type AIProvider } from "@/utils/ai-client";

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
};

const STORAGE_KEY = "sync:ai_settings";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"valid" | "invalid" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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
    const models = getAvailableModels(provider);
    setSettings({
      ...settings,
      provider,
      model: models[0] || "",
      apiKey: "",
    });
    setValidationResult(null);
  };

  const models = getAvailableModels(settings.provider);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold">AI Settings (BYOK)</h2>
      <p className="text-xs text-muted-foreground">
        Provide your own API key to enable AI-powered request analysis.
      </p>

      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Provider</label>
        <div className="flex gap-2">
          {(["openai", "anthropic", "gemini"] as AIProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-3 py-1.5 text-xs rounded border ${
                settings.provider === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Model</label>
        <select
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          className="w-full px-2 py-1.5 text-xs border rounded bg-background"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <label className="text-xs font-medium">API Key</label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => {
            setSettings({ ...settings, apiKey: e.target.value });
            setValidationResult(null);
          }}
          placeholder={`Enter your ${settings.provider} API key`}
          className="w-full px-2 py-1.5 text-xs border rounded bg-background"
        />
      </div>

      {/* Validation & Save */}
      <div className="flex gap-2">
        <button
          onClick={handleValidateKey}
          disabled={!settings.apiKey || isValidating}
          className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
        >
          {isValidating ? "Validating..." : "Validate Key"}
        </button>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div
          className={`text-xs p-2 rounded ${
            validationResult === "valid"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {validationResult === "valid"
            ? "✓ API key is valid"
            : "✗ API key validation failed"}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground border-t pt-4 mt-4">
        <p className="mb-1">Your API key is stored locally in browser sync storage.</p>
        <p>Keys are never sent to our servers.</p>
      </div>
    </div>
  );
}
