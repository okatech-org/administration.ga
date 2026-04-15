"use client";

/**
 * RepDashboard — Tableau de bord d'une représentation (Phase B4)
 *
 * Premier onglet de la zone OPÉRATIONNELLE — affiche en un coup d'œil :
 *   - Carte santé : score complétion + breakdown par section (heatmap)
 *   - Carte alertes : modules désactivés avec orphelins, postes critiques vacants
 *   - KPI temps réel : appels actifs, RDV du jour, demandes 24h
 *   - Activité récente (placeholder Phase C5)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Crown,
  Info,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CompletionBadge,
} from "@/components/admin/settings/CompletionBadge";
import {
  useCompletionScore,
  type SectionKey,
} from "@/components/admin/settings/use-completion-score";
import { Skeleton } from "@/components/ui/skeleton";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export interface RepDashboardProps {
  orgId: Id<"orgs">;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  identity: "Identité",
  protocol: "Protocole",
  addresses: "Adresses",
  jurisdiction: "Juridiction",
  calendar: "Calendrier",
  calls: "Téléphonie",
  iboite: "iBoîte",
  correspondance: "iCorrespondance",
  notifications: "Notifications",
  chats: "Chats P2P",
  contacts: "Contacts",
  iasted: "iAsted",
  services: "Services",
  branding: "Branding",
};

export function RepDashboard({ orgId }: RepDashboardProps) {
  const completion = useCompletionScore(orgId);

  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    { orgId },
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const vacantCount = orgChart?.vacantPositions ?? 0;
  const requiredVacant = (orgChart?.positions ?? [])
    .filter((p: { isRequired?: boolean; occupants?: unknown[] }) =>
      p.isRequired && (!p.occupants || p.occupants.length === 0),
    ).length;

  const memberCount = members?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* ─── Alertes critiques ───────────────────────── */}
      {(completion.global.criticalMissing.length > 0 || requiredVacant > 0) && (
        <FlatCard className="border-amber-500/30 bg-amber-500/5">
          <div className="p-4">
            <SectionHeader
              icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
              title="Actions recommandées"
            />
            <ul className="space-y-2 mt-2">
              {completion.global.criticalMissing.map((sectionKey) => (
                <li
                  key={sectionKey}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    Section{" "}
                    <strong>
                      {SECTION_LABELS[sectionKey as SectionKey] ?? sectionKey}
                    </strong>{" "}
                    non configurée — à compléter dans les paramètres
                  </span>
                </li>
              ))}
              {requiredVacant > 0 && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    <strong>{requiredVacant}</strong> poste
                    {requiredVacant > 1 ? "s" : ""} requis vacant
                    {requiredVacant > 1 ? "s" : ""} — voir l'onglet Équipe
                  </span>
                </li>
              )}
            </ul>
          </div>
        </FlatCard>
      )}

      {/* ─── Vue santé : score complétion + heatmap ──────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              icon={<Activity className="h-4 w-4 text-emerald-600" />}
              title="Santé de la configuration"
            />
            <div className="flex items-center gap-2">
              {completion.isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums">
                    {completion.global.score}%
                  </span>
                  <CompletionBadge
                    status={completion.global.status}
                    score={completion.global.score}
                    variant="full"
                  />
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Configuration des 14 sections de paramétrage. Cliquer sur une
            section dans l'éditeur pour la compléter.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {(Object.keys(completion.sections) as SectionKey[]).map((key) => {
              const section = completion.sections[key];
              const bgClass =
                section.status === "complete"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : section.status === "partial"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-rose-500/10 border-rose-500/30";
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-md border p-2 text-center transition-colors",
                    bgClass,
                  )}
                  title={`${SECTION_LABELS[key]} : ${section.score}%`}
                >
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                    {SECTION_LABELS[key]}
                  </p>
                  <p className="text-sm font-bold mt-0.5 tabular-nums">
                    {section.score}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </FlatCard>

      {/* ─── KPI temps réel ───────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <DashboardKpi
          icon={Users}
          label="Membres actifs"
          value={memberCount}
          accent="#6366f1"
        />
        <DashboardKpi
          icon={Crown}
          label="Postes occupés"
          value={`${orgChart?.filledPositions ?? 0}/${orgChart?.totalPositions ?? 0}`}
          accent="#f59e0b"
          subtitle={
            vacantCount > 0
              ? `${vacantCount} vacant${vacantCount > 1 ? "s" : ""}`
              : "Tous occupés"
          }
        />
        <DashboardKpi
          icon={ClipboardList}
          label="Demandes en cours"
          value="—"
          accent="#3b82f6"
          subtitle="Vue temps réel — Phase C5"
        />
        <DashboardKpi
          icon={TrendingUp}
          label="SLA respecté"
          value="—"
          accent="#10b981"
          subtitle="Métriques — Phase C5"
        />
      </div>

      {/* ─── Activité récente (placeholder) ────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Activity className="h-4 w-4 text-slate-600" />}
            title="Activité récente"
          />
          <div className="text-center py-6 text-muted-foreground text-xs">
            <Info className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p>Flux d'activité audit en lecture seule</p>
            <p className="mt-1">
              Disponible en Phase C avec audit log enrichi
            </p>
          </div>
        </div>
      </FlatCard>

      {/* ─── État global ──────────────────────────────── */}
      {completion.global.score >= 100 &&
        requiredVacant === 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">
              Configuration complète et opérationnelle
            </span>
          </div>
        )}
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────
function DashboardKpi({
  icon: Icon,
  label,
  value,
  accent,
  subtitle,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  accent: string;
  subtitle?: string;
}) {
  return (
    <FlatCard className="relative overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="p-3 pl-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${accent}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
      </div>
    </FlatCard>
  );
}

