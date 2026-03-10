interface RequestBodyProps {
  body: string | null;
}

export function RequestBody({ body }: RequestBodyProps) {
  if (!body) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No request body
      </div>
    );
  }

  // Try to pretty-print JSON
  let displayBody = body;
  try {
    const parsed = JSON.parse(body);
    displayBody = JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON, use as-is
  }

  return (
    <div className="p-3">
      <h3 className="text-xs font-medium mb-2">Request Body</h3>
      <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-[200px]">
        {displayBody}
      </pre>
    </div>
  );
}
