"use client";

/**
 * CommunicationsTab — Onglet « Communications » unifié (Phase B2)
 *
 * Regroupe les vues opérationnelles des canaux internes :
 *   - Téléphonie (CallLinesTab existant)
 *   - Stats iBoîte (volume, threads actifs)
 *   - Stats iAsted (conversations, escalation rate)
 *
 * Les paramètres détaillés restent dans /reps/{orgId}/edit (zone Configuration).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Bot, Mail, MessageSquare, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CallLinesTab } from "@/components/admin/call-lines-tab";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export interface CommunicationsTabProps {
  orgId: Id<"orgs">;
}

export function CommunicationsTab({ orgId }: CommunicationsTabProps) {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="phone">
      <TabsList className="grid grid-cols-3 sm:inline-flex h-auto p-1 bg-[#F4F3ED] dark:bg-[#171616]">
        <TabsTrigger value="phone" className="gap-1.5 text-xs sm:text-sm">
          <Phone className="h-4 w-4" />
          {t("superadmin.communications.phone", "Téléphonie")}
        </TabsTrigger>
        <TabsTrigger value="iboite" className="gap-1.5 text-xs sm:text-sm">
          <Mail className="h-4 w-4" />
          {t("superadmin.communications.iboite", "iBoîte")}
        </TabsTrigger>
        <TabsTrigger value="iasted" className="gap-1.5 text-xs sm:text-sm">
          <Bot className="h-4 w-4" />
          {t("superadmin.communications.iasted", "iAsted")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="phone" className="mt-4">
        <CallLinesTab orgId={orgId} />
      </TabsContent>

      <TabsContent value="iboite" className="mt-4">
        <IboiteStats orgId={orgId} />
      </TabsContent>

      <TabsContent value="iasted" className="mt-4">
        <IAstedStats orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Stats iBoîte ──────────────────────────────────────────────
function IboiteStats({ orgId }: { orgId: Id<"orgs"> }) {
  const { data: org } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const internalMail = (org?.settings as { internalMail?: { defaultSignature?: unknown; replyTemplates?: unknown[]; autoResponder?: { enabled?: boolean }; stamps?: unknown[] } } | undefined)?.internalMail;
  const templatesCount = Array.isArray(internalMail?.replyTemplates)
    ? internalMail.replyTemplates.length
    : 0;
  const stampsCount = Array.isArray(internalMail?.stamps)
    ? internalMail.stamps.length
    : 0;
  const hasSignature = Boolean(internalMail?.defaultSignature);
  const autoResponderActive = internalMail?.autoResponder?.enabled === true;

  return (
    <div className="space-y-3">
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Mail className="h-4 w-4 text-purple-600" />}
            title="Configuration iBoîte"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatCard
              label="Templates de réponse"
              value={templatesCount}
              hint={templatesCount === 0 ? "Aucun configuré" : undefined}
            />
            <StatCard
              label="Tampons digitaux"
              value={stampsCount}
              hint={stampsCount === 0 ? "Aucun configuré" : undefined}
            />
            <StatCard
              label="Signature par défaut"
              value={hasSignature ? "✓ OK" : "—"}
              valueColor={hasSignature ? "text-emerald-600" : "text-muted-foreground"}
              hint={!hasSignature ? "Non définie" : undefined}
            />
            <StatCard
              label="Auto-répondeur"
              value={autoResponderActive ? "✓ Actif" : "—"}
              valueColor={autoResponderActive ? "text-emerald-600" : "text-muted-foreground"}
            />
          </div>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="p-4 text-center text-muted-foreground text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Métriques détaillées (volume messages, threads actifs)</p>
          <p className="text-xs mt-1">Disponible en Phase C avec analytics par canal</p>
        </div>
      </FlatCard>
    </div>
  );
}

// ─── Stats iAsted ──────────────────────────────────────────────
function IAstedStats({ orgId }: { orgId: Id<"orgs"> }) {
  const { data: config, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgIAstedConfig.getByOrgId,
    { orgId },
  );

  if (isPending) {
    return (
      <FlatCard>
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      </FlatCard>
    );
  }

  if (!config) {
    return (
      <FlatCard>
        <div className="p-6 text-center text-muted-foreground">
          <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">iAsted non initialisé</p>
          <p className="text-xs mt-1">
            Configure le chatbot dans la section iAsted des paramètres avancés.
          </p>
        </div>
      </FlatCard>
    );
  }

  const toolsCount = config.toolsPolicy.enabledTools.length;
  const langsCount = config.languages.supported.length;
  const escalationKeywords = config.escalation.triggerKeywords.length;

  return (
    <div className="space-y-3">
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader
              icon={<Bot className="h-4 w-4 text-indigo-600" />}
              title={config.persona.name}
            />
            <Badge
              variant={config.isActive ? "default" : "secondary"}
              className={
                config.isActive
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                  : ""
              }
            >
              {config.isActive ? "Actif" : "Désactivé"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Mode disponibilité"
              value={config.availability.mode === "always" ? "24/7" : config.availability.mode}
            />
            <StatCard label="Langues" value={langsCount} />
            <StatCard label="Tools activés" value={toolsCount} />
            <StatCard
              label="Mots-clés escalation"
              value={escalationKeywords}
              hint={escalationKeywords === 0 ? "Aucun défini" : undefined}
            />
          </div>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="p-4 text-center text-muted-foreground text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Métriques de conversations & taux d'escalation</p>
          <p className="text-xs mt-1">
            Disponible en Phase C avec analytics PostHog par org
          </p>
        </div>
      </FlatCard>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  valueColor,
  hint,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border/50 p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-lg font-bold mt-0.5 ${valueColor ?? "text-foreground"}`}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-muted-foreground italic mt-0.5">{hint}</p>
      )}
    </div>
  );
}
