import type { ImportResult } from "./types";
import { detectImportFormat } from "./types";
import { parseOpenAPI } from "./openapi";
import { parsePostmanCollection, parsePostmanEnvironment } from "./postman";
import { parseHar } from "./har";
import { parseCurl } from "./curl";

export { detectImportFormat } from "./types";
export { parseOpenAPI } from "./openapi";
export { parsePostmanCollection, parsePostmanEnvironment } from "./postman";
export { parseHar } from "./har";
export { parseCurl } from "./curl";
export type { ImportResult, ImportCollection, ImportRequest, ImportEnvironment } from "./types";

export function importContent(content: string, filename?: string): ImportResult {
  const format = detectImportFormat(content, filename);

  switch (format) {
    case "openapi":
    case "openapi-yaml":
      return parseOpenAPI(content);

    case "postman":
      const data = JSON.parse(content);
      if (data.values && Array.isArray(data.values)) {
        return parsePostmanEnvironment(content);
      }
      return parsePostmanCollection(content);

    case "har":
      return parseHar(content);

    case "curl":
      return parseCurl(content);

    case "json":
      const jsonData = JSON.parse(content);
      if (jsonData.openapi || jsonData.swagger) {
        return parseOpenAPI(content);
      }
      if (jsonData.info?._postman_id || jsonData.info?.schema?.includes("postman")) {
        return parsePostmanCollection(content);
      }
      if (jsonData.log?.entries) {
        return parseHar(content);
      }
      return {
        type: "collection",
        name: "Unknown Format",
        errors: ["Unable to determine import format. Supported: OpenAPI, Postman, HAR, cURL"],
        collections: [],
      };

    default:
      return {
        type: "collection",
        name: "Unknown Format",
        errors: [`Unsupported format. Detected: ${format || "unknown"}. Supported: OpenAPI, Postman, HAR, cURL`],
        collections: [],
      };
  }
}
