import { useEffect, useCallback } from "react";
import { KEYBOARD_SHORTCUTS, matchesShortcut } from "@/lib/shortcuts";

interface UseKeyboardShortcutsProps {
  onSendRequest?: () => void;
  onCancelRequest?: () => void;
  onSaveRequest?: () => void;
  onSaveRequestAs?: () => void;
  onNewRequest?: () => void;
  onOpenCollection?: () => void;
  onCommandPalette?: () => void;
  onSearch?: () => void;
  onSearchResponse?: () => void;
  onShowShortcuts?: () => void;
  onFocusUrl?: () => void;
  onFocusBody?: () => void;
  onCloseTab?: () => void;
  onSwitchTab?: (index: number) => void;
}

export function useKeyboardShortcuts({
  onSendRequest,
  onCancelRequest,
  onSaveRequest,
  onSaveRequestAs,
  onNewRequest,
  onOpenCollection,
  onCommandPalette,
  onSearch,
  onSearchResponse,
  onShowShortcuts,
  onFocusUrl,
  onFocusBody,
  onCloseTab,
  onSwitchTab,
}: UseKeyboardShortcutsProps = {}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (event.key === "Escape") {
          target.blur();
          return;
        }
        
        if (event.key !== "Escape" && !event.ctrlKey && !event.metaKey) {
          return;
        }
      }

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();

          switch (shortcut.action) {
            case "sendRequest":
              onSendRequest?.();
              break;
            case "cancelRequest":
              onCancelRequest?.();
              break;
            case "saveRequest":
              onSaveRequest?.();
              break;
            case "saveRequestAs":
              onSaveRequestAs?.();
              break;
            case "newRequest":
              onNewRequest?.();
              break;
            case "openCollection":
              onOpenCollection?.();
              break;
            case "commandPalette":
              onCommandPalette?.();
              break;
            case "search":
              onSearch?.();
              break;
            case "searchResponse":
              onSearchResponse?.();
              break;
            case "showShortcuts":
              onShowShortcuts?.();
              break;
            case "focusUrl":
              onFocusUrl?.();
              break;
            case "focusBody":
              onFocusBody?.();
              break;
            case "closeTab":
              onCloseTab?.();
              break;
            case "switchTab1":
              onSwitchTab?.(0);
              break;
            case "switchTab2":
              onSwitchTab?.(1);
              break;
            case "switchTab3":
              onSwitchTab?.(2);
              break;
            case "switchTab4":
              onSwitchTab?.(3);
              break;
            case "switchTab5":
              onSwitchTab?.(4);
              break;
          }

          return;
        }
      }
    },
    [
      onSendRequest,
      onCancelRequest,
      onSaveRequest,
      onSaveRequestAs,
      onNewRequest,
      onOpenCollection,
      onCommandPalette,
      onSearch,
      onSearchResponse,
      onShowShortcuts,
      onFocusUrl,
      onFocusBody,
      onCloseTab,
      onSwitchTab,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: KEYBOARD_SHORTCUTS,
  };
}
