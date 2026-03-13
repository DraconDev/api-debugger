import { useMemo } from "react";

interface DiffViewerProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
}

interface DiffLine {
  leftNum: number | null;
  rightNum: number | null;
  leftContent: string;
  rightContent: string;
  type: "same" | "added" | "removed" | "modified";
}

export function DiffViewer({ left, right, leftLabel = "Before", rightLabel = "After" }: DiffViewerProps) {
  const diff = useMemo(() => computeDiff(left, right), [left, right]);

  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === "added").length;
    const removed = diff.filter((d) => d.type === "removed").length;
    const modified = diff.filter((d) => d.type === "modified").length;
    return { added, removed, modified, unchanged: diff.length - added - removed - modified };
  }, [diff]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-border text-xs">
        <span className="font-medium">Changes:</span>
        {stats.added > 0 && <span className="text-emerald-500">+{stats.added} added</span>}
        {stats.removed > 0 && <span className="text-red-500">-{stats.removed} removed</span>}
        {stats.modified > 0 && <span className="text-amber-500">~{stats.modified} modified</span>}
        <span className="text-muted-foreground">{stats.unchanged} unchanged</span>
      </div>

      {/* Headers */}
      <div className="flex border-b border-border">
        <div className="w-1/2 px-3 py-1 text-xs font-medium border-r border-border bg-muted/30">
          {leftLabel}
        </div>
        <div className="w-1/2 px-3 py-1 text-xs font-medium bg-muted/30">
          {rightLabel}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {diff.map((line, index) => (
          <div key={index} className="flex">
            {/* Left side */}
            <div className="w-1/2 flex border-r border-border">
              <div className="w-8 flex-shrink-0 text-right pr-2 text-xs text-muted-foreground bg-muted/30 select-none border-r border-border">
                {line.leftNum || ""}
              </div>
              <div
                className={`flex-1 px-2 text-xs font-mono whitespace-pre overflow-x-auto ${
                  line.type === "removed"
                    ? "bg-red-500/10 text-red-400"
                    : line.type === "modified"
                    ? "bg-amber-500/10"
                    : ""
                }`}
              >
                {line.leftContent || "\u00A0"}
              </div>
            </div>

            {/* Right side */}
            <div className="w-1/2 flex">
              <div className="w-8 flex-shrink-0 text-right pr-2 text-xs text-muted-foreground bg-muted/30 select-none border-r border-border">
                {line.rightNum || ""}
              </div>
              <div
                className={`flex-1 px-2 text-xs font-mono whitespace-pre overflow-x-auto ${
                  line.type === "added"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : line.type === "modified"
                    ? "bg-amber-500/10"
                    : ""
                }`}
              >
                {line.rightContent || "\u00A0"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const result: DiffLine[] = [];

  const lcs = computeLCS(leftLines, rightLines);

  let leftIdx = 0;
  let rightIdx = 0;
  let lcsIdx = 0;

  while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
    const leftLine = leftLines[leftIdx];
    const rightLine = rightLines[rightIdx];
    const lcsLine = lcs[lcsIdx];

    if (lcsLine !== undefined && leftLine === lcsLine && rightLine === lcsLine) {
      result.push({
        leftNum: leftIdx + 1,
        rightNum: rightIdx + 1,
        leftContent: leftLine,
        rightContent: rightLine,
        type: "same",
      });
      leftIdx++;
      rightIdx++;
      lcsIdx++;
    } else if (rightLine !== undefined && (leftLine === undefined || (lcsLine !== undefined && rightLine !== lcsLine))) {
      if (leftLine !== undefined && leftLine !== lcsLine) {
        result.push({
          leftNum: leftIdx + 1,
          rightNum: rightIdx + 1,
          leftContent: leftLine,
          rightContent: rightLine,
          type: "modified",
        });
        leftIdx++;
      } else {
        result.push({
          leftNum: null,
          rightNum: rightIdx + 1,
          leftContent: "",
          rightContent: rightLine,
          type: "added",
        });
      }
      rightIdx++;
    } else if (leftLine !== undefined) {
      result.push({
        leftNum: leftIdx + 1,
        rightNum: null,
        leftContent: leftLine,
        rightContent: "",
        type: "removed",
      });
      leftIdx++;
    }
  }

  return result;
}

function computeLCS(left: string[], right: string[]): string[] {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift(left[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
