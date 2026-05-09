"use client"

import { useEffect, useState } from "react"
import { BackofficeIAstedWindow } from "@/components/ai/BackofficeIAstedWindow"
import { SuperadminGuard } from "@/components/guards/SuperadminGuard"
import { SuperadminSidebar } from "@/components/sidebars/superadmin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

const SIDEBAR_STORAGE_KEY = "superadmin-sidebar-expanded"

export function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored === null ? true : stored === "true"
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded))
    } catch {
      // Ignore localStorage errors
    }
  }, [isExpanded])

  return (
    <SuperadminGuard>
      <SidebarProvider
        open={isExpanded}
        onOpenChange={setIsExpanded}
        className="backoffice-layout relative flex h-screen min-h-0 overflow-hidden"
      >
        <div className="hidden md:block">
          <SuperadminSidebar />
        </div>
        <main className="flex-1 min-h-full overflow-y-auto citizen-scrollbar">
          {children}
        </main>
        <BackofficeIAstedWindow />
      </SidebarProvider>
    </SuperadminGuard>
  )
}
