/**
 * Tableau de bord PNPE — vue différenciée selon le rôle staff.
 *
 *  - Direction PNPE / Admin Ministère du Travail → Vue nationale
 *  - Chef d'antenne → Vue antenne
 *  - Conseiller PNPE → Mon portefeuille
 *
 * Composants design system : PageHeader + FlatCard + SectionHeader
 * (Citizen Design System v3.0 — surfaces warm-gray, zero shadow,
 * icônes en boîtes colorées).
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Building2,
  Briefcase,
  CheckCircle2,
  Globe2,
  Inbox,
  Layers,
  LayoutDashboard,
  MapPin,
  PhoneCall,
  TrendingUp,
  Users,
  UserCheck,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  FlatCard,
  PageHeader,
  SectionHeader,
} from "@workspace/agent-features/components/my-space";
import { usePnpeRole } from "@/lib/pnpe/use-pnpe-role";
import { PnpeRole, getRoleLabel } from "@/lib/pnpe/roles";

const PROVINCE_LABEL: Record<string, string> = {
  ESTUAIRE: "Estuaire",
  HAUT_OGOOUE: "Haut-Ogooué",
  MOYEN_OGOOUE: "Moyen-Ogooué",
  NGOUNIE: "Ngounié",
  NYANGA: "Nyanga",
  OGOOUE_IVINDO: "Ogooué-Ivindo",
  OGOOUE_LOLO: "Ogooué-Lolo",
  OGOOUE_MARITIME: "Ogooué-Maritime",
  WOLEU_NTEM: "Woleu-Ntem",
};

const STATUT_DE_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VALIDATION: "En validation",
  ACTIF: "Actif",
  EN_FORMATION: "En formation",
  EN_CONTRAT: "En contrat",
  PLACE: "Placé",
  SUSPENDU: "Suspendu",
  INACTIF: "Inactif",
};

export default function PnpeDashboardPage() {
  const { status, role, antenneId } = usePnpeRole();

  if (status === "loading" || status !== "ready" || !role) {
    return null; // Géré par PnpeRoleGate dans le layout
  }

  if (
    role === PnpeRole.DirectionPnpe ||
    role === PnpeRole.AdminMinistereTravail
  ) {
    return <NationalDashboard role={role} />;
  }

  if (role === PnpeRole.ChefAntennePnpe && antenneId) {
    return (
      <AntenneDashboard
        antenneId={antenneId as Id<"antennesPnpe">}
        role={role}
      />
    );
  }

  if (role === PnpeRole.ConseillerPnpe) {
    return <PortfolioDashboard role={role} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle={getRoleLabel(role)}
        icon={<LayoutDashboard className="size-4" />}
      />
      <FlatCard className="p-12 text-center text-muted-foreground">
        Espace formateur Auto-Emploi —{" "}
        <Link href="/auto-emploi/formation" className="text-primary underline">
          accéder aux sessions BMC
        </Link>
      </FlatCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card — bloc compact réutilisable (FlatCard)
// ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "amber" | "emerald" | "blue";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-600"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-600"
        : tone === "blue"
          ? "bg-blue-500/10 text-blue-600"
          : "bg-foreground/8 dark:bg-foreground/5 text-foreground/70";

  return (
    <FlatCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`size-9 rounded-md flex items-center justify-center ${toneClass}`}>
          <Icon className="size-4.5" />
        </div>
        {hint && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-display font-bold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      </div>
    </FlatCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Vue nationale — Direction PNPE + Admin Ministère
// ─────────────────────────────────────────────────────────────

function NationalDashboard({ role }: { role: PnpeRole }) {
  const kpis = useQuery(api.functions.pnpe.stats.nationalKpis, {});
  const byProvince = useQuery(api.functions.pnpe.stats.demandeursByProvince, {});
  const bySector = useQuery(api.functions.pnpe.stats.offresBySector, {});
  const recentOffres = useQuery(api.functions.pnpe.stats.recentOffres, {
    limit: 5,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vue nationale"
        subtitle={`${getRoleLabel(role)} · Réseau PNPE Gabon`}
        icon={<Globe2 className="size-4" />}
      />

      {/* KPIs nationaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Demandeurs inscrits"
          value={kpis?.demandeursInscrits ?? "…"}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="D.E actifs"
          value={kpis?.demandeursActifs ?? "…"}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiCard
          label="Offres publiées"
          value={kpis?.offresPubliees ?? "…"}
          icon={Briefcase}
        />
        <KpiCard
          label="Employeurs vérifiés"
          value={kpis?.employeursVerifies ?? "…"}
          icon={Building2}
        />
        <KpiCard
          label="Antennes opérationnelles"
          value={`${kpis?.antennesOperationnelles ?? "…"} / 9`}
          icon={MapPin}
          hint="Provinces"
        />
        <KpiCard
          label="Placements réalisés"
          value={kpis?.demandeursPlaces ?? "…"}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FlatCard className="p-5">
          <SectionHeader
            icon={<Layers />}
            title="Répartition par province"
          />
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Demandeurs d'emploi inscrits
          </p>
          {byProvince === undefined ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : byProvince.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune donnée disponible.
            </div>
          ) : (
            <ul className="space-y-2">
              {byProvince
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((p) => (
                  <ProvinceBar
                    key={p.province}
                    label={PROVINCE_LABEL[p.province] ?? p.province}
                    count={p.count}
                    max={Math.max(...byProvince.map((x) => x.count))}
                  />
                ))}
            </ul>
          )}
        </FlatCard>

        <FlatCard className="p-5">
          <SectionHeader icon={<TrendingUp />} title="Top secteurs" />
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Offres actuellement publiées
          </p>
          {bySector === undefined ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : bySector.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune offre publiée pour le moment.
            </div>
          ) : (
            <ul className="space-y-2">
              {bySector.slice(0, 6).map((s) => (
                <li
                  key={s.secteur}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground/90 truncate">
                    {s.secteur}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </FlatCard>
      </div>

      <RecentOffresSection offres={recentOffres ?? null} />
    </div>
  );
}

function ProvinceBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground/90 truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// Vue antenne — Chef d'antenne
// ─────────────────────────────────────────────────────────────

function AntenneDashboard({
  antenneId,
  role,
}: {
  antenneId: Id<"antennesPnpe">;
  role: PnpeRole;
}) {
  const kpis = useQuery(api.functions.pnpe.stats.antenneKpis, { antenneId });
  const recentDe = useQuery(api.functions.pnpe.stats.recentDemandeurs, {
    antenneId,
    limit: 6,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={kpis?.antenneNom ?? "Antenne"}
        subtitle={`${getRoleLabel(role)}${kpis?.antenneVille ? ` · ${kpis.antenneVille}` : ""}`}
        icon={<MapPin className="size-4" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="D.E rattachés"
          value={kpis?.demandeursTotal ?? "…"}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="En validation"
          value={kpis?.demandeursEnValidation ?? "…"}
          icon={Inbox}
          tone="amber"
          hint="File d'attente"
        />
        <KpiCard
          label="D.E actifs"
          value={kpis?.demandeursActifs ?? "…"}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiCard
          label="Placés"
          value={kpis?.demandeursPlaces ?? "…"}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Conseillers actifs"
          value={kpis?.conseillersActifs ?? "…"}
          icon={UserCheck}
        />
        <KpiCard
          label="En contrat"
          value={kpis?.demandeursEnContrat ?? "…"}
          icon={Briefcase}
        />
        <KpiCard
          label="Candidatures actives"
          value={kpis?.candidaturesActives ?? "…"}
          icon={TrendingUp}
          hint={`Total : ${kpis?.candidaturesTotal ?? 0}`}
        />
      </div>

      <RecentDemandeursSection demandeurs={recentDe ?? null} />

      <QuickActions />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vue portefeuille — Conseiller
// ─────────────────────────────────────────────────────────────

function PortfolioDashboard({ role }: { role: PnpeRole }) {
  const portfolio = useQuery(api.functions.pnpe.stats.myPortfolioKpis, {});
  const recentOffres = useQuery(api.functions.pnpe.stats.recentOffres, {
    limit: 5,
  });

  if (portfolio === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mon portefeuille"
          subtitle="Chargement…"
          icon={<UserCheck className="size-4" />}
        />
      </div>
    );
  }

  if (portfolio === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mon portefeuille"
          subtitle={getRoleLabel(role)}
          icon={<UserCheck className="size-4" />}
        />
        <FlatCard className="p-12 text-center text-muted-foreground">
          Aucune antenne rattachée. Contactez votre chef d'antenne.
        </FlatCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mon portefeuille"
        subtitle={`${getRoleLabel(role)} · ${portfolio.antenneNom}`}
        icon={<UserCheck className="size-4" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Mes D.E"
          value={portfolio.mesDemandeursTotal}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Actifs"
          value={portfolio.mesDemandeursActifs}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiCard
          label="File d'attente"
          value={portfolio.fileAttenteTotal}
          icon={Inbox}
          tone="amber"
          hint="Antenne"
        />
        <KpiCard
          label="Entretiens en cours"
          value={portfolio.candidaturesEntretien}
          icon={PhoneCall}
        />
      </div>

      <QuickActions />

      <RecentOffresSection offres={recentOffres ?? null} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Widgets partagés
// ─────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    {
      href: "/conseiller/file-d-attente",
      label: "Valider des D.E",
      icon: Inbox,
    },
    {
      href: "/conseiller/offres-a-valider",
      label: "Modérer les offres",
      icon: Briefcase,
    },
    {
      href: "/conseiller/mes-demandeurs",
      label: "Mes D.E",
      icon: Users,
    },
    {
      href: "/conseiller/rendez-vous",
      label: "Rendez-vous du jour",
      icon: PhoneCall,
    },
  ];
  return (
    <FlatCard className="p-5">
      <SectionHeader icon={<ArrowRight />} title="Actions rapides" />
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center justify-between gap-3 rounded-lg bg-background p-3 text-sm hover:bg-primary/5 transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                <span className="truncate font-medium">{a.label}</span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>
    </FlatCard>
  );
}

function RecentOffresSection({
  offres,
}: {
  offres:
    | Array<{
        _id: string;
        titre: string;
        reference: string;
        typeContrat: string;
        ville: string;
        province: string;
        datePublication?: number;
        nbCandidatures: number;
      }>
    | null;
}) {
  return (
    <FlatCard className="p-5">
      <SectionHeader
        icon={<Briefcase />}
        title="Offres récemment publiées"
        actions={
          <Link
            href="/conseiller/offres-a-valider"
            className="text-xs font-medium text-primary hover:underline"
          >
            Voir tout
          </Link>
        }
      />
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        5 dernières offres validées et publiées
      </p>
      {offres === null ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : offres.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Aucune offre publiée pour le moment.
        </div>
      ) : (
        <ul className="space-y-2">
          {offres.map((o) => (
            <li
              key={o._id}
              className="flex items-center justify-between gap-4 rounded-lg bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{o.titre}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {o.reference} · {o.typeContrat} · {o.ville}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {o.nbCandidatures} cand.
              </span>
            </li>
          ))}
        </ul>
      )}
    </FlatCard>
  );
}

function RecentDemandeursSection({
  demandeurs,
}: {
  demandeurs:
    | Array<{
        _id: string;
        nom: string;
        prenoms: string;
        provinceResidence: string;
        statutCompte: string;
        _creationTime: number;
      }>
    | null;
}) {
  return (
    <FlatCard className="p-5">
      <SectionHeader
        icon={<Users />}
        title="Derniers D.E inscrits"
        actions={
          <Link
            href="/conseiller/mes-demandeurs"
            className="text-xs font-medium text-primary hover:underline"
          >
            Voir tout
          </Link>
        }
      />
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        6 inscriptions les plus récentes
      </p>
      {demandeurs === null ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : demandeurs.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Aucun D.E inscrit récemment.
        </div>
      ) : (
        <ul className="space-y-2">
          {demandeurs.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between gap-4 rounded-lg bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {d.prenoms} {d.nom}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {PROVINCE_LABEL[d.provinceResidence] ?? d.provinceResidence} ·{" "}
                  {new Date(d._creationTime).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground bg-foreground/5 rounded-full px-2 py-0.5">
                {STATUT_DE_LABEL[d.statutCompte] ?? d.statutCompte}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FlatCard>
  );
}
