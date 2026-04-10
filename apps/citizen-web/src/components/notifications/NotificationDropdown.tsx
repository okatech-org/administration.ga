"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Stub — will be fully implemented in Phase 4
export function NotificationDropdown({
  className,
  count = 3,
}: {
  className?: string
  count?: number
}) {
  return (
    <Button variant="ghost" size="icon" className={cn("relative", className)}>
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
          {count}
        </span>
      )}
    </Button>
  )
}
