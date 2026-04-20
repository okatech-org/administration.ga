"use client";

/**
 * Auto-generation rules editor — embedded directly inside the service edit
 * page (onglet « Génération auto »). Extracted from the standalone route
 * /services/[serviceId]/auto-generation so the user doesn't have to
 * navigate to a separate page to configure the rules.
 *
 * Loads the orgService + org templates, lets the user add/edit/remove rules,
 * validates on save and persists via `services.updateAutoGenerationRules`.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { FileText, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "../../../shell/org-provider";
import { Button } from "@workspace/ui/components/button";
import { Combobox, type ComboboxOption } from "@workspace/ui/components/combobox";
import { FlatCard } from "../../../components/my-space/flat-card";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

type Trigger = "on_submission" | "on_status_transition";

type FieldMappingSource =
	| "user"
	| "profile"
	| "request"
	| "formData"
	| "org"
	| "system";

type FieldMapping = Record<
	string,
	{ source: FieldMappingSource; path?: string }
>;

interface RuleDraft {
	trigger: Trigger;
	fromStatus?: string;
	toStatus?: string;
	templateId: Id<"documentTemplates"> | "";
	autoSign: boolean;
	autoPublish: boolean;
	fieldMapping?: FieldMapping;
}

interface PlaceholderSummary {
	key: string;
	label?: { fr?: string; en?: string };
	source: FieldMappingSource;
	path?: string;
}

interface FormFieldSummary {
	id: string;
	sectionId: string;
	label: string;
}

// Map of constant value → translation key suffix under templates.autoGen.status.*
const STATUS_KEY_MAP: Record<string, string> = {
	[RequestStatus.Draft]: "draft",
	[RequestStatus.Submitted]: "submitted",
	[RequestStatus.Pending]: "pending",
	[RequestStatus.UnderReview]: "underReview",
	[RequestStatus.InProduction]: "inProduction",
	[RequestStatus.Validated]: "validated",
	[RequestStatus.AppointmentScheduled]: "appointmentScheduled",
	[RequestStatus.ReadyForPickup]: "readyForPickup",
	[RequestStatus.Completed]: "completed",
	[RequestStatus.Rejected]: "rejected",
	[RequestStatus.Cancelled]: "cancelled",
};

const STATUS_VALUES = [
	RequestStatus.Draft,
	RequestStatus.Submitted,
	RequestStatus.Pending,
	RequestStatus.UnderReview,
	RequestStatus.InProduction,
	RequestStatus.Validated,
	RequestStatus.AppointmentScheduled,
	RequestStatus.ReadyForPickup,
	RequestStatus.Completed,
	RequestStatus.Rejected,
	RequestStatus.Cancelled,
];

export function AutoGenerationRulesPanel({
	orgServiceId,
}: {
	orgServiceId: Id<"orgServices">;
}) {
	const { t } = useTranslation();
	const { activeOrgId } = useOrg();

	const { data: orgService, isLoading: loadingService } = useAuthenticatedConvexQuery(
		api.functions.services.getOrgServiceById,
		{ orgServiceId },
	);

	const { data: templates, isLoading: loadingTemplates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Flatten the service's formSchema into a list of `{id, sectionId, label}`
	// — the rule editor uses this to suggest mapping paths for placeholders
	// of source `formData`.
	const formFields: FormFieldSummary[] = (() => {
		const schema = (orgService as { formSchema?: unknown } | null)?.formSchema as
			| { sections?: Array<{ id: string; fields?: Array<{ id: string; label?: { fr?: string; en?: string } }> }> }
			| undefined;
		const out: FormFieldSummary[] = [];
		for (const section of schema?.sections ?? []) {
			for (const field of section.fields ?? []) {
				out.push({
					id: field.id,
					sectionId: section.id,
					label: field.label?.fr ?? field.label?.en ?? field.id,
				});
			}
		}
		return out;
	})();

	const { mutateAsync: saveRules } = useConvexMutationQuery(
		api.functions.services.updateAutoGenerationRules,
	);

	const [rules, setRules] = useState<RuleDraft[] | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (orgService && rules === null) {
			setRules(
				((orgService.autoGenerationRules ?? []) as unknown as RuleDraft[]).map(
					(r) => ({ ...r }),
				),
			);
		}
	}, [orgService, rules]);

	if (loadingService) {
		return (
			<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t("templates.autoGen.loading")}
			</div>
		);
	}
	if (!orgService) {
		return <div className="p-6 text-sm text-destructive">{t("templates.autoGen.serviceNotFound")}</div>;
	}

	const draft = rules ?? [];

	function patch(index: number, changes: Partial<RuleDraft>) {
		setRules((current) => {
			const base = current ?? [];
			return base.map((r, i) => (i === index ? { ...r, ...changes } : r));
		});
	}

	function addRule() {
		setRules((current) => [
			...(current ?? []),
			{
				trigger: "on_submission",
				templateId: "",
				autoSign: false,
				autoPublish: true,
			},
		]);
	}

	function removeRule(index: number) {
		setRules((current) => (current ?? []).filter((_, i) => i !== index));
	}

	async function save() {
		for (const [i, rule] of draft.entries()) {
			if (!rule.templateId) {
				toast.error(t("templates.autoGen.errors.missingTemplate", { index: i + 1 }));
				return;
			}
			if (rule.trigger === "on_status_transition" && !rule.toStatus) {
				toast.error(t("templates.autoGen.errors.missingToStatus", { index: i + 1 }));
				return;
			}
		}
		setSaving(true);
		try {
			await saveRules({
				orgServiceId,
				rules: draft.map((r) => ({
					trigger: r.trigger,
					fromStatus: r.fromStatus as never,
					toStatus: r.toStatus as never,
					templateId: r.templateId as Id<"documentTemplates">,
					autoSign: r.autoSign,
					autoPublish: r.autoPublish,
					fieldMapping:
						r.fieldMapping && Object.keys(r.fieldMapping).length > 0
							? r.fieldMapping
							: undefined,
				})),
			});
			toast.success(t("templates.autoGen.savedToast"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.autoGen.saveError");
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Sparkles className="h-5 w-5" />
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-bold">{t("templates.autoGen.title")}</h3>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{t("templates.autoGen.description")}
					</p>
				</div>
				<Button onClick={save} disabled={saving} size="sm">
					<Save className="mr-2 h-4 w-4" />
					{saving ? t("templates.autoGen.saving") : t("templates.autoGen.saveButton")}
				</Button>
			</div>

			<FlatCard className="p-4 md:p-6">
				{draft.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<FileText className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">{t("templates.autoGen.empty.title")}</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{t("templates.autoGen.empty.description")}
							</p>
						</div>
						<Button onClick={addRule}>
							<Plus className="mr-2 h-4 w-4" />
							{t("templates.autoGen.empty.addButton")}
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{draft.map((rule, index) => (
							<RuleEditor
								key={index}
								rule={rule}
								templates={
									(templates ?? []) as Array<{
										_id: Id<"documentTemplates">;
										name: Record<string, string>;
										placeholders?: PlaceholderSummary[];
									}>
								}
								templatesLoading={loadingTemplates}
								formFields={formFields}
								onChange={(changes) => patch(index, changes)}
								onRemove={() => removeRule(index)}
								index={index + 1}
							/>
						))}
						<Button variant="outline" onClick={addRule}>
							<Plus className="mr-2 h-4 w-4" />
							{t("templates.autoGen.addAnotherButton")}
						</Button>
					</div>
				)}
			</FlatCard>
		</div>
	);
}

function RuleEditor({
	rule,
	index,
	templates,
	templatesLoading,
	formFields,
	onChange,
	onRemove,
}: {
	rule: RuleDraft;
	index: number;
	templates: Array<{
		_id: Id<"documentTemplates">;
		name: Record<string, string>;
		placeholders?: PlaceholderSummary[];
	}>;
	templatesLoading: boolean;
	formFields: FormFieldSummary[];
	onChange: (changes: Partial<RuleDraft>) => void;
	onRemove: () => void;
}) {
	const { t } = useTranslation();
	const templateOptions: ComboboxOption<string>[] = templates.map((tpl) => ({
		value: tpl._id,
		label: tpl.name.fr ?? tpl.name.en ?? t("templates.common.untitled"),
	}));

	const selectedTemplate = templates.find((tpl) => tpl._id === rule.templateId);
	const placeholders: PlaceholderSummary[] = selectedTemplate?.placeholders ?? [];

	function statusLabel(value: string): string {
		const key = STATUS_KEY_MAP[value];
		return key ? t(`templates.autoGen.status.${key}`) : value;
	}

	function patchMapping(key: string, next: { source: FieldMappingSource; path?: string } | null) {
		const current = rule.fieldMapping ?? {};
		const updated: FieldMapping = { ...current };
		if (next === null) {
			delete updated[key];
		} else {
			updated[key] = next;
		}
		onChange({ fieldMapping: updated });
	}

	function autoSuggestMappings() {
		const next: FieldMapping = { ...(rule.fieldMapping ?? {}) };
		for (const ph of placeholders) {
			if (next[ph.key]) continue;
			// 1. exact match on fieldId
			const exact = formFields.find((f) => f.id === ph.key);
			if (exact) {
				next[ph.key] = { source: "formData", path: exact.id };
				continue;
			}
			// 2. match on `sectionId.fieldId`
			const dotted = formFields.find(
				(f) => `${f.sectionId}.${f.id}` === ph.key,
			);
			if (dotted) {
				next[ph.key] = {
					source: "formData",
					path: `${dotted.sectionId}.${dotted.id}`,
				};
			}
		}
		onChange({ fieldMapping: next });
	}

	return (
		<div className="rounded-xl border bg-background p-4">
			<header className="mb-3 flex items-center justify-between gap-2">
				<span className="text-sm font-semibold">
					{t("templates.autoGen.rule.title", { index })}
				</span>
				<Button
					size="icon"
					variant="ghost"
					onClick={onRemove}
					aria-label={t("templates.autoGen.rule.removeAria")}
				>
					<Trash2 className="h-4 w-4 text-muted-foreground" />
				</Button>
			</header>

			<div className="grid gap-3 md:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label>{t("templates.autoGen.rule.trigger")}</Label>
					<Select
						value={rule.trigger}
						onValueChange={(v) =>
							onChange({
								trigger: v as Trigger,
								...(v === "on_submission"
									? { fromStatus: undefined, toStatus: undefined }
									: {}),
							})
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="on_submission">
								{t("templates.autoGen.rule.triggerOptions.submission")}
							</SelectItem>
							<SelectItem value="on_status_transition">
								{t("templates.autoGen.rule.triggerOptions.transition")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label>{t("templates.common.templateLabel")}</Label>
					<Combobox
						options={templateOptions}
						value={rule.templateId || null}
						onValueChange={(v) =>
							onChange({ templateId: v as Id<"documentTemplates"> })
						}
						placeholder={
							templatesLoading
								? t("templates.common.loading")
								: t("templates.common.chooseTemplate")
						}
						searchPlaceholder={t("templates.common.searchTemplate")}
						emptyText={t("templates.common.noTemplatesAvailable")}
					/>
				</div>

				{rule.trigger === "on_status_transition" ? (
					<>
						<div className="flex flex-col gap-1">
							<Label>{t("templates.autoGen.rule.fromStatus")}</Label>
							<Select
								value={rule.fromStatus ?? "__any__"}
								onValueChange={(v) =>
									onChange({ fromStatus: v === "__any__" ? undefined : v })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder={t("templates.autoGen.rule.anyStatus")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__any__">
										{t("templates.autoGen.rule.anyStatus")}
									</SelectItem>
									{STATUS_VALUES.map((s) => (
										<SelectItem key={s} value={s}>
											{statusLabel(s)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<Label>{t("templates.autoGen.rule.toStatus")}</Label>
							<Select
								value={rule.toStatus ?? ""}
								onValueChange={(v) => onChange({ toStatus: v || undefined })}
							>
								<SelectTrigger>
									<SelectValue placeholder={t("templates.autoGen.rule.toStatusPlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									{STATUS_VALUES.map((s) => (
										<SelectItem key={s} value={s}>
											{statusLabel(s)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</>
				) : null}
			</div>

			<div className="mt-4 grid gap-3 md:grid-cols-2">
				<label className="flex items-center justify-between gap-3 rounded-md border p-3">
					<div>
						<div className="text-sm font-medium">
							{t("templates.autoGen.rule.autoSign.title")}
						</div>
						<div className="text-xs text-muted-foreground">
							{t("templates.autoGen.rule.autoSign.description")}
						</div>
					</div>
					<Switch
						checked={rule.autoSign}
						onCheckedChange={(checked) => onChange({ autoSign: checked })}
					/>
				</label>
				<label className="flex items-center justify-between gap-3 rounded-md border p-3">
					<div>
						<div className="text-sm font-medium">
							{t("templates.autoGen.rule.autoPublish.title")}
						</div>
						<div className="text-xs text-muted-foreground">
							{t("templates.autoGen.rule.autoPublish.description")}
						</div>
					</div>
					<Switch
						checked={rule.autoPublish}
						onCheckedChange={(checked) => onChange({ autoPublish: checked })}
					/>
				</label>
			</div>

			{/* Mapping des variables — visible quand un template est selectionne et
			    qu'il declare au moins un placeholder. */}
			{placeholders.length > 0 ? (
				<div className="mt-4 flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium">
								{t("templates.autoGen.mapping.title")}
							</div>
							<div className="text-xs text-muted-foreground">
								{t("templates.autoGen.mapping.description")}
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={autoSuggestMappings}
							disabled={formFields.length === 0}
						>
							{t("templates.autoGen.mapping.autoSuggest")}
						</Button>
					</div>
					<ul className="flex flex-col gap-2">
						{placeholders.map((ph) => {
							const mapped = rule.fieldMapping?.[ph.key];
							const source = mapped?.source ?? ph.source;
							const path = mapped?.path ?? ph.path ?? "";
							return (
								<li
									key={ph.key}
									className="flex flex-col gap-2 rounded-md border bg-background p-2 md:flex-row md:items-center"
								>
									<div className="min-w-0 flex-1">
										<code className="break-all font-mono text-xs text-blue-700">{`{{${ph.key}}}`}</code>
									</div>
									<div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center">
										<Select
											value={source}
											onValueChange={(v) =>
												patchMapping(ph.key, {
													source: v as FieldMappingSource,
													path: path || undefined,
												})
											}
										>
											<SelectTrigger className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="user">
													{t("templates.placeholders.sources.user")}
												</SelectItem>
												<SelectItem value="profile">
													{t("templates.placeholders.sources.profile")}
												</SelectItem>
												<SelectItem value="request">
													{t("templates.placeholders.sources.request")}
												</SelectItem>
												<SelectItem value="formData">
													{t("templates.placeholders.sources.formData")}
												</SelectItem>
												<SelectItem value="org">
													{t("templates.placeholders.sources.org")}
												</SelectItem>
												<SelectItem value="system">
													{t("templates.placeholders.sources.system")}
												</SelectItem>
											</SelectContent>
										</Select>
										{source === "formData" && formFields.length > 0 ? (
											<Combobox
												options={formFields.map((f) => ({
													value: f.id,
													label: `${f.label} (${f.id})`,
												}))}
												value={path || null}
												onValueChange={(v) =>
													patchMapping(ph.key, {
														source: "formData",
														path: v || undefined,
													})
												}
												placeholder={t(
													"templates.autoGen.mapping.pathPlaceholder",
												)}
												searchPlaceholder={t(
													"templates.autoGen.mapping.searchField",
												)}
												emptyText={t("templates.autoGen.mapping.noField")}
											/>
										) : (
											<input
												type="text"
												value={path}
												onChange={(e) =>
													patchMapping(ph.key, {
														source,
														path: e.target.value || undefined,
													})
												}
												placeholder={t(
													"templates.autoGen.mapping.pathPlaceholder",
												)}
												className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
											/>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			) : null}
		</div>
	);
}
