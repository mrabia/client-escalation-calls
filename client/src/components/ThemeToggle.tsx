/**
 * Theme Toggle Component
 * Allows users to switch between dark and light modes
 */

import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "button" | "dropdown" | "switch";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ 
  variant = "button", 
  className,
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) {
    return null;
  }

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          className
        )}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Sun 
          className={cn(
            "h-5 w-5 transition-all duration-300",
            theme === "dark" 
              ? "rotate-0 scale-100 text-neon-yellow" 
              : "rotate-90 scale-0"
          )} 
        />
        <Moon 
          className={cn(
            "absolute h-5 w-5 transition-all duration-300",
            theme === "dark" 
              ? "rotate-90 scale-0" 
              : "rotate-0 scale-100 text-neon-blue"
          )} 
        />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  if (variant === "switch") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300",
          theme === "dark" 
            ? "bg-slate-700" 
            : "bg-slate-300",
          className
        )}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span
          className={cn(
            "inline-flex h-6 w-6 transform items-center justify-center rounded-full transition-all duration-300",
            theme === "dark"
              ? "translate-x-9 bg-slate-900"
              : "translate-x-1 bg-white"
          )}
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-neon-blue" />
          ) : (
            <Sun className="h-4 w-4 text-yellow-500" />
          )}
        </span>
        {showLabel && (
          <span className="sr-only">
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem 
          onClick={() => theme !== "light" && toggleTheme()}
          className={cn(
            "cursor-pointer",
            theme === "light" && "bg-muted"
          )}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => theme !== "dark" && toggleTheme()}
          className={cn(
            "cursor-pointer",
            theme === "dark" && "bg-muted"
          )}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact theme indicator for header
export function ThemeIndicator({ className }: { className?: string }) {
  const { theme } = useTheme();
  
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {theme === "dark" ? (
        <>
          <Moon className="h-4 w-4 text-neon-blue" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 text-yellow-500" />
          <span>Light Mode</span>
        </>
      )}
    </div>
  );
}
