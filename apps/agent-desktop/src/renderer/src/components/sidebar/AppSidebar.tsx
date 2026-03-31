import {
  ChevronsLeft,
  ChevronsRight,
  Palette,
  Printer,
} from "lucide-react"

export type Page = "designer" | "printer"

interface AppSidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
  isExpanded: boolean
  onToggle: () => void
}

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "designer", label: "Designer", icon: Palette },
  { page: "printer", label: "Imprimante", icon: Printer },
]

export function AppSidebar({ activePage, onNavigate, isExpanded, onToggle }: AppSidebarProps) {
  return (
    <aside
      className={`flex flex-col py-3 px-3 bg-card border border-border h-full overflow-hidden
        rounded-2xl transition-[width] duration-300 ease-in-out shrink-0
        ${isExpanded ? "w-52 items-stretch" : "w-14 items-center"}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center mb-4">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">GA</span>
        </div>
        {isExpanded && (
          <span className="ml-3 text-sm font-semibold text-foreground truncate">
            Agent Desktop
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex flex-col gap-1 flex-1 ${!isExpanded ? "items-center" : ""}`}>
        {navItems.map((item) => {
          const active = item.page === activePage
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              title={!isExpanded ? item.label : undefined}
              className={`flex items-center transition-all duration-200
                ${isExpanded
                  ? "w-full justify-start gap-3 px-3 h-10 rounded-xl text-sm"
                  : "w-10 h-10 justify-center rounded-full"
                }
                ${active
                  ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
            >
              <item.icon className="size-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Toggle */}
      <div className={`pt-3 border-t border-border/50 ${!isExpanded ? "flex justify-center" : ""}`}>
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={isExpanded ? "Réduire" : "Développer"}
        >
          {isExpanded ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        </button>
      </div>
    </aside>
  )
}
