"use client";

/**
 * JurisdictionSection — Juridiction consulaire enrichie
 *
 * Couverture :
 *   - Pays de juridiction primaire (obligatoires)
 *   - Pays de juridiction secondaire (services limités)
 *   - Sous-juridictions : consulats honoraires, antennes, villes couvertes
 *   - Notes textuelles sur la répartition territoriale
 *
 * Pattern : auto-save debounced 1s + mutation `updateJurisdiction`.
 * Le champ plat `jurisdictionCountries` est synchronisé côté backend.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CountryCode } from "@convex/lib/validators";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";
import { FileText, Globe2, Map, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

interface SubJurisdiction {
  name: string;
  countryCode: CountryCode;
  city?: string;
  honoraryConsulateOrgId?: Id<"orgs">;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export function JurisdictionSection({
  orgId,
  onStatusChange,
}: SettingsSectionProps) {
  const { t } = useTranslation();
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateJurisdiction } = useConvexMutationQuery(
    api.functions.orgs.updateJurisdiction,
  );

  const [primary, setPrimary] = useState<CountryCode[]>([]);
  const [secondary, setSecondary] = useState<CountryCode[]>([]);
  const [subJurisdictions, setSubJurisdictions] = useState<SubJurisdiction[]>(
    [],
  );
  const [notes, setNotes] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateJurisdiction({
        orgId,
        jurisdiction: {
          primary,
          secondary: secondary.length ? secondary : undefined,
          subJurisdictions: subJurisdictions.length
            ? subJurisdictions
            : undefined,
          notes: notes || undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("jurisdiction", dirty),
  });

  useRegisterSection("jurisdiction", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const j = org.jurisdiction;
    if (j) {
      setPrimary((j.primary ?? []) as CountryCode[]);
      setSecondary((j.secondary ?? []) as CountryCode[]);
      setSubJurisdictions((j.subJurisdictions ?? []) as SubJurisdiction[]);
      setNotes(j.notes ?? "");
    } else {
      // Migration depuis champs plats
      setPrimary((org.jurisdictionCountries ?? []) as CountryCode[]);
      setNotes(org.jurisdictionNotes ?? "");
    }
  }, [org, hasPending]);

  const push = () => trigger();

  const countryOptions: ComboboxOption<CountryCode>[] = Object.values(
    CountryCode,
  ).map((code) => ({
    value: code,
    label: t(`superadmin.countryCodes.${code}`, code),
  }));

  const addPrimary = (code: CountryCode) => {
    if (!primary.includes(code)) {
      setPrimary([...primary, code]);
      push();
    }
  };
  const removePrimary = (code: CountryCode) => {
    setPrimary(primary.filter((c) => c !== code));
    push();
  };
  const addSecondary = (code: CountryCode) => {
    if (!secondary.includes(code) && !primary.includes(code)) {
      setSecondary([...secondary, code]);
      push();
    }
  };
  const removeSecondary = (code: CountryCode) => {
    setSecondary(secondary.filter((c) => c !== code));
    push();
  };

  const addSubJurisdiction = () => {
    setSubJurisdictions([
      ...subJurisdictions,
      { name: "", countryCode: primary[0] ?? CountryCode.GA },
    ]);
    push();
  };
  const updateSub = (idx: number, patch: Partial<SubJurisdiction>) => {
    const next = subJurisdictions.map((s, i) =>
      i === idx ? { ...s, ...patch } : s,
    );
    setSubJurisdictions(next);
    push();
  };
  const removeSub = (idx: number) => {
    setSubJurisdictions(subJurisdictions.filter((_, i) => i !== idx));
    push();
  };

  if (isPending) return <JurisdictionSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Juridiction primaire ──────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Globe2 className="h-4 w-4 text-emerald-600" />}
            title="Juridiction primaire"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Pays principaux couverts par cette représentation. Les services
            consulaires complets y sont disponibles.
          </p>
          <Combobox
            options={countryOptions.filter(
              (o) => !primary.includes(o.value as CountryCode),
            )}
            value={null}
            onValueChange={(v) => addPrimary(v as CountryCode)}
            placeholder="Ajouter un pays primaire…"
            searchPlaceholder="Rechercher…"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {primary.map((code) => (
              <Badge
                key={code}
                className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15"
              >
                {t(`superadmin.countryCodes.${code}`, code)}
                <button
                  type="button"
                  onClick={() => removePrimary(code)}
                  className="ml-1 opacity-70 hover:opacity-100"
                  aria-label={`Retirer ${code}`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {primary.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Aucun pays primaire défini
              </p>
            )}
          </div>
        </div>
      </FlatCard>

      {/* ─── Juridiction secondaire ────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Globe2 className="h-4 w-4 text-amber-600" />}
            title="Juridiction secondaire"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Pays où seuls certains services limités sont proposés (ex: visas,
            légalisations). Ne peuvent pas être dans la juridiction primaire.
          </p>
          <Combobox
            options={countryOptions.filter(
              (o) =>
                !primary.includes(o.value as CountryCode) &&
                !secondary.includes(o.value as CountryCode),
            )}
            value={null}
            onValueChange={(v) => addSecondary(v as CountryCode)}
            placeholder="Ajouter un pays secondaire…"
            searchPlaceholder="Rechercher…"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {secondary.map((code) => (
              <Badge
                key={code}
                variant="secondary"
                className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/15"
              >
                {t(`superadmin.countryCodes.${code}`, code)}
                <button
                  type="button"
                  onClick={() => removeSecondary(code)}
                  className="ml-1 opacity-70 hover:opacity-100"
                  aria-label={`Retirer ${code}`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {secondary.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Aucune juridiction secondaire
              </p>
            )}
          </div>
        </div>
      </FlatCard>

      {/* ─── Sous-juridictions ─────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<Map className="h-4 w-4 text-blue-600" />}
              title="Sous-juridictions & consulats honoraires"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={addSubJurisdiction}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Antennes, consulats honoraires ou villes spécifiques couverts dans
            les pays de juridiction.
          </p>
          {subJurisdictions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucune sous-juridiction configurée
            </p>
          ) : (
            <ul className="space-y-3">
              {subJurisdictions.map((sub, idx) => (
                <li
                  key={idx}
                  className="border border-border/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Field className="flex-1">
                      <FieldLabel className="text-xs">Libellé</FieldLabel>
                      <Input
                        value={sub.name}
                        onChange={(e) =>
                          updateSub(idx, { name: e.target.value })
                        }
                        placeholder="ex: Consulat honoraire de Barcelone"
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeSub(idx)}
                      className="text-destructive hover:text-destructive mt-5"
                      aria-label="Supprimer cette sous-juridiction"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field>
                      <FieldLabel className="text-xs">Pays</FieldLabel>
                      <Combobox
                        options={countryOptions}
                        value={sub.countryCode}
                        onValueChange={(v) =>
                          updateSub(idx, { countryCode: v as CountryCode })
                        }
                        placeholder="Pays"
                        searchPlaceholder="Rechercher…"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Ville</FieldLabel>
                      <Input
                        value={sub.city ?? ""}
                        onChange={(e) =>
                          updateSub(idx, { city: e.target.value })
                        }
                        placeholder="ex: Barcelone"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field>
                      <FieldLabel className="text-xs">Contact</FieldLabel>
                      <Input
                        value={sub.contactName ?? ""}
                        onChange={(e) =>
                          updateSub(idx, { contactName: e.target.value })
                        }
                        placeholder="Nom du responsable"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Téléphone</FieldLabel>
                      <Input
                        value={sub.contactPhone ?? ""}
                        onChange={(e) =>
                          updateSub(idx, { contactPhone: e.target.value })
                        }
                        placeholder="+34…"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Email</FieldLabel>
                      <Input
                        type="email"
                        value={sub.contactEmail ?? ""}
                        onChange={(e) =>
                          updateSub(idx, { contactEmail: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FlatCard>

      {/* ─── Notes ────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<FileText className="h-4 w-4" />}
            title="Notes sur la juridiction"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Précisions sur la répartition territoriale, exceptions, accords
            bilatéraux particuliers.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              push();
            }}
            rows={4}
            placeholder="Ex : les ressortissants résidant dans les îles Canaries peuvent être servis par le consulat honoraire de Las Palmas…"
          />
        </div>
      </FlatCard>
    </div>
  );
}

function JurisdictionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
