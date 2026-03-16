import { useState, useEffect } from "react";
import {
  getChecklist,
  completeChecklistItem,
  resetChecklist,
  type ChecklistItem,
} from "@/lib/checklist";

interface GettingStartedProps {
  onNavigate: (view: string) => void;
}

export function GettingStarted({ onNavigate }: GettingStartedProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    setIsLoading(true);
    try {
      const checklist = await getChecklist();
      setItems(checklist);

      const dismissed = await chrome.storage.local.get(
        "apiDebugger_checklist_dismissed",
      );
      setIsDismissed(!!dismissed.apiDebugger_checklist_dismissed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    await completeChecklistItem(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: true } : item,
      ),
    );
  };

  const handleDismiss = async () => {
    await chrome.storage.local.set({ apiDebugger_checklist_dismissed: true });
    setIsDismissed(true);
  };

  const handleReset = async () => {
    await resetChecklist();
    await chrome.storage.local.remove("apiDebugger_checklist_dismissed");
    setIsDismissed(false);
    await loadChecklist();
  };

  if (isLoading) return null;
  if (isDismissed) return null;

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="border-b border-border bg-card">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{allDone ? "🎉" : "📋"}</span>
          <div>
            <h3 className="text-sm font-medium">
              {allDone ? "All features explored!" : "Getting Started"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} features tried
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Checklist items */}
      {isExpanded && (
        <div className="px-4 pb-3">
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  item.completed
                    ? "opacity-50"
                    : "hover:bg-accent/30 cursor-pointer"
                }`}
                onClick={() => {
                  if (!item.completed && item.navigateTo) {
                    onNavigate(item.navigateTo);
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.completed) {
                      handleComplete(item.id);
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.completed
                      ? "bg-success border-success text-white"
                      : "border-muted-foreground/30 hover:border-primary"
                  }`}
                >
                  {item.completed && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-sm flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                  {!item.completed && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                {!item.completed && item.navigateTo && (
                  <span className="text-xs text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
            {allDone ? (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset checklist
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
