"use client"

import { useEffect, useRef } from "react"
import Header from "@/components/Header"
import { Footer } from "@/components/Footer"
import { useIsMobile } from "@/hooks/use-mobile"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const mainRef = useRef<HTMLElement>(null)
  const isMobile = useIsMobile()

  // Desktop: redirect wheel events to main scroll area
  useEffect(() => {
    if (isMobile) return

    const handleWheel = (e: WheelEvent) => {
      if (!mainRef.current) return

      let target = e.target as HTMLElement | null
      while (target) {
        if (target === mainRef.current) return
        const style = window.getComputedStyle(target)
        const overflowY = style.overflowY
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          target.scrollHeight > target.clientHeight
        if (isScrollable) return
        target = target.parentElement
      }

      mainRef.current.scrollTop += e.deltaY
    }

    window.addEventListener("wheel", handleWheel)
    return () => window.removeEventListener("wheel", handleWheel)
  }, [isMobile])

  // Desktop: lock html overflow
  useEffect(() => {
    const html = document.documentElement
    if (!isMobile) {
      html.style.overflow = "hidden"
    } else {
      html.style.overflow = ""
    }
    return () => {
      html.style.overflow = ""
    }
  }, [isMobile])

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-dvh">
        <Header />
        <main className="flex-1">
          {children}
          <Footer />
        </main>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <Header />
      <main
        id="main-scrollable-area"
        ref={mainRef}
        className="overflow-y-auto flex-1"
      >
        {children}
        <Footer />
      </main>
    </div>
  )
}
