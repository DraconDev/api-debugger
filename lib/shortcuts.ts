export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
  description: string;
  category: "global" | "request" | "navigation" | "editing";
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Request actions
  { key: "Enter", ctrl: true, action: "sendRequest", description: "Send request", category: "request" },
  { key: "Escape", action: "cancelRequest", description: "Cancel request / Close modal", category: "request" },
  { key: "s", ctrl: true, action: "saveRequest", description: "Save request", category: "request" },
  { key: "s", ctrl: true, shift: true, action: "saveRequestAs", description: "Save request as...", category: "request" },
  
  // Navigation
  { key: "n", ctrl: true, action: "newRequest", description: "New request", category: "navigation" },
  { key: "o", ctrl: true, action: "openCollection", description: "Open collection", category: "navigation" },
  { key: "p", ctrl: true, action: "commandPalette", description: "Command palette", category: "navigation" },
  { key: "1", ctrl: true, action: "switchTab1", description: "Switch to tab 1", category: "navigation" },
  { key: "2", ctrl: true, action: "switchTab2", description: "Switch to tab 2", category: "navigation" },
  { key: "3", ctrl: true, action: "switchTab3", description: "Switch to tab 3", category: "navigation" },
  { key: "4", ctrl: true, action: "switchTab4", description: "Switch to tab 4", category: "navigation" },
  { key: "5", ctrl: true, action: "switchTab5", description: "Switch to tab 5", category: "navigation" },
  { key: "w", ctrl: true, action: "closeTab", description: "Close tab", category: "navigation" },
  { key: "Tab", action: "nextField", description: "Next field", category: "navigation" },
  { key: "Tab", shift: true, action: "prevField", description: "Previous field", category: "navigation" },
  
  // Editing
  { key: "f", ctrl: true, action: "search", description: "Search", category: "editing" },
  { key: "g", ctrl: true, action: "searchResponse", description: "Search in response", category: "editing" },
  { key: "l", ctrl: true, action: "focusUrl", description: "Focus URL field", category: "editing" },
  { key: "i", ctrl: true, action: "focusBody", description: "Focus request body", category: "editing" },
  
  // Global
  { key: "?", shift: true, action: "showShortcuts", description: "Show shortcuts", category: "global" },
  { key: "k", ctrl: true, action: "commandPalette", description: "Command palette", category: "global" },
];

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const ctrlKey = isMac ? "⌘" : "Ctrl";
  
  if (shortcut.ctrl || shortcut.meta) parts.push(ctrlKey);
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  
  let key = shortcut.key;
  if (key === "Enter") key = isMac ? "↵" : "Enter";
  else if (key === "Escape") key = isMac ? "⎋" : "Esc";
  else if (key === "Tab") key = "Tab";
  else if (key === "ArrowUp") key = "↑";
  else if (key === "ArrowDown") key = "↓";
  else if (key === "ArrowLeft") key = "←";
  else if (key === "ArrowRight") key = "→";
  else key = key.toUpperCase();
  
  parts.push(key);
  
  return parts.join(isMac ? "" : "+");
}

export function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  
  if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;
  if (!!shortcut.ctrl !== (isMac ? event.metaKey : event.ctrlKey)) return false;
  if (!!shortcut.shift !== event.shiftKey) return false;
  if (!!shortcut.alt !== event.altKey) return false;
  
  return true;
}
