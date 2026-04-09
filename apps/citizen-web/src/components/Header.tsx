"use client"

import { CountryCode, ServiceCategory } from "@convex/lib/constants"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { changeLanguage } from "i18next"
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Globe,
  GraduationCap,
  Menu,
  Newspaper,
  Users,
  X,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import HeaderUser from "@/components/auth/HeaderUser"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlagIcon } from "@/components/ui/flag-icon"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function Header() {
  const { t, i18n } = useTranslation()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [servicesExpanded, setServicesExpanded] = useState(false)

  const languages = [
    { label: "Français", value: "fr", country: CountryCode.FR },
    { label: "English", value: "en", country: CountryCode.GB },
  ]

  const navLinks = [
    { label: t("header.nav.worldNetwork"), href: "/reps", icon: Globe },
    { label: t("header.nav.news"), href: "/news", icon: Newspaper },
    { label: t("header.nav.resources", "Ressources"), href: "/ressources", icon: BookOpen },
    { label: t("header.nav.information"), href: "/information", icon: FileText },
    { label: t("header.nav.academy"), href: "/academy", icon: GraduationCap },
    { label: t("header.nav.community"), href: "/community", icon: Users },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <>
      <header className="relative z-50">
        <div className="bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0">
                <img
                  src="/icons/apple-icon.png"
                  alt="Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-lg text-foreground leading-tight">
                  Consulat.ga
                </div>
                <div suppressHydrationWarning className="text-xs text-muted-foreground">
                  {t("header.country")}
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <div className="relative group">
                <Button variant="ghost" size="sm" className="font-medium" asChild>
                  <Link
                    href="/services"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <span suppressHydrationWarning>{t("header.nav.services")}</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="bg-card rounded-xl shadow-xl border border-border p-2 min-w-[220px]">
                    {Object.entries(ServiceCategory).map(([key, value]) => (
                      <Link
                        key={key}
                        href={`/services?category=${value}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <span suppressHydrationWarning className="text-sm font-medium text-foreground">
                          {t(`services.categoriesMap.${value}`)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {navLinks.map((link) => (
                <Button key={link.label} asChild variant="ghost" size="sm" className="font-medium">
                  <Link
                    href={link.href}
                    className={cn(
                      isActive(link.href) &&
                        "bg-primary text-white hover:bg-primary/90 hover:text-white"
                    )}
                  >
                    <span suppressHydrationWarning>{link.label}</span>
                  </Link>
                </Button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                    <FlagIcon
                      countryCode={
                        languages.find((l) => (i18n.language ?? "fr").startsWith(l.value))
                          ?.country || CountryCode.FR
                      }
                      size={16}
                      className="w-4 h-auto rounded-sm"
                    />
                    <span suppressHydrationWarning className="uppercase text-xs font-medium">
                      {i18n.language}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.value}
                      onClick={() => changeLanguage(lang.value)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FlagIcon
                          countryCode={lang.country}
                          size={16}
                          className="w-4 h-auto rounded-sm"
                        />
                        <span>{lang.label}</span>
                      </span>
                      {(i18n.language ?? "fr").startsWith(lang.value) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden sm:block">
                <HeaderUser />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="lg:hidden"
                aria-label={t("header.openMenu")}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-label={t("header.closeMenu")}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-card z-50 transform transition-transform duration-300 ease-out lg:hidden flex flex-col shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img src="/icons/apple-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <div className="font-bold text-foreground">Consulat.ga</div>
              <div suppressHydrationWarning className="text-xs text-muted-foreground">
                {t("header.country")}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label={t("header.closeMenu")}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <HeaderUser />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-2 bg-background">
                <FlagIcon
                  countryCode={languages.find((l) => (i18n.language ?? "fr").startsWith(l.value))?.country || CountryCode.FR}
                  size={16}
                  className="w-5 h-auto rounded-sm"
                />
                <span suppressHydrationWarning className="uppercase text-xs font-medium">
                  {i18n.language}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => changeLanguage(lang.value)}
                  className="flex items-center justify-between cursor-pointer py-2.5"
                >
                  <span className="flex items-center gap-3">
                    <FlagIcon countryCode={lang.country} size={18} className="w-5 h-auto rounded-sm shadow-sm" />
                    <span className="font-medium">{lang.label}</span>
                  </span>
                  {(i18n.language ?? "fr").startsWith(lang.value) && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors mb-1",
                isActive(link.href) && "bg-primary text-white"
              )}
            >
              <link.icon className="w-5 h-5" />
              <span className="font-medium" suppressHydrationWarning>{link.label}</span>
            </Link>
          ))}

          <Separator className="my-4" />

          <div>
            <button
              type="button"
              onClick={() => setServicesExpanded(!servicesExpanded)}
              className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <span className="font-medium" suppressHydrationWarning>{t("header.nav.services")}</span>
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${servicesExpanded ? "rotate-180" : ""}`} />
            </button>

            {servicesExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {Object.entries(ServiceCategory).map(([key, value]) => (
                  <Link
                    key={key}
                    href={`/services?category=${value}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-secondary transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span suppressHydrationWarning>{t(`services.categoriesMap.${value}`)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center" suppressHydrationWarning>
            consulat.ga · {t("header.country")}
          </p>
        </div>
      </aside>
    </>
  )
}
