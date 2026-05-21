"use client";

/**
 * IAstedSection — Configuration du chatbot iAsted par représentation (Phase 3)
 *
 * Couverture :
 *   - Persona (nom, ton, signature)
 *   - System prompt suffix (instructions contextuelles)
 *   - Tools policy (whitelist / blacklist / all)
 *   - Langues supportées
 *   - Disponibilité (always / business hours / custom / disabled)
 *   - Escalation (keywords + sentiment + handoff vers callLine/agent)
 *   - Mémoire (retention, learn from conversations)
 *   - Quotas (messages / citoyen / jour, tokens total)
 *
 * Synergie : l'escalation peut handoff vers une callLine existante (onglet iAppel)
 * ou vers des memberships spécifiques.
 */

import { api } from "@convex/_generated/api";
import { Bot, Clock, Languages, Rocket, Settings2, ShieldAlert, Sparkles, User2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type Tone = "formel" | "professionnel" | "chaleureux" | "concis";
type AvailabilityMode = "always" | "business_hours" | "custom_schedule" | "disabled";
type ToolsMode = "whitelist" | "blacklist" | "all";
type SentimentTrigger = "negative_only" | "frustrated" | "never";
type HandoffType = "call_line" | "membership" | "chat_standard";

const TONE_OPTIONS: Array<{ value: Tone; label: string; description: string }> = [
  { value: "formel", label: "Formel", description: "Vouvoiement strict, langage diplomatique" },
  { value: "professionnel", label: "Professionnel", description: "Équilibré, neutre (par défaut)" },
  { value: "chaleureux", label: "Chaleureux", description: "Accueillant et empathique" },
  { value: "concis", label: "Concis", description: "Réponses courtes et directes" },
];

const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

export function IAstedSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: config, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgIAstedConfig.getByOrgId,
    { orgId },
  );

  const { data: toolsCatalog } = useAuthenticatedConvexQuery(
    api.functions.orgIAstedConfig.listToolsCatalog,
    {},
  );

  const { data: callLines } = useAuthenticatedConvexQuery(
    api.functions.callLines.listByOrg,
    { orgId },
  );

  const { mutateAsync: initializeDefaults } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.initializeDefaults,
  );
  const { mutateAsync: updatePersona } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.updatePersona,
  );
  const { mutateAsync: updatePrompt } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.updatePrompt,
  );
  const { mutateAsync: updateToolsPolicy } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.updateToolsPolicy,
  );
  const { mutateAsync: updateBehavior } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.updateBehavior,
  );
  const { mutateAsync: setActive } = useConvexMutationQuery(
    api.functions.orgIAstedConfig.setActive,
  );

  // Persona
  const [personaName, setPersonaName] = useState("");
  const [tone, setTone] = useState<Tone>("professionnel");
  const [signature, setSignature] = useState("");

  // Prompt
  const [systemPromptSuffix, setSystemPromptSuffix] = useState("");
  const [customProcedures, setCustomProcedures] = useState("");

  // Tools
  const [toolsMode, setToolsMode] = useState<ToolsMode>("all");
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);

  // Langues
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(["fr", "en"]);
  const [defaultLanguage, setDefaultLanguage] = useState("fr");
  const [autoDetect, setAutoDetect] = useState(true);

  // Disponibilité
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>("always");
  const [outOfHoursMessage, setOutOfHoursMessage] = useState("");

  // Escalation
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [triggerKeywordInput, setTriggerKeywordInput] = useState("");
  const [triggerSentiment, setTriggerSentiment] =
    useState<SentimentTrigger>("negative_only");
  const [maxTurns, setMaxTurns] = useState(8);
  const [handoffType, setHandoffType] = useState<HandoffType>("chat_standard");
  const [handoffCallLineId, setHandoffCallLineId] = useState<string>("");
  const [handoffMessage, setHandoffMessage] = useState("");

  // Mémoire
  const [retentionDays, setRetentionDays] = useState(90);
  const [learnFromConv, setLearnFromConv] = useState(false);

  // Quotas
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState<number | "">("");
  const [maxTokensPerDay, setMaxTokensPerDay] = useState<number | "">("");
  const [alertPercent, setAlertPercent] = useState(80);

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  // On utilise une ref au lieu de combinedHasPending dans les deps pour éviter
  // de déclencher l'effet sur chaque tick du statut debounced.
  useEffect(() => {
    if (!config) return;
    // Référence indirecte pour lire hasPending sans créer de dépendance instable
    // (combinedHasPending est recréé à chaque render).
    const pending =
      hasPendingPersona() ||
      hasPendingPrompt() ||
      hasPendingTools() ||
      hasPendingBehavior();
    if (pending) return;
    setPersonaName(config.persona.name);
    setTone(config.persona.tone as Tone);
    setSignature(config.persona.signature ?? "");
    setSystemPromptSuffix(config.systemPromptSuffix);
    setCustomProcedures(config.customProcedures ?? "");
    setToolsMode(config.toolsPolicy.mode as ToolsMode);
    setEnabledTools(config.toolsPolicy.enabledTools);
    setDisabledTools(config.toolsPolicy.disabledTools);
    setSupportedLanguages(config.languages.supported);
    setDefaultLanguage(config.languages.default);
    setAutoDetect(config.languages.autoDetect);
    setAvailabilityMode(config.availability.mode as AvailabilityMode);
    setOutOfHoursMessage(config.availability.outOfHoursMessage ?? "");
    setTriggerKeywords(config.escalation.triggerKeywords);
    setTriggerSentiment(config.escalation.triggerSentiment as SentimentTrigger);
    setMaxTurns(config.escalation.maxTurnsBeforeSuggestHandoff);
    setHandoffType(config.escalation.handoffTarget.type as HandoffType);
    setHandoffCallLineId(
      (config.escalation.handoffTarget.callLineId as string | undefined) ?? "",
    );
    setHandoffMessage(config.escalation.handoffMessage);
    setRetentionDays(config.memory.conversationRetentionDays);
    setLearnFromConv(config.memory.learnFromConversations);
    setMaxMessagesPerDay(config.quotas?.maxMessagesPerCitizenPerDay ?? "");
    setMaxTokensPerDay(config.quotas?.maxTokensPerDayTotal ?? "");
    setAlertPercent(config.quotas?.alertAtPercent ?? 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Auto-save persona (sous-hook #1)
  const {
    trigger: triggerPersona,
    flush: flushPersona,
    hasPending: hasPendingPersona,
    status: statusPersona,
    errorMessage: errorPersona,
  } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updatePersona({
        orgId,
        persona: {
          name: personaName,
          tone,
          signature: signature || undefined,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("iasted", dirty),
  });

  // Auto-save prompt (sous-hook #2)
  const {
    trigger: triggerPrompt,
    flush: flushPrompt,
    hasPending: hasPendingPrompt,
    status: statusPrompt,
    errorMessage: errorPrompt,
  } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updatePrompt({
        orgId,
        systemPromptSuffix,
        customProcedures: customProcedures || undefined,
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("iasted", dirty),
  });

  // Auto-save tools (sous-hook #3)
  const {
    trigger: triggerTools,
    flush: flushTools,
    hasPending: hasPendingTools,
    status: statusTools,
    errorMessage: errorTools,
  } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateToolsPolicy({
        orgId,
        toolsPolicy: {
          mode: toolsMode,
          enabledTools,
          disabledTools,
          citizenOnlyTools: [],
          agentOnlyTools: [],
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("iasted", dirty),
  });

  // Auto-save behavior (langues, dispo, escalation, mémoire, quotas) (sous-hook #4)
  const {
    trigger: triggerBehavior,
    flush: flushBehavior,
    hasPending: hasPendingBehavior,
    status: statusBehavior,
    errorMessage: errorBehavior,
  } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateBehavior({
        orgId,
        languages: {
          supported: supportedLanguages,
          default: defaultLanguage,
          autoDetect,
        },
        availability: {
          mode: availabilityMode,
          outOfHoursMessage: outOfHoursMessage || undefined,
          outOfHoursAction: "show_message",
        },
        escalation: {
          triggerKeywords,
          triggerSentiment,
          maxTurnsBeforeSuggestHandoff: maxTurns,
          handoffTarget: {
            type: handoffType,
            callLineId:
              handoffType === "call_line" && handoffCallLineId
                ? (handoffCallLineId as any)
                : undefined,
          },
          handoffMessage,
        },
        memory: {
          conversationRetentionDays: retentionDays,
          learnFromConversations: learnFromConv,
          shareAnalyticsWithPlatform: true,
        },
        quotas: {
          maxMessagesPerCitizenPerDay:
            typeof maxMessagesPerDay === "number" ? maxMessagesPerDay : undefined,
          maxTokensPerDayTotal:
            typeof maxTokensPerDay === "number" ? maxTokensPerDay : undefined,
          alertAtPercent: alertPercent,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("iasted", dirty),
  });

  // Composition des 4 sous-hooks en un flush/hasPending/status unifiés
  const combinedFlush = async () => {
    await Promise.all([
      flushPersona(),
      flushPrompt(),
      flushTools(),
      flushBehavior(),
    ]);
  };
  const combinedHasPending = () =>
    hasPendingPersona() ||
    hasPendingPrompt() ||
    hasPendingTools() ||
    hasPendingBehavior();
  const combinedStatus =
    [statusPersona, statusPrompt, statusTools, statusBehavior].includes("error")
      ? "error"
      : [statusPersona, statusPrompt, statusTools, statusBehavior].includes("saving")
      ? "saving"
      : [statusPersona, statusPrompt, statusTools, statusBehavior].includes("saved")
      ? "saved"
      : "idle";
  const combinedErrorMessage =
    errorPersona ?? errorPrompt ?? errorTools ?? errorBehavior;

  useRegisterSection("iasted", {
    flush: combinedFlush,
    hasPending: combinedHasPending,
    status: combinedStatus,
    errorMessage: combinedErrorMessage,
  });

  const addKeyword = () => {
    const k = triggerKeywordInput.trim();
    if (k && !triggerKeywords.includes(k)) {
      setTriggerKeywords([...triggerKeywords, k]);
      setTriggerKeywordInput("");
      triggerBehavior();
    }
  };

  const removeKeyword = (k: string) => {
    setTriggerKeywords(triggerKeywords.filter((x) => x !== k));
    triggerBehavior();
  };

  const toggleLanguage = (code: string) => {
    const next = supportedLanguages.includes(code)
      ? supportedLanguages.filter((c) => c !== code)
      : [...supportedLanguages, code];
    setSupportedLanguages(next);
    triggerBehavior();
  };

  const toggleTool = (code: string) => {
    if (toolsMode === "whitelist") {
      const next = enabledTools.includes(code)
        ? enabledTools.filter((c) => c !== code)
        : [...enabledTools, code];
      setEnabledTools(next);
      triggerTools();
    } else if (toolsMode === "blacklist") {
      const next = disabledTools.includes(code)
        ? disabledTools.filter((c) => c !== code)
        : [...disabledTools, code];
      setDisabledTools(next);
      triggerTools();
    }
  };

  const isToolActive = (code: string): boolean => {
    if (toolsMode === "all") return true;
    if (toolsMode === "whitelist") return enabledTools.includes(code);
    return !disabledTools.includes(code);
  };

  const handleInitialize = async () => {
    onStatusChange?.("saving");
    try {
      await initializeDefaults({ orgId });
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleToggleActive = async () => {
    if (!config) return;
    onStatusChange?.("saving");
    try {
      await setActive({ orgId, isActive: !config.isActive });
      onStatusChange?.("saved");
      setTimeout(() => onStatusChange?.("idle"), 1500);
    } catch (err) {
      onStatusChange?.("error", err instanceof Error ? err.message : "Erreur");
    }
  };

  if (isPending) return <IAstedSkeleton />;

  // Première utilisation : pas de config
  if (!config) {
    return (
      <FlatCard>
        <div className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-1">
              Initialiser iAsted pour cette représentation
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure une persona par défaut (Astedia), les tools standards et
              une disponibilité 24/7. Tout est personnalisable après.
            </p>
          </div>
          <Button onClick={handleInitialize}>
            <Rocket className="h-4 w-4 mr-2" />
            Initialiser iAsted
          </Button>
        </div>
      </FlatCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Activation globale ────────────────────────── */}
      <FlatCard>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-lg p-2",
                config.isActive ? "bg-indigo-500/10" : "bg-muted",
              )}
            >
              <Bot
                className={cn(
                  "h-4 w-4",
                  config.isActive ? "text-indigo-600" : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <h3 className="font-medium text-sm">iAsted</h3>
              <p className="text-xs text-muted-foreground">
                {config.isActive ? "Assistant actif" : "Assistant désactivé"} —
                {config.persona.name}
              </p>
            </div>
          </div>
          <Switch checked={config.isActive} onCheckedChange={handleToggleActive} />
        </div>
      </FlatCard>

      {/* ─── Persona ────────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<User2 className="h-4 w-4 text-indigo-600" />}
              title="Persona"
            />
            <HelpTooltip content={HELP.iasted.persona} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Identité et style de l'assistant vu par les citoyens.
          </p>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Nom de l'assistant</FieldLabel>
              <Input
                value={personaName}
                onChange={(e) => {
                  setPersonaName(e.target.value);
                  triggerPersona();
                }}
                placeholder="Astedia Madrid"
              />
            </Field>
            <Field>
              <FieldLabel>Ton de conversation</FieldLabel>
              <Select
                value={tone}
                onValueChange={(v) => {
                  setTone(v as Tone);
                  triggerPersona();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Phrase de signature (optionnel)</FieldLabel>
              <Input
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  triggerPersona();
                }}
                placeholder="— Astedia, votre assistante virtuelle du Consulat"
              />
            </Field>
          </div>
        </div>
      </FlatCard>

      {/* ─── Prompt & Instructions ─────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Settings2 className="h-4 w-4 text-blue-600" />}
              title="Instructions contextuelles"
            />
            <HelpTooltip content={HELP.iasted.systemPrompt} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Instructions Markdown ajoutées au prompt système de Gemini à chaque
            conversation. Permet de contextualiser pour cette représentation.
          </p>
          <div className="space-y-3">
            <Field>
              <FieldLabel>System prompt (suffixe)</FieldLabel>
              <Textarea
                value={systemPromptSuffix}
                onChange={(e) => {
                  setSystemPromptSuffix(e.target.value);
                  triggerPrompt();
                }}
                rows={4}
                placeholder="Tu es l'assistant du Consulat du Gabon à Madrid. Tu aides les ressortissants gabonais en Espagne avec leurs démarches consulaires."
              />
            </Field>
            <Field>
              <FieldLabel>Procédures locales (Markdown)</FieldLabel>
              <Textarea
                value={customProcedures}
                onChange={(e) => {
                  setCustomProcedures(e.target.value);
                  triggerPrompt();
                }}
                rows={6}
                className="font-mono text-xs"
                placeholder={`# Spécificités locales\n- Les passeports sont délivrés en 15 jours ouvrés\n- Le RDV est obligatoire pour toutes les demandes\n- Service d'urgence disponible 24/7 au +34…`}
              />
            </Field>
          </div>
        </div>
      </FlatCard>

      {/* ─── Tools policy ──────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Wrench className="h-4 w-4 text-purple-600" />}
              title="Tools autorisés"
            />
            <HelpTooltip content={HELP.iasted.toolsPolicy} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Contrôle les fonctionnalités que l'assistant peut utiliser. Le mode
            whitelist active uniquement les tools cochés; le mode blacklist
            désactive ceux cochés.
          </p>
          <Field className="mb-3">
            <FieldLabel>Mode de filtrage</FieldLabel>
            <Select
              value={toolsMode}
              onValueChange={(v) => {
                setToolsMode(v as ToolsMode);
                triggerTools();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tools activés</SelectItem>
                <SelectItem value="whitelist">
                  Whitelist (cocher les autorisés)
                </SelectItem>
                <SelectItem value="blacklist">
                  Blacklist (cocher les interdits)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {toolsMode !== "all" && toolsCatalog && (
            <div className="space-y-3">
              {toolsCatalog.map((cat: any) => (
                <div key={cat.category}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {cat.categoryLabelFr}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {cat.tools.map((tool: any) => {
                      const active = isToolActive(tool.code);
                      const checked =
                        toolsMode === "whitelist"
                          ? enabledTools.includes(tool.code)
                          : disabledTools.includes(tool.code);
                      return (
                        <label
                          key={tool.code}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded text-sm border transition-colors cursor-pointer",
                            active
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-border/50 opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleTool(tool.code)}
                          />
                          <span className="flex-1">{tool.labelFr}</span>
                          <code className="text-[9px] text-muted-foreground">
                            {tool.code}
                          </code>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FlatCard>

      {/* ─── Langues ───────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Languages className="h-4 w-4 text-emerald-600" />}
            title="Langues supportées"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {LANGUAGE_OPTIONS.map((lang) => (
              <label
                key={lang.code}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm cursor-pointer",
                  supportedLanguages.includes(lang.code)
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/50 hover:bg-muted/50",
                )}
              >
                <Checkbox
                  checked={supportedLanguages.includes(lang.code)}
                  onCheckedChange={() => toggleLanguage(lang.code)}
                />
                {lang.label}
              </label>
            ))}
          </div>
          <Field className="mt-3">
            <FieldLabel>Langue par défaut</FieldLabel>
            <Select
              value={defaultLanguage}
              onValueChange={(v) => {
                setDefaultLanguage(v);
                triggerBehavior();
              }}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.filter((l) =>
                  supportedLanguages.includes(l.code),
                ).map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm mt-3">
            <Switch
              checked={autoDetect}
              onCheckedChange={(v) => {
                setAutoDetect(v);
                triggerBehavior();
              }}
            />
            Détection automatique de la langue du citoyen
          </label>
        </div>
      </FlatCard>

      {/* ─── Disponibilité ─────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            title="Disponibilité"
          />
          <Field className="mb-3">
            <FieldLabel>Mode</FieldLabel>
            <Select
              value={availabilityMode}
              onValueChange={(v) => {
                setAvailabilityMode(v as AvailabilityMode);
                triggerBehavior();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Toujours disponible (24/7)</SelectItem>
                <SelectItem value="business_hours">
                  Selon les horaires d'ouverture de la représentation
                </SelectItem>
                <SelectItem value="custom_schedule">
                  Horaires personnalisés
                </SelectItem>
                <SelectItem value="disabled">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(availabilityMode === "business_hours" ||
            availabilityMode === "custom_schedule") && (
            <Field>
              <FieldLabel>Message hors horaires</FieldLabel>
              <Textarea
                value={outOfHoursMessage}
                onChange={(e) => {
                  setOutOfHoursMessage(e.target.value);
                  triggerBehavior();
                }}
                rows={3}
                placeholder="L'assistant est disponible durant nos heures d'ouverture. Vous pouvez nous laisser un message que nous traiterons dès notre retour."
              />
            </Field>
          )}
        </div>
      </FlatCard>

      {/* ─── Escalation ─────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<ShieldAlert className="h-4 w-4 text-rose-600" />}
              title="Escalation vers un agent humain"
            />
            <HelpTooltip content={HELP.iasted.escalation} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Déclenche une proposition de handoff vers un agent selon keywords,
            sentiment ou nombre de tours infructueux.
          </p>

          <div className="space-y-3">
            <Field>
              <FieldLabel>Mots-clés déclencheurs</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={triggerKeywordInput}
                  onChange={(e) => setTriggerKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="urgence, plainte, réclamation…"
                />
                <Button onClick={addKeyword} size="sm" type="button">
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {triggerKeywords.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1">
                    {k}
                    <button
                      type="button"
                      onClick={() => removeKeyword(k)}
                      className="ml-1 opacity-60 hover:opacity-100"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel>Sentiment déclencheur</FieldLabel>
              <Select
                value={triggerSentiment}
                onValueChange={(v) => {
                  setTriggerSentiment(v as SentimentTrigger);
                  triggerBehavior();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Jamais (mots-clés seulement)</SelectItem>
                  <SelectItem value="negative_only">Sentiment négatif</SelectItem>
                  <SelectItem value="frustrated">
                    Frustration détectée (agressif)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Proposer handoff après N tours</FieldLabel>
              <Input
                type="number"
                min={1}
                max={30}
                value={maxTurns}
                onChange={(e) => {
                  setMaxTurns(Number(e.target.value));
                  triggerBehavior();
                }}
              />
            </Field>

            <Field>
              <FieldLabel>Cible du handoff</FieldLabel>
              <Select
                value={handoffType}
                onValueChange={(v) => {
                  setHandoffType(v as HandoffType);
                  triggerBehavior();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat_standard">
                    Chat standard (pool d'agents)
                  </SelectItem>
                  <SelectItem value="call_line">
                    Appel vers une ligne spécifique
                  </SelectItem>
                  <SelectItem value="membership">
                    Agent(s) spécifique(s)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {handoffType === "call_line" && callLines && (
              <Field>
                <FieldLabel>Ligne d'appel</FieldLabel>
                <Select
                  value={handoffCallLineId}
                  onValueChange={(v) => {
                    setHandoffCallLineId(v);
                    triggerBehavior();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une ligne…" />
                  </SelectTrigger>
                  <SelectContent>
                    {callLines.map((line: any) => (
                      <SelectItem key={line._id} value={line._id}>
                        {line.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel>Message montré au citoyen avant handoff</FieldLabel>
              <Textarea
                value={handoffMessage}
                onChange={(e) => {
                  setHandoffMessage(e.target.value);
                  triggerBehavior();
                }}
                rows={2}
                placeholder="Je vous propose de parler directement avec un de nos agents. Un instant s'il vous plaît…"
              />
            </Field>
          </div>
        </div>
      </FlatCard>

      {/* ─── Mémoire ───────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Settings2 className="h-4 w-4 text-slate-600" />}
            title="Mémoire & Confidentialité"
          />
          <div className="space-y-3">
            <Field>
              <FieldLabel>Rétention des conversations (jours)</FieldLabel>
              <Select
                value={String(retentionDays)}
                onValueChange={(v) => {
                  setRetentionDays(Number(v));
                  triggerBehavior();
                }}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours (par défaut)</SelectItem>
                  <SelectItem value="180">180 jours</SelectItem>
                  <SelectItem value="365">1 an</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-start gap-2.5 text-sm">
              <Switch
                checked={learnFromConv}
                onCheckedChange={(v) => {
                  setLearnFromConv(v);
                  triggerBehavior();
                }}
              />
              <div>
                <div className="font-medium">
                  Apprendre des conversations
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Utilise l'historique pour améliorer les réponses (opt-in).
                </div>
              </div>
            </label>
          </div>
        </div>
      </FlatCard>

      {/* ─── Quotas ────────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Rocket className="h-4 w-4 text-indigo-600" />}
              title="Quotas & Limites"
            />
            <HelpTooltip content={HELP.iasted.quotas} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Protège contre les abus et contrôle les coûts LLM.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Messages / citoyen / jour</FieldLabel>
              <Input
                type="number"
                min={1}
                value={maxMessagesPerDay}
                onChange={(e) => {
                  setMaxMessagesPerDay(
                    e.target.value === "" ? "" : Number(e.target.value),
                  );
                  triggerBehavior();
                }}
                placeholder="Illimité"
              />
            </Field>
            <Field>
              <FieldLabel>Tokens / jour (total org)</FieldLabel>
              <Input
                type="number"
                min={1}
                value={maxTokensPerDay}
                onChange={(e) => {
                  setMaxTokensPerDay(
                    e.target.value === "" ? "" : Number(e.target.value),
                  );
                  triggerBehavior();
                }}
                placeholder="Illimité"
              />
            </Field>
          </div>
          <Field className="mt-3">
            <FieldLabel>Alerte à % du quota ({alertPercent}%)</FieldLabel>
            <Input
              type="range"
              min={50}
              max={100}
              value={alertPercent}
              onChange={(e) => {
                setAlertPercent(Number(e.target.value));
                triggerBehavior();
              }}
            />
          </Field>
        </div>
      </FlatCard>
    </div>
  );
}

function IAstedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
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
