/**
 * MOJAVOX Keyboard Shortcuts Component
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Global keyboard shortcuts
 * - Help overlay (Ctrl+/)
 * - Quick navigation
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Shortcut {
  keys: string[];
  description: string;
  action?: () => void;
}

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const [, setLocation] = useLocation();

  const shortcuts: Shortcut[] = [
    { keys: ["Ctrl", "/"], description: "Show keyboard shortcuts" },
    { keys: ["Ctrl", "D"], description: "Go to Dashboard" },
    { keys: ["Ctrl", "L"], description: "Go to Live Monitor" },
    { keys: ["Ctrl", "C"], description: "Go to Campaigns" },
    { keys: ["Ctrl", "F"], description: "Go to AI Fleet" },
    { keys: ["Ctrl", "B"], description: "Go to Debtors" },
    { keys: ["Ctrl", "A"], description: "Go to Analytics" },
    { keys: ["Ctrl", "R"], description: "Go to Reports" },
    { keys: ["Ctrl", "S"], description: "Go to Settings" },
    { keys: ["Ctrl", "N"], description: "Go to Notifications" },
    { keys: ["Esc"], description: "Close dialogs/modals" },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl + / - Show help
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Ctrl + D - Dashboard
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setLocation("/dashboard");
        toast.success("Navigated to Dashboard");
        return;
      }

      // Ctrl + L - Live Monitor
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        setLocation("/live-monitor");
        toast.success("Navigated to Live Monitor");
        return;
      }

      // Ctrl + C - Campaigns (only if not copying)
      if (e.ctrlKey && e.key === "c" && !window.getSelection()?.toString()) {
        // Don't override copy
      }

      // Ctrl + F - Fleet
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setLocation("/fleet");
        toast.success("Navigated to AI Fleet");
        return;
      }

      // Ctrl + B - Debtors
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setLocation("/debtors");
        toast.success("Navigated to Debtors");
        return;
      }

      // Ctrl + A - Analytics
      if (e.ctrlKey && e.key === "a" && !window.getSelection()?.toString()) {
        // Don't override select all
      }

      // Ctrl + R - Reports
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        setLocation("/reports");
        toast.success("Navigated to Reports");
        return;
      }

      // Ctrl + S - Settings (prevent save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        setLocation("/settings");
        toast.success("Navigated to Settings");
        return;
      }

      // Ctrl + N - Notifications
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setLocation("/notifications");
        toast.success("Navigated to Notifications");
        return;
      }

      // Escape - Close help
      if (e.key === "Escape") {
        setShowHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⌨️ Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                      {key}
                    </Badge>
                    {i < shortcut.keys.length - 1 && <span className="text-muted-foreground mx-1">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Press <Badge variant="outline" className="font-mono text-xs px-1">Esc</Badge> to close
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcuts;
