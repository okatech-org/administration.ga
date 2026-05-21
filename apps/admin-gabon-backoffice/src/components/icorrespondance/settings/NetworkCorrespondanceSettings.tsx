"use client";

/**
 * NetworkCorrespondanceSettings — Réglages globaux du réseau iCorrespondance.
 *
 * Édite le singleton `correspondanceNetworkConfig` (référence par défaut,
 * auto-routage, approbation chef requise, signatures, filigrane). Les types
 * standards du catalogue sont édités par un sous-composant interne.
 *
 * Accès réservé à super_admin / admin_system (vérifié côté Convex).
 */

import { api } from "@convex/_generated/api";
import {
  AlertCircle,
  Fingerprint,
  Hash,
  Loader2,
  Power,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FlatCard } from "@/components/design-system/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export function NetworkCorrespondanceSettings() {
  const { data: config, isPending } = useAuthenticatedConvexQuery(
    api.functions.correspondanceNetworkConfig.getNetworkConfig,
    {},
  );

  const { mutateAsync: updateNetworkConfig, isPending: isSaving } =
    useConvexMutationQuery(
      api.functions.correspondanceNetworkConfig.updateNetworkConfig,
    );

  // State local pour les champs édités
  const [referencePattern, setReferencePattern] = useState("");
  const [autoRouteByHierarchy, setAutoRouteByHierarchy] = useState(false);
  const [chiefApprovalRequired, setChiefApprovalRequired] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [signatureLevel, setSignatureLevel] = useState(1);

  // Hydrate le state depuis la query au premier load
  useEffect(() => {
    if (!config) return;
    setReferencePattern(config.referencePattern ?? "DIPL/{YYYY}/{TYPE}/{NNNNN}");
    setAutoRouteByHierarchy(config.autoRouteByHierarchy ?? true);
    setChiefApprovalRequired(config.chiefApprovalRequired ?? false);
    setWatermarkEnabled(config.watermarkDefaults?.enabled ?? false);
    setWatermarkText(config.watermarkDefaults?.text ?? "");
    setSignatureLevel(config.signatureDefaults?.defaultLevel ?? 1);
  }, [config]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <FlatCard className="border-amber-500/30">
        <div className="flex items-start gap-3 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold">
              Configuration réseau non initialisée
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Exécutez la migration{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                migrations.initCorrespondanceNetworkConfig
              </code>{" "}
              depuis le dashboard Convex pour créer le document singleton.
            </p>
          </div>
        </div>
      </FlatCard>
    );
  }

  const handleSave = async () => {
    try {
      await updateNetworkConfig({
        referencePattern: referencePattern.trim() || undefined,
        autoRouteByHierarchy,
        chiefApprovalRequired,
        signatureDefaults: { defaultLevel: signatureLevel },
        watermarkDefaults: {
          enabled: watermarkEnabled,
          text: watermarkText.trim() || undefined,
        },
      });
      toast.success("Réglages réseau enregistrés");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement",
      );
    }
  };

  return (
    <div className="space-y-4">
      <FlatCard>
        <div className="border-b border-[color:var(--border-soft)] p-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Référence et registre par défaut
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Format automatique appliqué aux nouvelles correspondances quand
            la représentation n'a pas surchargé son propre pattern.
          </p>
        </div>
        <div className="p-4">
          <label className="text-xs font-medium text-muted-foreground">
            Pattern de référence
          </label>
          <Input
            value={referencePattern}
            onChange={(e) => setReferencePattern(e.target.value)}
            placeholder="DIPL/{YYYY}/{TYPE}/{NNNNN}"
            className="mt-1.5 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Tokens disponibles :{" "}
            <code className="rounded bg-muted px-1 text-[11px]">
              {"{YYYY}"}
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 text-[11px]">
              {"{TYPE}"}
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 text-[11px]">
              {"{ORG}"}
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 text-[11px]">
              {"{NNNNN}"}
            </code>
            .
          </p>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="border-b border-[color:var(--border-soft)] p-4">
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Workflow d'approbation par défaut
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Comportement appliqué aux nouvelles représentations.
          </p>
        </div>
        <div className="space-y-4 p-4">
          <label className="flex items-start gap-3">
            <Switch
              checked={autoRouteByHierarchy}
              onCheckedChange={setAutoRouteByHierarchy}
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Auto-routage hiérarchique
              </p>
              <p className="text-xs text-muted-foreground">
                Les correspondances suivent automatiquement la chaîne
                d'approbation selon le grade.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={chiefApprovalRequired}
              onCheckedChange={(v) => setChiefApprovalRequired(v === true)}
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Validation chef de poste obligatoire
              </p>
              <p className="text-xs text-muted-foreground">
                Force la signature du chef de mission pour toute
                correspondance sortante.
              </p>
            </div>
          </label>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="border-b border-[color:var(--border-soft)] p-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Signature et filigrane par défaut
            </h3>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Niveau eIDAS par défaut
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[
                { value: 1, label: "Simple (sceau serveur)" },
                { value: 2, label: "Avancée (certificat utilisateur)" },
                { value: 3, label: "Qualifiée (PSCO)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSignatureLevel(opt.value)}
                  className="rounded-md border border-[color:var(--border-soft)] px-3 py-1.5 text-xs transition-colors data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  data-active={signatureLevel === opt.value}
                >
                  Niveau {opt.value} — {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3">
            <Switch
              checked={watermarkEnabled}
              onCheckedChange={setWatermarkEnabled}
            />
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">Filigrane activé</p>
              <Input
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                disabled={!watermarkEnabled}
                placeholder="CONFIDENTIEL"
                className="mt-1 max-w-xs"
              />
            </div>
          </label>
        </div>
      </FlatCard>

      <FlatCard>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="text-xs text-muted-foreground">
            Dernière mise à jour :{" "}
            {config.updatedAt
              ? new Date(config.updatedAt).toLocaleString("fr-FR")
              : "—"}
            <Badge variant="outline" className="ml-2">
              {config.standardTypes.length} types standards
            </Badge>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </FlatCard>
    </div>
  );
}
