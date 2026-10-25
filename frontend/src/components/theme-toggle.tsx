"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg border border-border bg-card opacity-50" />
    );
  }

  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  return (
    <button
      onClick={cycleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Toggle theme (currently ${theme})`}
      title={`Theme: ${theme}. Click to switch.`}
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4 text-primary transition-transform duration-200 rotate-0" />
      ) : theme === "light" ? (
        <Sun className="h-4 w-4 text-warning transition-transform duration-200 rotate-0" />
      ) : (
        <Laptop className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
      )}
    </button>
  );
}
