/**
 * Page Statistiques — vue détaillée des KPIs PNPE.
 *
 * Réutilise les queries de `convex/functions/pnpe/stats.ts` :
 *   - nationalKpis : 6 compteurs nationaux
 *   - demandeursByProvince : répartition territoriale
 *   - offresBySector : top secteurs d'offres publiées
 *
 * Accessible aux Chef d'antenne, Direction PNPE et Admin Min Travail
 * (limite imposée dans le layout via roles[]).
 */
"use client";

import { useQuery } from "convex/react";
import {
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  Layers,
  LineChart,
  MapPin,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import {
  FlatCard,
  PageHeader,
  SectionHeader,
} from "@workspace/agent-features/components/my-space";

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

export default function StatistiquesPage() {
  const kpis = useQuery(api.functions.pnpe.stats.nationalKpis, {});
  const byProvince = useQuery(api.functions.pnpe.stats.demandeursByProvince, {});
  const bySector = useQuery(api.functions.pnpe.stats.offresBySector, {});

  const tauxPlacement =
    kpis && kpis.demandeursInscrits > 0
      ? Math.round((kpis.demandeursPlaces / kpis.demandeursInscrits) * 100)
      : 0;

  const tauxActivation =
    kpis && kpis.demandeursInscrits > 0
      ? Math.round((kpis.demandeursActifs / kpis.demandeursInscrits) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistiques"
        subtitle="Indicateurs nationaux PNPE — Gabon"
        icon={<BarChart3 className="size-4" />}
      />

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiBlock
          label="Demandeurs inscrits"
          value={kpis?.demandeursInscrits ?? "…"}
          hint="Total cumulé"
          icon={Users}
          tone="blue"
        />
        <KpiBlock
          label="D.E actifs"
          value={kpis?.demandeursActifs ?? "…"}
          hint={`${tauxActivation}% du total`}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiBlock
          label="Placements"
          value={kpis?.demandeursPlaces ?? "…"}
          hint={`${tauxPlacement}% du total`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiBlock
          label="Offres publiées"
          value={kpis?.offresPubliees ?? "…"}
          hint="Catalogue actif"
          icon={Briefcase}
        />
        <KpiBlock
          label="Employeurs vérifiés"
          value={kpis?.employeursVerifies ?? "…"}
          hint="Statut DGI / CNSS"
          icon={Building2}
        />
        <KpiBlock
          label="Antennes opérationnelles"
          value={`${kpis?.antennesOperationnelles ?? "…"} / 9`}
          hint="Provinces couvertes"
          icon={MapPin}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FlatCard className="p-5">
          <SectionHeader
            icon={<Layers />}
            title="Répartition territoriale"
          />
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            D.E inscrits par province de résidence
          </p>
          {byProvince === undefined ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : byProvince.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune donnée disponible.
            </div>
          ) : (
            <ul className="space-y-3">
              {byProvince
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((p) => (
                  <Bar
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
          <SectionHeader icon={<TrendingUp />} title="Top secteurs d'offres" />
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Distribution des offres publiées par secteur d'activité
          </p>
          {bySector === undefined ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : bySector.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune offre publiée pour le moment.
            </div>
          ) : (
            <ul className="space-y-3">
              {bySector.slice(0, 8).map((s) => (
                <Bar
                  key={s.secteur}
                  label={s.secteur}
                  count={s.count}
                  max={Math.max(...bySector.map((x) => x.count))}
                />
              ))}
            </ul>
          )}
        </FlatCard>
      </div>

      <FlatCard className="p-5">
        <SectionHeader icon={<LineChart />} title="Indicateurs synthétiques" />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SyntheticIndicator
            label="Taux d'activation"
            value={`${tauxActivation}%`}
            description="Part des D.E inscrits qui sont passés en statut ACTIF"
          />
          <SyntheticIndicator
            label="Taux de placement"
            value={`${tauxPlacement}%`}
            description="Part des D.E inscrits qui ont décroché un emploi"
          />
          <SyntheticIndicator
            label="Couverture territoriale"
            value={`${kpis?.antennesOperationnelles ?? 0} / 9`}
            description="Antennes provinciales opérationnelles"
          />
        </div>
      </FlatCard>
    </div>
  );
}

function KpiBlock({
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
  tone?: "default" | "emerald" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "blue"
        ? "bg-blue-500/10 text-blue-600"
        : "bg-foreground/8 dark:bg-foreground/5 text-foreground/70";

  return (
    <FlatCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`size-9 rounded-md flex items-center justify-center ${toneClass}`}>
          <Icon className="size-4.5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-3xl font-display font-bold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="text-sm text-foreground/80 mt-0.5">{label}</div>
        {hint && (
          <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
        )}
      </div>
    </FlatCard>
  );
}

function Bar({
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
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-foreground/90 truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums text-xs">
          {count}
        </span>
      </div>
      <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

function SyntheticIndicator({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-display font-bold tabular-nums">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">{description}</div>
    </div>
  );
}
