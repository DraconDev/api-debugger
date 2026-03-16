import type {
  ImportResult,
  ImportRequest,
  ImportCollection,
  ImportEnvironment,
} from "./types";

interface InsomniaResource {
  _type: string;
  _id: string;
  parentId?: string;
  name?: string;
  method?: string;
  url?: string;
  headers?: Array<{ name: string; value: string; disabled?: boolean }>;
  body?: {
    mimeType?: string;
    text?: string;
    params?: Array<{ name: string; value: string }>;
  };
  authentication?: Record<string, unknown>;
  description?: string;
  data?: Record<string, string>;
}

interface InsomniaExport {
  _type: "export";
  __export_format: number;
  resources: InsomniaResource[];
}

export function parseInsomnia(content: string): ImportResult {
  try {
    const data: InsomniaExport = JSON.parse(content);
    const resources: InsomniaResource[] = data.resources || [];

    // Group by workspace
    const workspaces = resources.filter((r) => r._type === "workspace");
    const folders = resources.filter((r) => r._type === "request_group");
    const requests = resources.filter((r) => r._type === "request");
    const environments = resources.filter((r) => r._type === "environment");

    if (workspaces.length === 0) {
      // No workspace, treat all requests as flat collection
      return {
        type: "collection",
        name: "Insomnia Import",
        collections: [
          {
            id: `insomnia-${Date.now()}`,
            name: "Insomnia Requests",
            folders: [],
          },
        ],
        requests: requests.map((r) => convertRequest(r)),
        environments: environments
          .filter((e) => e.data && Object.keys(e.data).length > 0)
          .map((e) => convertEnvironment(e)),
      };
    }

    const collections: ImportCollection[] = workspaces.map((ws) => {
      const wsFolders = folders.filter((f) => f.parentId === ws._id);

      return {
        id: ws._id,
        name: ws.name || "Imported Workspace",
        description: ws.description,
        folders: wsFolders.map((folder) => ({
          id: folder._id,
          name: folder.name || "Folder",
          description: folder.description,
          requests: requests
            .filter((r) => r.parentId === folder._id)
            .map((r) => convertRequest(r, ws._id)),
        })),
      };
    });

    // Add requests that belong to workspaces but not to any folder
    for (const col of collections) {
      const orphanRequests = requests.filter(
        (r) =>
          r.parentId === col.id && !folders.some((f) => f._id === r.parentId),
      );
      if (orphanRequests.length > 0 && col.folders) {
        col.folders.push({
          id: `${col.id}-root`,
          name: "Requests",
          requests: orphanRequests.map((r) => convertRequest(r, col.id)),
        });
      }
    }

    return {
      type: "collection",
      name: workspaces[0]?.name || "Insomnia Import",
      collections,
      requests: [],
      environments: environments
        .filter((e) => e.data && Object.keys(e.data).length > 0)
        .map((e) => convertEnvironment(e)),
    };
  } catch (err) {
    return {
      type: "collection",
      name: "Import Failed",
      errors: [
        `Failed to parse Insomnia export: ${err instanceof Error ? err.message : "Unknown error"}`,
      ],
      collections: [],
    };
  }
}

function convertRequest(
  r: InsomniaResource,
  collectionId?: string,
): ImportRequest {
  const headers = (r.headers || [])
    .filter((h) => !h.disabled)
    .map((h) => ({ name: h.name, value: h.value, enabled: true }));

  let body: ImportRequest["body"] = undefined;
  if (r.body) {
    if (
      r.body.mimeType === "application/json" ||
      r.body.mimeType === "text/plain"
    ) {
      body = { mode: "raw", raw: r.body.text || "" };
    } else if (r.body.mimeType === "multipart/form-data" && r.body.params) {
      body = {
        mode: "formdata",
        formData: r.body.params.map((p) => ({
          key: p.name,
          value: p.value,
          type: "text",
        })),
      };
    } else if (
      r.body.mimeType === "application/x-www-form-urlencoded" &&
      r.body.params
    ) {
      body = {
        mode: "urlencoded",
        urlEncoded: r.body.params.map((p) => ({ key: p.name, value: p.value })),
      };
    } else if (r.body.text) {
      body = { mode: "raw", raw: r.body.text };
    }
  }

  let auth: ImportRequest["auth"] = undefined;
  if (r.authentication && r.authentication.type) {
    const authType = r.authentication.type as string;
    if (authType === "bearer") {
      auth = {
        type: "bearer",
        bearer: { token: String(r.authentication.token || "") },
      };
    } else if (authType === "basic") {
      auth = {
        type: "basic",
        basic: {
          username: String(r.authentication.username || ""),
          password: String(r.authentication.password || ""),
        },
      };
    } else if (authType === "apikey") {
      auth = {
        type: "apikey",
        apikey: {
          key: String(r.authentication.key || ""),
          value: String(r.authentication.value || ""),
          addTo: (r.authentication.addTo as "header" | "query") || "header",
        },
      };
    }
  }

  return {
    id: r._id,
    name: r.name || `${r.method} Request`,
    method: r.method || "GET",
    url: r.url || "",
    collectionId,
    headers,
    body,
    auth,
    description: r.description,
  };
}

function convertEnvironment(e: InsomniaResource): ImportEnvironment {
  const values: ImportEnvironment["values"] = [];
  if (e.data) {
    for (const [key, value] of Object.entries(e.data)) {
      if (key.startsWith("_") || key.startsWith("$")) continue;
      values.push({ key, value: String(value), enabled: true });
    }
  }
  return {
    id: e._id,
    name: e.name || "Environment",
    values,
  };
}
