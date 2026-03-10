import type { RequestRecord } from "@/types";

interface ExportPanelProps {
  request: RequestRecord;
}

function toCurl(request: RequestRecord): string {
  const parts = [`curl -X ${request.method}`];

  if (request.requestHeaders?.length) {
    request.requestHeaders.forEach((h) => {
      parts.push(`-H '${h.name}: ${h.value}'`);
    });
  }

  if (request.requestBodyText) {
    parts.push(`-d '${request.requestBodyText}'`);
  }

  parts.push(`'${request.url}'`);

  return parts.join(" \\\n  ");
}

function toFetch(request: RequestRecord): string {
  const headers: Record<string, string> = {};
  request.requestHeaders?.forEach((h) => {
    headers[h.name] = h.value;
  });

  const options: Record<string, unknown> = {
    method: request.method,
    headers,
  };

  if (request.requestBodyText) {
    options.body = request.requestBodyText;
  }

  return `fetch('${request.url}', ${JSON.stringify(options, null, 2)});`;
}

export function ExportPanel({ request }: ExportPanelProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyCurl = async () => {
    await copyToClipboard(toCurl(request));
  };

  const handleCopyFetch = async () => {
    await copyToClipboard(toFetch(request));
  };

  return (
    <div className="p-3 border-b">
      <h3 className="text-xs font-medium mb-2">Export</h3>
      <div className="flex gap-2">
        <button
          onClick={handleCopyCurl}
          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Copy as cURL
        </button>
        <button
          onClick={handleCopyFetch}
          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Copy as Fetch
        </button>
      </div>
    </div>
  );
}
