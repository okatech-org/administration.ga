"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/org/org-provider";

const CAPABILITIES: Array<{
  code: string;
  label: string;
  description: string;
  supportsAutoApply: boolean;
}> = [
  { code: "request_triage", label: "Triage des demandes", description: "Propose un statut et un commentaire pour les demandes en cours.", supportsAutoApply: true },
  { code: "document_analysis", label: "Analyse documentaire", description: "Détecte expiration, conformité, signatures manquantes.", supportsAutoApply: false },
  { code: "document_drafting", label: "Rédaction de documents", description: "Brouillons de documents officiels.", supportsAutoApply: false },
  { code: "auto_summary", label: "Résumés automatiques", description: "Résume les longs fils/dossiers en quelques lignes.", supportsAutoApply: true },
  { code: "next_step_suggestion", label: "Prochaine étape", description: "Propose l'action suivante sur un workflow.", supportsAutoApply: true },
  { code: "risk_detection", label: "Détection de risque", description: "Incohérences, sanctions, doublons, alertes.", supportsAutoApply: false },
  { code: "proactive_notifications", label: "Notifications proactives", description: "Push intelligent multi-canal.", supportsAutoApply: false },
  { code: "voice_assist", label: "Assistant vocal", description: "Suggestions proactives en vocal.", supportsAutoApply: false },
  { code: "bulk_actions_helper", label: "Actions groupées", description: "Assiste les sélections multiples.", supportsAutoApply: false },
  { code: "correspondance_drafting", label: "Rédaction courriers", description: "Brouillons de notes verbales, lettres.", supportsAutoApply: true },
  { code: "meeting_prep", label: "Préparation réunion", description: "Briefing, ordre du jour avant une réunion.", supportsAutoApply: false },
  { code: "compliance_check", label: "Vérification conformité", description: "Contrôle avant action sensible.", supportsAutoApply: false },
];

type CapConfig = { enabled: boolean; autoApply: boolean; sensitivity: "low" | "medium" | "high"; channels: Array<"toast" | "inline" | "activity" | "email"> };

const DEFAULT_CAP: CapConfig = {
  enabled: false,
  autoApply: false,
  sensitivity: "medium",
  channels: ["toast", "inline"],
};

export default function AIAssistantPreferencesPage() {
  const { activeOrgId } = useOrg();
  const prefs = useAuthenticatedConvexQuery(
    api.ai.preferences.getMyPreferences,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );
  const upsert = useConvexMutationQuery(api.ai.preferences.upsertMyPreferences);

  const [enabled, setEnabled] = useState(false);
  const [caps, setCaps] = useState<Record<string, CapConfig>>({});

  useEffect(() => {
    if (prefs.data) {
      setEnabled(prefs.data.enabled);
      setCaps(prefs.data.capabilities as Record<string, CapConfig>);
    }
  }, [prefs.data?._id]);

  const updateCap = (code: string, patch: Partial<CapConfig>) => {
    setCaps((prev) => ({
      ...prev,
      [code]: { ...DEFAULT_CAP, ...prev[code], ...patch },
    }));
  };

  const handleSave = async () => {
    if (!activeOrgId) return;
    // Fill defaults for missing caps so backend always has complete record.
    const full: Record<string, CapConfig> = {};
    for (const c of CAPABILITIES) {
      full[c.code] = caps[c.code] ?? DEFAULT_CAP;
    }
    try {
      await upsert.mutateAsync({
        orgId: activeOrgId,
        enabled,
        capabilities: full,
      });
      toast.success("Préférences enregistrées");
    } catch (err) {
      toast.error("Impossible d'enregistrer", {
        description: (err as Error).message,
      });
    }
  };

  if (!activeOrgId) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">Aucune organisation active.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Assistant IA proactif</h1>
      </div>

      <div className="rounded-md border bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Activer l&apos;assistant IA</div>
            <p className="text-xs text-muted-foreground">
              Maître interrupteur : si désactivé, aucune suggestion n&apos;est poussée.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Capacités</h2>
        {CAPABILITIES.map((cap) => {
          const current = caps[cap.code] ?? DEFAULT_CAP;
          return (
            <div
              key={cap.code}
              className="rounded-md border bg-background p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cap.label}</span>
                    {cap.supportsAutoApply && (
                      <Badge variant="outline" className="text-[10px]">
                        auto-apply
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cap.description}
                  </p>
                </div>
                <Switch
                  checked={current.enabled}
                  onCheckedChange={(v) => updateCap(cap.code, { enabled: v })}
                />
              </div>
              {current.enabled && cap.supportsAutoApply && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                  <Label className="text-xs">
                    Auto-apply (si autorisé par l&apos;organisation)
                  </Label>
                  <Switch
                    checked={current.autoApply}
                    onCheckedChange={(v) => updateCap(cap.code, { autoApply: v })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
