import { useState, useEffect } from "react";
import type { Environment, Variable } from "@/types";

interface EnvironmentManagerProps {
  onEnvironmentChange?: (env: Environment | null) => void;
}

const STORAGE_KEY = "sync:environments";

export function EnvironmentManager({ onEnvironmentChange }: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const envs = result[STORAGE_KEY] || [];
      setEnvironments(envs);
      const activeEnv = envs.find((e: Environment) => e.isActive);
      if (activeEnv) {
        setSelectedId(activeEnv.id);
        onEnvironmentChange?.(activeEnv);
      }
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  };

  const saveEnvironments = async (envs: Environment[]) => {
    await chrome.storage.sync.set({ [STORAGE_KEY]: envs });
    setEnvironments(envs);
  };

  const createEnvironment = async () => {
    if (!newName.trim()) return;

    const newEnv: Environment = {
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName.trim(),
      isActive: false,
      variables: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveEnvironments([...environments, newEnv]);
    setNewName("");
    setIsCreating(false);
  };

  const activateEnvironment = async (id: string) => {
    const updated = environments.map((env) => ({
      ...env,
      isActive: env.id === id,
    }));
    await saveEnvironments(updated);
    setSelectedId(id);
    const activeEnv = updated.find((e) => e.id === id);
    onEnvironmentChange?.(activeEnv || null);
  };

  const deleteEnvironment = async (id: string) => {
    const updated = environments.filter((env) => env.id !== id);
    await saveEnvironments(updated);
    if (selectedId === id) {
      setSelectedId(null);
      onEnvironmentChange?.(null);
    }
  };

  const updateVariable = async (envId: string, index: number, field: keyof Variable, value: string | boolean) => {
    const updated = environments.map((env) => {
      if (env.id === envId) {
        const newVars = [...env.variables];
        newVars[index] = { ...newVars[index], [field]: value };
        return { ...env, variables: newVars, updatedAt: Date.now() };
      }
      return env;
    });
    await saveEnvironments(updated);
  };

  const addVariable = async (envId: string) => {
    const updated = environments.map((env) => {
      if (env.id === envId) {
        return {
          ...env,
          variables: [...env.variables, { key: "", value: "", enabled: true }],
          updatedAt: Date.now(),
        };
      }
      return env;
    });
    await saveEnvironments(updated);
  };

  const deleteVariable = async (envId: string, index: number) => {
    const updated = environments.map((env) => {
      if (env.id === envId) {
        return {
          ...env,
          variables: env.variables.filter((_, i) => i !== index),
          updatedAt: Date.now(),
        };
      }
      return env;
    });
    await saveEnvironments(updated);
  };

  const selectedEnv = environments.find((e) => e.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Environments</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Environment List */}
        <div className="w-48 border-r border-border flex flex-col">
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {environments.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">
                No environments
              </div>
            ) : (
              environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setSelectedId(env.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                    selectedId === env.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${env.isActive ? "bg-success" : "bg-muted-foreground/30"}`}
                  />
                  <span className="flex-1 text-left truncate">{env.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {env.variables.filter((v) => v.enabled !== false).length}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            {isCreating ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEnvironment()}
                  placeholder="Name"
                  className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                  autoFocus
                />
                <button onClick={createEnvironment} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-1 text-xs text-primary hover:bg-primary/10 rounded"
              >
                + New Environment
              </button>
            )}
          </div>
        </div>

        {/* Variable Editor */}
        <div className="flex-1 flex flex-col">
          {selectedEnv ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium">{selectedEnv.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activateEnvironment(selectedEnv.id)}
                    disabled={selectedEnv.isActive}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedEnv.isActive
                        ? "bg-success/20 text-success cursor-default"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {selectedEnv.isActive ? "Active" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteEnvironment(selectedEnv.id)}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2">
                <div className="space-y-1">
                  {selectedEnv.variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={variable.enabled !== false}
                        onChange={(e) => updateVariable(selectedEnv.id, index, "enabled", e.target.checked)}
                        className="w-3 h-3"
                      />
                      <input
                        type="text"
                        value={variable.key}
                        onChange={(e) => updateVariable(selectedEnv.id, index, "key", e.target.value)}
                        placeholder="Variable name"
                        className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded font-mono"
                      />
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => updateVariable(selectedEnv.id, index, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                      />
                      <button
                        onClick={() => deleteVariable(selectedEnv.id, index)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addVariable(selectedEnv.id)}
                  className="w-full mt-2 py-1 text-xs text-primary hover:bg-primary/10 rounded border border-dashed border-border"
                >
                  + Add Variable
                </button>

                <div className="mt-4 p-2 bg-muted rounded text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Usage</p>
                  <p>Use variables in URLs, headers, or body with {"{{variableName}}"} syntax.</p>
                  <p className="mt-1">Example: {"{{baseUrl}}"}/api/users</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Select an environment</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
