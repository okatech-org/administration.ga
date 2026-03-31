import { useState } from "react"
import { useConvexAuth } from "convex/react"
import { AppSidebar, type Page } from "./components/sidebar/AppSidebar"
import { CardDesigner } from "./components/card-designer/CardDesigner"
import { PrinterPage } from "./components/printer/PrinterPage"
import { LoginPage } from "./components/auth/LoginPage"

const SIDEBAR_KEY = "agent-desktop-sidebar"

export function App() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [activePage, setActivePage] = useState<Page>("designer")
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY)
      return stored === null ? true : stored === "true"
    } catch {
      return true
    }
  })

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Connexion...</span>
        </div>
      </div>
    )
  }

  // Login required
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="h-screen flex gap-4 bg-background p-4 overflow-hidden">
      <AppSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isExpanded={sidebarExpanded}
        onToggle={toggleSidebar}
      />
      <main className="flex-1 min-h-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {activePage === "designer" && <CardDesigner />}
        {activePage === "printer" && <PrinterPage />}
      </main>
    </div>
  )
}
