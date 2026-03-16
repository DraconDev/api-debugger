import { describe, it, expect } from "vitest";
import { parseCurl } from "@/lib/importers/curl";
import { parseHar } from "@/lib/importers/har";
import { parsePostmanCollection } from "@/lib/importers/postman";
import { parseOpenAPI } from "@/lib/importers/openapi";
import { parseInsomnia } from "@/lib/importers/insomnia";
import { detectImportFormat } from "@/lib/importers/types";

describe("Importers", () => {
  describe("detectImportFormat", () => {
    it("detects OpenAPI JSON", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test" },
      });
      expect(detectImportFormat(content)).toBe("openapi");
    });

    it("detects Postman collection", () => {
      const content = JSON.stringify({
        info: {
          _postman_id: "123",
          schema: "https://schema.postman.com/collection.json",
        },
        item: [],
      });
      expect(detectImportFormat(content)).toBe("postman");
    });

    it("detects HAR", () => {
      const content = JSON.stringify({
        log: { version: "1.2", entries: [] },
      });
      expect(detectImportFormat(content)).toBe("har");
    });

    it("detects cURL", () => {
      const content = "curl https://api.example.com";
      expect(detectImportFormat(content)).toBe("curl");
    });
  });

  describe("parseCurl", () => {
    it("parses simple GET request", () => {
      const result = parseCurl("curl https://api.example.com/users");
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].method).toBe("GET");
      expect(result.requests?.[0].url).toBe("https://api.example.com/users");
    });

    it("parses POST request with data", () => {
      const result = parseCurl(
        'curl -X POST -d \'{"name":"test"}\' https://api.example.com/users',
      );
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].method).toBe("POST");
      expect(result.requests?.[0].body?.raw).toBe('{"name":"test"}');
    });

    it("parses headers", () => {
      const result = parseCurl(
        'curl -H "Content-Type: application/json" https://api.example.com',
      );
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].headers).toContainEqual({
        name: "Content-Type",
        value: "application/json",
        enabled: true,
      });
    });

    it("parses Bearer auth", () => {
      const result = parseCurl(
        'curl -H "Authorization: Bearer mytoken" https://api.example.com',
      );
      expect(result.requests?.[0].auth?.type).toBe("bearer");
      expect(result.requests?.[0].auth?.bearer?.token).toBe("mytoken");
    });
  });

  describe("parseHar", () => {
    it("parses HAR with entries", () => {
      const content = JSON.stringify({
        log: {
          version: "1.2",
          entries: [
            {
              request: {
                method: "GET",
                url: "https://api.example.com/users",
                headers: [{ name: "Accept", value: "application/json" }],
              },
              response: { status: 200, statusText: "OK" },
            },
          ],
        },
      });
      const result = parseHar(content);
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].method).toBe("GET");
      expect(result.requests?.[0].url).toBe("https://api.example.com/users");
    });
  });

  describe("parsePostmanCollection", () => {
    it("parses collection with requests", () => {
      const content = JSON.stringify({
        info: { name: "My Collection", _postman_id: "123" },
        item: [
          {
            name: "Get Users",
            request: {
              method: "GET",
              url: "https://api.example.com/users",
            },
          },
        ],
      });
      const result = parsePostmanCollection(content);
      expect(result.collections).toHaveLength(1);
      expect(result.collections?.[0].name).toBe("My Collection");
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].name).toBe("Get Users");
    });

    it("parses collection with folders", () => {
      const content = JSON.stringify({
        info: { name: "My Collection" },
        item: [
          {
            name: "Users",
            item: [
              { name: "List Users", request: { method: "GET", url: "/users" } },
              {
                name: "Create User",
                request: { method: "POST", url: "/users" },
              },
            ],
          },
        ],
      });
      const result = parsePostmanCollection(content);
      expect(result.requests).toHaveLength(2);
    });
  });

  describe("parseOpenAPI", () => {
    it("parses OpenAPI 3.0 spec", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Pet Store", version: "1.0.0" },
        paths: {
          "/pets": {
            get: {
              summary: "List all pets",
              responses: { "200": { description: "Success" } },
            },
            post: {
              summary: "Create a pet",
              requestBody: {
                content: {
                  "application/json": {
                    example: { name: "Fluffy" },
                  },
                },
              },
              responses: { "201": { description: "Created" } },
            },
          },
        },
      });
      const result = parseOpenAPI(content);
      expect(result.collections).toHaveLength(1);
      expect(result.collections?.[0].name).toBe("Pet Store");
      expect(result.requests).toHaveLength(2);
      expect(result.requests?.[0].method).toBe("GET");
      expect(result.requests?.[1].method).toBe("POST");
    });

    it("handles empty paths", () => {
      const content = JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Empty API" },
        paths: {},
      });
      const result = parseOpenAPI(content);
      expect(result.collections).toHaveLength(1);
      expect(result.requests).toHaveLength(0);
    });
  });

  describe("parseInsomnia", () => {
    it("detects Insomnia format", () => {
      const content = JSON.stringify({
        _type: "export",
        __export_format: 4,
        resources: [],
      });
      expect(detectImportFormat(content)).toBe("insomnia");
    });

    it("parses workspace with requests", () => {
      const content = JSON.stringify({
        _type: "export",
        __export_format: 4,
        resources: [
          { _type: "workspace", _id: "wrk_1", name: "My API" },
          {
            _type: "request",
            _id: "req_1",
            parentId: "wrk_1",
            name: "Get Users",
            method: "GET",
            url: "https://api.example.com/users",
          },
          {
            _type: "request",
            _id: "req_2",
            parentId: "wrk_1",
            name: "Create User",
            method: "POST",
            url: "https://api.example.com/users",
            body: { mimeType: "application/json", text: '{"name":"test"}' },
          },
        ],
      });
      const result = parseInsomnia(content);
      expect(result.collections).toHaveLength(1);
      expect(result.collections?.[0].name).toBe("My API");
    });

    it("parses folders", () => {
      const content = JSON.stringify({
        _type: "export",
        __export_format: 4,
        resources: [
          { _type: "workspace", _id: "wrk_1", name: "My API" },
          {
            _type: "request_group",
            _id: "fld_1",
            parentId: "wrk_1",
            name: "Users",
          },
          {
            _type: "request",
            _id: "req_1",
            parentId: "fld_1",
            name: "Get User",
            method: "GET",
            url: "https://api.example.com/users/1",
          },
        ],
      });
      const result = parseInsomnia(content);
      expect(result.collections?.[0].folders).toHaveLength(1);
      expect(result.collections?.[0].folders?.[0].name).toBe("Users");
      expect(result.collections?.[0].folders?.[0].requests).toHaveLength(1);
    });

    it("parses environments", () => {
      const content = JSON.stringify({
        _type: "export",
        __export_format: 4,
        resources: [
          { _type: "workspace", _id: "wrk_1", name: "My API" },
          {
            _type: "environment",
            _id: "env_1",
            name: "Production",
            data: { baseUrl: "https://api.example.com", apiKey: "secret" },
          },
        ],
      });
      const result = parseInsomnia(content);
      expect(result.environments).toHaveLength(1);
      expect(result.environments?.[0].name).toBe("Production");
      expect(result.environments?.[0].values).toHaveLength(2);
    });

    it("handles requests without workspace", () => {
      const content = JSON.stringify({
        _type: "export",
        __export_format: 4,
        resources: [
          {
            _type: "request",
            _id: "req_1",
            name: "Test",
            method: "GET",
            url: "https://example.com",
          },
        ],
      });
      const result = parseInsomnia(content);
      expect(result.requests).toHaveLength(1);
    });
  });
});
