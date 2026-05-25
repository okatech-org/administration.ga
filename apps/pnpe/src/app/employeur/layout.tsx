/**
 * Layout Espace Employeur PNPE.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CheckSquare,
  FileCheck2,
  Home,
  Inbox,
  PlusCircle,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/employeur/tableau-de-bord", label: "Tableau de bord", icon: Home },
  { href: "/employeur/verification", label: "Vérification", icon: FileCheck2 },
  { href: "/employeur/offres", label: "Mes offres", icon: Briefcase },
  { href: "/employeur/offres/nouvelle", label: "Publier une offre", icon: PlusCircle },
  { href: "/employeur/candidatures", label: "Candidatures", icon: Inbox },
  { href: "/employeur/vivier", label: "Vivier (CVthèque)", icon: Users },
  { href: "/employeur/entretiens", label: "Entretiens", icon: Video },
] as const;

export default function EmployeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground">
              G
            </div>
            <span className="font-display font-black text-lg tracking-tight">
              PNPE<span className="text-emerald-500">.GA</span>
            </span>
          </Link>
          <div className="text-sm text-muted-foreground">Espace Employeur</div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
