/**
 * Shell visuel pour les staff PNPE (4 rôles : Direction PNPE, Admin
 * Ministère du Travail, Chef d'antenne, Conseiller).
 *
 * Header :
 *   - Logo PNPE.GA
 *   - Identité utilisateur + libellé du rôle + antenne de rattachement
 *   - Bouton déconnexion
 *
 * Sidebar (2 sections) :
 *   - **Espace PNPE** : Tableau de bord, File d'attente, Demandeurs,
 *     Employeurs, Offres à valider, Prospection, Rendez-vous, Statistiques
 *     (les items hors-rôle sont masqués via `roles?`).
 *   - **iBureau** : iProfil, iCorrespondance, iDocument, iAgenda, iCom
 *     (modules génériques de l'écosystème OkaTech, accessibles depuis
 *     n'importe quel rôle staff PNPE).
 *
 * Utilisé par :
 *   - `conseiller/layout.tsx` (avec PnpeRoleGate pour le RBAC)
 *   - `(app)/layout.tsx` quand l'utilisateur est staff PNPE
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  FileText,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
  UserCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import { OrgProvider } from "@workspace/agent-features/shell";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { PnpeRole, getRoleLabel } from "@/lib/pnpe/roles";
import { usePnpeRole } from "@/lib/pnpe/use-pnpe-role";
import { IAstedLaborCodeWidget } from "@/components/iasted/IAstedLaborCodeWidget";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Si défini, seuls ces rôles voient l'entrée. */
  roles?: PnpeRole[];
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const STAFF_NAV: NavSection[] = [
  {
    id: "pnpe-metier",
    label: "Espace PNPE",
    items: [
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
    ],
  },
  {
    id: "ibureau",
    label: "iBureau",
    items: [
      { href: "/iprofil", label: "iProfil", icon: UserCircle2 },
      { href: "/icorrespondance", label: "iCorrespondance", icon: Mail },
      { href: "/idocument", label: "iDocument", icon: FileText },
      { href: "/iagenda", label: "iAgenda", icon: CalendarDays },
      { href: "/icom", label: "iCom", icon: MessageSquare },
    ],
  },
];

export function PnpeStaffShell({ children }: { children: React.ReactNode }) {
  // OrgProvider est requis par les pages iBureau (iProfil, iCorrespondance,
  // iDocument, iAgenda, iCom) qui appellent `useOrg()`. L'utilisateur staff
  // PNPE a une membership sur l'org `pnpe` créée par staffAccountsPnpe.ts,
  // que OrgProvider sélectionne automatiquement (autoBindFirstMembership).
  return (
    <OrgProvider storageKey="pnpe-active-org">
      <div className="min-h-screen bg-background">
        <PnpeStaffHeader />
        <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <PnpeStaffSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────

function PnpeStaffHeader() {
  const { role, antenneId, status } = usePnpeRole();
  const session = authClient.useSession();
  const user = session.data?.user;

  const antennes = useQuery(
    api.functions.pnpe.antennes.list,
    antenneId ? {} : "skip",
  ) as Array<{ _id: string; nom: string; ville: string }> | undefined;
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
// Sidebar (2 sections : Espace PNPE + iBureau)
// ─────────────────────────────────────────────────────────────

function PnpeStaffSidebar() {
  const pathname = usePathname();
  const { role } = usePnpeRole();

  const isActive = (href: string) => {
    // Match exact pour /conseiller pour éviter qu'il s'active sur les
    // sous-routes (file-d-attente, mes-demandeurs, etc.).
    if (href === "/conseiller") return pathname === "/conseiller";
    return pathname?.startsWith(href);
  };

  return (
    <aside className="space-y-6">
      {STAFF_NAV.map((section) => {
        const visibleItems = section.items.filter(
          (item) => !item.roles || (role && item.roles.includes(role)),
        );
        if (visibleItems.length === 0) return null;

        return (
          <nav key={section.id}>
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
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
            </div>
          </nav>
        );
      })}

      <div className="pt-2">
        <IAstedLaborCodeWidget />
      </div>

      <div className="px-2 pt-1 text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
        <BookOpen className="size-3" />
        Espace agent — PNPE.GA
      </div>
    </aside>
  );
}
