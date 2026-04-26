"use client"

import { api } from "@convex/_generated/api"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  Briefcase,
  Calendar,
  FileText,
  LogOut,

  Menu,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Settings,
  Sun,
  User,
  Users,
  X,
} from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CircleMenu } from "@workspace/iasted"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"

interface ChatThread {
  unreadCount?: number
}

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
}

export function MobileNavBar() {
  const pathname = usePathname()
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [circleMenuOpen, setCircleMenuOpen] = useState(false)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const { data: session } = authClient.useSession()
  const { data: childProfiles } = useAuthenticatedConvexQuery(
    api.functions.childProfiles.getMine,
    {}
  )
  const { data: chatThreads } = useAuthenticatedConvexQuery(
    api.functions.chats.listMyChats,
    {}
  )

  const children = childProfiles ?? []
  const totalUnread =
    (chatThreads as ChatThread[] | undefined)?.reduce(
      (acc, thread) => acc + (thread.unreadCount ?? 0),
      0
    ) ?? 0
  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en"
  const userName = session?.user?.name ?? ""
  const userEmail = session?.user?.email ?? ""
  const userInitial = userName?.[0]?.toUpperCase() ?? "U"

  const mainItems: NavItem[] = [
    { title: "iProfil", url: "/my-space", icon: User },
    { title: "iDocument", url: "/my-space/idocument", icon: FileText },
    { title: "iAgenda", url: "/my-space/iagenda", icon: Calendar },
  ]

  const sheetItems: NavItem[] = [
    {
      title: "Mes Démarches",
      url: "/my-space/services-demarches",
      icon: Briefcase,
    },
    {
      title: t("mySpace.nav.settings"),
      url: "/my-space/settings",
      icon: Settings,
    },
  ]

  const isActive = (url: string) => {
    if (url === "/my-space") {
      return pathname === "/my-space" || pathname === "/my-space/"
    }
    return pathname.startsWith(url)
  }

  const isIAstedActive = isActive("/my-space/iasted")
  const hasSheetActive =
    sheetItems.some((i) => isActive(i.url)) ||
    (children.length > 0 && pathname.startsWith("/my-space/children"))

  const handleLogout = async () => {
    setSheetOpen(false)
    await authClient.signOut()
    window.location.href = "/"
  }

  return (
    <>
      <nav className="fixed right-3 bottom-[calc(0.8rem+env(safe-area-inset-bottom,0px))] left-3 z-40 md:hidden">
        <div className="rounded-2xl bg-secondary backdrop-blur-md">
          <div className="flex h-(--mobile-nav-height) items-center justify-around px-2">
            <NavBarItem
              item={mainItems[0]}
              active={isActive(mainItems[0].url)}
              onClick={() => setSheetOpen(false)}
            />
            <NavBarItem
              item={mainItems[1]}
              active={isActive(mainItems[1].url)}
              onClick={() => setSheetOpen(false)}
            />
            <button
              type="button"
              onClick={() => {
                setSheetOpen(false)
                setCircleMenuOpen(true)
              }}
              className="relative -mt-4 flex flex-col items-center"
            >
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
              <motion.div
                initial={false}
                animate={{
                  scale: circleMenuOpen ? 0 : 1,
                  opacity: circleMenuOpen ? 0 : 1,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                suppressHydrationWarning
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full active:scale-95",
                  isIAstedActive
                    ? "bg-emerald-500 ring-2 ring-emerald-500/30"
                    : "bg-emerald-600 hover:bg-emerald-500"
                )}
              >
                <Bot className="h-6 w-6 text-white" />
              </motion.div>
            </button>

            <NavBarItem
              item={mainItems[2]}
              active={isActive(mainItems[2].url)}
              onClick={() => setSheetOpen(false)}
            />

            <button
              type="button"
              onClick={() => setSheetOpen((prev) => !prev)}
              className="flex min-w-[48px] flex-col items-center justify-center gap-0.5 px-1 py-2"
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  (sheetOpen || hasSheetActive) && "bg-primary/10"
                )}
              >
                {sheetOpen ? (
                  <X className="h-4.5 w-4.5 text-primary" />
                ) : (
                  <Menu
                    className={cn(
                      "h-4.5 w-4.5",
                      hasSheetActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium",
                  sheetOpen || hasSheetActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                Menu
              </span>
            </button>
          </div>
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex max-h-[75dvh] flex-col rounded-t-2xl border-none bg-secondary px-4 shadow-2xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("mySpace.nav.navigation")}</SheetTitle>
          </SheetHeader>

          <div className="disable-scrollbars flex-1 space-y-4 overflow-y-auto pt-2 pb-20">
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
                <span className="text-sm font-bold text-white">
                  {userInitial}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {userName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                title={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-3 gap-2">
              {sheetItems.map((item) => (
                <Link
                  key={item.url}
                  href={item.url}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center transition-colors",
                    isActive(item.url)
                      ? "bg-primary/10 font-semibold text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-5",
                      isActive(item.url)
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="text-[11px] leading-tight font-medium">
                    {item.title}
                  </span>
                </Link>
              ))}

              {children.length > 0 && (
                <Link
                  href="/my-space/children"
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center transition-colors",
                    pathname.startsWith("/my-space/children")
                      ? "bg-primary/10 font-semibold text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  <Users
                    className={cn(
                      "size-5",
                      pathname.startsWith("/my-space/children")
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="text-[11px] leading-tight font-medium">
                    Enfants
                  </span>
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {children.length}
                  </span>
                </Link>
              )}
            </div>

            <div className="h-px bg-border/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                  title={
                    currentLang === "fr"
                      ? "Switch to English"
                      : "Passer en Français"
                  }
                >
                  <span className="text-xs font-bold uppercase">
                    {currentLang}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                  title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                >
                  {mounted ? (
                    theme === "dark" ? (
                      <Sun className="h-4.5 w-4.5 text-amber-500" />
                    ) : (
                      <Moon className="h-4.5 w-4.5" />
                    )
                  ) : (
                    <Moon className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 items-center gap-2 rounded-full bg-rose-500/10 px-4 text-rose-500 transition-colors hover:bg-rose-500/15"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">Déconnexion</span>
              </button>
            </div>

            <Button
              className="h-11 w-full rounded-lg border-0 bg-primary text-sm font-medium text-white hover:bg-primary/90"
              onClick={() => setSheetOpen(false)}
              asChild
            >
              <Link
                href="/my-space/services-demarches"
                className="flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4 shrink-0" />
                {t("mySpace.actions.newRequest")}
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── iAsted CircleMenu Overlay ── */}
      <AnimatePresence>
        {circleMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xl md:hidden"
            onClick={() => setCircleMenuOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 200 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.3, opacity: 0, y: 200 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CircleMenu
                defaultOpen
                items={[
                  {
                    label: "Mr Ray",
                    icon: <Bot size={20} className="text-white" />,
                    className: "bg-rose-500 hover:bg-rose-600",
                    onClick: () => {
                      setCircleMenuOpen(false)
                      window.location.href = "/my-space/iasted"
                    },
                  },
                  {
                    label: "iChat",
                    icon: <MessageSquare size={18} className="text-white" />,
                    className: "bg-emerald-600 hover:bg-emerald-500",
                    onClick: () => {
                      setCircleMenuOpen(false)
                      window.dispatchEvent(
                        new CustomEvent("iasted:open", {
                          detail: { tab: "ichat" },
                        })
                      )
                    },
                  },
                  {
                    label: "iAppel",
                    icon: <Phone size={18} className="text-white" />,
                    className: "bg-[#0072B9] hover:bg-[#0080D0]",
                    onClick: () => {
                      setCircleMenuOpen(false)
                      window.dispatchEvent(
                        new CustomEvent("iasted:open", {
                          detail: { tab: "icall" },
                        })
                      )
                    },
                  },
                ]}
                openIcon={<Bot size={22} className="text-white" />}
                triggerClassName="bg-emerald-600 hover:bg-emerald-500"
                onCloseComplete={() => setCircleMenuOpen(false)}
                onTriggerClick={() => {
                  setCircleMenuOpen(false)
                  window.location.href = "/my-space/iasted"
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavBarItem({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={item.url}
      onClick={onClick}
      className="flex min-w-[48px] flex-col items-center justify-center gap-0.5 px-1 py-2"
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          active && "bg-primary/10"
        )}
      >
        <item.icon
          className={cn(
            "h-4.5 w-4.5",
            active ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <span
        className={cn(
          "text-[9px] font-medium",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {item.title}
      </span>
    </Link>
  )
}
