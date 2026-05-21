"use client";

/**
 * CallSettingsSection — Paramètres globaux iAppel par représentation
 *
 * Extensions Phase 2 sur le système d'appels existant (iAppel) :
 *   - Ring timeout par défaut (override possible par ligne)
 *   - Durée max d'appel, type média par défaut
 *   - Max participants (calls / meetings)
 *   - Enregistrement (consentement, rétention)
 *   - Fallback si aucun agent disponible (voicemail, callback request, disconnect)
 *
 * La gestion des lignes (CallLinesTab) reste dans l'onglet "Téléphonie" existant.
 */

import { api } from "@convex/_generated/api";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";
import { Mic, PhoneOff, Timer, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

export function CallSettingsSection({
  orgId,
  onStatusChange,
}: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateCallsConfig } = useConvexMutationQuery(
    api.functions.orgs.updateCallsConfig,
  );

  // États
  const [ringTimeout, setRingTimeout] = useState(60);
  const [maxDuration, setMaxDuration] = useState<number | "">("");
  const [defaultMediaType, setDefaultMediaType] = useState<"audio" | "video">(
    "audio",
  );
  const [maxParticipantsCall, setMaxParticipantsCall] = useState(2);
  const [maxParticipantsMeeting, setMaxParticipantsMeeting] = useState(20);

  // Recording
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingAutoStart, setRecordingAutoStart] = useState(false);
  const [recordingRetentionDays, setRecordingRetentionDays] = useState(90);
  const [recordingConsentRequired, setRecordingConsentRequired] = useState(true);

  // Fallback
  const [noAgentAction, setNoAgentAction] = useState<
    "voicemail" | "callback_request" | "disconnect"
  >("callback_request");
  const [voicemailGreeting, setVoicemailGreeting] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateCallsConfig({
        orgId,
        calls: {
          ringTimeoutSeconds: ringTimeout,
          maxCallDurationMinutes:
            typeof maxDuration === "number" ? maxDuration : undefined,
          defaultCallMediaType: defaultMediaType,
          maxParticipantsCall,
          maxParticipantsMeeting,
          recording: {
            enabled: recordingEnabled,
            autoStart: recordingAutoStart,
            retentionDays: recordingRetentionDays,
            citizenConsentRequired: recordingConsentRequired,
          },
          noAgentAvailableAction: noAgentAction,
          voicemailGreeting: voicemailGreeting || undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("calls", dirty),
  });

  useRegisterSection("calls", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const calls = org.settings?.calls ?? {};
    setRingTimeout(calls.ringTimeoutSeconds ?? 60);
    setMaxDuration(calls.maxCallDurationMinutes ?? "");
    setDefaultMediaType((calls.defaultCallMediaType ?? "audio") as "audio" | "video");
    setMaxParticipantsCall(calls.maxParticipantsCall ?? 2);
    setMaxParticipantsMeeting(calls.maxParticipantsMeeting ?? 20);
    setRecordingEnabled(calls.recording?.enabled ?? false);
    setRecordingAutoStart(calls.recording?.autoStart ?? false);
    setRecordingRetentionDays(calls.recording?.retentionDays ?? 90);
    setRecordingConsentRequired(calls.recording?.citizenConsentRequired ?? true);
    setNoAgentAction(
      (calls.noAgentAvailableAction ?? "callback_request") as
        | "voicemail"
        | "callback_request"
        | "disconnect",
    );
    setVoicemailGreeting(calls.voicemailGreeting ?? "");
  }, [org, hasPending]);

  const push = () => trigger();

  if (isPending) return <CallSettingsSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Temps & Durées ────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Timer className="h-4 w-4 text-blue-600" />}
            title="Temps d'attente et durée"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Configuration des temps d'attente avant timeout et de la durée
            maximale d'un appel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel>Timeout sonnerie par défaut (secondes)</FieldLabel>
                <HelpTooltip content={HELP.calls.ringTimeout} />
              </div>
              <Input
                type="number"
                min={10}
                max={600}
                value={ringTimeout}
                onChange={(e) => {
                  setRingTimeout(Number(e.target.value));
                  push();
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Peut être surchargé par ligne dans l'onglet Téléphonie.
              </p>
            </Field>
            <Field>
              <FieldLabel>Durée max d'un appel (minutes)</FieldLabel>
              <Input
                type="number"
                min={1}
                value={maxDuration}
                onChange={(e) => {
                  setMaxDuration(
                    e.target.value === "" ? "" : Number(e.target.value),
                  );
                  push();
                }}
                placeholder="Illimité si vide"
              />
            </Field>
          </div>
        </div>
      </FlatCard>

      {/* ─── Participants ──────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Users className="h-4 w-4 text-indigo-600" />}
            title="Participants maximum"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Appels 1:1 (call)</FieldLabel>
              <Input
                type="number"
                min={2}
                max={10}
                value={maxParticipantsCall}
                onChange={(e) => {
                  setMaxParticipantsCall(Number(e.target.value));
                  push();
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Réunions de groupe (meeting)</FieldLabel>
              <Input
                type="number"
                min={2}
                max={100}
                value={maxParticipantsMeeting}
                onChange={(e) => {
                  setMaxParticipantsMeeting(Number(e.target.value));
                  push();
                }}
              />
            </Field>
          </div>
          <Field className="mt-3">
            <FieldLabel>Type média par défaut</FieldLabel>
            <Select
              value={defaultMediaType}
              onValueChange={(v) => {
                setDefaultMediaType(v as "audio" | "video");
                push();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio">Audio uniquement</SelectItem>
                <SelectItem value="video">Audio + Vidéo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Les citoyens restent toujours en audio uniquement, quelle que soit
              cette valeur.
            </p>
          </Field>
        </div>
      </FlatCard>

      {/* ─── Enregistrement ────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <SectionHeader
                icon={<Mic className="h-4 w-4 text-rose-600" />}
                title="Enregistrement des appels"
              />
              <HelpTooltip content={HELP.calls.recording} />
            </div>
            <Switch
              checked={recordingEnabled}
              onCheckedChange={(v) => {
                setRecordingEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Activer l'enregistrement permet la relecture pour contrôle qualité
            et audit. Vérifier la conformité RGPD selon la juridiction.
          </p>
          {recordingEnabled && (
            <div className="space-y-3 pl-2 border-l-2 border-rose-200">
              <label className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">Démarrage automatique</div>
                  <div className="text-[10px] text-muted-foreground">
                    Enregistre dès la connexion (sinon l'agent doit démarrer
                    manuellement)
                  </div>
                </div>
                <Switch
                  checked={recordingAutoStart}
                  onCheckedChange={(v) => {
                    setRecordingAutoStart(v);
                    push();
                  }}
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">Consentement citoyen requis</div>
                  <div className="text-[10px] text-muted-foreground">
                    Affiche une pop-up de consentement avant le démarrage
                  </div>
                </div>
                <Switch
                  checked={recordingConsentRequired}
                  onCheckedChange={(v) => {
                    setRecordingConsentRequired(v);
                    push();
                  }}
                />
              </label>
              <Field>
                <FieldLabel>Rétention (jours)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={2555}
                  value={recordingRetentionDays}
                  onChange={(e) => {
                    setRecordingRetentionDays(Number(e.target.value));
                    push();
                  }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Les enregistrements sont automatiquement supprimés après ce
                  délai.
                </p>
              </Field>
            </div>
          )}
        </div>
      </FlatCard>

      {/* ─── Fallback si aucun agent ───────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<PhoneOff className="h-4 w-4 text-amber-600" />}
            title="Aucun agent disponible"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Action appliquée quand le citoyen appelle hors horaires ou si aucun
            agent ne décroche avant expiration.
          </p>
          <Field>
            <FieldLabel>Action par défaut</FieldLabel>
            <Select
              value={noAgentAction}
              onValueChange={(v) => {
                setNoAgentAction(
                  v as "voicemail" | "callback_request" | "disconnect",
                );
                push();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voicemail">
                  Boîte vocale (laisser un message)
                </SelectItem>
                <SelectItem value="callback_request">
                  Demander un rappel (crée un missedCall)
                </SelectItem>
                <SelectItem value="disconnect">
                  Raccrocher silencieusement
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {noAgentAction === "voicemail" && (
            <Field className="mt-3">
              <FieldLabel>Message de boîte vocale</FieldLabel>
              <Textarea
                value={voicemailGreeting}
                onChange={(e) => {
                  setVoicemailGreeting(e.target.value);
                  push();
                }}
                rows={3}
                placeholder="Bonjour, vous avez joint le Consulat du Gabon. Nous ne sommes pas disponibles actuellement. Laissez votre nom, numéro et objet de l'appel après le bip."
              />
            </Field>
          )}
        </div>
      </FlatCard>
    </div>
  );
}

function CallSettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
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
