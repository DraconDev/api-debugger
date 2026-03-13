export interface ImportResult {
  type: "collection" | "environment" | "requests";
  name: string;
  collections?: ImportCollection[];
  environments?: ImportEnvironment[];
  requests?: ImportRequest[];
  errors?: string[];
}

export interface ImportCollection {
  id: string;
  name: string;
  description?: string;
  folders?: ImportFolder[];
}

export interface ImportFolder {
  id: string;
  name: string;
  description?: string;
  requests: ImportRequest[];
}

export interface ImportRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Array<{ name: string; value: string; enabled: boolean }>;
  body?: {
    mode: "raw" | "formdata" | "urlencoded" | "file" | "graphql";
    raw?: string;
    formData?: Array<{ key: string; value: string; type: string }>;
    urlEncoded?: Array<{ key: string; value: string }>;
    graphql?: { query: string; variables?: string };
  };
  auth?: {
    type: "none" | "bearer" | "basic" | "apikey";
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apikey?: { key: string; value: string; addTo: "header" | "query" };
  };
  description?: string;
  preRequestScript?: string;
  postRequestScript?: string;
  tests?: string;
}

export interface ImportEnvironment {
  id: string;
  name: string;
  values: Array<{ key: string; value: string; enabled: boolean }>;
}

export function detectImportFormat(content: string, filename?: string): string | null {
  const ext = filename?.split(".").pop()?.toLowerCase();
  
  if (ext === "yaml" || ext === "yml") {
    if (content.includes("openapi:") || content.includes("'openapi':") || content.includes('"openapi":')) {
      return "openapi";
    }
  }
  
  try {
    const parsed = JSON.parse(content);
    
    if (parsed.openapi || parsed.swagger) {
      return "openapi";
    }
    
    if (parsed.info?._postman_id || parsed.info?.schema?.includes("postman")) {
      return "postman";
    }
    
    if (parsed.log?.entries && parsed.log?.version) {
      return "har";
    }
    
    if (parsed.resources && typeof parsed.resources === "object") {
      return "insomnia";
    }
    
    if (content.includes("meta")) {
      return "bruno";
    }
    
    return "json";
  } catch {
    if (content.trim().startsWith("curl")) {
      return "curl";
    }
    
    if (content.includes("openapi:") || content.includes("swagger:")) {
      return "openapi-yaml";
    }
    
    return null;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
