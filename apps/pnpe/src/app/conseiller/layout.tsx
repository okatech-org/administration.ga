/**
 * Layout Espace Conseiller PNPE.
 *
 * Sidebar dynamique : les items affiches sont filtres en fonction des
 * modules `pnpeStaffAssignments.modules` du user connecte. Un conseiller
 * d'antenne ne voit pas les modules de pilotage national, un formateur
 * Auto-Emploi ne voit que ses sessions BMC, etc.
 *
 * Affiche aussi les liens "Rendez-vous" et "Statistiques" qui sont
 * accessibles a tous les roles staff PNPE (pas de gating module-based).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  LineChart,
  Loader2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyPnpeAssignment } from "@/lib/use-my-pnpe-assignment";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type PnpeModuleClient,
} from "@/lib/pnpe-modules-catalog";

// Items toujours visibles (transverses, non gated par module)
const ALWAYS_VISIBLE = [
  {
    href: "/conseiller/rendez-vous",
    label: "Rendez-vous",
    icon: CheckSquare,
    category: "transverse",
  },
  {
    href: "/conseiller/statistiques",
    label: "Statistiques",
    icon: LineChart,
    category: "transverse",
  },
] as const;

export default function ConseillerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { assignment, modules, isLoading, hasFallback } = useMyPnpeAssignment();

  // Group modules par categorie pour rendu sectionne
  const groupedByCategory = modules.reduce<Record<string, PnpeModuleClient[]>>(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {},
  );

  // Identite affichee dans le header
  const displayName = assignment
    ? `${assignment.prenoms} ${assignment.nom}`
    : "Conseiller PNPE";
  const displayRole = assignment?.fonctionAffichee ?? "Espace Conseiller";

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
          <div className="text-sm flex items-center gap-2">
            <UserCheck className="size-4 text-muted-foreground" />
            <div className="text-right">
              <div className="font-medium leading-tight">{displayName}</div>
              <div className="text-xs text-muted-foreground leading-tight">
                {displayRole}
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2.5">
              <Loader2 className="size-4 animate-spin" />
              Chargement…
            </div>
          ) : (
            <>
              {/* Modules groupes par categorie */}
              {CATEGORY_ORDER.filter((c) => groupedByCategory[c]?.length).map(
                (cat) => (
                  <div key={cat}>
                    <div className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </div>
                    <ul className="space-y-0.5">
                      {groupedByCategory[cat].map((m) => {
                        const Icon = m.icon;
                        const active = pathname?.startsWith(m.route);
                        return (
                          <li key={m.code}>
                            <Link
                              href={m.route}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                              {m.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ),
              )}

              {/* Items transverses */}
              <div>
                <div className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transverse
                </div>
                <ul className="space-y-0.5">
                  {ALWAYS_VISIBLE.map((item) => {
                    const Icon = item.icon;
                    const active = pathname?.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {hasFallback && (
                <div className="px-4 py-2 mt-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Mode admin : tous les modules affiches (pas d'assignment
                  PNPE trouve).
                </div>
              )}
            </>
          )}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
