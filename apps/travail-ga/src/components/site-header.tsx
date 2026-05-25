"use client";

import Link from "next/link";
import { Briefcase, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn, pnpeLink } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";

const NAV = [
  { href: "/offres", label: "Offres" },
  { href: "/publier-annonce", label: "Publier une annonce" },
  { href: "/antennes", label: "Antennes" },
  { href: "/je-cherche", label: "Je cherche" },
  { href: "/je-veux-embaucher", label: "Je veux embaucher" },
  { href: "/statistiques", label: "Stats" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <Briefcase className="size-4" />
          </div>
          <span className="font-display font-black text-lg tracking-tight">
            TRAVAIL<span className="text-emerald-500">.GA</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <UserMenu />
          <a
            href={pnpeLink("/")}
            className={cn(
              "hidden xl:inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            Espace PNPE →
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-6 py-3 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/mon-compte"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              Mon compte
            </Link>
            <a
              href={pnpeLink("/")}
              className="block px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold text-center"
            >
              Espace PNPE →
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
