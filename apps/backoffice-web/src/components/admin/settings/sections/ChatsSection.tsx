"use client";

/**
 * ChatsSection — Configuration des chats P2P par représentation
 *
 * Couverture :
 *   - Autoriser les citoyens à initier un thread (défaut: non, agents seulement)
 *   - Règles de routage "standard" (pool d'agents qui reçoivent les threads non assignés)
 *   - Stratégie fair assignment (round_robin / least_busy)
 *   - Auto-archivage après inactivité
 *   - Limites pièces jointes
 */

import { api } from "@convex/_generated/api";
import { Archive, MessageSquare, Paperclip, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
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

export function ChatsSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateChatsConfig } = useConvexMutationQuery(
    api.functions.orgs.updateChatsConfig,
  );

  const [allowCitizenInitiated, setAllowCitizenInitiated] = useState(false);
  const [standardEnabled, setStandardEnabled] = useState(false);
  const [fairAssignment, setFairAssignment] = useState<
    "round_robin" | "least_busy"
  >("round_robin");
  const [autoArchiveDays, setAutoArchiveDays] = useState<number | "">("");
  const [allowAttachments, setAllowAttachments] = useState(true);
  const [maxAttachmentSize, setMaxAttachmentSize] = useState(10);

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateChatsConfig({
        orgId,
        chats: {
          allowCitizenInitiated,
          standardRoutingRules: {
            enabledByDefault: standardEnabled,
            routingMembershipIds: [],
            fairAssignment,
          },
          autoArchiveAfterInactiveDays:
            typeof autoArchiveDays === "number" ? autoArchiveDays : undefined,
          allowFileAttachments: allowAttachments,
          maxAttachmentSizeMb: maxAttachmentSize,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("chats", dirty),
  });

  useRegisterSection("chats", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const chats = org.settings?.chats ?? {};
    setAllowCitizenInitiated(chats.allowCitizenInitiated ?? false);
    setStandardEnabled(chats.standardRoutingRules?.enabledByDefault ?? false);
    setFairAssignment(
      (chats.standardRoutingRules?.fairAssignment ?? "round_robin") as
        | "round_robin"
        | "least_busy",
    );
    setAutoArchiveDays(chats.autoArchiveAfterInactiveDays ?? "");
    setAllowAttachments(chats.allowFileAttachments ?? true);
    setMaxAttachmentSize(chats.maxAttachmentSizeMb ?? 10);
  }, [org, hasPending]);

  const push = () => trigger();

  if (isPending) return <ChatsSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Initiation ───────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<MessageSquare className="h-4 w-4 text-blue-600" />}
            title="Initiation des conversations"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Contrôle qui peut démarrer un nouveau thread de chat P2P.
          </p>
          <label className="flex items-start gap-2.5 text-sm">
            <Switch
              checked={allowCitizenInitiated}
              onCheckedChange={(v) => {
                setAllowCitizenInitiated(v);
                push();
              }}
            />
            <div>
              <div className="font-medium">
                Autoriser les citoyens à initier un chat
              </div>
              <div className="text-[10px] text-muted-foreground">
                Si désactivé, seuls les agents peuvent démarrer. Les citoyens
                peuvent toujours répondre.
              </div>
            </div>
          </label>
        </div>
      </FlatCard>

      {/* ─── Routage standard ──────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              title="Standard (file d'attente)"
            />
            <Switch
              checked={standardEnabled}
              onCheckedChange={(v) => {
                setStandardEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Route automatiquement les threads non assignés vers un pool
            d'agents (type "Mr Ray"). Ce pool se configure dans l'onglet
            Agents.
          </p>
          {standardEnabled && (
            <Field>
              <FieldLabel>Stratégie d'assignation</FieldLabel>
              <Select
                value={fairAssignment}
                onValueChange={(v) => {
                  setFairAssignment(v as "round_robin" | "least_busy");
                  push();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">
                    Round-robin (tour à tour)
                  </SelectItem>
                  <SelectItem value="least_busy">
                    Le moins occupé (fewest active chats)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      </FlatCard>

      {/* ─── Pièces jointes ───────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<Paperclip className="h-4 w-4 text-purple-600" />}
              title="Pièces jointes"
            />
            <Switch
              checked={allowAttachments}
              onCheckedChange={(v) => {
                setAllowAttachments(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Autoriser l'envoi de fichiers dans les chats P2P.
          </p>
          {allowAttachments && (
            <Field>
              <FieldLabel>Taille max par fichier (Mo)</FieldLabel>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxAttachmentSize}
                onChange={(e) => {
                  setMaxAttachmentSize(Number(e.target.value));
                  push();
                }}
              />
            </Field>
          )}
        </div>
      </FlatCard>

      {/* ─── Auto-archivage ───────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Archive className="h-4 w-4 text-amber-600" />}
            title="Auto-archivage"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Archive automatiquement les threads inactifs pour garder la boîte
            propre. Les threads archivés restent accessibles en lecture.
          </p>
          <Field>
            <FieldLabel>Jours d'inactivité avant archivage</FieldLabel>
            <Input
              type="number"
              min={1}
              value={autoArchiveDays}
              onChange={(e) => {
                setAutoArchiveDays(
                  e.target.value === "" ? "" : Number(e.target.value),
                );
                push();
              }}
              placeholder="Jamais si vide"
            />
          </Field>
        </div>
      </FlatCard>
    </div>
  );
}

function ChatsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
