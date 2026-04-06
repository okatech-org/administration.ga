"use client"

import { useEffect, useState } from "react"
import {
  ConsularThemeContext,
  useConsularThemeState,
} from "@/hooks/useConsularTheme"
import { cn } from "@/lib/utils"
import { MobileNavBar } from "./mobile-nav-bar"
import { MySpaceSidebar } from "./my-space-sidebar"

const SIDEBAR_STORAGE_KEY = "myspace-sidebar-expanded"

interface MySpaceWrapperProps {
  children: React.ReactNode
  className?: string
}

export function MySpaceWrapper({ children, className }: MySpaceWrapperProps) {
  const consularThemeValue = useConsularThemeState()

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
    <ConsularThemeContext.Provider value={consularThemeValue}>
      <div
        className={cn(
          "citizen-layout relative flex",
          "h-dvh flex-col overflow-hidden md:flex-row md:h-screen",
          consularThemeValue.consularTheme === "homeomorphism" &&
            "theme-homeomorphism"
        )}
      >
        <div className="" />

        <div className="hidden md:block p-4 pr-0">
          <div className="h-full rounded-2xl bg-card overflow-hidden border flat-card-border">
            <MySpaceSidebar
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded((prev) => !prev)}
            />
          </div>
        </div>

        <main
          className={cn(
            "flex-1 overflow-hidden md:overflow-y-auto citizen-scrollbar",
            "px-3 min-[400px]:px-4 pt-4 pb-24 md:px-4 md:pt-4 md:pb-4",
            className
          )}
        >
          {children}
        </main>

        <MobileNavBar />
      </div>
    </ConsularThemeContext.Provider>
  )
}
