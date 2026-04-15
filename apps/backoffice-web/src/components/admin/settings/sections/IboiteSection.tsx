"use client";

/**
 * IboiteSection — Configuration iBoîte (messagerie interne par org)
 *
 * Couverture :
 *   - Tampons digitaux (cachet officiel, mention "COPIE", filigrane)
 *   - Signature électronique par défaut (HTML + image)
 *   - Templates de réponses rapides (accueil, refus, information, urgence)
 *   - Auto-répondeur (vacances, hors horaires)
 *
 * Pas de config domaine DNS externe (contrainte utilisateur : messagerie interne).
 */

import { api } from "@convex/_generated/api";
import { FileText, MessageCircle, Plus, Stamp, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { SettingsSectionProps } from "../SettingsTabsLayout";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";

type ReplyTemplate = {
  code: string;
  label: string;
  subject: string;
  bodyHtml: string;
  category?: "accueil" | "refus" | "information" | "urgence";
};

const TEMPLATE_CATEGORIES: Array<{
  value: "accueil" | "refus" | "information" | "urgence";
  label: string;
  color: string;
}> = [
  { value: "accueil", label: "Accueil", color: "bg-emerald-500/10 text-emerald-700" },
  { value: "information", label: "Information", color: "bg-blue-500/10 text-blue-700" },
  { value: "refus", label: "Refus", color: "bg-rose-500/10 text-rose-700" },
  { value: "urgence", label: "Urgence", color: "bg-amber-500/10 text-amber-700" },
];

export function IboiteSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateInternalMail } = useConvexMutationQuery(
    api.functions.orgs.updateInternalMailConfig,
  );

  const [signatureHtml, setSignatureHtml] = useState("");
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [autoResponderEnabled, setAutoResponderEnabled] = useState(false);
  const [autoResponderMessage, setAutoResponderMessage] = useState("");
  const [autoResponderStart, setAutoResponderStart] = useState("");
  const [autoResponderEnd, setAutoResponderEnd] = useState("");

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateInternalMail({
        orgId,
        internalMail: {
          defaultSignature: signatureHtml ? { html: signatureHtml } : undefined,
          replyTemplates: replyTemplates.length ? replyTemplates : undefined,
          autoResponder: autoResponderEnabled
            ? {
                enabled: true,
                message: autoResponderMessage,
                startAt: autoResponderStart
                  ? new Date(autoResponderStart).getTime()
                  : undefined,
                endAt: autoResponderEnd
                  ? new Date(autoResponderEnd).getTime()
                  : undefined,
              }
            : undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("iboite", dirty),
  });

  useRegisterSection("iboite", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const im = org.settings?.internalMail ?? {};
    setSignatureHtml(im.defaultSignature?.html ?? "");
    setReplyTemplates((im.replyTemplates ?? []) as ReplyTemplate[]);
    setAutoResponderEnabled(im.autoResponder?.enabled ?? false);
    setAutoResponderMessage(im.autoResponder?.message ?? "");
    setAutoResponderStart(
      im.autoResponder?.startAt
        ? new Date(im.autoResponder.startAt).toISOString().slice(0, 10)
        : "",
    );
    setAutoResponderEnd(
      im.autoResponder?.endAt
        ? new Date(im.autoResponder.endAt).toISOString().slice(0, 10)
        : "",
    );
  }, [org, hasPending]);

  const push = () => trigger();

  const addTemplate = () => {
    setReplyTemplates([
      ...replyTemplates,
      {
        code: `tmpl_${Date.now()}`,
        label: "Nouveau modèle",
        subject: "",
        bodyHtml: "",
      },
    ]);
    push();
  };

  const updateTemplate = (idx: number, patch: Partial<ReplyTemplate>) => {
    const next = replyTemplates.map((t, i) =>
      i === idx ? { ...t, ...patch } : t,
    );
    setReplyTemplates(next);
    push();
  };

  const removeTemplate = (idx: number) => {
    setReplyTemplates(replyTemplates.filter((_, i) => i !== idx));
    push();
  };

  if (isPending) return <IboiteSectionSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Signature électronique ───────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Stamp className="h-4 w-4 text-purple-600" />}
            title="Signature électronique par défaut"
          />
          <p className="text-xs text-muted-foreground mb-3">
            HTML de la signature qui sera appliquée en bas des messages envoyés
            depuis cette représentation.
          </p>
          <Textarea
            value={signatureHtml}
            onChange={(e) => {
              setSignatureHtml(e.target.value);
              push();
            }}
            rows={6}
            className="font-mono text-sm"
            placeholder={`<p><strong>Consulat du Gabon à Madrid</strong></p>\n<p>Calle Fortuny 16, 28010 Madrid</p>\n<p>📞 +34 91 234 56 78</p>`}
          />
          {signatureHtml && (
            <div className="mt-3 rounded-lg border border-border/50 p-3 bg-muted/20">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
                Aperçu
              </div>
              <div
                className="text-sm prose prose-sm max-w-none"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: preview utilisateur
                dangerouslySetInnerHTML={{ __html: signatureHtml }}
              />
            </div>
          )}
        </div>
      </FlatCard>

      {/* ─── Templates de réponses ────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<FileText className="h-4 w-4 text-blue-600" />}
              title="Modèles de réponses rapides"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={addTemplate}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter un modèle
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Modèles utilisables par les agents pour répondre rapidement aux
            messages fréquents.
          </p>

          {replyTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucun modèle configuré
            </p>
          ) : (
            <ul className="space-y-3">
              {replyTemplates.map((tmpl, idx) => (
                <li
                  key={tmpl.code}
                  className="border border-border/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <Field className="flex-1">
                      <FieldLabel className="text-xs">Libellé</FieldLabel>
                      <Input
                        value={tmpl.label}
                        onChange={(e) =>
                          updateTemplate(idx, { label: e.target.value })
                        }
                        placeholder="Ex : Confirmation rendez-vous"
                      />
                    </Field>
                    <Field className="w-40">
                      <FieldLabel className="text-xs">Catégorie</FieldLabel>
                      <Select
                        value={tmpl.category ?? ""}
                        onValueChange={(v) =>
                          updateTemplate(idx, {
                            category: v as ReplyTemplate["category"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeTemplate(idx)}
                      className="text-destructive hover:text-destructive mt-5"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Field>
                    <FieldLabel className="text-xs">Objet</FieldLabel>
                    <Input
                      value={tmpl.subject}
                      onChange={(e) =>
                        updateTemplate(idx, { subject: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Corps (HTML)</FieldLabel>
                    <Textarea
                      value={tmpl.bodyHtml}
                      onChange={(e) =>
                        updateTemplate(idx, { bodyHtml: e.target.value })
                      }
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </Field>
                  {tmpl.category && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        TEMPLATE_CATEGORIES.find((c) => c.value === tmpl.category)
                          ?.color,
                      )}
                    >
                      {
                        TEMPLATE_CATEGORIES.find((c) => c.value === tmpl.category)
                          ?.label
                      }
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </FlatCard>

      {/* ─── Auto-répondeur ───────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<MessageCircle className="h-4 w-4 text-amber-600" />}
              title="Auto-répondeur (absence)"
            />
            <Switch
              checked={autoResponderEnabled}
              onCheckedChange={(v) => {
                setAutoResponderEnabled(v);
                push();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Message automatique envoyé aux citoyens pendant les périodes
            d'absence (congés, événement diplomatique).
          </p>
          {autoResponderEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Début (optionnel)</FieldLabel>
                  <Input
                    type="date"
                    value={autoResponderStart}
                    onChange={(e) => {
                      setAutoResponderStart(e.target.value);
                      push();
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Fin (optionnel)</FieldLabel>
                  <Input
                    type="date"
                    value={autoResponderEnd}
                    onChange={(e) => {
                      setAutoResponderEnd(e.target.value);
                      push();
                    }}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Message</FieldLabel>
                <Textarea
                  value={autoResponderMessage}
                  onChange={(e) => {
                    setAutoResponderMessage(e.target.value);
                    push();
                  }}
                  rows={4}
                  placeholder="Le consulat est fermé du 20 décembre au 3 janvier. Votre message sera traité dès la réouverture."
                />
              </Field>
              <p className="text-[10px] text-muted-foreground italic">
                Limité à un envoi par expéditeur toutes les 24h pour éviter le spam.
              </p>
            </div>
          )}
        </div>
      </FlatCard>
    </div>
  );
}

function IboiteSectionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
