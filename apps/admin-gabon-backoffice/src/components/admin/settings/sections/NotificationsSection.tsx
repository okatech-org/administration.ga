"use client";

/**
 * NotificationsSection — Configuration notifications par représentation
 *
 * Couverture :
 *   - Matrice canaux (in-app, email, SMS, WhatsApp, push) × events
 *   - Quiet hours (pas de SMS/WhatsApp la nuit sauf critical)
 *   - Escalation automatique (relances + escalation si pas de réponse)
 *   - Sender config (SMS sender name Bird, email from name custom)
 */

import { api } from "@convex/_generated/api";
import {
  AtSign,
  Bell,
  Megaphone,
  MessageSquare,
  Moon,
  Phone,
  Send,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import type { SettingsSectionProps } from "../SettingsTabsLayout";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";

const CHANNELS = [
  { code: "inApp", label: "In-app", icon: Bell, color: "text-blue-600" },
  { code: "email", label: "Email", icon: AtSign, color: "text-emerald-600" },
  { code: "sms", label: "SMS", icon: MessageSquare, color: "text-purple-600" },
  {
    code: "whatsapp",
    label: "WhatsApp",
    icon: Phone,
    color: "text-green-600",
  },
  { code: "push", label: "Push", icon: Smartphone, color: "text-rose-600" },
] as const;

const EVENT_CATEGORIES = [
  {
    title: "Demandes & Dossiers",
    events: [
      { code: "request.created", label: "Nouvelle demande créée" },
      { code: "request.status_changed", label: "Changement de statut" },
      { code: "request.documents_needed", label: "Documents manquants" },
      { code: "request.completed", label: "Demande finalisée" },
    ],
  },
  {
    title: "Rendez-vous",
    events: [
      { code: "appointment.scheduled", label: "RDV planifié" },
      { code: "appointment.reminder", label: "Rappel RDV (J-1)" },
      { code: "appointment.cancelled", label: "RDV annulé" },
      { code: "appointment.rescheduled", label: "RDV reporté" },
    ],
  },
  {
    title: "Communications",
    events: [
      { code: "message.received", label: "Message iBoîte reçu" },
      { code: "correspondance.approved", label: "Correspondance approuvée" },
      { code: "missed_call.created", label: "Appel manqué à rappeler" },
    ],
  },
];

export function NotificationsSection({
  orgId,
  onStatusChange,
}: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateNotifications } = useConvexMutationQuery(
    api.functions.orgs.updateNotificationsConfig,
  );

  // Canaux activés globalement
  const [channels, setChannels] = useState({
    inApp: true,
    email: true,
    sms: false,
    whatsapp: false,
    push: false,
  });

  // Matrice events × channels
  const [eventChannels, setEventChannels] = useState<
    Record<string, string[]>
  >({});

  // Quiet hours
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStartHour, setQuietStartHour] = useState(22);
  const [quietEndHour, setQuietEndHour] = useState(7);
  const [quietChannels, setQuietChannels] = useState<string[]>(["sms", "whatsapp"]);

  // Escalation
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationHours, setEscalationHours] = useState(24);
  const [maxReminders, setMaxReminders] = useState(2);

  // Sender config
  const [smsSenderName, setSmsSenderName] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateNotifications({
        orgId,
        notifications: {
          channels,
          events: Object.entries(eventChannels).map(([eventCode, enabledChannels]) => ({
            eventCode,
            enabledChannels,
          })),
          quietHours: quietEnabled
            ? {
                enabled: true,
                startHour: quietStartHour,
                endHour: quietEndHour,
                channelsAffected: quietChannels,
              }
            : undefined,
          escalation: escalationEnabled
            ? {
                enabled: true,
                noResponseAfterHours: escalationHours,
                escalateToMembershipIds: [],
                maxReminders,
              }
            : undefined,
          senderConfig: {
            smsSenderName: smsSenderName || undefined,
            emailFromName: emailFromName || undefined,
            emailReplyTo: emailReplyTo || undefined,
          },
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("notifications", dirty),
  });

  useRegisterSection("notifications", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const notif = org.settings?.notifications;
    setChannels({
      inApp: notif?.channels?.inApp ?? true,
      email: notif?.channels?.email ?? true,
      sms: notif?.channels?.sms ?? false,
      whatsapp: notif?.channels?.whatsapp ?? false,
      push: notif?.channels?.push ?? false,
    });

    const eventMap: Record<string, string[]> = {};
    for (const ev of notif?.events ?? []) {
      eventMap[ev.eventCode] = ev.enabledChannels;
    }
    setEventChannels(eventMap);

    setQuietEnabled(notif?.quietHours?.enabled ?? false);
    setQuietStartHour(notif?.quietHours?.startHour ?? 22);
    setQuietEndHour(notif?.quietHours?.endHour ?? 7);
    setQuietChannels(
      notif?.quietHours?.channelsAffected ?? ["sms", "whatsapp"],
    );

    setEscalationEnabled(notif?.escalation?.enabled ?? false);
    setEscalationHours(notif?.escalation?.noResponseAfterHours ?? 24);
    setMaxReminders(notif?.escalation?.maxReminders ?? 2);

    setSmsSenderName(notif?.senderConfig?.smsSenderName ?? "");
    setEmailFromName(notif?.senderConfig?.emailFromName ?? "");
    setEmailReplyTo(notif?.senderConfig?.emailReplyTo ?? "");
  }, [org, hasPending]);

  const push = () => trigger();

  const toggleEventChannel = (eventCode: string, channel: string) => {
    const current = eventChannels[eventCode] ?? [];
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    setEventChannels({ ...eventChannels, [eventCode]: next });
    push();
  };

  const toggleQuietChannel = (channel: string) => {
    const next = quietChannels.includes(channel)
      ? quietChannels.filter((c) => c !== channel)
      : [...quietChannels, channel];
    setQuietChannels(next);
    push();
  };

  if (isPending) return <NotificationsSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Canaux globaux ───────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Megaphone className="h-4 w-4 text-blue-600" />}
            title="Canaux de notification"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Canaux disponibles pour cette représentation. Les citoyens peuvent
            ensuite choisir individuellement lesquels ils souhaitent recevoir.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const active = channels[c.code as keyof typeof channels];
              return (
                <label
                  key={c.code}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-md border cursor-pointer transition-colors",
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", c.color)} />
                    <span className="text-sm font-medium">{c.label}</span>
                  </div>
                  <Switch
                    checked={active}
                    onCheckedChange={(v) => {
                      setChannels({ ...channels, [c.code]: v });
                      push();
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </FlatCard>

      {/* ─── Matrice events × canaux ──────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Bell className="h-4 w-4 text-indigo-600" />}
            title="Matrice événements × canaux"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Activez les canaux pour chaque événement déclencheur. Un canal doit
            être activé globalement pour apparaître ici.
          </p>

          <div className="space-y-4">
            {EVENT_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {cat.title}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground">
                        <th className="text-left py-1.5 pr-3 font-medium">
                          Événement
                        </th>
                        {CHANNELS.filter(
                          (c) => channels[c.code as keyof typeof channels],
                        ).map((c) => (
                          <th
                            key={c.code}
                            className="text-center py-1.5 px-2 font-medium w-16"
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cat.events.map((ev) => {
                        const eventChannelsList = eventChannels[ev.code] ?? [];
                        return (
                          <tr
                            key={ev.code}
                            className="border-b border-border/20 hover:bg-muted/30"
                          >
                            <td className="py-1.5 pr-3">{ev.label}</td>
                            {CHANNELS.filter(
                              (c) => channels[c.code as keyof typeof channels],
                            ).map((c) => (
                              <td key={c.code} className="text-center py-1.5 px-2">
                                <Checkbox
                                  checked={eventChannelsList.includes(c.code)}
                                  onCheckedChange={() =>
                                    toggleEventChannel(ev.code, c.code)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FlatCard>

      {/* ─── Quiet hours ─────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <SectionHeader
                icon={<Moon className="h-4 w-4 text-slate-600" />}
                title="Heures silencieuses (quiet hours)"
              />
              <HelpTooltip content={HELP.notifications.quietHours} />
            </div>
            <Switch
              checked={quietEnabled}
              onCheckedChange={(v) => {
                setQuietEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Suspend les notifications intrusives (SMS, WhatsApp) pendant la
            nuit, sauf pour les alertes critiques.
          </p>
          {quietEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Début (heure)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={quietStartHour}
                    onChange={(e) => {
                      setQuietStartHour(Number(e.target.value));
                      push();
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Fin (heure)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={quietEndHour}
                    onChange={(e) => {
                      setQuietEndHour(Number(e.target.value));
                      push();
                    }}
                  />
                </Field>
              </div>
              <div>
                <FieldLabel className="text-xs mb-1.5">
                  Canaux affectés
                </FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <label
                      key={c.code}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <Checkbox
                        checked={quietChannels.includes(c.code)}
                        onCheckedChange={() => toggleQuietChannel(c.code)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Les notifications priority="critical" ignorent toujours les
                quiet hours.
              </p>
            </div>
          )}
        </div>
      </FlatCard>

      {/* ─── Escalation ──────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <SectionHeader
                icon={<Send className="h-4 w-4 text-amber-600" />}
                title="Escalation & relances"
              />
              <HelpTooltip content={HELP.notifications.escalation} />
            </div>
            <Switch
              checked={escalationEnabled}
              onCheckedChange={(v) => {
                setEscalationEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Relance automatique si aucune action n'est prise dans un délai
            donné.
          </p>
          {escalationEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Escalation après (heures)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={escalationHours}
                  onChange={(e) => {
                    setEscalationHours(Number(e.target.value));
                    push();
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Nombre max de relances</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxReminders}
                  onChange={(e) => {
                    setMaxReminders(Number(e.target.value));
                    push();
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      </FlatCard>

      {/* ─── Sender config ────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<AtSign className="h-4 w-4 text-purple-600" />}
            title="Identité d'expéditeur"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Personnalisation du nom/adresse d'expéditeur pour les SMS et
            emails envoyés depuis cette représentation.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel>Nom d'expéditeur SMS (11 car. max)</FieldLabel>
                <HelpTooltip content={HELP.notifications.smsSenderName} />
              </div>
              <Input
                maxLength={11}
                value={smsSenderName}
                onChange={(e) => {
                  setSmsSenderName(e.target.value);
                  push();
                }}
                placeholder="GABON-MAD"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Nom alphanumérique affiché comme expéditeur SMS Bird. Limitation
                opérateur selon pays.
              </p>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Nom d'expéditeur email</FieldLabel>
                <Input
                  value={emailFromName}
                  onChange={(e) => {
                    setEmailFromName(e.target.value);
                    push();
                  }}
                  placeholder="Consulat du Gabon à Madrid"
                />
              </Field>
              <Field>
                <FieldLabel>Adresse de réponse (reply-to)</FieldLabel>
                <Input
                  type="email"
                  value={emailReplyTo}
                  onChange={(e) => {
                    setEmailReplyTo(e.target.value);
                    push();
                  }}
                  placeholder="info@madrid.consulat.ga"
                />
              </Field>
            </div>
          </div>
        </div>
      </FlatCard>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
