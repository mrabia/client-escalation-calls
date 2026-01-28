/**
 * MOJAVOX Confirm Dialog
 * Style: Cyberpunk Corporate
 * 
 * Reusable confirmation modal for critical actions.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle, Info, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmVariant = "default" | "danger" | "warning" | "success";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const variantConfig = {
  default: {
    icon: Info,
    iconClass: "text-neon-blue",
    buttonClass: "bg-neon-blue hover:bg-neon-blue/90 text-background",
  },
  danger: {
    icon: Trash2,
    iconClass: "text-red-500",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-neon-yellow",
    buttonClass: "bg-neon-yellow hover:bg-neon-yellow/90 text-background",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-neon-green",
    buttonClass: "bg-neon-green hover:bg-neon-green/90 text-background",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background/50", config.iconClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-foreground font-display">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            onClick={handleCancel}
            className="bg-transparent border-border hover:bg-muted"
            disabled={loading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(config.buttonClass, "gap-2")}
            disabled={loading}
          >
            {loading && <Zap className="w-4 h-4 animate-pulse" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
import { useState, useCallback } from "react";

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const confirm = useCallback((action: () => void) => {
    setPendingAction(() => action);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const dialogProps = {
    open,
    onOpenChange: setOpen,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    ...options,
  };

  return { confirm, dialogProps, ConfirmDialog };
}
