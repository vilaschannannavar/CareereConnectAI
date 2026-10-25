"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;
const DrawerPortal = DialogPrimitive.Portal;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "left" | "right" | "bottom";
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const sideVariants = {
    right:
      "inset-y-0 right-0 h-full w-full sm:max-w-xl border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    left:
      "inset-y-0 left-0 h-full w-full sm:max-w-xl border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
    bottom:
      "inset-x-0 bottom-0 h-auto max-h-[85vh] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-2xl",
  };

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-card text-card-foreground shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out duration-300",
          sideVariants[side],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <div className="flex-1" />
          <DialogPrimitive.Close className="rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Close drawer</span>
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </DialogPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent };
