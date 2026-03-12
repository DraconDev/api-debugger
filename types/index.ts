export interface HttpHeader {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface QueryParam {
  name: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface FormDataField {
  name: string;
  value: string;
  type: "text" | "file";
  enabled?: boolean;
}

export type BodyType = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

export type AuthType = "none" | "bearer" | "basic" | "api-key" | "oauth2";

export interface AuthConfig {
  type: AuthType;
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: "header" | "query";
  };
  oauth2?: {
    accessTokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken?: string;
  };
}

export interface RequestConfig {
  id?: string;
  name?: string;
  method: string;
  url: string;
  params: QueryParam[];
  headers: HttpHeader[];
  bodyType: BodyType;
  body: {
    raw?: string;
    json?: string;
    formData?: FormDataField[];
    urlEncoded?: { name: string; value: string }[];
    binary?: string;
  };
  auth: AuthConfig;
  extractions?: VariableExtraction[];
  preRequestScript?: string;
  postResponseScript?: string;
}

export interface RequestRecord {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  type?: string;
  tabId: number;
  startTime: number;
  timeStamp: number;
  duration: number;
  requestHeaders: HttpHeader[];
  requestBody: Record<string, unknown> | null;
  requestBodyText: string | null;
  responseBodyText?: string;
  responseHeaders: HttpHeader[];
  requestConfig?: RequestConfig;
}

export interface CollectionFolder {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  requestCount: number;
  folders?: CollectionFolder[];
  auth?: AuthConfig;
  headers?: HttpHeader[];
  variables?: Variable[];
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  folderId?: string;
  name: string;
  description?: string;
  request: RequestRecord;
  requestConfig?: RequestConfig;
  tags: string[];
  createdAt: number;
}

export interface Variable {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface VariableExtraction {
  id: string;
  variableName: string;
  source: "body" | "header";
  path: string;
  enabled?: boolean;
}

export interface RuntimeVariables {
  [key: string]: string;
}

export interface Environment {
  id: string;
  name: string;
  isActive: boolean;
  variables: Variable[];
  createdAt: number;
  updatedAt: number;
}

export interface Diagnostic {
  type: string;
  severity: "error" | "warning" | "info";
  title: string;
  explanation: string;
  evidence: Array<{
    source: string;
    field: string;
    value: string;
    description: string;
  }>;
  suggestions: string[];
  confidence: number;
}

export interface TimingBreakdown {
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export interface CapturedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  duration: number;
  size: number;
  timing?: TimingBreakdown;
}

export interface RequestTest {
  type: "status" | "header" | "body" | "responseTime";
  operator: "equals" | "contains" | "matches" | "lessThan" | "greaterThan";
  value: string;
  actual?: string;
  passed?: boolean;
}

export interface TestResult {
  passed: boolean;
  tests: RequestTest[];
  duration: number;
  error?: string;
}
