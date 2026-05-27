/**
 * Layout — Espace Demandeur d'Emploi.
 *
 * Sidebar dédiée D.E avec accès aux 8 sections principales du parcours :
 * inscription, profil, CV, offres, candidatures, messages, rendez-vous,
 * formation. Le middleware racine route les `demandeur_emploi` ici.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  Send,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PnpeRoleGate } from "@/components/auth/PnpeRoleGate";
import { PnpeRole } from "@/lib/pnpe/roles";

const NAV_ITEMS = [
  { href: "/demandeur/profil", label: "Mon profil", icon: UserCircle },
  { href: "/demandeur/cv", label: "Mon CV", icon: FileText },
  { href: "/demandeur/offres", label: "Offres d'emploi", icon: Briefcase },
  { href: "/demandeur/candidatures", label: "Mes candidatures", icon: Send },
  { href: "/demandeur/messages", label: "Messages", icon: MessageSquare },
  { href: "/demandeur/rendez-vous", label: "Rendez-vous", icon: Calendar },
  { href: "/demandeur/formation", label: "Formations", icon: GraduationCap },
] as const;

export default function DemandeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Pages d'inscription : accessibles sans profil (le user n'a pas encore
  // de profil D.E). Les autres routes /demandeur/* exigent le rôle.
  const isInscription = pathname?.startsWith("/demandeur/inscription");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <div className="text-sm text-muted-foreground">
            Espace Demandeur d'Emploi
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar */}
          <aside>
            <nav className="space-y-1">
              <Link
                href="/demandeur"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/demandeur"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Home className="size-4" />
                Accueil
              </Link>
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

          {/* Main content */}
          <main className="min-w-0">
            {isInscription ? (
              children
            ) : (
              <PnpeRoleGate allowedRoles={[PnpeRole.DemandeurEmploi]}>
                {children}
              </PnpeRoleGate>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
