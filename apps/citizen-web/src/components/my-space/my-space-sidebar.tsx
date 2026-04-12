"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Baby,
  Bot,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Globe,

  Moon,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore, useState } from "react"
import { useTranslation } from "react-i18next"
import { api } from "@convex/_generated/api"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"
import { LogoutButton } from "@/components/sidebars/logout-button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  color?: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

interface MySpaceSidebarProps {
  isExpanded?: boolean
  onToggle?: () => void
}

function SidebarText({
  isExpanded,
  children,
  className,
}: {
  isExpanded: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "truncate text-[15.5px] whitespace-nowrap transition-opacity duration-200",
        isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0 overflow-hidden",
        className
      )}
    >
      {children}
    </span>
  )
}

export function MySpaceSidebar({
  isExpanded = false,
  onToggle,
}: MySpaceSidebarProps) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const { t, i18n } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const isDark = mounted && resolvedTheme === "dark"

  const isActive = (url: string) => {
    if (url === "/my-space") {
      return pathname === "/my-space" || pathname === "/my-space/"
    }
    return pathname.startsWith(url)
  }

  const { data: childProfiles } = useAuthenticatedConvexQuery(
    api.functions.childProfiles.getMine,
    {}
  )
  const children = (childProfiles ?? []) as Array<{ _id: string; firstName?: string; lastName?: string }>
  const [childrenOpen, setChildrenOpen] = useState(false)

  const navSections: NavSection[] = [
    {
      label: t("mySpace.nav.sectionIdentity", "Identité"),
      items: [
        { title: "iProfil", url: "/my-space", icon: User },
        { title: "iDocument", url: "/my-space/idocument", icon: FileText },
      ],
    },
    {
      label: t("mySpace.nav.sectionTools", "Outils"),
      items: [
        { title: "iAsted", url: "/my-space/iasted", icon: Bot },
        { title: "iAgenda", url: "/my-space/iagenda", icon: Calendar },
      ],
    },
    {
      label: t("mySpace.nav.sectionRequests", "Demandes"),
      items: [
        { title: "Mes Démarches", url: "/my-space/services-demarches", icon: Briefcase },
      ],
    },
  ]

  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en"
  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        data-slot="sidebar"
        className={cn(
          "flex flex-col py-3 px-3 h-full overflow-y-auto overflow-x-hidden",
          "transition-[width] duration-300 ease-in-out",
          isExpanded ? "w-56 items-stretch" : "w-[68px] items-center"
        )}
      >
        {/* Logo */}
        <div className={cn("mb-3", isExpanded ? "px-1" : "")}>
          <Link href="/" className={cn("flex items-center", isExpanded && "gap-2.5")}>
            <div className="size-11 shrink-0 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/icons/apple-icon.png" alt="Logo" width={44} height={44} className="w-full h-full object-contain" />
            </div>
            <div
              className={cn(
                "flex flex-col transition-opacity duration-200 overflow-hidden whitespace-nowrap",
                isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0"
              )}
            >
              <span className="text-base font-black tracking-[0.2em]">CONSULAT</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-[0.12em]">
                Espace Numérique
              </span>
            </div>
          </Link>
        </div>

        <div className={cn("border-t border-border mb-3", !isExpanded && "w-8 mx-auto")} />

        {/* Navigation */}
        <nav
          className={cn(
            "flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden citizen-scrollbar",
            !isExpanded && "items-center"
          )}
        >
          {navSections.map((section, sectionIdx) => (
            <div key={section.label ?? `section-${sectionIdx}`}>
              {sectionIdx > 0 && (
                <div
                  className={cn(
                    "my-2.5",
                    isExpanded
                      ? "border-t border-foreground/5 pt-2"
                      : "border-t border-foreground/5 pt-2 w-8"
                  )}
                />
              )}

              {isExpanded && section.label && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1.5 block">
                  {section.label}
                </span>
              )}

              {section.items.map((item) => {
                const active = isActive(item.url)
                const button = (
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center transition-all duration-200 rounded-lg",
                      isExpanded ? "w-full gap-3 px-3 h-11" : "w-11 h-11 justify-center",
                      active
                        ? "font-bold text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary"
                        : "font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon
                      className={cn("size-5 shrink-0 transition-colors", active && "text-primary dark:text-primary")}
                    />
                    <SidebarText isExpanded={isExpanded}>{item.title}</SidebarText>
                    {!isExpanded && <span className="sr-only">{item.title}</span>}
                  </Link>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10} className="bg-card border-0 font-semibold">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return <div key={item.title}>{button}</div>
              })}
            </div>
          ))}

          {/* Children section */}
          {children.length > 0 && (
            <div>
              <div className={cn("my-2.5", isExpanded ? "border-t border-foreground/5 pt-2" : "border-t border-foreground/5 pt-2 w-8")} />
              {isExpanded && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1.5 block">
                  {t("mySpace.nav.sectionTutor", "Tuteur")}
                </span>
              )}

              {isExpanded ? (
                <>
                  <button
                    type="button"
                    onClick={() => setChildrenOpen(!childrenOpen)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 h-11 transition-all duration-200 text-[15.5px] rounded-lg",
                      childrenOpen
                        ? "active bg-rose-500/10 text-rose-600 font-bold border border-rose-500/10"
                        : "font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Users className="size-5 shrink-0" />
                    <span className="flex-1 text-left truncate">Mes Enfants</span>
                    <span className="text-[8px] bg-rose-500/12 text-rose-500 font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {children.length}
                    </span>
                    <ChevronDown className={cn("size-3 transition-transform duration-200", childrenOpen && "rotate-180")} />
                  </button>

                  <div className={cn("overflow-hidden transition-all duration-200 ease-in-out", childrenOpen ? "max-h-60 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                    <div className="pl-4 space-y-0.5">
                      {children.map((child) => {
                        const childUrl = `/my-space/children/${child._id}`
                        const active = isActive(childUrl)
                        return (
                          <Link
                            key={child._id}
                            href={childUrl}
                            className={cn(
                              "flex items-center gap-2.5 px-3 h-10 text-[14px] rounded-lg",
                              active
                                ? "active text-rose-600 font-bold bg-rose-500/10 border border-rose-500/10"
                                : "font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <Baby className="size-[18px] shrink-0" />
                            <span className="truncate">{child.identity?.firstName ?? "Enfant"}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      title="Mes Enfants"
                      aria-label="Mes Enfants"
                      className={cn(
                        "flex items-center justify-center w-11 h-11",
                        children.some((c) => isActive(`/my-space/children/${c._id}`))
                          ? "active text-rose-600"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setChildrenOpen(!childrenOpen)}
                    >
                      <Users className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="bg-card border-0">
                    Mes Enfants ({children.length})
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Settings */}
          <div className={cn("mt-auto pb-2 min-h-[44px]")}>
            {isExpanded ? (
              <Link
                href="/my-space/settings"
                className={cn(
                  "flex items-center transition-all duration-200 rounded-lg",
                  isExpanded ? "w-full gap-3 px-3 h-11" : "w-11 h-11 justify-center",
                  isActive("/my-space/settings")
                    ? "font-bold text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary"
                    : "font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Settings className={cn("size-5 shrink-0 transition-colors", isActive("/my-space/settings") && "text-primary dark:text-primary")} />
                <SidebarText isExpanded={isExpanded}>{t("mySpace.nav.settings")}</SidebarText>
              </Link>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/my-space/settings"
                    className={cn(
                      "flex items-center transition-all duration-200 w-11 h-11 justify-center",
                      isActive("/my-space/settings")
                        ? "active text-primary dark:text-primary font-black"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Settings className={cn("size-5 shrink-0 transition-colors", isActive("/my-space/settings") && "text-primary dark:text-primary")} />
                    <span className="sr-only">{t("mySpace.nav.settings")}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="bg-card border-0">
                  {t("mySpace.nav.settings")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </nav>

        {/* Bottom Controls */}
        <div className={cn("flex flex-col gap-1 pt-3", !isExpanded && "items-center")}>
          <div className={cn("border-t border-border mb-2", !isExpanded && "w-8")} />

          {isExpanded ? (
            <div className="flex items-center gap-0.5 px-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={toggleLanguage} className="flex items-center gap-1.5 h-9 px-2 text-muted-foreground hover:text-foreground">
                    <Globe className="size-3.5" />
                    <span className="text-[10px] font-bold uppercase">{currentLang}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{currentLang === "fr" ? "Switch to English" : "Passer en Français"}</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" title={t("mySpace.nav.collapse")} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground" onClick={onToggle}>
                    <ChevronsLeft className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("mySpace.nav.collapse")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground">
                    {isDark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{isDark ? t("theme.light") : t("theme.dark")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" title={t("mySpace.nav.expand")} onClick={onToggle} className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <ChevronsRight className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("mySpace.nav.expand")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {isDark ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{isDark ? t("theme.light") : t("theme.dark")}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* User info */}
          <div className={cn("flex items-center pt-2 mt-1", isExpanded ? "gap-3 px-1" : "flex-col gap-1.5 justify-center")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary dark:text-primary">
                      {session?.user?.name?.[0] || "U"}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                </div>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right">{session?.user?.name || "Utilisateur"}</TooltipContent>
              )}
            </Tooltip>
            {isExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{session?.user?.name || "Utilisateur"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email || ""}</p>
                </div>
                <LogoutButton />
              </>
            )}
            {!isExpanded && <LogoutButton tooltipSide="right" />}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
