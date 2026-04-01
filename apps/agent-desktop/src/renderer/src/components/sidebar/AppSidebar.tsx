import {
  BookUser,
  Calendar,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  Printer,
  Settings2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { authClient } from "../../lib/auth-client"
import { useOrg } from "../../hooks/useOrg"
import { cn } from "../../lib/utils"

// ─── Route types ────────────────────────────────────────────────────────────

export type Route =
  | { page: "dashboard" }
  | { page: "affaires-diplomatiques" }
  | { page: "affaires-consulaires"; sub?: "demandes" | "registre" | "rdv" | "services" }
  | { page: "posts" }
  | { page: "iboite" }
  | { page: "icorrespondance" }
  | { page: "idocument" }
  | { page: "iagenda" }
  | { page: "statistics" }
  | { page: "payments" }
  | { page: "team" }
  | { page: "settings" }
  | { page: "appointments" }
  | { page: "requests" }
  | { page: "services" }
  | { page: "iarchive" }
  | { page: "iasted" }
  | { page: "calls" }
  | { page: "meetings" }
  // Desktop-only
  | { page: "impression" }

export type PageId = Route["page"]

// ─── Nav config ─────────────────────────────────────────────────────────────

interface NavItem {
  page: PageId
  labelKey: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  labelKey: string
  items: NavItem[]
}

interface AppSidebarProps {
  activeRoute: Route
  onNavigate: (route: Route) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({ activeRoute, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation()
  const { data: session } = authClient.useSession()
  const { orgId } = useOrg()

  // Live badge count for print queue
  const queueStats = useQuery(
    api.functions.printJobs.queueStats,
    orgId ? { orgId } : "skip",
  )

  const userName = session?.user?.name || t("common.profile")
  const userEmail = session?.user?.email || ""
  const userAvatar = session?.user?.image || ""
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await authClient.signOut()
  }

  const queueBadge = (queueStats?.queued ?? 0) + (queueStats?.printing ?? 0)

  const sections: NavSection[] = [
    {
      labelKey: "desktop.sidebar.sections.commands",
      items: [
        { page: "dashboard", labelKey: "desktop.sidebar.nav.dashboard", icon: LayoutDashboard },
      ],
    },
    {
      labelKey: "desktop.sidebar.sections.operations",
      items: [
        { page: "affaires-diplomatiques", labelKey: "desktop.sidebar.nav.diplomaticAffairs", icon: Globe2 },
        { page: "affaires-consulaires", labelKey: "desktop.sidebar.nav.consularAffairs", icon: BookUser },
        { page: "posts", labelKey: "desktop.sidebar.nav.news", icon: Newspaper },
      ],
    },
    {
      labelKey: "desktop.sidebar.sections.iBureau",
      items: [
        { page: "iboite", labelKey: "desktop.sidebar.nav.iBoite", icon: Mail },
        { page: "icorrespondance", labelKey: "desktop.sidebar.nav.iCorrespondance", icon: FolderOpen },
        { page: "idocument", labelKey: "desktop.sidebar.nav.iDocument", icon: FileText },
        { page: "iagenda", labelKey: "desktop.sidebar.nav.iAgenda", icon: Calendar },
      ],
    },
    {
      labelKey: "desktop.sidebar.sections.localOffice",
      items: [
        { page: "impression", labelKey: "desktop.sidebar.nav.impression", icon: Printer, badge: queueBadge },
      ],
    },
    {
      labelKey: "desktop.sidebar.sections.administration",
      items: [
        { page: "settings", labelKey: "desktop.sidebar.nav.settings", icon: Settings2 },
      ],
    },
  ]

  return (
    <aside className="flex flex-col py-3 px-3 bg-card border border-border h-full overflow-hidden rounded-2xl w-52 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="size-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
          <img src="/icons/apple-icon.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">
            Diplomate<span className="text-primary">.ga</span>
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{t("desktop.sidebar.brand")}</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex flex-col gap-3 flex-1 overflow-y-auto overflow-x-hidden">
        {sections.map((section, sectionIdx) => (
          <div key={section.labelKey}>
            {sectionIdx > 0 && (
              <div className="border-t border-border/40 mb-2" />
            )}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-3 mb-1">
              {t(section.labelKey)}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.page === activeRoute.page
                return (
                  <button
                    key={item.page}
                    onClick={() => onNavigate({ page: item.page } as Route)}
                    className={cn(
                      "flex items-center w-full justify-start gap-3 px-3 h-8 rounded-xl text-[13px] transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{t(item.labelKey)}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 px-1">
          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="size-9 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-primary">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            title={t("desktop.sidebar.logout")}
            className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
