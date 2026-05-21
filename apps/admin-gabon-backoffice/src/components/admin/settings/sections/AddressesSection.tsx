"use client";

/**
 * AddressesSection — Adresses structurées d'une représentation
 *
 * Couverture :
 *   - Adresse physique (bâtiment principal)
 *   - Adresse postale (PO Box ou distincte si différente)
 *   - Correspondance (texte libre pour bloc adresse courrier)
 *   - Coordonnées GPS (latitude/longitude)
 *
 * Pattern : auto-save debounced 1s + mutation `updateAddresses`.
 * Le champ plat `address` historique est synchronisé côté backend.
 */

import { api } from "@convex/_generated/api";
import { CountryCode } from "@convex/lib/validators";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";
import { Copy, Home, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AddressInput,
  type AddressValue,
} from "@workspace/ui/components/address-input";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { usePlacesAutocompleteAdapter } from "@/hooks/use-places-autocomplete-adapter";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  country: CountryCode;
  lat?: string;
  lng?: string;
}

const EMPTY_ADDRESS: AddressFields = {
  street: "",
  city: "",
  postalCode: "",
  country: CountryCode.GA,
};

export function AddressesSection({
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

  const { mutateAsync: updateAddresses } = useConvexMutationQuery(
    api.functions.orgs.updateAddresses,
  );

  const [physical, setPhysical] = useState<AddressFields>(EMPTY_ADDRESS);
  const [postalEnabled, setPostalEnabled] = useState(false);
  const [postal, setPostal] = useState<AddressFields>(EMPTY_ADDRESS);
  const [correspondence, setCorrespondence] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      const physicalPayload = {
        street: physical.street,
        city: physical.city,
        postalCode: physical.postalCode,
        country: physical.country,
        coordinates:
          physical.lat && physical.lng
            ? {
                lat: Number.parseFloat(physical.lat),
                lng: Number.parseFloat(physical.lng),
              }
            : undefined,
      };
      const postalPayload = postalEnabled
        ? {
            street: postal.street,
            city: postal.city,
            postalCode: postal.postalCode,
            country: postal.country,
          }
        : undefined;

      await updateAddresses({
        orgId,
        addresses: {
          physical: physicalPayload,
          postal: postalPayload,
          correspondence: correspondence || undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("addresses", dirty),
  });

  useRegisterSection("addresses", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    // Priorité : addresses.physical > address plat
    const a = org.addresses?.physical ?? org.address;
    if (a) {
      setPhysical({
        street: a.street ?? "",
        city: a.city ?? "",
        postalCode: a.postalCode ?? "",
        country: (a.country ?? CountryCode.GA) as CountryCode,
        lat: a.coordinates?.lat?.toString() ?? "",
        lng: a.coordinates?.lng?.toString() ?? "",
      });
    }
    const p = org.addresses?.postal;
    if (p) {
      setPostalEnabled(true);
      setPostal({
        street: p.street ?? "",
        city: p.city ?? "",
        postalCode: p.postalCode ?? "",
        country: (p.country ?? CountryCode.GA) as CountryCode,
      });
    }
    setCorrespondence(org.addresses?.correspondence ?? "");
  }, [org, hasPending]);

  const push = () => trigger();

  const countryOptions: ComboboxOption<CountryCode>[] = Object.values(
    CountryCode,
  ).map((code) => ({
    value: code,
    label: t(`superadmin.countryCodes.${code}`, code),
  }));

  const copyPhysicalToPostal = () => {
    setPostal({
      street: physical.street,
      city: physical.city,
      postalCode: physical.postalCode,
      country: physical.country,
    });
    push();
  };

  if (isPending) return <AddressesSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Adresse physique ──────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Home className="h-4 w-4 text-blue-600" />}
            title="Adresse physique"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Adresse du bâtiment principal de la représentation (visible
            publiquement sur la page de l'ambassade/consulat).
          </p>
          <PhysicalAddressEditor
            value={physical}
            onChange={(next) => {
              setPhysical(next);
              push();
            }}
            countryOptions={countryOptions}
          />
        </div>
      </FlatCard>

      {/* ─── Adresse postale ──────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<Mail className="h-4 w-4 text-emerald-600" />}
              title="Adresse postale"
            />
            <Switch
              checked={postalEnabled}
              onCheckedChange={(v) => {
                setPostalEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Renseigner uniquement si différente de l'adresse physique (PO Box,
            boîte postale, etc.).
          </p>
          {postalEnabled ? (
            <>
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={copyPhysicalToPostal}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  Copier depuis adresse physique
                </Button>
              </div>
              <PostalAddressEditor
                value={postal}
                onChange={(next) => {
                  setPostal(next);
                  push();
                }}
                countryOptions={countryOptions}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              L'adresse physique sera utilisée pour toute correspondance
              postale.
            </p>
          )}
        </div>
      </FlatCard>

      {/* ─── Bloc correspondance ─────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Mail className="h-4 w-4 text-purple-600" />}
            title="Bloc d'adresse pour courrier"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Texte libre qui apparaîtra tel quel dans les en-têtes de lettres
            officielles (plusieurs lignes autorisées).
          </p>
          <Textarea
            value={correspondence}
            onChange={(e) => {
              setCorrespondence(e.target.value);
              push();
            }}
            rows={4}
            placeholder={`Ambassade de la République Gabonaise\nCalle Fortuny 16, 28010 Madrid\nEspagne`}
            className="font-mono text-sm"
          />
        </div>
      </FlatCard>
    </div>
  );
}

// ─── Adresse physique : avec autocomplete + GPS + completion score ─
function PhysicalAddressEditor({
  value,
  onChange,
  countryOptions,
}: {
  value: AddressFields;
  onChange: (v: AddressFields) => void;
  countryOptions: ComboboxOption<CountryCode>[];
}) {
  const adapter = usePlacesAutocompleteAdapter();

  const addressValue: AddressValue = {
    street: value.street,
    city: value.city,
    postalCode: value.postalCode,
    country: value.country,
    lat: value.lat,
    lng: value.lng,
  };

  return (
    <AddressInput
      value={addressValue}
      onChange={(next) =>
        onChange({
          street: next.street,
          city: next.city,
          postalCode: next.postalCode,
          country: (next.country as CountryCode) || value.country,
          lat: next.lat !== undefined ? String(next.lat) : undefined,
          lng: next.lng !== undefined ? String(next.lng) : undefined,
        })
      }
      autocomplete={adapter}
      showCoordinates
      showCompletion
      idPrefix="physical"
      countrySelector={
        <Combobox
          options={countryOptions}
          value={value.country}
          onValueChange={(v) =>
            onChange({ ...value, country: v as CountryCode })
          }
          placeholder="Choisir un pays…"
          searchPlaceholder="Rechercher…"
        />
      }
    />
  );
}

// ─── Adresse postale : sans GPS, avec completion ─────────────────
function PostalAddressEditor({
  value,
  onChange,
  countryOptions,
}: {
  value: AddressFields;
  onChange: (v: AddressFields) => void;
  countryOptions: ComboboxOption<CountryCode>[];
}) {
  const adapter = usePlacesAutocompleteAdapter();

  const addressValue: AddressValue = {
    street: value.street,
    city: value.city,
    postalCode: value.postalCode,
    country: value.country,
  };

  return (
    <AddressInput
      value={addressValue}
      onChange={(next) =>
        onChange({
          street: next.street,
          city: next.city,
          postalCode: next.postalCode,
          country: (next.country as CountryCode) || value.country,
        })
      }
      autocomplete={adapter}
      showCoordinates={false}
      showCompletion
      idPrefix="postal"
      countrySelector={
        <Combobox
          options={countryOptions}
          value={value.country}
          onValueChange={(v) =>
            onChange({ ...value, country: v as CountryCode })
          }
          placeholder="Choisir un pays…"
          searchPlaceholder="Rechercher…"
        />
      }
    />
  );
}

function AddressesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
