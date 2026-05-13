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
  FileText,
  Globe,
  Moon,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import { api } from "@convex/_generated/api"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"
import { LogoutButton } from "@/components/sidebars/logout-button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
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
}

interface NavSection {
  label?: string
  items: NavItem[]
}

export function MySpaceSidebar() {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const { t } = useTranslation()

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
  const children = (childProfiles ?? []) as Array<{
    _id: string
    identity?: { firstName?: string; lastName?: string }
  }>

  const navSections: NavSection[] = [
    {
      label: t("mySpace.nav.sectionIdentity"),
      items: [
        { title: "iProfil", url: "/my-space", icon: User },
        { title: "iDocument", url: "/my-space/idocument", icon: FileText },
      ],
    },
    {
      label: t("mySpace.nav.sectionTools"),
      items: [
        { title: "iAsted", url: "/my-space/iasted", icon: Bot },
        { title: "iAgenda", url: "/my-space/iagenda", icon: Calendar },
      ],
    },
    {
      label: t("mySpace.nav.sectionRequests"),
      items: [
        {
          title: "Mes Démarches",
          url: "/my-space/services-demarches",
          icon: Briefcase,
        },
      ],
    },
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <Sidebar
        variant="floating"
        collapsible="none"
        className="border-none bg-background shadow-none ring-0"
      >
        <SidebarHeader className="px-3 pt-3 pb-3">
          <Header />
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 citizen-scrollbar">
          {navSections.map((section, sectionIdx) => (
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
                            "h-9 gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all duration-200",
                            "hover:bg-muted/50 hover:text-foreground",
                            "data-[active=true]:bg-primary/10 data-[active=true]:font-bold data-[active=true]:text-primary dark:data-[active=true]:bg-primary/20",
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

          {/* Children section */}
          {children.length > 0 && (
            <ChildrenSection
              children={children}
              isActive={isActive}
              label={t("mySpace.nav.sectionTutor")}
              myChildrenLabel={t("mySpace.myChildren")}
            />
          )}

          {/* Settings — pushed to bottom of content area */}
          <div className="mt-auto pb-2">
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/my-space/settings")}
                  tooltip={t("mySpace.nav.settings")}
                  className={cn(
                    "h-9 gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all duration-200",
                    "hover:bg-muted/50 hover:text-foreground",
                    "data-[active=true]:bg-primary/10 data-[active=true]:font-bold data-[active=true]:text-primary dark:data-[active=true]:bg-primary/20",
                    "group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:rounded-full! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto"
                  )}
                >
                  <Link href="/my-space/settings">
                    <Settings className="size-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {t("mySpace.nav.settings")}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-border px-3 pt-3">
          <FooterControls
            session={session}
            lightLabel={t("theme.light")}
            darkLabel={t("theme.dark")}
          />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

function Header() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <Image
          src="/icons/apple-icon.png"
          alt="Logo"
          width={40}
          height={40}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col overflow-hidden whitespace-nowrap">
        <span className="text-sm font-black tracking-[0.2em]">CONSULAT</span>
        <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground">
          Espace Numérique
        </span>
      </div>
    </Link>
  )
}

interface ChildrenSectionProps {
  children: Array<{
    _id: string
    identity?: { firstName?: string; lastName?: string }
  }>
  isActive: (url: string) => boolean
  label: string
  myChildrenLabel: string
}

function ChildrenSection({
  children,
  isActive,
  label,
  myChildrenLabel,
}: ChildrenSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarGroup className="px-0 py-0">
      <div className="mx-0 my-2 border-t border-foreground/5 pt-2" />
      <SidebarGroupLabel className="mb-1.5 block px-3 text-[10px] font-extrabold tracking-widest text-muted-foreground/70 uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <Collapsible open={open} onOpenChange={setOpen}>
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200",
                    open
                      ? "border border-rose-500/10 bg-rose-500/10 font-bold text-rose-600"
                      : "font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Users className="size-[18px] shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {myChildrenLabel}
                  </span>
                  <span className="min-w-[18px] rounded-full bg-rose-500/12 px-1.5 py-0.5 text-center text-[8px] font-bold text-rose-500">
                    {children.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="mx-0 border-l-0 pl-4">
                  {children.map((child) => {
                    const childUrl = `/my-space/children/${child._id}`
                    const active = isActive(childUrl)
                    return (
                      <SidebarMenuSubItem key={child._id}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={active}
                          className={cn(
                            "h-8 gap-2.5 rounded-xl px-3 text-sm",
                            active
                              ? "border border-rose-500/10 bg-rose-500/10 font-bold text-rose-600 data-[active=true]:bg-rose-500/10 data-[active=true]:text-rose-600"
                              : "font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Link href={childUrl}>
                            <Baby className="size-4 shrink-0" />
                            <span className="truncate">
                              {child.identity?.firstName ?? "Enfant"}
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

interface FooterControlsProps {
  session: ReturnType<typeof authClient.useSession>["data"]
  lightLabel: string
  darkLabel: string
}

function FooterControls({
  session,
  lightLabel,
  darkLabel,
}: FooterControlsProps) {
  const { i18n } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const isDark = mounted && resolvedTheme === "dark"
  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en"
  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")
  }

  return (
    <>
      <div className="flex items-center gap-0.5 px-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex h-9 items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Globe className="size-3.5" />
              <span className="text-[10px] font-bold uppercase">
                {currentLang}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {currentLang === "fr"
              ? "Switch to English"
              : "Passer en Français"}
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isDark ? lightLabel : darkLabel}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* User info */}
      <div className="mt-1 flex items-center gap-3 px-1 pt-2">
        <div className="relative">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-bold text-primary dark:text-primary">
              {session?.user?.name?.[0] || "U"}
            </span>
          </div>
          <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {session?.user?.name || "Utilisateur"}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {session?.user?.email || ""}
          </p>
        </div>
        <LogoutButton />
      </div>
    </>
  )
}
