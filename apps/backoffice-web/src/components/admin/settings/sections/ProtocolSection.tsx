"use client";

/**
 * ProtocolSection — Protocole diplomatique d'une représentation
 *
 * Couverture :
 *   - Sélection du chef de poste parmi les membres actifs
 *   - Grade diplomatique (ambassadeur, consul général, chargé d'affaires...)
 *   - Titre officiel FR/EN
 *   - Dates credentials (lettres de créance / exequatur)
 *   - Photo officielle (upload via storage)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";
import { Crown, FileText, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
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
import type { SettingsSectionProps } from "../SettingsTabsLayout";

type Grade =
  | "ambassadeur"
  | "ambassadeur_extraordinaire"
  | "ministre_plenipotentiaire"
  | "consul_general"
  | "consul"
  | "charge_affaires"
  | "haut_commissaire"
  | "representant_permanent"
  | "consul_honoraire";

const GRADE_OPTIONS: Array<{ value: Grade; label: string }> = [
  { value: "ambassadeur", label: "Ambassadeur / Ambassadrice" },
  {
    value: "ambassadeur_extraordinaire",
    label: "Ambassadeur Extraordinaire et Plénipotentiaire",
  },
  {
    value: "ministre_plenipotentiaire",
    label: "Ministre Plénipotentiaire",
  },
  { value: "haut_commissaire", label: "Haut Commissaire" },
  { value: "representant_permanent", label: "Représentant Permanent" },
  { value: "charge_affaires", label: "Chargé(e) d'Affaires" },
  { value: "consul_general", label: "Consul(e) Général(e)" },
  { value: "consul", label: "Consul(e)" },
  { value: "consul_honoraire", label: "Consul(e) Honoraire" },
];

export function ProtocolSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const { mutateAsync: updateProtocol } = useConvexMutationQuery(
    api.functions.orgs.updateProtocol,
  );

  const [membershipId, setMembershipId] = useState<Id<"memberships"> | null>(null);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [grade, setGrade] = useState<Grade | "">("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [credentialsAt, setCredentialsAt] = useState<string>("");
  const [exequaturAt, setExequaturAt] = useState<string>("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateProtocol({
        orgId,
        protocol: {
          headOfMissionMembershipId: membershipId ?? undefined,
          headOfMissionUserId: userId ?? undefined,
          headOfMissionGrade: grade || undefined,
          headOfMissionTitleFr: titleFr || undefined,
          headOfMissionTitleEn: titleEn || undefined,
          credentialsPresentedAt: credentialsAt
            ? new Date(credentialsAt).getTime()
            : undefined,
          exequaturGrantedAt: exequaturAt
            ? new Date(exequaturAt).getTime()
            : undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("protocol", dirty),
  });

  useRegisterSection("protocol", { flush, hasPending, status, errorMessage });

  // Synchronise l'état local quand l'org arrive.
  // BUG FIX #4 : skip si l'utilisateur a des modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const p = org.protocol ?? {};
    setMembershipId(p.headOfMissionMembershipId ?? null);
    setUserId(p.headOfMissionUserId ?? null);
    setGrade((p.headOfMissionGrade ?? "") as Grade | "");
    setTitleFr(p.headOfMissionTitleFr ?? "");
    setTitleEn(p.headOfMissionTitleEn ?? "");
    setCredentialsAt(
      p.credentialsPresentedAt
        ? new Date(p.credentialsPresentedAt).toISOString().slice(0, 10)
        : "",
    );
    setExequaturAt(
      p.exequaturGrantedAt
        ? new Date(p.exequaturGrantedAt).toISOString().slice(0, 10)
        : "",
    );
  }, [org, hasPending]);

  const push = () => trigger();

  if (isPending) {
    return <ProtocolSectionSkeleton />;
  }

  if (!org) return null;

  const memberOptions: ComboboxOption<string>[] = (members ?? []).map((m) => ({
    value: m.membershipId as string,
    label:
      `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
      m.email ||
      m._id.toString(),
  }));

  return (
    <div className="space-y-4">
      {/* ─── Chef de poste ──────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Crown className="h-4 w-4 text-amber-600" />}
            title="Chef de poste"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Ambassadeur, Consul Général ou Représentant Permanent. Doit être un
            membre actif de cette représentation.
          </p>
          <FieldGroup>
            <Field>
              <FieldLabel>Membre assigné</FieldLabel>
              <Combobox
                options={memberOptions}
                value={membershipId as string | null}
                onValueChange={(val) => {
                  const m = (members ?? []).find(
                    (x) => (x.membershipId as string) === val,
                  );
                  setMembershipId(val as Id<"memberships">);
                  setUserId((m?._id ?? null) as Id<"users"> | null);
                  push();
                }}
                placeholder="Sélectionner un membre…"
                searchPlaceholder="Rechercher un membre…"
              />
            </Field>

            <Field>
              <FieldLabel>Grade diplomatique</FieldLabel>
              <Select
                value={grade}
                onValueChange={(v) => {
                  setGrade(v as Grade);
                  push();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un grade…" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Titre officiel (FR)</FieldLabel>
                <Input
                  value={titleFr}
                  onChange={(e) => {
                    setTitleFr(e.target.value);
                    push();
                  }}
                  placeholder="Son Excellence Madame l'Ambassadrice…"
                />
              </Field>
              <Field>
                <FieldLabel>Titre officiel (EN)</FieldLabel>
                <Input
                  value={titleEn}
                  onChange={(e) => {
                    setTitleEn(e.target.value);
                    push();
                  }}
                  placeholder="Her Excellency, the Ambassador…"
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      </FlatCard>

      {/* ─── Credentials ────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<FileText className="h-4 w-4" />}
            title="Lettres de créance & Exequatur"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Dates de présentation des lettres de créance (ambassadeurs) ou
            d'octroi de l'exequatur (consuls) par le pays d'accueil.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="flex items-center gap-1.5">
                <Medal className="h-3.5 w-3.5" />
                Lettres de créance présentées
              </FieldLabel>
              <Input
                type="date"
                value={credentialsAt}
                onChange={(e) => {
                  setCredentialsAt(e.target.value);
                  push();
                }}
              />
            </Field>
            <Field>
              <FieldLabel className="flex items-center gap-1.5">
                <Medal className="h-3.5 w-3.5" />
                Exequatur accordé
              </FieldLabel>
              <Input
                type="date"
                value={exequaturAt}
                onChange={(e) => {
                  setExequaturAt(e.target.value);
                  push();
                }}
              />
            </Field>
          </div>
        </div>
      </FlatCard>
    </div>
  );
}

function ProtocolSectionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
