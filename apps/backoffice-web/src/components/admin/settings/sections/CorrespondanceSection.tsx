"use client";

/**
 * CorrespondanceSection — Configuration iCorrespondance par représentation
 *
 * Remplace l'affichage JSON brut dans l'onglet Paramètres par une UI dédiée.
 *
 * Couverture :
 *   - Activation/désactivation du module
 *   - Pattern de référence avec tokens {YYYY}, {TYPE}, {NN}
 *   - Registre courrier (préfixes arrivée/départ, numérotation annuelle)
 *   - Approbation globale (auto-routage hiérarchique, chef de poste requis)
 *   - Types de correspondance actifs (note verbale, lettre officielle, etc.)
 *   - Signature électronique + cachet de l'organisme
 *   - Filigrane PHASE 2
 */

import { api } from "@convex/_generated/api";
import {
  AtSign,
  FileSignature,
  FileText,
  Fingerprint,
  Hash,
  ListChecks,
  Power,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import type { SettingsSectionProps } from "../SettingsTabsLayout";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";

const AVAILABLE_TYPES = [
  { code: "note_verbale", label: "Note verbale" },
  { code: "lettre_officielle", label: "Lettre officielle" },
  { code: "circulaire", label: "Circulaire" },
  { code: "proces_verbal", label: "Procès-verbal" },
  { code: "demande_information", label: "Demande d'information" },
  { code: "rapport", label: "Rapport" },
  { code: "memorandum", label: "Mémorandum" },
  { code: "communique", label: "Communiqué" },
];

export function CorrespondanceSection({
  orgId,
  onStatusChange,
}: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateOrg } = useConvexMutationQuery(
    api.functions.orgs.update,
  );

  const [isEnabled, setIsEnabled] = useState(false);
  const [referencePattern, setReferencePattern] = useState(
    "DIPL/{YYYY}/{TYPE}/{NN}",
  );
  const [prefixArrivee, setPrefixArrivee] = useState("ARR");
  const [prefixDepart, setPrefixDepart] = useState("DEP");
  const [numerotationAnnuelle, setNumerotationAnnuelle] = useState(true);
  const [autoRoute, setAutoRoute] = useState(true);
  const [chefDePosteRequired, setChefDePosteRequired] = useState(true);
  const [typesActifs, setTypesActifs] = useState<string[]>([]);
  const [signatureElectronique, setSignatureElectronique] = useState(false);
  const [cachetOrganisme, setCachetOrganisme] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("COPIE");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [inboundEmailAddress, setInboundEmailAddress] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      const currentSettings = org?.settings ?? {
        appointmentBuffer: 24,
        maxActiveRequests: 10,
        workingHours: {},
      };
      await updateOrg({
        orgId,
        settings: {
          ...currentSettings,
          correspondanceConfig: {
            isEnabled,
            defaultReferencePattern: referencePattern,
            registreCourrier: {
              prefixArrivee,
              prefixDepart,
              numerotationAnnuelle,
            },
            approbationGlobale: {
              autoRouteByHierarchy: autoRoute,
              chefDePosteRequired,
            },
            typesActifs,
            signatureConfig: {
              signatureElectronique,
              cachetOrganisme,
            },
            watermarkConfig: {
              enabled: watermarkEnabled,
              text: watermarkText,
              opacity: watermarkOpacity,
            },
            inboundEmailAddress: inboundEmailAddress.trim() || undefined,
          },
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("correspondance", dirty),
  });

  useRegisterSection("correspondance", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const cc = org.settings?.correspondanceConfig;
    setIsEnabled(cc?.isEnabled ?? false);
    setReferencePattern(
      cc?.defaultReferencePattern ?? "DIPL/{YYYY}/{TYPE}/{NN}",
    );
    setPrefixArrivee(cc?.registreCourrier?.prefixArrivee ?? "ARR");
    setPrefixDepart(cc?.registreCourrier?.prefixDepart ?? "DEP");
    setNumerotationAnnuelle(cc?.registreCourrier?.numerotationAnnuelle ?? true);
    setAutoRoute(cc?.approbationGlobale?.autoRouteByHierarchy ?? true);
    setChefDePosteRequired(cc?.approbationGlobale?.chefDePosteRequired ?? true);
    setTypesActifs(cc?.typesActifs ?? []);
    setSignatureElectronique(
      cc?.signatureConfig?.signatureElectronique ?? false,
    );
    setCachetOrganisme(cc?.signatureConfig?.cachetOrganisme ?? false);
    setWatermarkEnabled(cc?.watermarkConfig?.enabled ?? false);
    setWatermarkText(cc?.watermarkConfig?.text ?? "COPIE");
    setWatermarkOpacity(cc?.watermarkConfig?.opacity ?? 0.3);
    setInboundEmailAddress((cc as any)?.inboundEmailAddress ?? "");
  }, [org, hasPending]);

  const push = () => trigger();

  const toggleType = (code: string) => {
    const next = typesActifs.includes(code)
      ? typesActifs.filter((c) => c !== code)
      : [...typesActifs, code];
    setTypesActifs(next);
    push();
  };

  // Aperçu live de la référence avec remplacements
  const referencePreview = useMemo(() => {
    const year = new Date().getFullYear();
    return referencePattern
      .replace("{YYYY}", String(year))
      .replace("{YY}", String(year).slice(-2))
      .replace("{TYPE}", "NV")
      .replace("{NN}", "00042")
      .replace("{N}", "42");
  }, [referencePattern]);

  if (isPending) return <CorrespondanceSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Activation ───────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${
                  isEnabled ? "bg-emerald-500/10" : "bg-muted"
                }`}
              >
                <Power
                  className={`h-4 w-4 ${
                    isEnabled ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <h3 className="font-medium text-sm">Module iCorrespondance</h3>
                <p className="text-xs text-muted-foreground">
                  Gestion du courrier officiel (notes verbales, lettres…)
                </p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(v) => {
                setIsEnabled(v);
                push();
              }}
            />
          </div>
        </div>
      </FlatCard>

      {isEnabled && (
        <>
          {/* ─── Pattern référence ───────────────────── */}
          <FlatCard>
            <div className="p-4">
              <div className="flex items-center gap-1.5">
                <SectionHeader
                  icon={<Hash className="h-4 w-4 text-blue-600" />}
                  title="Pattern de référence"
                />
                <HelpTooltip content={HELP.correspondance.referencePattern} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Format automatique pour numéroter les correspondances. Tokens
                disponibles :
                <code className="mx-1 text-[10px] bg-muted px-1 rounded">
                  {"{YYYY}"}
                </code>
                <code className="mx-1 text-[10px] bg-muted px-1 rounded">
                  {"{YY}"}
                </code>
                <code className="mx-1 text-[10px] bg-muted px-1 rounded">
                  {"{TYPE}"}
                </code>
                <code className="mx-1 text-[10px] bg-muted px-1 rounded">
                  {"{NN}"}
                </code>
              </p>
              <Field>
                <FieldLabel>Format</FieldLabel>
                <Input
                  value={referencePattern}
                  onChange={(e) => {
                    setReferencePattern(e.target.value);
                    push();
                  }}
                  className="font-mono"
                />
              </Field>
              <div className="mt-3 rounded-lg border border-border/50 p-3 bg-muted/20">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                  Aperçu
                </div>
                <code className="font-mono text-sm">{referencePreview}</code>
              </div>
            </div>
          </FlatCard>

          {/* ─── Registre courrier ────────────────────── */}
          <FlatCard>
            <div className="p-4">
              <SectionHeader
                icon={<FileText className="h-4 w-4 text-emerald-600" />}
                title="Registre du courrier"
              />
              <p className="text-xs text-muted-foreground mb-3">
                Préfixes pour distinguer les courriers entrants/sortants dans le
                registre officiel.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Préfixe arrivée</FieldLabel>
                  <Input
                    value={prefixArrivee}
                    onChange={(e) => {
                      setPrefixArrivee(e.target.value);
                      push();
                    }}
                    placeholder="ARR"
                  />
                </Field>
                <Field>
                  <FieldLabel>Préfixe départ</FieldLabel>
                  <Input
                    value={prefixDepart}
                    onChange={(e) => {
                      setPrefixDepart(e.target.value);
                      push();
                    }}
                    placeholder="DEP"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm mt-3">
                <Switch
                  checked={numerotationAnnuelle}
                  onCheckedChange={(v) => {
                    setNumerotationAnnuelle(v);
                    push();
                  }}
                />
                Numérotation remise à zéro chaque année
              </label>
            </div>
          </FlatCard>

          {/* ─── Approbation ─────────────────────────── */}
          <FlatCard>
            <div className="p-4">
              <div className="flex items-center gap-1.5">
                <SectionHeader
                  icon={<ListChecks className="h-4 w-4 text-indigo-600" />}
                  title="Circuit d'approbation"
                />
                <HelpTooltip content={HELP.correspondance.autoRouting} />
              </div>
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 text-sm">
                  <Switch
                    checked={autoRoute}
                    onCheckedChange={(v) => {
                      setAutoRoute(v);
                      push();
                    }}
                  />
                  <div>
                    <div className="font-medium">
                      Routage automatique par hiérarchie
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Les correspondances suivent la chaîne hiérarchique des
                      postes assignés.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 text-sm">
                  <Switch
                    checked={chefDePosteRequired}
                    onCheckedChange={(v) => {
                      setChefDePosteRequired(v);
                      push();
                    }}
                  />
                  <div>
                    <div className="font-medium">
                      Validation du chef de poste obligatoire
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Toute correspondance sortante doit être approuvée par le
                      chef de poste avant envoi.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </FlatCard>

          {/* ─── Types actifs ────────────────────────── */}
          <FlatCard>
            <div className="p-4">
              <SectionHeader
                icon={<FileText className="h-4 w-4 text-purple-600" />}
                title="Types de correspondance actifs"
              />
              <p className="text-xs text-muted-foreground mb-3">
                Sélectionnez les types disponibles pour les agents de cette
                représentation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_TYPES.map((t) => {
                  const active = typesActifs.includes(t.code);
                  return (
                    <label
                      key={t.code}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleType(t.code)}
                      />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  {typesActifs.length} type{typesActifs.length !== 1 ? "s" : ""}{" "}
                  actif{typesActifs.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </FlatCard>

          {/* ─── Signature & Cachet ──────────────────── */}
          <FlatCard>
            <div className="p-4">
              <SectionHeader
                icon={<FileSignature className="h-4 w-4 text-rose-600" />}
                title="Signature & Cachet"
              />
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 text-sm">
                  <Switch
                    checked={signatureElectronique}
                    onCheckedChange={(v) => {
                      setSignatureElectronique(v);
                      push();
                    }}
                  />
                  <div>
                    <div className="font-medium">Signature électronique</div>
                    <div className="text-[10px] text-muted-foreground">
                      Appose la signature numérique du signataire sur les
                      documents.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 text-sm">
                  <Switch
                    checked={cachetOrganisme}
                    onCheckedChange={(v) => {
                      setCachetOrganisme(v);
                      push();
                    }}
                  />
                  <div>
                    <div className="font-medium">Cachet de l'organisme</div>
                    <div className="text-[10px] text-muted-foreground">
                      Appose le cachet officiel de la représentation.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </FlatCard>

          {/* ─── Email entrant ───────────────────────── */}
          <FlatCard>
            <div className="p-4">
              <SectionHeader
                icon={<AtSign className="h-4 w-4 text-cyan-600" />}
                title="Email entrant"
              />
              <p className="text-xs text-muted-foreground mb-3">
                Adresse email qui reçoit les courriers externes pour cette
                représentation. Les emails reçus seront automatiquement convertis
                en correspondances reçues. Configurez votre service de parsing
                inbound (Postmark, Resend, SendGrid…) pour POST sur le webhook
                Convex avec le header <code className="text-[10px] bg-muted px-1 rounded">X-Inbound-Secret</code>.
              </p>
              <Field>
                <FieldLabel>Adresse de réception</FieldLabel>
                <Input
                  type="email"
                  value={inboundEmailAddress}
                  onChange={(e) => {
                    setInboundEmailAddress(e.target.value);
                    push();
                  }}
                  placeholder="consulat-paris@inbound.consulat.ga"
                />
              </Field>
              {inboundEmailAddress.trim() && (
                <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs space-y-1">
                  <p className="font-medium text-cyan-700 dark:text-cyan-400">
                    Routage actif
                  </p>
                  <p className="text-muted-foreground">
                    Tout email envoyé à cette adresse sera créé comme
                    correspondance reçue dans cette représentation.
                  </p>
                </div>
              )}
            </div>
          </FlatCard>

          {/* ─── Filigrane ───────────────────────────── */}
          <FlatCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <SectionHeader
                    icon={<Fingerprint className="h-4 w-4 text-amber-600" />}
                    title="Filigrane (watermark)"
                  />
                  <HelpTooltip content={HELP.correspondance.watermark} />
                </div>
                <Switch
                  checked={watermarkEnabled}
                  onCheckedChange={(v) => {
                    setWatermarkEnabled(v);
                    push();
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Applique un filigrane en diagonale sur les documents (ex:
                "COPIE", "BROUILLON", "CONFIDENTIEL").
              </p>
              {watermarkEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Texte</FieldLabel>
                    <Input
                      value={watermarkText}
                      onChange={(e) => {
                        setWatermarkText(e.target.value);
                        push();
                      }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Opacité ({Math.round(watermarkOpacity * 100)}%)</FieldLabel>
                    <Input
                      type="range"
                      min={0.1}
                      max={0.8}
                      step={0.05}
                      value={watermarkOpacity}
                      onChange={(e) => {
                        setWatermarkOpacity(Number(e.target.value));
                        push();
                      }}
                    />
                  </Field>
                </div>
              )}
            </div>
          </FlatCard>
        </>
      )}
    </div>
  );
}

function CorrespondanceSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
