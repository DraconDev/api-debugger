import type { ImportResult, ImportCollection, ImportRequest, ImportEnvironment } from "./types";
import { generateId } from "./types";

interface OpenAPIInfo {
  title?: string;
  description?: string;
  version?: string;
}

interface OpenAPIPath {
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required?: boolean;
    schema?: { type?: string };
    description?: string;
  }>;
  requestBody?: {
    content?: Record<string, {
      schema?: { $ref?: string; type?: string; properties?: Record<string, unknown> };
      example?: unknown;
    }>;
    description?: string;
  }>;
  responses?: Record<string, { description?: string }>;
  security?: Array<Record<string, unknown>>;
  operationId?: string;
}

interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: OpenAPIInfo;
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, Record<string, OpenAPIPath>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, {
      type?: string;
      scheme?: string;
      bearerFormat?: string;
      name?: string;
      in?: string;
    }>;
  };
  security?: Array<Record<string, unknown>>;
  basePath?: string;
  host?: string;
}

export function parseOpenAPI(content: string): ImportResult {
  let spec: OpenAPISpec;
  
  try {
    if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
      spec = JSON.parse(content);
    } else {
      spec = parseYaml(content);
    }
  } catch (error) {
    return {
      type: "collection",
      name: "Import Failed",
      errors: [`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : "Unknown error"}`],
      collections: [],
    };
  }

  const errors: string[] = [];
  const collectionName = spec.info?.title || "Imported API";
  const baseUrl = getBaseUrl(spec);

  const requests: ImportRequest[] = [];
  const paths = spec.paths || {};

  for (const [path, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object") continue;

    for (const [method, operation] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method.toLowerCase())) {
        continue;
      }

      const op = operation as OpenAPIPath;
      const request = createRequestFromOperation(
        method.toUpperCase(),
        path,
        op,
        baseUrl,
        spec
      );
      requests.push(request);
    }
  }

  const collection: ImportCollection = {
    id: generateId(),
    name: collectionName,
    description: spec.info?.description,
  };

  return {
    type: "collection",
    name: collectionName,
    collections: [collection],
    requests: requests.map((r) => ({ ...r, collectionId: collection.id })),
    errors: errors.length > 0 ? errors : undefined,
  };
}

function getBaseUrl(spec: OpenAPISpec): string {
  if (spec.servers && spec.servers.length > 0) {
    return spec.servers[0].url;
  }
  if (spec.host) {
    const scheme = spec.schemes?.[0] || "https";
    const basePath = spec.basePath || "";
    return `${scheme}://${spec.host}${basePath}`;
  }
  return "https://api.example.com";
}

function createRequestFromOperation(
  method: string,
  path: string,
  operation: OpenAPIPath,
  baseUrl: string,
  spec: OpenAPISpec
): ImportRequest {
  const name = operation.summary || operation.operationId || `${method} ${path}`;
  const url = `${baseUrl}${path}`;

  const headers: Array<{ name: string; value: string; enabled: boolean }> = [];
  const params: Array<{ name: string; value: string; enabled: boolean }> = [];

  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (param.in === "header") {
        headers.push({
          name: param.name,
          value: getExampleValue(param.schema),
          enabled: true,
        });
      } else if (param.in === "query") {
        params.push({
          name: param.name,
          value: getExampleValue(param.schema),
          enabled: true,
        });
      }
    }
  }

  let body: ImportRequest["body"];
  if (operation.requestBody?.content) {
    const jsonContent = operation.requestBody.content["application/json"];
    if (jsonContent) {
      body = {
        mode: "raw",
        raw: JSON.stringify(jsonContent.example || generateExampleFromSchema(jsonContent.schema, spec.components?.schemas), null, 2),
      };
      headers.push({ name: "Content-Type", value: "application/json", enabled: true });
    }
  }

  const auth = getAuthFromSecurity(operation.security, spec);

  return {
    id: generateId(),
    name,
    method,
    url: params.length > 0 ? `${url}?${params.map((p) => `${p.name}={{${p.name}}}`).join("&")}` : url,
    headers,
    body,
    auth,
    description: operation.description,
  };
}

function getExampleValue(schema?: { type?: string }): string {
  if (!schema?.type) return "";
  switch (schema.type) {
    case "string": return "string";
    case "number":
    case "integer": return "0";
    case "boolean": return "true";
    case "array": return "[]";
    case "object": return "{}";
    default: return "";
  }
}

function generateExampleFromSchema(
  schema?: { $ref?: string; type?: string; properties?: Record<string, unknown> },
  schemas?: Record<string, unknown>
): unknown {
  if (!schema) return null;

  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    if (refName && schemas?.[refName]) {
      return generateExampleFromSchema(schemas[refName] as typeof schema, schemas);
    }
    return null;
  }

  if (schema.type === "object" && schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateExampleFromSchema(prop as typeof schema, schemas);
    }
    return obj;
  }

  if (schema.type === "array") {
    return [];
  }

  return getExampleValue(schema as { type?: string });
}

function getAuthFromSecurity(
  security?: Array<Record<string, unknown>>,
  spec?: OpenAPISpec
): ImportRequest["auth"] {
  if (!security || security.length === 0) return { type: "none" };

  const secReq = security[0];
  const secName = Object.keys(secReq)[0];
  const secScheme = spec?.components?.securitySchemes?.[secName];

  if (!secScheme) return { type: "none" };

  if (secScheme.type === "http" && secScheme.scheme === "bearer") {
    return { type: "bearer", bearer: { token: "{{token}}" } };
  }

  if (secScheme.type === "http" && secScheme.scheme === "basic") {
    return { type: "basic", basic: { username: "{{username}}", password: "{{password}}" } };
  }

  if (secScheme.type === "apiKey") {
    return {
      type: "apikey",
      apikey: {
        key: secScheme.name || "X-API-Key",
        value: "{{api_key}}",
        addTo: secScheme.in === "query" ? "query" : "header",
      },
    };
  }

  return { type: "none" };
}

function parseYaml(content: string): OpenAPISpec {
  const result: OpenAPISpec = {};
  const lines = content.split("\n");
  let currentPath: string[] = [];
  let indent = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const currentIndent = line.search(/\S/);
    const match = trimmed.match(/^(\s*)([^:]+):\s*(.*)$/);

    if (match) {
      const [, , key, value] = match;
      const cleanKey = key.trim();
      const cleanValue = value.trim();

      if (currentIndent < indent) {
        const levelsBack = Math.floor((indent - currentIndent) / 2);
        currentPath = currentPath.slice(0, -levelsBack);
      }
      indent = currentIndent;

      if (cleanValue) {
        setNestedValue(result, [...currentPath, cleanKey], parseYamlValue(cleanValue));
      } else {
        currentPath.push(cleanKey);
        setNestedValue(result, currentPath, {});
      }
    }
  }

  return result;
}

function parseYamlValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
