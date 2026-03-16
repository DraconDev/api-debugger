/**
 * Getting Started checklist - tracks feature discovery progress
 *
 * Each item maps to a feature the user should try.
 * Items auto-complete when the user performs the action.
 * Stored in chrome.storage.local per profile.
 */

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigateTo?: string; // view to navigate to when clicked
  completed: boolean;
}

const CHECKLIST_KEY = "apiDebugger_checklist";

const DEFAULT_ITEMS: Omit<ChecklistItem, "completed">[] = [
  {
    id: "send-request",
    title: "Send your first request",
    description: "Use the request builder to call any API",
    icon: "🚀",
    navigateTo: "builder",
  },
  {
    id: "try-websocket",
    title: "Connect via WebSocket",
    description: "Open a real-time WebSocket connection",
    icon: "🔌",
    navigateTo: "websocket",
  },
  {
    id: "try-sse",
    title: "Stream with SSE",
    description: "Connect to a Server-Sent Events stream",
    icon: "📡",
    navigateTo: "sse",
  },
  {
    id: "setup-ai",
    title: "Set up AI analysis",
    description: "Add your OpenRouter key for smart request analysis",
    icon: "🤖",
    navigateTo: "settings",
  },
  {
    id: "import-collection",
    title: "Import a collection",
    description: "Import from Postman, Insomnia, OpenAPI, or cURL",
    icon: "📥",
  },
  {
    id: "create-environment",
    title: "Create an environment",
    description: "Set up variables for dev, staging, or prod",
    icon: "🌍",
    navigateTo: "settings",
  },
  {
    id: "try-test-mode",
    title: "Try Test Mode",
    description: "Explore 14 pre-loaded public API examples",
    icon: "🧪",
    navigateTo: "test",
  },
  {
    id: "run-workflow",
    title: "Run a workflow",
    description: "Chain requests with load testing and assertions",
    icon: "⚡",
    navigateTo: "workflows",
  },
  {
    id: "use-scripts",
    title: "Use pre-request scripts",
    description: "Automate with pm.variables, pm.test, and assertions",
    icon: "📝",
    navigateTo: "builder",
  },
];

/**
 * Get the current checklist state
 */
export async function getChecklist(): Promise<ChecklistItem[]> {
  const result = await chrome.storage.local.get(CHECKLIST_KEY);
  const saved: Record<string, boolean> = result[CHECKLIST_KEY] || {};

  return DEFAULT_ITEMS.map((item) => ({
    ...item,
    completed: saved[item.id] || false,
  }));
}

/**
 * Mark a checklist item as completed
 */
export async function completeChecklistItem(id: string): Promise<void> {
  const result = await chrome.storage.local.get(CHECKLIST_KEY);
  const saved: Record<string, boolean> = result[CHECKLIST_KEY] || {};
  saved[id] = true;
  await chrome.storage.local.set({ [CHECKLIST_KEY]: saved });
}

/**
 * Mark a checklist item as incomplete (for reset)
 */
export async function uncompleteChecklistItem(id: string): Promise<void> {
  const result = await chrome.storage.local.get(CHECKLIST_KEY);
  const saved: Record<string, boolean> = result[CHECKLIST_KEY] || {};
  delete saved[id];
  await chrome.storage.local.set({ [CHECKLIST_KEY]: saved });
}

/**
 * Reset the entire checklist
 */
export async function resetChecklist(): Promise<void> {
  await chrome.storage.local.remove(CHECKLIST_KEY);
}

/**
 * Check if the checklist should be shown (has incomplete items)
 */
export async function shouldShowChecklist(): Promise<boolean> {
  const items = await getChecklist();
  return items.some((item) => !item.completed);
}

/**
 * Get completion stats
 */
export async function getChecklistStats(): Promise<{
  completed: number;
  total: number;
  percentage: number;
}> {
  const items = await getChecklist();
  const completed = items.filter((i) => i.completed).length;
  return {
    completed,
    total: items.length,
    percentage: Math.round((completed / items.length) * 100),
  };
}
