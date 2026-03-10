import type { RequestRecord } from "@/types";

interface RequestHeadersProps {
  request: RequestRecord;
  isResponse?: boolean;
}

export function RequestHeaders({ request, isResponse = false }: RequestHeadersProps) {
  const headers = isResponse ? request.responseHeaders : request.requestHeaders;

  if (!headers || headers.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No {isResponse ? "response" : "request"} headers
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3 className="text-xs font-medium mb-2">
        {isResponse ? "Response" : "Request"} Headers
      </h3>
      <div className="space-y-1">
        {headers.map((header, index) => (
          <div key={index} className="text-xs font-mono">
            <span className="text-muted-foreground">{header.name}:</span>{" "}
            <span>{header.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
