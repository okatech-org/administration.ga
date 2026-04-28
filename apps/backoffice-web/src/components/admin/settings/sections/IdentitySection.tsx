"use client";

/**
 * IdentitySection — Identité étendue d'une représentation
 *
 * Couverture :
 *   - Nom officiel FR/langue locale
 *   - Pays d'accréditation (multi-select)
 *   - Statut cycle de vie (active/maintenance/archived/draft/suspended)
 *   - Dates ouverture/fermeture
 *   - Mapping vers le champ plat `name` historique
 *
 * Pattern : auto-save debounced 1s + mutation `updateIdentityExtended`.
 */

import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/validators";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";
import { Archive, CircleDot, Globe2, Info, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { LocalizedField, type LocalizedValue } from "../LocalizedField";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

type LifecycleStatus =
  | "active"
  | "inactive"
  | "draft"
  | "maintenance"
  | "archived"
  | "suspended";

const STATUS_OPTIONS: Array<{
  value: LifecycleStatus;
  label: string;
  description: string;
  icon: typeof CircleDot;
  color: string;
}> = [
  {
    value: "active",
    label: "Active",
    description: "Opérationnelle, services ouverts aux citoyens",
    icon: Play,
    color: "text-emerald-600",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Services temporairement suspendus",
    icon: Pause,
    color: "text-amber-600",
  },
  {
    value: "draft",
    label: "En projet",
    description: "Pas encore opérationnelle, visible uniquement en interne",
    icon: Info,
    color: "text-blue-600",
  },
  {
    value: "suspended",
    label: "Suspendue",
    description: "Suspension temporaire (incident ou décision politique)",
    icon: Pause,
    color: "text-orange-600",
  },
  {
    value: "inactive",
    label: "Inactive",
    description: "Non opérationnelle, peut être réactivée",
    icon: CircleDot,
    color: "text-muted-foreground",
  },
  {
    value: "archived",
    label: "Archivée",
    description: "Fermée définitivement, lecture seule",
    icon: Archive,
    color: "text-slate-600",
  },
];

export function IdentitySection({ orgId, onStatusChange }: SettingsSectionProps) {
  const { t } = useTranslation();
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateIdentity } = useConvexMutationQuery(
    api.functions.orgs.updateIdentityExtended,
  );
  const { mutateAsync: updateOrgNameMut } = useConvexMutationQuery(
    api.functions.orgs.updateOrgName,
  );
  const { mutateAsync: updateStatusMut } = useConvexMutationQuery(
    api.functions.orgs.updateStatus,
  );

  // État local miroir du serveur
  const [nameI18n, setNameI18n] = useState<Record<string, string>>({});
  const [accreditedTo, setAccreditedTo] = useState<CountryCode[]>([]);
  const [status, setStatus] = useState<LifecycleStatus>("active");
  const [openedAt, setOpenedAt] = useState<string>("");
  const [closedAt, setClosedAt] = useState<string>("");

  // Auto-save identityExtended (sauf status et nameI18n qui ont leurs propres mutations).
  // BUG FIX #5 : `status` est RETIRÉ du payload — géré exclusivement par
  // updateStatusMut (mutation dédiée avec son propre audit).
  // Le nom multilingue est aussi extrait et géré par updateOrgName.
  const {
    trigger: triggerIdentitySave,
    flush,
    hasPending,
    status: saveStatus,
    errorMessage,
  } = useDebouncedSave<{
    nameI18n?: Record<string, string>;
    accreditedTo?: CountryCode[];
    openedAt?: number;
    closedAt?: number;
  }>({
    readOnly,
    onSave: async (val) => {
      // 1. Sauvegarde du nom multilingue (mutation dédiée)
      if (val.nameI18n && Object.values(val.nameI18n).some((s) => s.trim())) {
        await updateOrgNameMut({
          orgId,
          nameI18n: val.nameI18n,
        });
      }
      // 2. Sauvegarde des autres champs identityExtended
      await updateIdentity({
        orgId,
        identityExtended: {
          accreditedTo: val.accreditedTo?.length ? val.accreditedTo : undefined,
          openedAt: val.openedAt,
          closedAt: val.closedAt,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("identity", dirty),
  });

  // Inscrit la section au contexte pour flushAll() + indicateur dirty
  useRegisterSection("identity", {
    flush,
    hasPending,
    status: saveStatus,
    errorMessage,
  });

  // Synchronise l'état local quand l'org arrive.
  // BUG FIX #4 : ignore la resynchro si l'utilisateur a des modifs pending
  // (évite l'écrasement de la saisie en cours par un push Convex réactif).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const id = org.identityExtended ?? {};
    // nameI18n est la source de vérité ; à défaut on hydrate depuis les
    // anciens champs (officialName, officialNameLocal) ou name plat pour
    // les rows pas encore migrés.
    const incomingI18n = (org as any).nameI18n ?? {};
    if (Object.keys(incomingI18n).length === 0) {
      const fallback: Record<string, string> = {};
      if (id.officialName || org.name) fallback.fr = id.officialName ?? org.name ?? "";
      if (id.officialNameLocal) fallback.local = id.officialNameLocal;
      setNameI18n(fallback);
    } else {
      setNameI18n(incomingI18n);
    }
    setAccreditedTo((id.accreditedTo ?? []) as CountryCode[]);
    setStatus((id.status ?? (org.isActive ? "active" : "inactive")) as LifecycleStatus);
    setOpenedAt(id.openedAt ? new Date(id.openedAt).toISOString().slice(0, 10) : "");
    setClosedAt(id.closedAt ? new Date(id.closedAt).toISOString().slice(0, 10) : "");
  }, [org, hasPending]);

  const pushIdentity = (override?: Partial<Parameters<typeof triggerIdentitySave>[0]>) => {
    triggerIdentitySave({
      nameI18n,
      accreditedTo,
      openedAt: openedAt ? new Date(openedAt).getTime() : undefined,
      closedAt: closedAt ? new Date(closedAt).getTime() : undefined,
      ...override,
    });
  };

  // Changement de statut — mutation dédiée (audit séparé)
  const handleStatusChange = async (next: LifecycleStatus) => {
    setStatus(next);
    onStatusChange?.("saving");
    try {
      await updateStatusMut({ orgId, status: next });
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.(
        "error",
        err instanceof Error ? err.message : "Erreur inconnue",
      );
    }
  };

  if (isPending) {
    return <IdentitySectionSkeleton />;
  }

  if (!org) {
    return (
      <FlatCard>
        <div className="p-4 text-destructive">
          {t("errors.orgs.notFound", "Représentation introuvable")}
        </div>
      </FlatCard>
    );
  }

  const countryOptions: ComboboxOption<CountryCode>[] = Object.values(
    CountryCode,
  ).map((code) => ({
    value: code,
    label: t(`superadmin.countryCodes.${code}`, code),
  }));

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <div className="space-y-4">
      {/* ─── Statut cycle de vie ─────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={
              currentStatus ? (
                <currentStatus.icon
                  className={cn("h-4 w-4", currentStatus.color)}
                />
              ) : (
                <CircleDot className="h-4 w-4" />
              )
            }
            title="Statut opérationnel"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Le statut contrôle la visibilité de la représentation pour les
            citoyens et les agents. Les changements sont audités.
          </p>
          <div className="grid gap-2">
            <Select
              value={status}
              onValueChange={(v) => handleStatusChange(v as LifecycleStatus)}
            >
              <SelectTrigger className="w-full h-auto py-2">
                <SelectValue asChild>
                  {currentStatus ? (
                    <div className="flex items-center gap-2 text-left">
                      <currentStatus.icon
                        className={cn("h-4 w-4 shrink-0", currentStatus.color)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {currentStatus.label}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">
                          {currentStatus.description}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span>—</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className={cn("h-4 w-4", opt.color)} />
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {opt.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FlatCard>

      {/* ─── Identification officielle ─────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Info className="h-4 w-4" />}
            title="Identification officielle"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Nom officiel complet pour en-têtes documents et correspondances
            diplomatiques.
          </p>
          <FieldGroup>
            <Field>
              <FieldLabel>Nom officiel</FieldLabel>
              <LocalizedField
                locales={["fr", "en", "local"]}
                value={nameI18n as LocalizedValue}
                placeholder={{
                  fr: "Ambassade de la République Gabonaise en Espagne",
                  en: "Embassy of the Gabonese Republic in Spain",
                  local: "Embajada de la República Gabonesa en España",
                }}
                onChange={(next: LocalizedValue) => {
                  const cleaned: Record<string, string> = {};
                  for (const [loc, val] of Object.entries(next)) {
                    if (typeof val === "string") cleaned[loc] = val;
                  }
                  setNameI18n(cleaned);
                  pushIdentity({ nameI18n: cleaned });
                }}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Date d'ouverture</FieldLabel>
                <Input
                  type="date"
                  value={openedAt}
                  onChange={(e) => {
                    setOpenedAt(e.target.value);
                    pushIdentity({
                      openedAt: e.target.value
                        ? new Date(e.target.value).getTime()
                        : undefined,
                    });
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Date de fermeture</FieldLabel>
                <Input
                  type="date"
                  value={closedAt}
                  onChange={(e) => {
                    setClosedAt(e.target.value);
                    pushIdentity({
                      closedAt: e.target.value
                        ? new Date(e.target.value).getTime()
                        : undefined,
                    });
                  }}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </FlatCard>

      {/* ─── Accréditation ─────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Globe2 className="h-4 w-4" />}
            title="Pays d'accréditation"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Pays auprès desquels cette représentation est officiellement
            accréditée (peut différer de la juridiction consulaire).
          </p>
          <Combobox
            options={countryOptions.filter(
              (opt) => !accreditedTo.includes(opt.value),
            )}
            value={null}
            onValueChange={(val) => {
              if (!accreditedTo.includes(val as CountryCode)) {
                const next = [...accreditedTo, val as CountryCode];
                setAccreditedTo(next);
                pushIdentity({ accreditedTo: next });
              }
            }}
            placeholder="Ajouter un pays…"
            searchPlaceholder="Rechercher…"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {accreditedTo.map((code) => (
              <Badge key={code} variant="secondary" className="gap-1">
                {t(`superadmin.countryCodes.${code}`, code)}
                <button
                  type="button"
                  onClick={() => {
                    const next = accreditedTo.filter((c) => c !== code);
                    setAccreditedTo(next);
                    pushIdentity({ accreditedTo: next });
                  }}
                  className="ml-1 opacity-60 hover:opacity-100"
                  aria-label={`Retirer ${code}`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {accreditedTo.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Aucun pays d'accréditation défini
              </p>
            )}
          </div>
        </div>
      </FlatCard>
    </div>
  );
}

function IdentitySectionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
