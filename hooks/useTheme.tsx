import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "sync:theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const loadTheme = async () => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const savedTheme = result[STORAGE_KEY] || "system";
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } catch {
      applyTheme("system");
    }
  };

  const applyTheme = (newTheme: Theme) => {
    let resolved: "light" | "dark";

    if (newTheme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = newTheme;
    }

    setResolvedTheme(resolved);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    await chrome.storage.sync.set({ [STORAGE_KEY]: newTheme });
  };

  return { theme, resolvedTheme, setTheme };
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-3 border border-border rounded-lg">
      <span className="text-xs font-medium">Theme</span>
      <div className="flex gap-1 ml-auto">
        <button
          onClick={() => setTheme("light")}
          className={`p-1.5 rounded ${theme === "light" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          title="Light"
        >
          <SunIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-1.5 rounded ${theme === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          title="Dark"
        >
          <MoonIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`p-1.5 rounded ${theme === "system" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          title="System"
        >
          <MonitorIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
