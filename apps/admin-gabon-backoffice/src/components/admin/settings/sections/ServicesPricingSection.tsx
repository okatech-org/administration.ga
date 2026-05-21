"use client";

/**
 * ServicesPricingSection — Aperçu de la tarification des services (Phase 3)
 *
 * Vue synthétique des services actifs de la représentation avec leur pricing.
 * L'édition fine reste dans l'onglet Services (OrgServicesTable) dédié.
 *
 * Couverture :
 *   - Liste services actifs avec pricing (EUR / USD)
 *   - Indicateur SLA (délai standard)
 *   - CTA vers la page d'édition détaillée des services
 */

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { CreditCard, Euro, ExternalLink, FileText, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

export function ServicesPricingSection({ orgId }: SettingsSectionProps) {
  const { t } = useTranslation();

  const { data: services, isPending } = useAuthenticatedConvexQuery(
    api.functions.services.listByOrg,
    { orgId },
  );

  if (isPending) return <ServicesPricingSkeleton />;
  if (!services) return null;

  const activeServices = services.filter((s: any) => s.isActive);
  const totalServices = services.length;

  return (
    <div className="space-y-4">
      {/* ─── Résumé ───────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <SectionHeader
                  icon={<CreditCard className="h-4 w-4 text-blue-600" />}
                  title="Tarification des services"
                />
                <HelpTooltip content={HELP.services.pricing} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Aperçu des services actifs et leur tarification.
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  {activeServices.length} actif{activeServices.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="secondary">
                  {totalServices} au total
                </Badge>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/reps/${orgId}?tab=services`}>
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Éditer les services
              </Link>
            </Button>
          </div>
        </div>
      </FlatCard>

      {/* ─── Liste services ────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<FileText className="h-4 w-4 text-indigo-600" />}
            title="Services configurés"
          />

          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucun service configuré. Utilisez l'onglet Services pour démarrer.
            </p>
          ) : (
            <ul className="space-y-2">
              {services.map((s: any) => (
                <li
                  key={s._id}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-md border border-border/50 hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {s.service?.name?.fr ?? s.service?.name?.en ?? "Sans nom"}
                      </span>
                      {!s.isActive && (
                        <Badge variant="outline" className="text-[9px]">
                          Inactif
                        </Badge>
                      )}
                    </div>
                    {s.service?.category && (
                      <span className="text-xs text-muted-foreground">
                        {String(
                          t(
                            `serviceCategories.${s.service.category}`,
                            s.service.category,
                          ),
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Pricing */}
                    {s.pricing ? (
                      <div className="flex items-center gap-1 font-mono text-sm">
                        <Euro className="h-3 w-3 text-emerald-600" />
                        <span className="font-medium">
                          {(s.pricing.amount / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {s.pricing.currency ?? "eur"}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        Gratuit
                      </Badge>
                    )}

                    {/* SLA */}
                    {s.service?.estimatedDays && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {s.service.estimatedDays}j
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FlatCard>

    </div>
  );
}

function ServicesPricingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-12 w-full" />
            ))}
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
