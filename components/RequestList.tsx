import type { RequestRecord } from "@/types";

interface RequestListProps {
  requests: RequestRecord[];
  onSelectRequest: (request: RequestRecord) => void;
}

export function RequestList({ requests, onSelectRequest }: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No requests captured yet.
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-success";
    if (status >= 400 && status < 500) return "text-warning";
    if (status >= 500) return "text-destructive";
    return "text-muted-foreground";
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "text-primary";
      case "POST":
        return "text-success";
      case "PUT":
        return "text-warning";
      case "DELETE":
        return "text-destructive";
      case "PATCH":
        return "text-accent";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="divide-y">
      {requests.map((request) => (
        <button
          key={request.id}
          onClick={() => onSelectRequest(request)}
          className="w-full p-2 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`font-mono font-medium ${getMethodColor(request.method)}`}
            >
              {request.method}
            </span>
            <span className={`font-mono ${getStatusColor(request.statusCode)}`}>
              {request.statusCode}
            </span>
            <span className="text-muted-foreground text-xs truncate flex-1">
              {request.url}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {request.duration.toFixed(0)}ms
          </div>
        </button>
      ))}
    </div>
  );
}
