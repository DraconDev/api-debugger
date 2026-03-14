import { useState } from "react";
import { RequestHeaders } from "./RequestHeaders";
import { RequestBody } from "./RequestBody";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { ExportPanel } from "./ExportPanel";
import { ReplayPanel } from "./ReplayPanel";
import { SaveToCollection } from "./SaveToCollection";
import type { RequestRecord } from "@/types";

interface RequestDetailProps {
  request: RequestRecord;
  onBack: () => void;
}

export function RequestDetail({ request, onBack }: RequestDetailProps) {
  const [activeTab, setActiveTab] = useState<"headers" | "body" | "response">("headers");

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm">{request.method}</span>
          <span className="font-mono text-sm">{request.statusCode}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate mt-1">
          {request.url}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDate(request.timeStamp)} · {request.duration.toFixed(0)}ms
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("headers")}
          className={`px-3 py-2 text-xs ${
            activeTab === "headers"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Headers
        </button>
        <button
          onClick={() => setActiveTab("body")}
          className={`px-3 py-2 text-xs ${
            activeTab === "body"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTab("response")}
          className={`px-3 py-2 text-xs ${
            activeTab === "response"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Response
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "headers" && (
          <RequestHeaders request={request} />
        )}
        {activeTab === "body" && (
          <RequestBody body={request.requestBodyText} />
        )}
        {activeTab === "response" && (
          <RequestHeaders request={request} isResponse />
        )}
      </div>

      {/* Panels */}
      <div className="border-t border-border overflow-auto max-h-[300px]">
        {request.statusCode >= 400 && <DiagnosticsPanel request={request} />}
        <ExportPanel request={request} />
        <ReplayPanel request={request} />
        <SaveToCollection request={request} />
      </div>
    </div>
  );
}
