"use client";

/**
 * CategoryBreakdownCard — Phase E.5
 *
 * Affiche un breakdown des enregistrements consulaires pour une catégorie de
 * service donnée (identity, civil_status, passport, visa, certification,
 * registration, other). Présente le total + 3 sous-stats (active / requested /
 * expired) sous forme de mini-barres proportionnelles.
 *
 * Utilisé dans l'onglet « Registre » du backoffice, section breakdown.
 */

import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";

export interface CategoryBreakdownStats {
  category: string;
  total: number;
  active: number;
  expired: number;
  requested: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  identity: "#6366f1", // indigo
  certification: "#8b5cf6", // violet
  civil_status: "#06b6d4", // cyan
  transcript: "#0ea5e9", // sky
  notification: "#f59e0b", // amber
  assistance: "#ec4899", // pink
  travel_document: "#10b981", // emerald
  declaration: "#f97316", // orange
  passport: "#10b981", // emerald
  visa: "#3b82f6", // blue
  registration: "#a855f7", // purple
  other: "#6b7280", // gray
};

export function CategoryBreakdownCard({
  stats,
}: {
  stats: CategoryBreakdownStats;
}) {
  const { t } = useTranslation();
  const accent = CATEGORY_COLORS[stats.category] ?? CATEGORY_COLORS.other;

  const label = t(
    `superadmin.services.categories.${stats.category}`,
    stats.category,
  );

  const total = stats.total || 1; // éviter division par zéro
  const activePct = (stats.active / total) * 100;
  const requestedPct = (stats.requested / total) * 100;
  const expiredPct = (stats.expired / total) * 100;

  return (
    <FlatCard className="relative overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="p-3 pl-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-foreground truncate">
            {label}
          </p>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: accent }}
          >
            {stats.total}
          </span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full transition-all"
            style={{ width: `${activePct}%`, background: "#10b981" }}
            title={`${t("registry.breakdown.active", "Actifs")}: ${stats.active}`}
          />
          <div
            className="h-full transition-all"
            style={{ width: `${requestedPct}%`, background: "#f59e0b" }}
            title={`${t("registry.breakdown.requested", "Demandés")}: ${stats.requested}`}
          />
          <div
            className="h-full transition-all"
            style={{ width: `${expiredPct}%`, background: "#ef4444" }}
            title={`${t("registry.breakdown.expired", "Expirés")}: ${stats.expired}`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#10b981" }}
            />
            {stats.active}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#f59e0b" }}
            />
            {stats.requested}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#ef4444" }}
            />
            {stats.expired}
          </span>
        </div>
      </div>
    </FlatCard>
  );
}
