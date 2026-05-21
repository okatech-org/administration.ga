"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	CAPABILITY_CODES,
	CAPABILITY_REGISTRY,
	type CapabilityCode,
} from "@convex/ai/capabilityRegistry";
import {
	Bot,
	Check,
	ChevronDown,
	ChevronRight,
	Loader2,
	RotateCcw,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type Sensitivity = "low" | "medium" | "high";

const DEFAULT_MODEL_TOKEN = "__default__";

interface CapabilityFormState {
	enabled: boolean;
	autoApplyAllowed: boolean;
	maxSensitivity: Sensitivity;
	modelOverride: string;
	dailyBudgetMicroCents: string;
}

interface OrgAIAssistantSectionProps {
	orgId: Id<"orgs">;
	lang?: string;
}

const DEFAULT_CAP_STATE: CapabilityFormState = {
	enabled: false,
	autoApplyAllowed: false,
	maxSensitivity: "medium",
	modelOverride: DEFAULT_MODEL_TOKEN,
	dailyBudgetMicroCents: "",
};

const SENSITIVITY_OPTIONS: Array<{ value: Sensitivity; label: { fr: string; en: string } }> = [
	{ value: "low", label: { fr: "Faible (cas clairs)", en: "Low (clear cases)" } },
	{ value: "medium", label: { fr: "Moyenne (équilibre)", en: "Medium (balanced)" } },
	{ value: "high", label: { fr: "Élevée (plus proactif)", en: "High (more proactive)" } },
];

const MODEL_OVERRIDE_OPTIONS = [
	{ value: DEFAULT_MODEL_TOKEN, label: { fr: "Par défaut (registre)", en: "Default (registry)" } },
	{ value: "gemini-2.5-flash", label: { fr: "Gemini 2.5 Flash", en: "Gemini 2.5 Flash" } },
	{ value: "claude-sonnet-4-6", label: { fr: "Claude Sonnet 4.6", en: "Claude Sonnet 4.6" } },
];

const CAPABILITY_LABELS: Record<CapabilityCode, { fr: string; en: string }> = {
	request_triage: { fr: "Triage des demandes", en: "Request triage" },
	document_analysis: { fr: "Analyse documentaire", en: "Document analysis" },
	document_drafting: { fr: "Rédaction de documents", en: "Document drafting" },
	auto_summary: { fr: "Résumés automatiques", en: "Auto summaries" },
	next_step_suggestion: { fr: "Prochaine étape", en: "Next step" },
	risk_detection: { fr: "Détection de risque", en: "Risk detection" },
	proactive_notifications: { fr: "Notifications proactives", en: "Proactive notifications" },
	voice_assist: { fr: "Assistant vocal", en: "Voice assist" },
	bulk_actions_helper: { fr: "Actions groupées", en: "Bulk actions helper" },
	correspondance_drafting: { fr: "Rédaction courriers", en: "Correspondence drafting" },
	meeting_prep: { fr: "Préparation réunion", en: "Meeting prep" },
	compliance_check: { fr: "Vérification conformité", en: "Compliance check" },
};

function formatBudgetInput(value: number | undefined): string {
	if (value === undefined || value === null) return "";
	return String(value);
}

function parseBudgetInput(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const num = Number(trimmed);
	if (!Number.isFinite(num) || num < 0) return undefined;
	return Math.floor(num);
}

export function OrgAIAssistantSection({ orgId, lang: langProp }: OrgAIAssistantSectionProps) {
	const { i18n } = useTranslation();
	const lang = (langProp === "fr" || langProp === "en"
		? langProp
		: i18n.language === "fr"
			? "fr"
			: "en") as "fr" | "en";

	const { data: orgConfigs, isPending } = useAuthenticatedConvexQuery(
		api.ai.preferences.getOrgCapabilityConfigs,
		{ orgId },
	);

	const { mutateAsync: upsertConfig, isPending: isSaving } = useConvexMutationQuery(
		api.ai.preferences.upsertCapabilityConfig,
	);

	const initialState = useMemo<Record<CapabilityCode, CapabilityFormState>>(() => {
		const map: Partial<Record<CapabilityCode, CapabilityFormState>> = {};
		const list = orgConfigs ?? [];
		for (const code of CAPABILITY_CODES) {
			const existing = list.find((c) => c.capabilityCode === code);
			if (existing) {
				map[code] = {
					enabled: existing.enabled,
					autoApplyAllowed: existing.autoApplyAllowed,
					maxSensitivity: existing.maxSensitivity as Sensitivity,
					modelOverride: existing.modelOverride ?? DEFAULT_MODEL_TOKEN,
					dailyBudgetMicroCents: formatBudgetInput(existing.dailyBudgetMicroCents),
				};
			} else {
				map[code] = { ...DEFAULT_CAP_STATE };
			}
		}
		return map as Record<CapabilityCode, CapabilityFormState>;
	}, [orgConfigs]);

	const [formState, setFormState] =
		useState<Record<CapabilityCode, CapabilityFormState>>(initialState);
	const [dirty, setDirty] = useState<Set<CapabilityCode>>(new Set());
	const [expanded, setExpanded] = useState<Set<CapabilityCode>>(new Set());

	useEffect(() => {
		setFormState(initialState);
		setDirty(new Set());
	}, [initialState]);

	const updateCap = useCallback(
		(code: CapabilityCode, patch: Partial<CapabilityFormState>) => {
			setFormState((prev) => ({
				...prev,
				[code]: { ...prev[code], ...patch },
			}));
			setDirty((prev) => {
				const next = new Set(prev);
				next.add(code);
				return next;
			});
		},
		[],
	);

	const toggleExpand = useCallback((code: CapabilityCode) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(code)) next.delete(code);
			else next.add(code);
			return next;
		});
	}, []);

	const handleSaveCap = useCallback(
		async (code: CapabilityCode) => {
			const state = formState[code];
			const def = CAPABILITY_REGISTRY[code];
			const autoApplyAllowed = def.supportsAutoApply && state.autoApplyAllowed;
			try {
				await upsertConfig({
					orgId,
					capabilityCode: code,
					enabled: state.enabled,
					autoApplyAllowed,
					maxSensitivity: state.maxSensitivity,
					modelOverride:
						state.modelOverride === DEFAULT_MODEL_TOKEN
							? undefined
							: state.modelOverride,
					dailyBudgetMicroCents: parseBudgetInput(state.dailyBudgetMicroCents),
				});
				setDirty((prev) => {
					const next = new Set(prev);
					next.delete(code);
					return next;
				});
				toast.success(lang === "fr" ? "Capacité mise à jour" : "Capability updated");
			} catch (e) {
				toast.error((e as Error).message);
			}
		},
		[formState, lang, orgId, upsertConfig],
	);

	const handleResetCap = useCallback(
		(code: CapabilityCode) => {
			setFormState((prev) => ({
				...prev,
				[code]: initialState[code] ?? DEFAULT_CAP_STATE,
			}));
			setDirty((prev) => {
				const next = new Set(prev);
				next.delete(code);
				return next;
			});
		},
		[initialState],
	);

	const enabledCount = Object.values(formState).filter((c) => c.enabled).length;

	return (
		<div className="mt-3 pt-3 border-t border-border/30">
			<div className="flex items-center justify-between mb-2">
				<p className="text-[10px] font-semibold uppercase text-muted-foreground">
					{lang === "fr"
						? `Capacités IA (${enabledCount}/${CAPABILITY_CODES.length})`
						: `AI capabilities (${enabledCount}/${CAPABILITY_CODES.length})`}
				</p>
				{dirty.size > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setFormState(initialState);
							setDirty(new Set());
						}}
						className="h-6 text-[10px] gap-1"
					>
						<RotateCcw className="h-3 w-3" />
						{lang === "fr" ? "Tout annuler" : "Reset all"}
					</Button>
				)}
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="grid gap-1.5">
					{CAPABILITY_CODES.map((code) => {
						const def = CAPABILITY_REGISTRY[code];
						const state = formState[code] ?? DEFAULT_CAP_STATE;
						const isDirty = dirty.has(code);
						const isExpanded = expanded.has(code);
						const labels = CAPABILITY_LABELS[code];
						const isAnthropic = def.provider === "anthropic";

						return (
							<div
								key={code}
								className={cn(
									"rounded-md border transition-colors",
									state.enabled
										? "border-border bg-background"
										: "border-border/40 bg-muted/20",
								)}
							>
								<div className="flex items-center gap-2 px-2.5 py-1.5">
									<button
										type="button"
										onClick={() => toggleExpand(code)}
										className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
									>
										{isExpanded ? (
											<ChevronDown className="h-3.5 w-3.5" />
										) : (
											<ChevronRight className="h-3.5 w-3.5" />
										)}
									</button>
									<Bot
										className={cn(
											"h-3.5 w-3.5 shrink-0",
											isAnthropic ? "text-violet-600" : "text-sky-600",
										)}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="text-xs font-medium truncate">
												{labels[lang]}
											</span>
											<Badge variant="outline" className="text-[9px] h-4 px-1">
												{def.provider}
											</Badge>
											{def.supportsAutoApply && (
												<Badge variant="outline" className="text-[9px] h-4 px-1">
													auto
												</Badge>
											)}
										</div>
									</div>
									{isDirty && (
										<Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
											{lang === "fr" ? "modifié" : "changed"}
										</Badge>
									)}
									<Switch
										checked={state.enabled}
										onCheckedChange={(v) => updateCap(code, { enabled: v })}
										disabled={isSaving}
										className="shrink-0"
									/>
								</div>

								{isExpanded && (
									<div className="px-3 pb-3 pt-0 border-t border-border/20 space-y-3">
										<p className="text-[10px] text-muted-foreground pt-2">
											{def.description[lang]}
										</p>

										{state.enabled && (
											<>
												{def.supportsAutoApply && (
													<div className="flex items-center justify-between gap-2">
														<div className="min-w-0">
															<Label className="text-xs font-medium">
																{lang === "fr"
																	? "Autoriser auto-apply"
																	: "Allow auto-apply"}
															</Label>
															<p className="text-[10px] text-muted-foreground mt-0.5">
																{lang === "fr"
																	? "Les agents pourront activer l'exécution automatique."
																	: "Agents will be able to enable auto execution."}
															</p>
														</div>
														<Switch
															checked={state.autoApplyAllowed}
															onCheckedChange={(v) =>
																updateCap(code, { autoApplyAllowed: v })
															}
															disabled={isSaving}
														/>
													</div>
												)}

												<div className="grid gap-1">
													<Label className="text-[10px] font-semibold uppercase text-muted-foreground">
														{lang === "fr" ? "Sensibilité max" : "Max sensitivity"}
													</Label>
													<Select
														value={state.maxSensitivity}
														onValueChange={(v) =>
															updateCap(code, {
																maxSensitivity: v as Sensitivity,
															})
														}
														disabled={isSaving}
													>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{SENSITIVITY_OPTIONS.map((opt) => (
																<SelectItem
																	key={opt.value}
																	value={opt.value}
																	className="text-xs"
																>
																	{opt.label[lang]}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div className="grid gap-1">
													<Label className="text-[10px] font-semibold uppercase text-muted-foreground">
														{lang === "fr" ? "Modèle LLM" : "LLM model"}
													</Label>
													<Select
														value={state.modelOverride}
														onValueChange={(v) =>
															updateCap(code, { modelOverride: v })
														}
														disabled={isSaving}
													>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{MODEL_OVERRIDE_OPTIONS.map((opt) => (
																<SelectItem
																	key={opt.value}
																	value={opt.value}
																	className="text-xs"
																>
																	{opt.label[lang]}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<p className="text-[10px] text-muted-foreground">
														{lang === "fr" ? "Par défaut : " : "Default: "}
														<code className="text-[10px]">{def.defaultModel}</code>
													</p>
												</div>

												<div className="grid gap-1">
													<Label className="text-[10px] font-semibold uppercase text-muted-foreground">
														{lang === "fr"
															? "Budget quotidien (micro-cents)"
															: "Daily budget (micro-cents)"}
													</Label>
													<Input
														type="number"
														inputMode="numeric"
														min={0}
														step={100000}
														placeholder={
															lang === "fr" ? "Illimité" : "Unlimited"
														}
														value={state.dailyBudgetMicroCents}
														onChange={(e) =>
															updateCap(code, {
																dailyBudgetMicroCents: e.target.value,
															})
														}
														disabled={isSaving}
														className="h-7 text-xs"
													/>
													<p className="text-[10px] text-muted-foreground">
														{lang === "fr"
															? "1 000 000 μ-cents = 1 cent USD."
															: "1,000,000 μ-cents = 1 US cent."}
													</p>
												</div>
											</>
										)}

										{isDirty && (
											<div className="flex items-center justify-end gap-2 pt-1">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleResetCap(code)}
													disabled={isSaving}
													className="h-7 text-[10px]"
												>
													<X className="mr-1 h-3 w-3" />
													{lang === "fr" ? "Annuler" : "Cancel"}
												</Button>
												<Button
													size="sm"
													onClick={() => handleSaveCap(code)}
													disabled={isSaving}
													className="h-7 text-[10px]"
												>
													<Check className="mr-1 h-3 w-3" />
													{lang === "fr" ? "Enregistrer" : "Save"}
												</Button>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
