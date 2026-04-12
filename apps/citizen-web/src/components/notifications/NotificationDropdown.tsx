"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NotificationDropdown({
  className,
  count = 3,
}: {
  className?: string
  count?: number
}) {
  return (
    <Button variant="ghost" size="icon" className={cn(className)} asChild>
      <Link href="/my-space/notifications">
        <div className="relative inline-flex items-center justify-center">
          <Bell className="size-[22px]" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
              {count}
            </span>
          )}
        </div>
      </Link>
    </Button>
  )
}
