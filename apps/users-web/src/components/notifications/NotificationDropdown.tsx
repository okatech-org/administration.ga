"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Stub — will be fully implemented in Phase 4
export function NotificationDropdown({ className }: { className?: string }) {
  return (
    <Button variant="ghost" size="icon" className={cn(className)}>
      <Bell className="size-5" />
    </Button>
  )
}
