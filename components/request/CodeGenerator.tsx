import { useState } from "react";
import type { RequestConfig } from "@/types";

interface CodeGeneratorProps {
  request: RequestConfig;
}

type Language = "curl" | "fetch" | "axios" | "python" | "go" | "java" | "php" | "rust";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "curl", label: "cURL" },
  { value: "fetch", label: "Fetch" },
  { value: "axios", label: "Axios" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
  { value: "rust", label: "Rust" },
];

export function CodeGenerator({ request }: CodeGeneratorProps) {
  const [language, setLanguage] = useState<Language>("curl");
  const [copied, setCopied] = useState(false);

  const code = generateCode(request, language);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Code Snippet</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Language Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            onClick={() => setLanguage(lang.value)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
              language === lang.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap break-all">
          {code}
        </pre>
      </div>
    </div>
  );
}

function generateCode(request: RequestConfig, language: Language): string {
  const { method, url, headers, bodyType, body, auth } = request;

  const allHeaders: Record<string, string> = {};
  headers.forEach((h) => {
    if (h.enabled !== false && h.name) {
      allHeaders[h.name] = h.value;
    }
  });

  if (auth.type === "bearer" && auth.bearer?.token) {
    allHeaders["Authorization"] = `Bearer ${auth.bearer.token}`;
  } else if (auth.type === "basic" && auth.basic) {
    const encoded = btoa(`${auth.basic.username}:${auth.basic.password}`);
    allHeaders["Authorization"] = `Basic ${encoded}`;
  } else if (auth.type === "api-key" && auth.apiKey) {
    if (auth.apiKey.addTo === "header") {
      allHeaders[auth.apiKey.key] = auth.apiKey.value;
    }
  }

  const bodyContent = bodyType === "json" ? body.json : bodyType === "raw" ? body.raw : null;

  switch (language) {
    case "curl":
      return generateCurl(method, url, allHeaders, bodyContent);
    case "fetch":
      return generateFetch(method, url, allHeaders, bodyContent);
    case "axios":
      return generateAxios(method, url, allHeaders, bodyContent);
    case "python":
      return generatePython(method, url, allHeaders, bodyContent);
    case "go":
      return generateGo(method, url, allHeaders, bodyContent);
    case "java":
      return generateJava(method, url, allHeaders, bodyContent);
    case "php":
      return generatePHP(method, url, allHeaders, bodyContent);
    case "rust":
      return generateRust(method, url, allHeaders, bodyContent);
    default:
      return "";
  }
}

function generateCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  const parts = [`curl -X ${method}`];

  Object.entries(headers).forEach(([name, value]) => {
    parts.push(`-H '${name}: ${value}'`);
  });

  if (body) {
    parts.push(`-d '${body.replace(/'/g, "'\\''")}'`);
  }

  parts.push(`'${url}'`);

  return parts.join(" \\\n  ");
}

function generateFetch(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  const headersStr = Object.keys(headers).length > 0
    ? JSON.stringify(headers, null, 4)
    : "{}";

  let code = `fetch('${url}', {\n`;
  code += `  method: '${method}',\n`;
  code += `  headers: ${headersStr},\n`;
  if (body) {
    code += `  body: '${body.replace(/'/g, "\\'")}',\n`;
  }
  code += `})\n`;
  code += `.then(response => response.json())\n`;
  code += `.then(data => console.log(data))\n`;
  code += `.catch(error => console.error('Error:', error));`;

  return code;
}

function generateAxios(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  const methodLower = method.toLowerCase();

  let code = `import axios from 'axios';\n\n`;

  const config: Record<string, unknown> = {
    method: methodLower,
    url,
    headers,
  };

  if (body) {
    try {
      config.data = JSON.parse(body);
    } catch {
      config.data = body;
    }
  }

  code += `axios(${JSON.stringify(config, null, 2)})\n`;
  code += `.then(response => {\n`;
  code += `  console.log(response.data);\n`;
  code += `})\n`;
  code +=`.catch(error => {\n`;
  code += `  console.error('Error:', error);\n`;
  code += `});`;

  return code;
}

function generatePython(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  let code = `import requests\n\n`;

  code += `url = '${url}'\n`;
  code += `headers = ${JSON.stringify(headers, null, 4)}\n`;

  if (body) {
    try {
      code += `data = ${JSON.stringify(JSON.parse(body), null, 4)}\n`;
      code += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers, json=data)`;
    } catch {
      code += `data = '${body.replace(/'/g, "\\'")}'\n`;
      code += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers, data=data)`;
    }
  } else {
    code += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)`;
  }

  code += `\n\nprint(response.status_code)`;
  code += `\nprint(response.json())`;

  return code;
}

function generateGo(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  let code = `package main\n\n`;
  code += `import (\n`;
  code += `  "bytes"\n`;
  code += `  "encoding/json"\n`;
  code += `  "fmt"\n`;
  code += `  "io"\n`;
  code += `  "net/http"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;

  if (body) {
    code += `  body := []byte(\`${body}\`)\n`;
    code += `  req, _ := http.NewRequest("${method}", "${url}", bytes.NewBuffer(body))\n`;
  } else {
    code += `  req, _ := http.NewRequest("${method}", "${url}", nil)\n`;
  }

  Object.entries(headers).forEach(([name, value]) => {
    code += `  req.Header.Set("${name}", "${value}")\n`;
  });

  code += `\n  client := &http.Client{}\n`;
  code += `  resp, _ := client.Do(req)\n`;
  code += `  defer resp.Body.Close()\n\n`;
  code += `  bodyBytes, _ := io.ReadAll(resp.Body)\n`;
  code += `  fmt.Println(string(bodyBytes))\n`;
  code += `}`;

  return code;
}

function generateJava(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  let code = `import java.net.URI;\n`;
  code += `import java.net.http.HttpClient;\n`;
  code += `import java.net.http.HttpRequest;\n`;
  code += `import java.net.http.HttpResponse;\n\n`;
  code += `public class Main {\n`;
  code += `  public static void main(String[] args) throws Exception {\n`;

  if (body) {
    code += `    HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `      .uri(URI.create("${url}"))\n`;
    code += `      .header("Content-Type", "application/json")\n`;
    Object.entries(headers).forEach(([name, value]) => {
      code += `      .header("${name}", "${value}")\n`;
    });
    code += `      .method("${method}", HttpRequest.BodyPublishers.ofString("${body.replace(/"/g, '\\"')}"))\n`;
    code += `      .build();\n`;
  } else {
    code += `    HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `      .uri(URI.create("${url}"))\n`;
    Object.entries(headers).forEach(([name, value]) => {
      code += `      .header("${name}", "${value}")\n`;
    });
    code += `      .method("${method}", HttpRequest.BodyPublishers.noBody())\n`;
    code += `      .build();\n`;
  }

  code += `\n    HttpClient client = HttpClient.newHttpClient();\n`;
  code += `    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n`;
  code += `    System.out.println(response.body());\n`;
  code += `  }\n`;
  code += `}`;

  return code;
}

function generatePHP(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  let code = `<?php\n\n`;
  code += `$ch = curl_init();\n\n`;
  code += `curl_setopt($ch, CURLOPT_URL, '${url}');\n`;
  code += `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n`;
  code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');\n`;

  if (Object.keys(headers).length > 0) {
    const headersArray = Object.entries(headers).map(
      ([name, value]) => `'${name}: ${value}'`
    );
    code += `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n  ${headersArray.join(",\n  ")}\n]);\n`;
  }

  if (body) {
    code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');\n`;
  }

  code += `\n$response = curl_exec($ch);\n`;
  code += `curl_close($ch);\n\n`;
  code += `echo $response;\n`;

  return code;
}

function generateRust(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null | undefined
): string {
  let code = `use reqwest::Client;\n\n`;
  code += `#[tokio::main]\n`;
  code += `async fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
  code += `  let client = Client::new();\n\n`;

  code += `  let mut request = client.${method.toLowerCase()}("${url}");\n`;

  Object.entries(headers).forEach(([name, value]) => {
    code += `    .header("${name}", "${value}")\n`;
  });

  if (body) {
    code += `    .body("${body.replace(/"/g, '\\"')}")\n`;
  }

  code += `;\n\n`;
  code += `  let response = request.send().await?;\n`;
  code += `  let body = response.text().await?;\n`;
  code += `  println!("{}", body);\n\n`;
  code += `  Ok(())\n`;
  code += `}`;

  return code;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
