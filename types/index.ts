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
  requestHeaders: chrome.webRequest.HttpHeader[];
  requestBody: Record<string, unknown> | null;
  requestBodyText: string | null;
  responseBodyText?: string;
  responseHeaders: chrome.webRequest.HttpHeader[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  requestCount: number;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  description?: string;
  request: RequestRecord;
  tags: string[];
  createdAt: number;
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
