import type { ImportResult, ImportCollection, ImportRequest, ImportEnvironment } from "./types";
import { generateId } from "./types";

interface PostmanCollection {
  info?: {
    _postman_id?: string;
    name?: string;
    description?: string;
    schema?: string;
  };
  item?: PostmanItem[];
  variable?: Array<{ key: string; value: string; enabled?: boolean }>;
  auth?: PostmanAuth;
}

interface PostmanItem {
  name?: string;
  id?: string;
  description?: string;
  request?: PostmanRequest | string;
  response?: PostmanResponse[];
  item?: PostmanItem[];
}

interface PostmanRequest {
  method?: string;
  url?: PostmanUrl | string;
  header?: Array<{ key?: string; value?: string; disabled?: boolean }>;
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanUrl {
  raw?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string; disabled?: boolean }>;
  variable?: Array<{ key: string; value: string }>;
}

interface PostmanBody {
  mode?: string;
  raw?: string;
  formdata?: Array<{ key: string; value: string; type?: string; disabled?: boolean }>;
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>;
  graphql?: { query: string; variables?: string };
}

interface PostmanAuth {
  type?: string;
  bearer?: Array<{ key: string; value: string }>;
  basic?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string }>;
  oauth2?: Array<{ key: string; value: string }>;
}

interface PostmanResponse {
  id?: string;
  name?: string;
  status?: string;
  code?: number;
  header?: Array<{ key: string; value: string }>;
  body?: string;
}

interface PostmanEnvironment {
  id?: string;
  name?: string;
  values?: Array<{ key?: string; value?: string; enabled?: boolean; type?: string }>;
}

export function parsePostmanCollection(content: string): ImportResult {
  let data: PostmanCollection;

  try {
    data = JSON.parse(content);
  } catch (error) {
    return {
      type: "collection",
      name: "Import Failed",
      errors: [`Failed to parse Postman collection: ${error instanceof Error ? error.message : "Invalid JSON"}`],
      collections: [],
    };
  }

  const collectionName = data.info?.name || "Imported Collection";
  const collectionId = generateId();

  const requests = parseItems(data.item || [], collectionId, data.auth);

  const collection: ImportCollection = {
    id: collectionId,
    name: collectionName,
    description: data.info?.description,
  };

  return {
    type: "collection",
    name: collectionName,
    collections: [collection],
    requests,
  };
}

function parseItems(
  items: PostmanItem[],
  collectionId: string,
  defaultAuth?: PostmanAuth
): ImportRequest[] {
  const requests: ImportRequest[] = [];

  for (const item of items) {
    if (item.item) {
      requests.push(...parseItems(item.item, collectionId, defaultAuth));
      continue;
    }

    if (item.request) {
      const request = parseRequest(item, collectionId, defaultAuth);
      if (request) {
        requests.push(request);
      }
    }
  }

  return requests;
}

function parseRequest(
  item: PostmanItem,
  collectionId: string,
  defaultAuth?: PostmanAuth
): ImportRequest | null {
  if (!item.request) return null;

  const req = typeof item.request === "string" 
    ? { method: "GET", url: item.request }
    : item.request;

  const method = req.method?.toUpperCase() || "GET";
  const url = parseUrl(req.url);

  const headers = (req.header || [])
    .filter((h) => h.key && !h.disabled)
    .map((h) => ({
      name: h.key || "",
      value: h.value || "",
      enabled: !h.disabled,
    }));

  const body = parseBody(req.body);

  const auth = parseAuth(req.auth || defaultAuth);

  return {
    id: item.id || generateId(),
    name: item.name || `${method} ${url}`,
    method,
    url,
    headers,
    body,
    auth,
    description: item.description || (typeof req.description === "string" ? req.description : undefined),
  };
}

function parseUrl(url: PostmanUrl | string | undefined): string {
  if (!url) return "";
  if (typeof url === "string") return url;

  if (url.raw) return url.raw;

  const host = Array.isArray(url.host) ? url.host.join(".") : url.host || "";
  const path = Array.isArray(url.path) ? "/" + url.path.join("/") : "";

  let fullUrl = host + path;

  if (url.query && url.query.length > 0) {
    const queryString = url.query
      .filter((q) => !q.disabled)
      .map((q) => `${q.key}=${q.value}`)
      .join("&");
    fullUrl += `?${queryString}`;
  }

  return fullUrl;
}

function parseBody(body: PostmanBody | undefined): ImportRequest["body"] {
  if (!body) return undefined;

  switch (body.mode) {
    case "raw":
      return { mode: "raw", raw: body.raw || "" };

    case "formdata":
      return {
        mode: "formdata",
        formData: (body.formdata || [])
          .filter((f) => !f.disabled)
          .map((f) => ({
            key: f.key,
            value: f.value,
            type: f.type || "text",
          })),
      };

    case "urlencoded":
      return {
        mode: "urlencoded",
        urlEncoded: (body.urlencoded || [])
          .filter((f) => !f.disabled)
          .map((f) => ({
            key: f.key,
            value: f.value,
          })),
      };

    case "graphql":
      return {
        mode: "graphql",
        graphql: {
          query: body.graphql?.query || "",
          variables: body.graphql?.variables,
        },
      };

    default:
      return undefined;
  }
}

function parseAuth(auth: PostmanAuth | undefined): ImportRequest["auth"] {
  if (!auth || !auth.type) {
    return { type: "none" };
  }

  switch (auth.type) {
    case "bearer":
      const bearerToken = auth.bearer?.find((b) => b.key === "token")?.value;
      return {
        type: "bearer",
        bearer: { token: bearerToken || "{{token}}" },
      };

    case "basic":
      const username = auth.basic?.find((b) => b.key === "username")?.value || "";
      const password = auth.basic?.find((b) => b.key === "password")?.value || "";
      return {
        type: "basic",
        basic: { username, password },
      };

    case "apikey":
      const key = auth.apikey?.find((a) => a.key === "key")?.value || "X-API-Key";
      const value = auth.apikey?.find((a) => a.key === "value")?.value || "";
      const addTo = auth.apikey?.find((a) => a.key === "in")?.value || "header";
      return {
        type: "apikey",
        apikey: {
          key,
          value,
          addTo: addTo as "header" | "query",
        },
      };

    case "oauth2":
      const oauthToken = auth.oauth2?.find((o) => o.key === "accessToken")?.value;
      if (oauthToken) {
        return {
          type: "bearer",
          bearer: { token: oauthToken },
        };
      }
      return { type: "none" };

    default:
      return { type: "none" };
  }
}

export function parsePostmanEnvironment(content: string): ImportResult {
  let data: PostmanEnvironment;

  try {
    data = JSON.parse(content);
  } catch (error) {
    return {
      type: "environment",
      name: "Import Failed",
      errors: [`Failed to parse Postman environment: ${error instanceof Error ? error.message : "Invalid JSON"}`],
      environments: [],
    };
  }

  const env: ImportEnvironment = {
    id: generateId(),
    name: data.name || "Imported Environment",
    values: (data.values || [])
      .filter((v) => v.key && v.enabled !== false)
      .map((v) => ({
        key: v.key || "",
        value: v.value || "",
        enabled: v.enabled !== false,
      })),
  };

  return {
    type: "environment",
    name: env.name,
    environments: [env],
  };
}
