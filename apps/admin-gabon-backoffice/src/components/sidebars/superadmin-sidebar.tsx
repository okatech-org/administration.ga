"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Archive,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Files,
  FolderOpen,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Moon,
  Newspaper,
  ScrollText,
  Settings,
  Sun,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { LogoutButton } from "@/components/sidebars/logout-button"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSuperAdminData } from "@/hooks/use-superadmin-data"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  /** Module code — when set, item is shown only if user has this module in allowedModules */
  moduleCode?: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

export function SuperadminSidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const user = useSuperAdminData()

  const allNavSections: NavSection[] = [
    {
      label: "Réseau",
      items: [
        {
          title: t("superadmin.nav.dashboard"),
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: t("superadmin.nav.representations", "Administrations"),
          url: "/reps",
          icon: Building2,
          moduleCode: "team",
        },
        {
          title: t(
            "superadmin.nav.affairesConsulaires",
            "Démarches administratives"
          ),
          url: "/affaires-consulaires",
          icon: Globe,
          moduleCode: "consular_affairs",
        },
        {
          title: t(
            "superadmin.nav.affairesDiplomatiques",
            "Pilotage stratégique"
          ),
          url: "/affaires-diplomatiques",
          icon: Globe,
          moduleCode: "diplomatic_affairs",
        },
      ],
    },
    {
      label: "Population",
      items: [
        {
          title: t("superadmin.nav.users"),
          url: "/users",
          icon: Users,
          moduleCode: "team",
        },
        {
          title: t("superadmin.nav.support"),
          url: "/support",
          icon: LifeBuoy,
          moduleCode: "calendar",
        },
      ],
    },
    {
      label: "iBureau",
      items: [
        {
          title: "iCorrespondance",
          url: "/icorrespondance",
          icon: FolderOpen,
          moduleCode: "correspondence",
        },
        {
          title: "iDocument",
          url: "/idocument",
          icon: FileText,
          moduleCode: "documents",
        },
        {
          title: "iArchive",
          url: "/iarchive",
          icon: Archive,
          moduleCode: "documents",
        },
        {
          title: "Modèles de documents",
          url: "/config/templates",
          icon: Files,
          moduleCode: "documents",
        },
        {
          title: "iAgenda",
          url: "/iagenda",
          icon: Calendar,
          moduleCode: "calendar",
        },
        {
          title: t("superadmin.nav.appointments", "Rendez-vous"),
          url: "/appointments",
          icon: Calendar,
          moduleCode: "calendar",
        },
      ],
    },
    {
      label: t("superadmin.nav.section.pnpe", "PNPE / Emploi"),
      items: [
        {
          title: t("superadmin.nav.pnpeDashboard", "Tableau de bord PNPE"),
          url: "/pnpe/dashboard",
          icon: Briefcase,
          moduleCode: "statistics",
        },
        {
          title: t("superadmin.nav.pnpeAntennes", "Antennes régionales"),
          url: "/pnpe/antennes",
          icon: MapPin,
          moduleCode: "team",
        },
      ],
    },
    {
      label: "Sécurité & Système",
      items: [
        {
          title: t("superadmin.nav.auditLogs"),
          url: "/audit-logs",
          icon: ScrollText,
          moduleCode: "statistics",
        },
        {
          title: t("superadmin.nav.monitoring", "Monitoring"),
          url: "/monitoring",
          icon: Activity,
          moduleCode: "statistics",
        },
        {
          title: t("superadmin.nav.settings"),
          url: "/settings",
          icon: Settings,
          moduleCode: "settings",
        },
      ],
    },
    {
      label: "Éditorial",
      items: [
        {
          title: t("superadmin.nav.posts"),
          url: "/posts",
          icon: Newspaper,
          moduleCode: "news",
        },
        {
          title: t("superadmin.nav.tutorials"),
          url: "/tutorials",
          icon: BookOpen,
          moduleCode: "news",
        },
        {
          title: t("superadmin.nav.events"),
          url: "/events",
          icon: Calendar,
          moduleCode: "community",
        },
      ],
    },
  ]

  // SuperAdmin/AdminSystem with no allowedModules restriction → see everything
  // Admins with specific allowedModules → only see items whose moduleCode is in the list
  const allowedModules = user.userData?.allowedModules as string[] | undefined
  const hasModuleRestriction =
    !!allowedModules && allowedModules.length > 0 && !user.isSuperAdmin

  const groups = hasModuleRestriction
    ? allNavSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              !item.moduleCode || allowedModules.includes(item.moduleCode)
          ),
        }))
        .filter((section) => section.items.length > 0)
    : allNavSections

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(url)
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Sidebar
        variant="sidebar"
        collapsible="none"
        className="border-r border-border/50 bg-secondary"
      >
        <SidebarHeader className="px-3 pt-3 pb-3">
          <Header
            roleLabel={
              user.userData?.role === "admin_system"
                ? "Administration Système"
                : user.userData?.role === "admin"
                  ? "Administration"
                  : "Super Administration"
            }
          />
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 citizen-scrollbar">
          {groups.map((section, sectionIdx) => (
            <SidebarGroup key={section.label} className="px-0 py-0">
              {sectionIdx > 0 && (
                <div className="mx-0 my-2 border-t border-foreground/5 pt-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-8" />
              )}
              <SidebarGroupLabel className="mb-1 block h-auto px-3 py-0 text-[10px] font-extrabold tracking-widest text-muted-foreground/70 uppercase">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.url)
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={cn(
                            "h-9 gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-all duration-200",
                            "hover:bg-[#EBE6DC]/50 hover:text-foreground dark:hover:bg-[#383633]/50",
                            "data-[active=true]:bg-primary/10 data-[active=true]:font-bold data-[active=true]:text-primary data-[active=true]:hover:bg-primary/15 data-[active=true]:hover:text-primary",
                            "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:rounded-full! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto"
                          )}
                        >
                          <Link href={item.url}>
                            <item.icon className="size-[18px] shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-foreground/5 px-3 pt-3">
          <FooterControls
            user={user}
            lightLabel={t("theme.light")}
            darkLabel={t("theme.dark")}
          />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

function Header({ roleLabel }: { roleLabel: string }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FDFCFA] dark:bg-[#21201E]">
        <img
          src="/icons/apple-icon.png"
          alt="Logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col overflow-hidden whitespace-nowrap text-foreground">
        <span className="text-sm font-bold">ADMINISTRATION.GA</span>
        <span className="text-xs text-foreground/60">{roleLabel}</span>
      </div>
    </Link>
  )
}

interface FooterControlsProps {
  user: ReturnType<typeof useSuperAdminData>
  lightLabel: string
  darkLabel: string
}

function FooterControls({
  user,
  lightLabel,
  darkLabel,
}: FooterControlsProps) {
  const { i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en"
  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")
  }

  return (
    <>
      <div className="flex items-center gap-1 px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex h-9 items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">
            {currentLang === "fr" ? "🇫🇷" : "🇬🇧"}
          </span>
          <span className="text-xs font-medium uppercase">{currentLang}</span>
        </Button>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {theme === "dark" ? lightLabel : darkLabel}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* User info + Logout */}
      <div className="flex items-center gap-2 rounded-lg bg-[#EBE6DC]/50 px-2 py-1.5 dark:bg-[#383633]/50">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xs font-bold text-primary">
            {user.userData?.firstName?.[0] || "A"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {user.userData?.firstName && user.userData?.lastName
              ? `${user.userData.firstName} ${user.userData.lastName}`
              : user.userData?.firstName || "Admin"}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {user.userData?.email || ""}
          </p>
        </div>
        <LogoutButton />
      </div>
    </>
  )
}
