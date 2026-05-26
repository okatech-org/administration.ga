/**
 * Layout Espace Conseiller PNPE.
 *
 * Affiché aux rôles staff PNPE (conseiller_pnpe, chef_antenne_pnpe,
 * direction_pnpe, admin_ministere_travail). Le wrapping `PnpeRoleGate`
 * fait la garde RBAC ; cette couche fournit le shell visuel :
 *   - Header avec branding PNPE, identité utilisateur, badge rôle/antenne.
 *   - Sidebar adaptative selon le rôle (DG + Admin Min Travail voient les
 *     entrées "Antennes" et "Reporting national" en plus).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Briefcase,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  MapPin,
  PhoneCall,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { PnpeRoleGate } from "@/components/auth/PnpeRoleGate";
import { PnpeRole, getRoleLabel } from "@/lib/pnpe/roles";
import { usePnpeRole } from "@/lib/pnpe/use-pnpe-role";
import { IAstedLaborCodeWidget } from "@/components/iasted/IAstedLaborCodeWidget";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Liste des rôles autorisés à voir l'entrée. Si absent, visible par tous. */
  roles?: PnpeRole[];
};

const NAV: NavItem[] = [
  { href: "/conseiller", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/conseiller/file-d-attente", label: "File d'attente", icon: Inbox },
  { href: "/conseiller/mes-demandeurs", label: "Demandeurs", icon: Users },
  { href: "/conseiller/employeurs", label: "Employeurs", icon: Briefcase },
  {
    href: "/conseiller/offres-a-valider",
    label: "Offres à valider",
    icon: ListChecks,
  },
  { href: "/conseiller/prospection", label: "Prospection", icon: PhoneCall },
  { href: "/conseiller/rendez-vous", label: "Rendez-vous", icon: CheckSquare },
  {
    href: "/conseiller/statistiques",
    label: "Statistiques",
    icon: LineChart,
    roles: [
      PnpeRole.ChefAntennePnpe,
      PnpeRole.DirectionPnpe,
      PnpeRole.AdminMinistereTravail,
    ],
  },
];

const ALLOWED_ROLES = [
  PnpeRole.ConseillerPnpe,
  PnpeRole.ChefAntennePnpe,
  PnpeRole.DirectionPnpe,
  PnpeRole.AdminMinistereTravail,
];

export default function ConseillerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <ConseillerHeader />
      <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <ConseillerSidebar />
        <main className="min-w-0">
          <PnpeRoleGate
            allowedRoles={ALLOWED_ROLES}
            redirectMissingProfile={false}
          >
            {children}
          </PnpeRoleGate>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────

function ConseillerHeader() {
  const { role, antenneId, status } = usePnpeRole();
  const session = authClient.useSession();
  const user = session.data?.user;

  // Charge le nom d'antenne si l'utilisateur est rattaché à une antenne
  const antennes = useQuery(
    api.functions.pnpe.antennes.list,
    antenneId ? {} : "skip",
  ) as
    | Array<{ _id: string; nom: string; ville: string }>
    | undefined;
  const antenne = antennes?.find((a) => a._id === antenneId);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b bg-card sticky top-0 z-30 backdrop-blur-sm bg-card/95">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/conseiller" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground shrink-0">
            G
          </div>
          <span className="font-display font-black text-lg tracking-tight truncate">
            PNPE<span className="text-emerald-500">.GA</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          {status === "ready" && role ? (
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <div className="text-right min-w-0">
                <div className="text-sm font-medium truncate">
                  {user?.name ?? user?.email ?? "Utilisateur"}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-end">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="size-3" />
                    {getRoleLabel(role)}
                  </span>
                  {antenne && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {antenne.nom}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-semibold text-sm shrink-0">
                {(user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar adaptative
// ─────────────────────────────────────────────────────────────

function ConseillerSidebar() {
  const pathname = usePathname();
  const { role } = usePnpeRole();

  const visibleNav = NAV.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <aside className="space-y-4">
      <nav className="space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          // "Tableau de bord" doit matcher exactement, sinon il serait
          // toujours actif (préfixe "/conseiller" inclut tout).
          const active =
            item.href === "/conseiller"
              ? pathname === "/conseiller"
              : pathname?.startsWith(item.href);
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
      <IAstedLaborCodeWidget />
    </aside>
  );
}
