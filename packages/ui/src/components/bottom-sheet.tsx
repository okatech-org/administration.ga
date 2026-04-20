/**
 * BottomSheet — reusable bottom sheet with spring animation + backdrop blur.
 *
 * Slides up from the bottom of the screen. Clicking outside closes it.
 * Pattern extracted from CVAIDrawer / ServiceDetailSheet.
 */

"use client"

import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Title displayed in the header. If omitted, only handle + optional close are rendered. */
  title?: React.ReactNode
  /** Icon displayed before the title */
  icon?: React.ReactNode
  /** Fixed footer content (e.g. CTA button) */
  footer?: React.ReactNode
  /** Max height as CSS value. Default: "90vh" */
  maxHeight?: string
  /** Max width as CSS class. Default: "max-w-2xl" */
  maxWidthClass?: string
  /** Additional class on the glass container */
  className?: string
  /** Show the close (X) button. Default: true */
  showCloseButton?: boolean
  /** Show the drag handle bar. Default: true */
  showHandle?: boolean
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  icon,
  footer,
  maxHeight = "90vh",
  maxWidthClass = "max-w-2xl",
  className,
  showCloseButton = true,
  showHandle = true,
}: BottomSheetProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, handleClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[91]"
          >
            <div
              className={cn(
                "mx-auto flex w-full flex-col rounded-t-2xl bg-background/95 backdrop-blur-xl shadow-2xl",
                maxWidthClass,
                className
              )}
              style={{ maxHeight }}
            >
              {/* Handle + optional header */}
              {(showHandle || title) && (
                <div
                  className={cn(
                    "flex shrink-0 flex-col items-center px-4 sm:px-5",
                    title ? "border-b border-border/30 pt-3 pb-3" : "pt-2.5 pb-1.5"
                  )}
                >
                  {showHandle && (
                    <div
                      className={cn(
                        "h-1 w-10 rounded-full bg-muted-foreground/30",
                        title ? "mb-3" : "mb-0"
                      )}
                    />
                  )}

                  {title && (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        {icon}
                        <h3 className="truncate text-sm font-semibold">{title}</h3>
                      </div>
                      {showCloseButton && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-full"
                          onClick={handleClose}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Content — scrollable */}
              <div className="citizen-scrollbar min-h-0 overflow-y-auto">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="shrink-0 border-t border-border/30 bg-background/80 px-4 py-3 sm:px-5">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
