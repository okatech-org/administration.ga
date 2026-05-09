"use client"

import { Link, usePathname } from "@workspace/routing"
import {
  BarChart3,
  BellRing,
  Briefcase,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileText,
  FolderKanban,
  FolderOpen,
  Globe,
  Globe2,
  Home,
  Mailbox,
  MessagesSquare,
  Moon,
  Network,
  Newspaper,
  Settings2,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Sun,
  UserCircle,
  UserSearch,
  Users,
  Users2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
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
  useSidebar,
} from "@workspace/ui/components/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useCanDoTask } from "../hooks/useCanDoTask"
import { useOrgModules } from "../hooks/useOrgModules"
import { useAuthClient } from "./auth-client-provider"
import { LogoutButton } from "./logout-button"
import { useOrg } from "./org-provider"
import { OrgSwitcher } from "./org-switcher"

export interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  requires?: string // task code required to see this item
  moduleCode?: string // module code for access level detection
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export interface OrgSidebarProps {
  /**
   * Nav sections injected by the host app (e.g. agent-desktop adds
   * "Impression" which doesn't exist on web). Appended after the shared
   * sections, before "Administration".
   */
  extraSections?: NavSection[]
}

export function OrgSidebar({ extraSections }: OrgSidebarProps) {
  const authClient = useAuthClient()
  const { data: session } = authClient.useSession()
  const pathname = usePathname()
  const { t, i18n } = useTranslation()
  const { activeOrgId } = useOrg()
  const { canDo, isReady } = useCanDoTask(activeOrgId ?? undefined)
  const { isModuleEnabled } = useOrgModules()

  const navSections: NavSection[] = [
    {
      label: "Commandes",
      items: [
        { title: "Dashboard", url: "/", icon: Home },
        {
          title: "iProfil",
          url: "/iprofil",
          icon: UserCircle,
          moduleCode: "profile",
        },
      ],
    },
    {
      label: "Opérations",
      items: [
        {
          title: "Affaires Diplomatiques",
          url: "/affaires-diplomatiques",
          icon: Globe2,
          requires: "intelligence.view",
          moduleCode: "diplomatic_affairs",
        },
        {
          title: "Affaires Consulaires",
          url: "/affaires-consulaires",
          icon: Users,
          requires: "requests.view",
          moduleCode: "consular_affairs",
        },
        {
          title: "Actualités",
          url: "/posts",
          icon: Newspaper,
          requires: "communication.publish",
          moduleCode: "news",
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
          requires: "correspondance.view",
          moduleCode: "correspondence",
        },
        {
          title: "iDocument",
          url: "/idocument",
          icon: FileText,
          requires: "documents.view",
          moduleCode: "documents",
        },
        {
          title: "iAgenda",
          url: "/iagenda",
          icon: Calendar,
          requires: "appointments.view",
          moduleCode: "calendar",
        },
        {
          title: "iCom",
          url: "/icom",
          icon: MessagesSquare,
          moduleCode: "messaging",
        },
      ],
    },
    {
      label: "Gestion",
      items: [
        {
          title: "Équipe",
          url: "/team",
          icon: Users2,
          requires: "team.view",
          moduleCode: "team",
        },
        {
          title: "Statistiques",
          url: "/statistics",
          icon: BarChart3,
          requires: "analytics.view",
          moduleCode: "statistics",
        },
      ],
    },
    {
      // Réseau diplomatique — visible uniquement pour les organismes de
      // type ministry (les modules network_* ne peuvent être activés
      // qu'à ce niveau, le filtre `isModuleEnabled` les masque ailleurs).
      label: "Réseau diplomatique",
      items: [
        {
          title: "Pipeline réseau",
          url: "/network/diplomatic-pipeline",
          icon: Network,
          requires: "network.diplomatic.view",
          moduleCode: "network_diplomatic_oversight",
        },
        {
          title: "Correspondance réseau",
          url: "/network/correspondence",
          icon: Mailbox,
          requires: "network.correspondence.view",
          moduleCode: "network_correspondence_oversight",
        },
        {
          title: "Intelligence réseau",
          url: "/network/intelligence",
          icon: BarChart3,
          requires: "network.intelligence.view",
          moduleCode: "network_intelligence",
        },
      ],
    },
    {
      // Renseignement souverain — module cloisonné, exclusif au type
      // d'organisme `intelligence_agency`. Routes namespacées sous
      // /agence/* (cf. INTELLIGENCE_AGENCY_MODULE_CODES). Invisible
      // des autres organismes : seuls les agents d'une agence
      // souveraine voient cette section (filtre `moduleCode` +
      // validation côté création d'organisme).
      label: "Renseignement",
      items: [
        {
          title: "Vue d'ensemble",
          url: "/agence",
          icon: ShieldAlert,
          requires: "intelligence.profiles.view",
          moduleCode: "intelligence",
        },
        {
          title: "Profils",
          url: "/agence/profiles",
          icon: UserSearch,
          requires: "intelligence.profiles.search",
          moduleCode: "intelligence",
        },
        {
          title: "Listes de surveillance",
          url: "/agence/watchlists",
          icon: Eye,
          requires: "intelligence.watchlists.view",
          moduleCode: "intelligence",
        },
        {
          title: "Notes",
          url: "/agence/notes",
          icon: StickyNote,
          requires: "intelligence.notes.view",
          moduleCode: "intelligence",
        },
        {
          title: "Carte",
          url: "/agence/map",
          icon: Globe,
          requires: "intelligence.map.view",
          moduleCode: "intelligence",
        },
        {
          title: "Dossiers",
          url: "/agence/dossiers",
          icon: FolderKanban,
          requires: "intelligence.cases.view",
          moduleCode: "intelligence",
        },
        {
          title: "Cohortes (TAL)",
          url: "/agence/cohortes",
          icon: Briefcase,
          requires: "intelligence.profiles.search",
          moduleCode: "intelligence",
        },
        {
          title: "Briefings IA",
          url: "/agence/briefings",
          icon: Sparkles,
          requires: "intelligence.briefing.generate",
          moduleCode: "intelligence",
        },
        {
          title: "Graphe",
          url: "/agence/graphe",
          icon: Network,
          requires: "intelligence.links.view",
          moduleCode: "intelligence",
        },
        {
          title: "Alertes",
          url: "/agence/alertes",
          icon: BellRing,
          requires: "intelligence.watchlists.view",
          moduleCode: "intelligence",
        },
      ],
    },
    ...(extraSections ?? []),
    {
      label: "Administration",
      items: [
        {
          title: "Paramètres",
          url: "/settings",
          icon: Settings2,
          requires: "settings.view",
          moduleCode: "settings",
        },
      ],
    },
  ]

  // Filter sections and their items based on org modules + permissions
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // 1. Module actif dans l'org ?
        if (item.moduleCode && !isModuleEnabled(item.moduleCode)) return false
        // 2. Permission utilisateur ?
        if (item.requires && !(isReady && canDo(item.requires))) return false
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)

  // Sélectionne UN SEUL item actif : le plus long préfixe qui matche le
  // pathname courant. Sans ça, /agence/profiles déclenche `/agence` ET
  // `/agence/profiles` car les deux passent le test startsWith.
  const allItemUrls = filteredSections.flatMap((s) => s.items.map((i) => i.url))
  const bestMatchUrl = (() => {
    if (!pathname) return null
    let best: string | null = null
    for (const url of allItemUrls) {
      if (url === "/") {
        if (pathname === "/") best = "/"
        continue
      }
      const matches = pathname === url || pathname.startsWith(url + "/")
      if (matches && (best === null || url.length > best.length)) {
        best = url
      }
    }
    return best
  })()

  const isActive = (url: string) => url === bestMatchUrl

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  // biome-ignore lint/suspicious/noExplicitAny: image optional on SharedAuthClient
  const userAvatar = ((session?.user as any)?.image as string | undefined) || ""

  return (
    <TooltipProvider delayDuration={100}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="[&_[data-slot=sidebar-container]]:border-r-border/50 [&_[data-slot=sidebar-inner]]:bg-secondary"
      >
        <SidebarHeader className="px-3 pt-3 pb-3">
          <OrgHeader />
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3">
          {filteredSections.map((section, sectionIdx) => (
            <SidebarGroup
              key={section.label ?? `section-${sectionIdx}`}
              className="px-0 py-0"
            >
              {sectionIdx > 0 && (
                <div className="mx-0 my-2 border-t border-foreground/5 pt-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-8" />
              )}
              {section.label && (
                <SidebarGroupLabel className="mb-1 block h-auto px-3 py-0 text-[10px] font-extrabold tracking-widest text-muted-foreground/70 uppercase">
                  {section.label}
                </SidebarGroupLabel>
              )}
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
                            "h-9 gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all duration-200 active:scale-[0.97]",
                            "hover:bg-muted/50 hover:text-foreground",
                            "data-[active=true]:bg-primary/10 data-[active=true]:font-bold data-[active=true]:text-primary data-[active=true]:hover:bg-primary/15 data-[active=true]:hover:text-primary dark:data-[active=true]:bg-primary/20",
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
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            lang={i18n.language}
            onToggleLanguage={() => {
              const current = i18n.language?.startsWith("fr") ? "fr" : "en"
              i18n.changeLanguage(current === "fr" ? "en" : "fr")
            }}
            collapseLabel={t("mySpace.nav.collapse")}
            expandLabel={t("mySpace.nav.expand")}
            lightLabel={t("theme.light")}
            darkLabel={t("theme.dark")}
          />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

function OrgHeader() {
  const { state } = useSidebar()
  if (state === "expanded") {
    return <OrgSwitcher />
  }
  return (
    <Link href="/" className="flex items-center justify-center">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FDFCFA] dark:bg-[#21201E]/77">
        <img
          src="/icons/apple-icon.png"
          alt="Logo"
          className="h-full w-full object-contain"
        />
      </div>
    </Link>
  )
}

interface FooterControlsProps {
  userName: string
  userEmail: string
  userAvatar: string
  lang: string | undefined
  onToggleLanguage: () => void
  collapseLabel: string
  expandLabel: string
  lightLabel: string
  darkLabel: string
}

function FooterControls({
  userName,
  userEmail,
  userAvatar,
  lang,
  onToggleLanguage,
  collapseLabel,
  expandLabel,
  lightLabel,
  darkLabel,
}: FooterControlsProps) {
  const { state, toggleSidebar } = useSidebar()
  const { theme, setTheme } = useTheme()
  const isExpanded = state === "expanded"
  const currentLang = lang?.startsWith("fr") ? "fr" : "en"

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 px-1",
          !isExpanded && "flex-col"
        )}
      >
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLanguage}
          className="flex h-9 items-center gap-1.5 px-2 text-muted-foreground transition-transform hover:text-foreground active:scale-[0.97]"
        >
          <span className="text-base leading-none">
            {currentLang === "fr" ? "🇫🇷" : "🇬🇧"}
          </span>
          <span className="text-xs font-medium uppercase">{currentLang}</span>
        </Button>

        {isExpanded && <div className="flex-1" />}

        {/* Toggle Sidebar Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground transition-transform hover:text-foreground active:scale-[0.97]"
              onClick={toggleSidebar}
            >
              {isExpanded ? (
                <ChevronsLeft className="size-4" />
              ) : (
                <ChevronsRight className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isExpanded ? "top" : "right"}>
            {isExpanded ? collapseLabel : expandLabel}
          </TooltipContent>
        </Tooltip>

        {/* Dark Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 text-muted-foreground transition-transform hover:text-foreground active:scale-[0.97]"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isExpanded ? "top" : "right"}>
            {theme === "dark" ? lightLabel : darkLabel}
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        className={cn(
          "flex items-center gap-3 border-t border-foreground/5 pt-2",
          isExpanded ? "px-1" : "justify-center"
        )}
      >
        <Avatar className="size-8 shrink-0 rounded-full">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="rounded-full text-xs">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {isExpanded && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userName}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <LogoutButton />
          </>
        )}
        {!isExpanded && <LogoutButton tooltipSide="right" />}
      </div>
    </>
  )
}
