/**
 * Layout Espace Conseiller PNPE.
 *
 * Affiché aux rôles conseiller_pnpe, chef_antenne_pnpe, direction_pnpe.
 * Vérification stricte du rôle en Phase 7 via Better Auth + middleware.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CheckSquare,
  Inbox,
  LineChart,
  ListChecks,
  PhoneCall,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/conseiller/file-d-attente", label: "File d'attente", icon: Inbox },
  { href: "/conseiller/mes-demandeurs", label: "Mes D.E", icon: Users },
  { href: "/conseiller/employeurs", label: "Employeurs", icon: Briefcase },
  { href: "/conseiller/offres-a-valider", label: "Offres à valider", icon: ListChecks },
  { href: "/conseiller/prospection", label: "Prospection", icon: PhoneCall },
  { href: "/conseiller/rendez-vous", label: "Rendez-vous", icon: CheckSquare },
  { href: "/conseiller/statistiques", label: "Statistiques", icon: LineChart },
] as const;

export default function ConseillerLayout({
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
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <UserCheck className="size-4" />
            Espace Conseiller
          </div>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-1">
          {NAV.map((item) => {
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
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
