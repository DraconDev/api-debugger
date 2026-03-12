import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface RuntimeVariablesContextType {
  variables: Record<string, string>;
  setVariable: (name: string, value: string) => void;
  setVariables: (vars: Record<string, string>) => void;
  getVariable: (name: string) => string | undefined;
  clearVariables: () => void;
  extractFromResponse: (body: string, headers: [string, string][], extractions: import("@/types").VariableExtraction[]) => void;
}

const RuntimeVariablesContext = createContext<RuntimeVariablesContextType | null>(null);

export function RuntimeVariablesProvider({ children }: { children: ReactNode }) {
  const [variables, setVariablesState] = useState<Record<string, string>>({});

  const setVariable = useCallback((name: string, value: string) => {
    setVariablesState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setVariables = useCallback((vars: Record<string, string>) => {
    setVariablesState(vars);
  }, []);

  const getVariable = useCallback((name: string) => variables[name], [variables]);

  const clearVariables = useCallback(() => {
    setVariablesState({});
  }, []);

  const extractFromResponse = useCallback((
    body: string,
    headers: [string, string][],
    extractions: import("@/types").VariableExtraction[]
  ) => {
    const extracted: Record<string, string> = {};
    
    for (const extraction of extractions) {
      if (extraction.enabled === false) continue;
      
      try {
        let value: string | undefined;
        
        if (extraction.source === "body") {
          const parsed = JSON.parse(body);
          value = getValueByPath(parsed, extraction.path);
        } else if (extraction.source === "header") {
          const header = headers.find(([name]) => 
            name.toLowerCase() === extraction.path.toLowerCase()
          );
          value = header?.[1];
        }
        
        if (value !== undefined) {
          extracted[extraction.variableName] = value;
        }
      } catch (e) {
        console.warn(`Failed to extract variable ${extraction.variableName}:`, e);
      }
    }
    
    if (Object.keys(extracted).length > 0) {
      setVariablesState((prev) => ({ ...prev, ...extracted }));
    }
  }, []);

  return (
    <RuntimeVariablesContext.Provider
      value={{
        variables,
        setVariable,
        setVariables,
        getVariable,
        clearVariables,
        extractFromResponse,
      }}
    >
      {children}
    </RuntimeVariablesContext.Provider>
  );
}

export function useRuntimeVariables() {
  const context = useContext(RuntimeVariablesContext);
  if (!context) {
    throw new Error("useRuntimeVariables must be used within a RuntimeVariablesProvider");
  }
  return context;
}

function getValueByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".").flatMap((part) => {
    const match = part.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (match) {
      return match[2] ? [match[1], parseInt(match[2], 10)] : [match[1]];
    }
    return [part];
  });

  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    if (typeof part === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
    } else {
      if (typeof current !== "object" || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }
  
  if (current === null || current === undefined) return undefined;
  return typeof current === "object" ? JSON.stringify(current) : String(current);
}

export function interpolateVariables(
  template: string,
  variables: Record<string, string>,
  runtimeVars?: Record<string, string>
): string {
  const allVars = { ...variables, ...runtimeVars };
  
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    return allVars[trimmedKey] ?? `{{${trimmedKey}}}`;
  });
}
