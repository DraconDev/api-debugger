import { describe, it, expect } from "vitest";

describe("Diff Engine", () => {
  it("should detect status changes", () => {
    const result = diffStatus(401, 200);

    expect(result.original).toBe(401);
    expect(result.replay).toBe(200);
  });

  it("should detect added headers", () => {
    const original = [
      { name: "Content-Type", value: "application/json" },
    ];
    const modified = [
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "Bearer token" },
    ];

    const result = diffHeaders(original, modified);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe("Authorization");
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
  });

  it("should detect removed headers", () => {
    const original = [
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "Bearer token" },
    ];
    const modified = [
      { name: "Content-Type", value: "application/json" },
    ];

    const result = diffHeaders(original, modified);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].name).toBe("Authorization");
  });

  it("should detect changed headers", () => {
    const original = [
      { name: "Authorization", value: "Bearer old-token" },
    ];
    const modified = [
      { name: "Authorization", value: "Bearer new-token" },
    ];

    const result = diffHeaders(original, modified);

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].name).toBe("Authorization");
    expect(result.changed[0].originalValue).toBe("Bearer old-token");
    expect(result.changed[0].replayValue).toBe("Bearer new-token");
  });

  it("should handle case-insensitive header comparison", () => {
    const original = [
      { name: "content-type", value: "application/json" },
    ];
    const modified = [
      { name: "Content-Type", value: "application/json" },
    ];

    const result = diffHeaders(original, modified);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
  });

  it("should detect multiple changes", () => {
    const original = [
      { name: "Content-Type", value: "text/html" },
      { name: "Accept", value: "*/*" },
    ];
    const modified = [
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "Bearer token" },
    ];

    const result = diffHeaders(original, modified);

    expect(result.changed).toHaveLength(1); // Content-Type changed
    expect(result.added).toHaveLength(1); // Authorization added
    expect(result.removed).toHaveLength(1); // Accept removed
  });

  it("should handle empty headers", () => {
    const result = diffHeaders([], []);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
  });
});

function diffStatus(original: number, replay: number) {
  return { original, replay };
}

function diffHeaders(original: any[], modified: any[]) {
  const mapO = new Map(original.map((h) => [h.name.toLowerCase(), h.value]));
  const mapM = new Map(modified.map((h) => [h.name.toLowerCase(), h.value]));
  const added: any[] = [];
  const removed: any[] = [];
  const changed: any[] = [];

  for (const [name, value] of mapM) {
    if (!mapO.has(name)) {
      added.push({ name, value });
    } else if (mapO.get(name) !== value) {
      changed.push({ name, originalValue: mapO.get(name), replayValue: value });
    }
  }

  for (const [name, value] of mapO) {
    if (!mapM.has(name)) {
      removed.push({ name, value });
    }
  }

  return { added, removed, changed };
}
