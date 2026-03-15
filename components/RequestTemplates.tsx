import { useState } from "react";
import type { RequestConfig } from "@/types";

interface RequestTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  config: Partial<RequestConfig>;
}

const TEMPLATES: RequestTemplate[] = [
  {
    id: "rest-get",
    name: "REST GET Request",
    category: "REST",
    description: "Basic GET request to fetch data",
    config: {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [
        { name: "Accept", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "none",
      body: {},
      auth: { type: "none" },
    },
  },
  {
    id: "rest-post",
    name: "REST POST Request",
    category: "REST",
    description: "Create a new resource with JSON body",
    config: {
      method: "POST",
      url: "https://jsonplaceholder.typicode.com/posts",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
        { name: "Accept", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            title: "My Post",
            body: "This is the body of my post.",
            userId: 1,
          },
          null,
          2
        ),
      },
      auth: { type: "none" },
    },
  },
  {
    id: "rest-put",
    name: "REST PUT Request",
    category: "REST",
    description: "Update an existing resource",
    config: {
      method: "PUT",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            id: 1,
            title: "Updated Title",
            body: "Updated body content.",
            userId: 1,
          },
          null,
          2
        ),
      },
      auth: { type: "none" },
    },
  },
  {
    id: "rest-delete",
    name: "REST DELETE Request",
    category: "REST",
    description: "Delete a resource",
    config: {
      method: "DELETE",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [],
      params: [],
      bodyType: "none",
      body: {},
      auth: { type: "none" },
    },
  },
  {
    id: "auth-bearer",
    name: "Bearer Token Auth",
    category: "Authentication",
    description: "Request with Bearer token authentication",
    config: {
      method: "GET",
      url: "https://api.example.com/user",
      headers: [
        { name: "Accept", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "none",
      body: {},
      auth: {
        type: "bearer",
        bearer: { token: "your-access-token-here" },
      },
    },
  },
  {
    id: "auth-basic",
    name: "Basic Auth",
    category: "Authentication",
    description: "Request with Basic authentication",
    config: {
      method: "GET",
      url: "https://api.example.com/protected",
      headers: [],
      params: [],
      bodyType: "none",
      body: {},
      auth: {
        type: "basic",
        basic: { username: "your-username", password: "your-password" },
      },
    },
  },
  {
    id: "auth-apikey",
    name: "API Key Auth",
    category: "Authentication",
    description: "Request with API key in header",
    config: {
      method: "GET",
      url: "https://api.example.com/data",
      headers: [],
      params: [],
      bodyType: "none",
      body: {},
      auth: {
        type: "api-key",
        apiKey: {
          key: "X-API-Key",
          value: "your-api-key-here",
          addTo: "header",
        },
      },
    },
  },
  {
    id: "graphql-query",
    name: "GraphQL Query",
    category: "GraphQL",
    description: "Basic GraphQL query",
    config: {
      method: "POST",
      url: "https://countries.trevorblades.com/graphql",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            query: `{
  countries {
    code
    name
    continent {
      name
    }
  }
}`,
          },
          null,
          2
        ),
      },
      auth: { type: "none" },
    },
  },
  {
    id: "graphql-mutation",
    name: "GraphQL Mutation",
    category: "GraphQL",
    description: "GraphQL mutation with variables",
    config: {
      method: "POST",
      url: "https://api.example.com/graphql",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            query: `mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}`,
            variables: {
              input: {
                name: "John Doe",
                email: "john@example.com",
              },
            },
          },
          null,
          2
        ),
      },
      auth: { type: "none" },
    },
  },
  {
    id: "form-urlencoded",
    name: "Form URL Encoded",
    category: "Forms",
    description: "Submit form data as URL encoded",
    config: {
      method: "POST",
      url: "https://httpbin.org/post",
      headers: [
        { name: "Content-Type", value: "application/x-www-form-urlencoded", enabled: true },
      ],
      params: [],
      bodyType: "x-www-form-urlencoded",
      body: {
        urlEncoded: [
          { name: "username", value: "john_doe" },
          { name: "password", value: "secret123" },
          { name: "remember", value: "true" },
        ],
      },
      auth: { type: "none" },
    },
  },
  {
    id: "form-multipart",
    name: "Form Multipart",
    category: "Forms",
    description: "Submit form data with file upload support",
    config: {
      method: "POST",
      url: "https://httpbin.org/post",
      headers: [],
      params: [],
      bodyType: "form-data",
      body: {
        formData: [
          { name: "field1", value: "value1", type: "text", enabled: true },
          { name: "field2", value: "value2", type: "text", enabled: true },
        ],
      },
      auth: { type: "none" },
    },
  },
  {
    id: "openai-chat",
    name: "OpenAI Chat Completion",
    category: "AI APIs",
    description: "OpenAI GPT chat completion request",
    config: {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: "Hello, how are you?" },
            ],
            max_tokens: 100,
          },
          null,
          2
        ),
      },
      auth: {
        type: "bearer",
        bearer: { token: "sk-your-openai-api-key" },
      },
    },
  },
  {
    id: "anthropic-chat",
    name: "Anthropic Claude",
    category: "AI APIs",
    description: "Anthropic Claude messages request",
    config: {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      headers: [
        { name: "Content-Type", value: "application/json", enabled: true },
        { name: "anthropic-version", value: "2023-06-01", enabled: true },
      ],
      params: [],
      bodyType: "json",
      body: {
        json: JSON.stringify(
          {
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: [{ role: "user", content: "Hello, Claude!" }],
          },
          null,
          2
        ),
      },
      auth: {
        type: "api-key",
        apiKey: {
          key: "x-api-key",
          value: "your-anthropic-api-key",
          addTo: "header",
        },
      },
    },
  },
  {
    id: "stripe-customers",
    name: "Stripe List Customers",
    category: "Payment APIs",
    description: "List Stripe customers",
    config: {
      method: "GET",
      url: "https://api.stripe.com/v1/customers",
      headers: [],
      params: [
        { name: "limit", value: "10", enabled: true },
      ],
      bodyType: "none",
      body: {},
      auth: {
        type: "bearer",
        bearer: { token: "sk_test_your-stripe-secret-key" },
      },
    },
  },
  {
    id: "github-repos",
    name: "GitHub List Repos",
    category: "Developer APIs",
    description: "List repositories for a GitHub user",
    config: {
      method: "GET",
      url: "https://api.github.com/users/github/repos",
      headers: [
        { name: "Accept", value: "application/vnd.github.v3+json", enabled: true },
      ],
      params: [
        { name: "sort", value: "updated", enabled: true },
        { name: "per_page", value: "10", enabled: true },
      ],
      bodyType: "none",
      body: {},
      auth: { type: "none" },
    },
  },
];

interface RequestTemplatesProps {
  onSelect: (config: RequestConfig) => void;
}

export function RequestTemplates({ onSelect }: RequestTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  const filteredTemplates = selectedCategory
    ? TEMPLATES.filter((t) => t.category === selectedCategory)
    : TEMPLATES;

  const handleSelect = (template: RequestTemplate) => {
    const config: RequestConfig = {
      method: template.config.method || "GET",
      url: template.config.url || "",
      params: template.config.params || [],
      headers: template.config.headers || [],
      bodyType: template.config.bodyType || "none",
      body: template.config.body || {},
      auth: template.config.auth || { type: "none" },
    };
    onSelect(config);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-1">Request Templates</h2>
        <p className="text-sm text-muted-foreground">
          Quick-start templates for common API patterns
        </p>
      </div>

      <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="grid gap-2">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="p-3 text-left bg-card border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                    template.config.method === "GET"
                      ? "text-success bg-success/10"
                      : template.config.method === "POST"
                      ? "text-amber-500 bg-amber-500/10"
                      : template.config.method === "PUT"
                      ? "text-blue-500 bg-blue-500/10"
                      : template.config.method === "DELETE"
                      ? "text-red-500 bg-red-500/10"
                      : "text-muted-foreground bg-muted"
                  }`}
                >
                  {template.config.method}
                </span>
                <span className="font-medium text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <p className="text-xs font-mono text-primary mt-2 truncate">
                {template.config.url}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
