"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmWord?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [inputVal, setInputVal] = React.useState("");

  const isConfirmDisabled = confirmWord
    ? inputVal.trim().toUpperCase() !== confirmWord.toUpperCase() || isLoading
    : isLoading;

  React.useEffect(() => {
    if (!open) setInputVal("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {destructive && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {confirmWord && (
          <div className="py-2 space-y-2">
            <p className="text-xs font-medium text-foreground">
              Please type <span className="font-mono font-bold text-destructive">{confirmWord}</span> to confirm:
            </p>
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={confirmWord}
              className="font-mono"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
