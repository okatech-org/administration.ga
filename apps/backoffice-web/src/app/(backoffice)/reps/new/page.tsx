"use client";

import { api } from "@convex/_generated/api";
import { OrganizationType } from "@convex/lib/constants";
import { CountryCode } from "@convex/lib/countryCodeValidator";
import { getPresetTasks } from "@convex/lib/roles";
import type { TaskCodeValue } from "@convex/lib/taskCodes";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Building,
	Check,
	GripVertical,
	Loader2,
	Plus,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";

// ─── Types ─────────────────────────────────────────────────────

interface PositionDraft {
	id: string; // client-side ID for tracking
	code: string;
	title: { fr: string; en: string };
	description: { fr: string; en: string };
	level: number;
	grade?: string;
	tasks: TaskCodeValue[];
	isRequired: boolean;
}

interface TemplateData {
	type: string;
	label: { fr?: string; en?: string };
	description: { fr?: string; en?: string };
	icon: string;
	modules?: string[];
	positions: Array<{
		code: string;
		title: { fr?: string; en?: string };
		description?: { fr?: string; en?: string };
		level: number;
		grade?: string;
		taskPresets: string[];
		isRequired: boolean;
	}>
}

// ─── Helpers ───────────────────────────────────────────────────

let nextId = 0;
function generateId() {
	return `pos_${Date.now()}_${nextId++}`;
}

function templatePositionToDraft(
	pos: TemplateData["positions"][0],
): PositionDraft {
	return {
		id: generateId(),
		code: pos.code,
		title: {
			fr: pos.title?.fr ?? pos.code,
			en: pos.title?.en ?? pos.code,
		},
		description: {
			fr: pos.description?.fr ?? "",
			en: pos.description?.en ?? "",
		},
		level: pos.level,
		grade: pos.grade,
		tasks: getPresetTasks(pos.taskPresets ?? []),
		isRequired: pos.isRequired,
	}
}

const GRADE_CONFIG: Record<string, { label: string; color: string }> = {
	chief: { label: "Chef", color: "bg-amber-500/15 text-amber-600" },
	counselor: {
		label: "Conseiller",
		color: "bg-blue-500/15 text-blue-600",
	},
	agent: { label: "Agent", color: "bg-emerald-500/15 text-emerald-600" },
	external: {
		label: "Externe",
		color: "bg-zinc-500/15 text-zinc-600",
	},
};

// ─── Step indicators ───────────────────────────────────────────

const STEPS = [
	{ key: "template", label: "Template" },
	{ key: "positions", label: "Postes" },
	{ key: "details", label: "Informations" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function StepIndicator({
	steps,
	current,
}: {
	steps: typeof STEPS;
	current: StepKey;
}) {
	const currentIdx = steps.findIndex((s) => s.key === current);
	return (
		<div className="flex items-center gap-2 mb-8">
			{steps.map((step, idx) => {
				const isDone = idx < currentIdx;
				const isActive = idx === currentIdx;
				return (
					<div key={step.key} className="flex items-center gap-2">
						{idx > 0 && (
							<div
								className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`}
							/>
						)}
						<div
							className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
								isActive
									? "bg-primary text-primary-foreground"
									: isDone
										? "bg-primary/10 text-primary"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{isDone ? (
								<Check className="h-3.5 w-3.5" />
							) : (
								<span className="w-5 h-5 flex items-center justify-center text-xs rounded-full bg-current/10">
									{idx + 1}
								</span>
							)}
							{step.label}
						</div>
					</div>
				)
			})}
		</div>
	)
}

// ─── Main Component ────────────────────────────────────────────

export default function NewOrganizationPage() {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const router = useRouter();

	// Steps
	const [step, setStep] = useState<StepKey>("template");

	// Template selection
	const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(
		null,
	)

	// Editable positions
	const [positions, setPositions] = useState<PositionDraft[]>([]);

	// Add position dialog
	const [addDialogOpen, setAddDialogOpen] = useState(false);

	// Fetch templates
	const { data: templates } = useConvexQuery(
		api.functions.roleConfig.getOrgTemplates,
		{},
	)

	const { mutateAsync: createOrg, isPending } = useConvexMutationQuery(
		api.functions.orgs.create,
	)

	// When selecting a template, pre-fill positions
	const handleSelectTemplate = useCallback((template: TemplateData) => {
		setSelectedTemplate(template);
		setPositions(template.positions.map((p) => templatePositionToDraft(p)));
		setStep("positions");
	}, []);

	// Reset to template defaults
	const handleResetPositions = useCallback(() => {
		if (selectedTemplate) {
			setPositions(
				selectedTemplate.positions.map((p) => templatePositionToDraft(p)),
			)
		}
	}, [selectedTemplate]);

	// Remove a position
	const handleRemovePosition = useCallback((id: string) => {
		setPositions((prev) => prev.filter((p) => p.id !== id));
	}, []);

	// Add a new blank position
	const handleAddPosition = useCallback((draft: Omit<PositionDraft, "id">) => {
		setPositions((prev) => [...prev, { ...draft, id: generateId() }]);
		setAddDialogOpen(false);
	}, []);

	// Org form
	const form = useForm({
		defaultValues: {
			name: "",
			slug: "",
			address: {
				street: "",
				city: "",
				postalCode: "",
				country: CountryCode.GA,
			},
			email: "",
			phone: "",
			website: "",
			timezone: "Europe/Paris",
			jurisdictionCountries: [] as CountryCode[],
			logoUrl: "",
			settings: {
				appointmentBuffer: 24,
				maxActiveRequests: 10,
				workingHours: {
					monday: [{ start: "09:00", end: "17:00", isOpen: true }],
					tuesday: [{ start: "09:00", end: "17:00", isOpen: true }],
					wednesday: [{ start: "09:00", end: "17:00", isOpen: true }],
					thursday: [{ start: "09:00", end: "17:00", isOpen: true }],
					friday: [{ start: "09:00", end: "17:00", isOpen: true }],
					saturday: [{ start: "09:00", end: "12:00", isOpen: false }],
					sunday: [{ start: "00:00", end: "00:00", isOpen: false }],
				},
			},
		},
		onSubmit: async ({ value }) => {
			if (!selectedTemplate) {
				toast.error("Veuillez sélectionner un template");
				return
			}
			if (!value.name || value.name.length < 3) {
				toast.error("Le nom doit comporter au moins 3 caractères");
				return
			}
			if (!value.slug || value.slug.length < 2) {
				toast.error("Le slug doit comporter au moins 2 caractères");
				return
			}

			try {
				await createOrg({
					name: value.name,
					slug: value.slug,
					type: selectedTemplate.type as OrganizationType,
					address: {
						street: value.address.street,
						city: value.address.city,
						postalCode: value.address.postalCode,
						country: value.address.country,
						coordinates: undefined,
					},
					country: value.address.country,
					email: value.email || undefined,
					phone: value.phone || undefined,
					website: value.website || undefined,
					timezone: value.timezone,
					templateType: selectedTemplate.type,
					modules: selectedTemplate.modules as any,
					positions: positions.map((p) => ({
						code: p.code,
						title: p.title,
						description: p.description,
						level: p.level,
						grade: p.grade,
						tasks: p.tasks,
						isRequired: p.isRequired,
					})),
				})
				toast.success("Représentation créée avec succès");
				router.push("/reps");
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Erreur inconnue";
				toast.error(message);
			}
		},
	})

	const handleNameChange = (name: string) => {
		form.setFieldValue("name", name);
		const slug = name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		form.setFieldValue("slug", slug);
	}

	// Sorted positions by level
	const sortedPositions = useMemo(
		() => [...positions].sort((a, b) => a.level - b.level),
		[positions],
	)

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-4xl mx-auto w-full">
			{/* Header */}
			<PageHeader
				icon={<Building className="h-5 w-5" />}
				title={t("superadmin.organizations.form.create")}
				subtitle={t("superadmin.organizations.description")}
				showBackButton
				onBack={() => {
					if (step === "positions") setStep("template");
					else if (step === "details") setStep("positions");
					else router.push("/reps");
				}}
			/>

			<StepIndicator steps={STEPS} current={step} />

			{/* ─── Step 1: Template Selection ─────────────────── */}
			{step === "template" && (
				<div className="space-y-6">
					<div>
						<h2 className="text-lg font-semibold mb-1">Choisir un modèle</h2>
						<p className="text-sm text-muted-foreground">
							Sélectionnez le type d'organisation. Les postes seront pré-remplis
							à partir du modèle.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{(templates as TemplateData[] | undefined)?.map((template) => {
							const isSelected = selectedTemplate?.type === template.type;
							return (
								<button
									type="button"
									key={template.type}
									onClick={() => handleSelectTemplate(template)}
									className={`relative text-left p-5 rounded-xl border-2 transition-all ${
										isSelected
											? "border-primary bg-primary/5"
											: "border-border hover:border-primary/40"
									}`}
								>
									{isSelected && (
										<div className="absolute top-3 right-3">
											<Check className="h-5 w-5 text-primary" />
										</div>
									)}
									<div className="flex items-start gap-4">
										<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
											<Building className="h-6 w-6 text-primary" />
										</div>
										<div className="min-w-0">
											<h3 className="font-semibold text-base">
												{getLocalizedValue(template.label, lang)}
											</h3>
											<p className="text-sm text-muted-foreground mt-0.5">
												{getLocalizedValue(template.description, lang)}
											</p>
											<div className="flex items-center gap-2 mt-3">
												<Badge variant="secondary" className="text-xs">
													{template.positions.length} postes
												</Badge>
												{template.positions.filter((p) => p.isRequired).length >
													0 && (
													<Badge variant="outline" className="text-xs">
														{
															template.positions.filter((p) => p.isRequired)
																.length
														}{" "}
														requis
													</Badge>
												)}
											</div>
										</div>
									</div>
								</button>
							)
						})}
					</div>
				</div>
			)}

			{/* ─── Step 2: Editable Positions ─────────────────── */}
			{step === "positions" && (
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold mb-1">
								Postes de l'organisation
							</h2>
							<p className="text-sm text-muted-foreground">
								Modifiez la liste des postes avant de créer l'organisation.
								{selectedTemplate && (
									<span className="ml-1">
										Modèle :{" "}
										<strong>
											{getLocalizedValue(selectedTemplate.label, lang)}
										</strong>
									</span>
								)}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleResetPositions}
							>
								Réinitialiser
							</Button>
							<Button size="sm" onClick={() => setAddDialogOpen(true)}>
								<Plus className="h-4 w-4 mr-1" />
								Ajouter
							</Button>
						</div>
					</div>

					{/* Stats */}
					<div className="flex gap-4 text-sm">
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted">
							<span className="font-semibold">{positions.length}</span> postes
						</div>
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600">
							<ShieldCheck className="h-3.5 w-3.5" />
							<span className="font-semibold">
								{positions.filter((p) => p.isRequired).length}
							</span>{" "}
							requis
						</div>
					</div>

					{/* Position cards */}
					<div className="space-y-2">
						{sortedPositions.map((pos) => (
							<div
								key={pos.id}
								className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all group ${
									pos.isRequired
										? "border-amber-500/30 bg-amber-500/5"
										: "border-border"
								}`}
							>
								<GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

								{/* Level badge */}
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
									{pos.level}
								</div>

								{/* Position info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-medium text-sm truncate">
											{pos.title.fr}
										</span>
										{pos.grade && GRADE_CONFIG[pos.grade] && (
											<Badge
												variant="secondary"
												className={`text-[10px] px-1.5 py-0 ${GRADE_CONFIG[pos.grade].color}`}
											>
												{GRADE_CONFIG[pos.grade].label}
											</Badge>
										)}
										{pos.isRequired && (
											<Badge
												variant="outline"
												className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600"
											>
												Requis
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground truncate mt-0.5">
										{pos.description.fr}
									</p>
								</div>

								{/* Modules */}
								<div className="hidden sm:flex gap-1 shrink-0">
									{pos.tasks.slice(0, 3).map((mod) => (
										<Badge
											key={mod}
											variant="outline"
											className="text-[10px] px-1.5 py-0"
										>
											{mod}
										</Badge>
									))}
									{pos.tasks.length > 3 && (
										<Badge
											variant="outline"
											className="text-[10px] px-1.5 py-0"
										>
											+{pos.tasks.length - 3}
										</Badge>
									)}
								</div>

								{/* Delete */}
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
									onClick={() => handleRemovePosition(pos.id)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
					</div>

					{positions.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Building className="h-10 w-10 mx-auto mb-3 opacity-40" />
							<p>Aucun poste défini</p>
							<p className="text-sm mt-1">
								Ajoutez des postes ou réinitialisez depuis le modèle
							</p>
						</div>
					)}

					{/* Navigation */}
					<div className="flex justify-between pt-4 border-t">
						<Button variant="outline" onClick={() => setStep("template")}>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Changer de modèle
						</Button>
						<Button onClick={() => setStep("details")}>
							Continuer
							<ArrowRight className="h-4 w-4 ml-2" />
						</Button>
					</div>
				</div>
			)}

			{/* ─── Step 3: Org Details ────────────────────────── */}
			{step === "details" && (
				<FlatCard>
					<div className="p-3 lg:p-4">
						<h2 className="text-lg font-bold mb-1">{t("superadmin.organizations.form.create")}</h2>
						<p className="text-xs text-muted-foreground mb-4">
							{selectedTemplate && (
								<span>
									{getLocalizedValue(selectedTemplate.label, lang)} ·{" "}
								</span>
							)}
							{positions.length} postes configurés
						</p>
						<form
							id="org-form"
							onSubmit={(e) => {
								e.preventDefault()
								form.handleSubmit()
							}}
						>
							<FieldGroup>
								{/* Name */}
								<form.Field
									name="name"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													{t("superadmin.organizations.form.name")}
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => handleNameChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder={t(
														"superadmin.organizations.form.namePlaceholder",
													)}
													autoComplete="off"
												/>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										)
									}}
								/>

								{/* Slug */}
								<form.Field
									name="slug"
									children={(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<FieldLabel htmlFor={field.name}>
													{t("superadmin.organizations.form.slug")}
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													aria-invalid={isInvalid}
													placeholder={t(
														"superadmin.organizations.form.slugPlaceholder",
													)}
													autoComplete="off"
												/>
												<p className="text-xs text-muted-foreground">
													{t("superadmin.organizations.form.slugHelp")}
												</p>
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										)
									}}
								/>

								{/* Address Section */}
								<div className="pt-4">
									<h3 className="font-medium mb-2">
										{t("superadmin.organizations.form.address")}
									</h3>
									<div className="grid gap-4">
										<form.Field
											name="address.street"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.street")}
													</FieldLabel>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</Field>
											)}
										/>
										<div className="grid grid-cols-2 gap-4">
											<form.Field
												name="address.city"
												children={(field) => (
													<Field>
														<FieldLabel htmlFor={field.name}>
															{t("superadmin.organizations.form.city")}
														</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
														/>
													</Field>
												)}
											/>
											<form.Field
												name="address.postalCode"
												children={(field) => (
													<Field>
														<FieldLabel htmlFor={field.name}>
															{t("superadmin.organizations.form.postalCode")}
														</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
														/>
													</Field>
												)}
											/>
										</div>
										<form.Field
											name="address.country"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.country")}
													</FieldLabel>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) =>
															field.handleChange(e.target.value as CountryCode)
														}
													/>
												</Field>
											)}
										/>
									</div>
								</div>

								{/* Contact Section */}
								<div className="pt-4">
									<h3 className="font-medium mb-2">
										{t("superadmin.organizations.form.contact")}
									</h3>
									<div className="grid gap-4">
										<form.Field
											name="email"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.email")}
													</FieldLabel>
													<Input
														id={field.name}
														type="email"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</Field>
											)}
										/>
										<form.Field
											name="phone"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.phone")}
													</FieldLabel>
													<Input
														id={field.name}
														type="tel"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</Field>
											)}
										/>
										<form.Field
											name="website"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.website")}
													</FieldLabel>
													<Input
														id={field.name}
														type="url"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="https://"
													/>
												</Field>
											)}
										/>
									</div>
								</div>
							</FieldGroup>

							{/* Advanced */}
							<div className="pt-6 border-t mt-6">
								<h3 className="text-lg font-medium mb-4">
									Configuration Avancée
								</h3>

								<form.Field
									name="jurisdictionCountries"
									children={(field) => (
										<Field>
											<FieldLabel>
												{t("superadmin.organizations.form.jurisdiction")}
											</FieldLabel>
											<MultiSelect<CountryCode>
												type="multiple"
												options={Object.values(CountryCode).map((code) => ({
													value: code,
													label: code,
												}))}
												onChange={(value: CountryCode[]) => {
													field.handleChange(value)
												}}
												selected={field.state.value}
											/>
											<div className="flex flex-wrap gap-2 mt-2">
												{field.state.value?.map((code) => (
													<div
														key={code}
														className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm flex items-center gap-1"
													>
														{code}
														<button
															type="button"
															onClick={() =>
																field.handleChange(
																	field.state.value.filter((c) => c !== code),
																)
															}
															className="text-muted-foreground hover:text-foreground"
														>
															×
														</button>
													</div>
												))}
											</div>
										</Field>
									)}
								/>

								<div className="grid grid-cols-2 gap-4 mt-4">
									<form.Field
										name="settings.appointmentBuffer"
										children={(field) => (
											<Field>
												<FieldLabel>Délai RDV (heures)</FieldLabel>
												<Input
													type="number"
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(Number(e.target.value))
													}
												/>
											</Field>
										)}
									/>
									<form.Field
										name="settings.maxActiveRequests"
										children={(field) => (
											<Field>
												<FieldLabel>Max Demandes Actives</FieldLabel>
												<Input
													type="number"
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(Number(e.target.value))
													}
												/>
											</Field>
										)}
									/>
								</div>
							</div>
						</form>
					</div>
				<div className="flex justify-between p-3 lg:p-4 border-t border-border/40">
					<Button
						type="button"
						variant="outline"
						onClick={() => setStep("positions")}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Retour aux postes
					</Button>
					<Button type="submit" form="org-form" disabled={isPending}>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : null}
						{isPending ? "Création en cours..." : "Créer l'organisation"}
					</Button>
				</div>
				</FlatCard>
			)}

			{/* ─── Add Position Dialog ────────────────────────── */}
			<AddPositionDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
				onAdd={handleAddPosition}
			/>
		</div>
	)
}

// ─── Add Position Dialog ───────────────────────────────────────

function AddPositionDialog({
	open,
	onOpenChange,
	onAdd,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (pos: Omit<PositionDraft, "id">) => void;
}) {
	const [code, setCode] = useState("");
	const [titleFr, setTitleFr] = useState("");
	const [titleEn, setTitleEn] = useState("");
	const [descFr, setDescFr] = useState("");
	const [level, setLevel] = useState(5);
	const [grade, setGrade] = useState("");

	const handleSubmit = () => {
		if (!code.trim() || !titleFr.trim()) {
			toast.error("Le code et le titre sont requis");
			return
		}
		onAdd({
			code: code.trim().toLowerCase().replace(/\s+/g, "_"),
			title: { fr: titleFr.trim(), en: titleEn.trim() || titleFr.trim() },
			description: { fr: descFr.trim(), en: "" },
			level,
			grade: grade || undefined,
			tasks: [],
			isRequired: false,
		})
		// Reset
		setCode("");
		setTitleFr("");
		setTitleEn("");
		setDescFr("");
		setLevel(5);
		setGrade("");
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Ajouter un poste</DialogTitle>
					<DialogDescription>
						Créez un nouveau poste pour cette organisation.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel>Code</FieldLabel>
							<Input
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder="ex. agent_consul"
							/>
						</Field>
						<Field>
							<FieldLabel>Niveau</FieldLabel>
							<Input
								type="number"
								min={1}
								max={10}
								value={level}
								onChange={(e) => setLevel(Number(e.target.value))}
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel>Titre (FR)</FieldLabel>
						<Input
							value={titleFr}
							onChange={(e) => setTitleFr(e.target.value)}
							placeholder="ex. Agent Consulaire"
						/>
					</Field>
					<Field>
						<FieldLabel>Titre (EN)</FieldLabel>
						<Input
							value={titleEn}
							onChange={(e) => setTitleEn(e.target.value)}
							placeholder="ex. Consular Agent"
						/>
					</Field>
					<Field>
						<FieldLabel>Description</FieldLabel>
						<Input
							value={descFr}
							onChange={(e) => setDescFr(e.target.value)}
							placeholder="ex. Agent polyvalent"
						/>
					</Field>
					<Field>
						<FieldLabel>Grade</FieldLabel>
						<Select value={grade} onValueChange={setGrade}>
							<SelectTrigger>
								<SelectValue placeholder="Aucun" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="chief">Chef</SelectItem>
								<SelectItem value="counselor">Conseiller</SelectItem>
								<SelectItem value="agent">Agent</SelectItem>
								<SelectItem value="external">Externe</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button onClick={handleSubmit}>
						<Plus className="h-4 w-4 mr-1" />
						Ajouter
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
