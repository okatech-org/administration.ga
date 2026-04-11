"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MODULE_REGISTRY, type ModuleCategory, type ModuleCodeValue } from "@convex/lib/moduleCodes";
import { POSITION_GRADES, ORGANIZATION_TEMPLATES, getPresetTasks, type PositionGrade, type PositionTemplate } from "@convex/lib/roles";
import { ALL_TASK_CODES, TASK_RISK, type TaskCodeValue } from "@convex/lib/taskCodes";
import {
	ArrowDown,
	ArrowUp,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	Crown,
	Edit,
	Loader2,
	Plus,
	Shield,
	Trash2,
	Users,
	MoreHorizontal,
	UserPlus,
	UserMinus,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Checkbox } from "@/components/ui/checkbox";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { getLocalizedValue } from "@/lib/i18n-utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────
interface Position {
	_id: Id<"positions">;
	code: string;
	title: Record<string, string>;
	description?: Record<string, string>;
	level: number;
	grade?: string;
	tasks: string[];
	isRequired?: boolean;
	isActive?: boolean;
	occupant?: {
		userId: Id<"users">;
		firstName?: string;
		lastName?: string;
		email?: string;
		avatarUrl?: string;
		membershipId: Id<"memberships">;
	} | null;
}

interface UnassignedMember {
	userId: Id<"users">;
	name?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	avatarUrl?: string;
	membershipId: Id<"memberships">;
}

interface OrgPositionsTabProps {
	orgId: Id<"orgs">;
}

// ─── Risk badge ─────────────────────────────────────────────────
const RISK_STYLE: Record<string, { color: string; bg: string; label: { fr: string; en: string } }> = {
	low: { color: "text-emerald-600", bg: "bg-emerald-500/10", label: { fr: "Faible", en: "Low" } },
	medium: { color: "text-amber-600", bg: "bg-amber-500/10", label: { fr: "Moyen", en: "Medium" } },
	high: { color: "text-orange-600", bg: "bg-orange-500/10", label: { fr: "Élevé", en: "High" } },
	critical: { color: "text-red-600", bg: "bg-red-500/10", label: { fr: "Critique", en: "Critical" } },
};

// ─── Grade order ────────────────────────────────────────────────
const GRADE_ORDER: PositionGrade[] = ["chief", "deputy_chief", "counselor", "agent", "external"];
const GRADE_OPTIONS: { value: string; label: { fr: string; en: string } }[] = [
	{ value: "chief", label: { fr: "Chef de mission", en: "Head of mission" } },
	{ value: "deputy_chief", label: { fr: "Adjoint au Chef", en: "Deputy Head" } },
	{ value: "counselor", label: { fr: "Conseiller", en: "Counselor" } },
	{ value: "secretary", label: { fr: "Secrétaire", en: "Secretary" } },
	{ value: "agent", label: { fr: "Agent", en: "Agent" } },
	{ value: "external", label: { fr: "Externe", en: "External" } },
	{ value: "intern", label: { fr: "Stagiaire", en: "Intern" } },
];

// ─── Task labels ────────────────────────────────────────────────
const TASK_LABELS: Record<string, { fr: string; en: string }> = {
	"requests.view": { fr: "Consulter les demandes", en: "View requests" },
	"requests.create": { fr: "Créer des demandes", en: "Create requests" },
	"requests.process": { fr: "Traiter les demandes", en: "Process requests" },
	"requests.validate": { fr: "Valider les demandes", en: "Validate requests" },
	"requests.assign": { fr: "Assigner les demandes", en: "Assign requests" },
	"requests.delete": { fr: "Supprimer les demandes", en: "Delete requests" },
	"requests.complete": { fr: "Clôturer les demandes", en: "Complete requests" },
	"documents.view": { fr: "Consulter les documents", en: "View documents" },
	"documents.validate": { fr: "Valider les documents", en: "Validate documents" },
	"documents.generate": { fr: "Générer des documents", en: "Generate documents" },
	"documents.delete": { fr: "Supprimer des documents", en: "Delete documents" },
	"appointments.view": { fr: "Consulter les rendez-vous", en: "View appointments" },
	"appointments.manage": { fr: "Gérer les rendez-vous", en: "Manage appointments" },
	"appointments.configure": { fr: "Configurer les créneaux", en: "Configure slots" },
	"profiles.view": { fr: "Consulter les profils", en: "View profiles" },
	"profiles.manage": { fr: "Gérer les profils", en: "Manage profiles" },
	"civil_status.transcribe": { fr: "Transcrire les actes", en: "Transcribe records" },
	"civil_status.register": { fr: "Enregistrer les actes", en: "Register records" },
	"civil_status.certify": { fr: "Certifier les actes", en: "Certify records" },
	"passports.process": { fr: "Traiter les passeports", en: "Process passports" },
	"passports.biometric": { fr: "Biométrie passeport", en: "Passport biometrics" },
	"passports.deliver": { fr: "Délivrer les passeports", en: "Deliver passports" },
	"visas.process": { fr: "Traiter les visas", en: "Process visas" },
	"visas.approve": { fr: "Approuver les visas", en: "Approve visas" },
	"visas.stamp": { fr: "Apposer le visa", en: "Stamp visas" },
	"finance.view": { fr: "Consulter les finances", en: "View finance" },
	"finance.collect": { fr: "Encaisser les paiements", en: "Collect payments" },
	"finance.manage": { fr: "Gérer les finances", en: "Manage finance" },
	"communication.publish": { fr: "Publier des communications", en: "Publish communications" },
	"communication.notify": { fr: "Envoyer des notifications", en: "Send notifications" },
	"team.view": { fr: "Consulter l'équipe", en: "View team" },
	"team.manage": { fr: "Gérer l'équipe", en: "Manage team" },
	"team.assign_roles": { fr: "Attribuer les rôles", en: "Assign roles" },
	"settings.view": { fr: "Consulter les paramètres", en: "View settings" },
	"settings.manage": { fr: "Modifier les paramètres", en: "Manage settings" },
	"org.view": { fr: "Consulter l'organisation", en: "View organization" },
	"schedules.view": { fr: "Consulter les plannings", en: "View schedules" },
	"schedules.manage": { fr: "Gérer les plannings", en: "Manage schedules" },
	"analytics.view": { fr: "Consulter les analyses", en: "View analytics" },
	"analytics.export": { fr: "Exporter les rapports", en: "Export reports" },
	"statistics.view": { fr: "Consulter les statistiques", en: "View statistics" },
	"intelligence.view": { fr: "Accéder au renseignement", en: "View intelligence" },
	"intelligence.manage": { fr: "Gérer le renseignement", en: "Manage intelligence" },
	"consular_registrations.view": { fr: "Consulter les inscriptions", en: "View registrations" },
	"consular_registrations.manage": { fr: "Gérer les inscriptions", en: "Manage registrations" },
	"consular_notifications.view": { fr: "Consulter les notifications", en: "View notifications" },
	"consular_cards.manage": { fr: "Gérer les cartes consulaires", en: "Manage consular cards" },
	"community_events.view": { fr: "Consulter les événements", en: "View events" },
	"community_events.manage": { fr: "Gérer les événements", en: "Manage events" },
	"payments.view": { fr: "Consulter les paiements", en: "View payments" },
	"digital_mail.view": { fr: "Consulter le courrier", en: "View mail" },
	"digital_mail.manage": { fr: "Gérer le courrier", en: "Manage mail" },
	"meetings.create": { fr: "Créer des réunions", en: "Create meetings" },
	"meetings.join": { fr: "Rejoindre des réunions", en: "Join meetings" },
	"meetings.manage": { fr: "Gérer les réunions", en: "Manage meetings" },
	"meetings.view_history": { fr: "Historique des réunions", en: "Meeting history" },
};

// ─── Module-to-tasks mapping ────────────────────────────────────
const MODULE_TASKS: Record<string, string[]> = {};
for (const code of ALL_TASK_CODES) {
	const moduleKey = code.split(".")[0];
	if (!MODULE_TASKS[moduleKey]) MODULE_TASKS[moduleKey] = [];
	MODULE_TASKS[moduleKey].push(code);
}
if (!MODULE_TASKS["org"]) MODULE_TASKS["org"] = ["org.view"];
if (!MODULE_TASKS["schedules"]) MODULE_TASKS["schedules"] = ["schedules.view", "schedules.manage"];

// ─── Module category labels ────────────────────────────────────
const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
	core: { fr: "Modules fondamentaux", en: "Core modules" },
	consular: { fr: "Modules consulaires", en: "Consular modules" },
	diplomatic: { fr: "Modules diplomatiques", en: "Diplomatic modules" },
	tools: { fr: "Communication & Outils", en: "Communication & Tools" },
	finance: { fr: "Finances & Paiements", en: "Finance & Payments" },
	admin: { fr: "Administration", en: "Administration" },
};
const CATEGORY_ORDER: string[] = ["core", "consular", "diplomatic", "tools", "finance", "admin"];

// ─── Grade icons for position cards ─────────────────────────────
const GRADE_ICONS: Record<string, string> = {
	chief: "Crown",
	deputy_chief: "Shield",
	counselor: "Briefcase",
	agent: "User",
	external: "Link",
};

// ─── Module Permission Card ────────────────────────────────────
function ModulePermissionCard({
	moduleCode,
	selected,
	onChange,
	lang,
}: {
	moduleCode: string;
	selected: Set<string>;
	onChange: (tasks: Set<string>) => void;
	lang: string;
}) {
	const moduleDef = MODULE_REGISTRY[moduleCode as ModuleCodeValue];
	const moduleTasks = MODULE_TASKS[moduleCode] ?? [];
	if (!moduleDef || moduleTasks.length === 0) return null;

	const selectedCount = moduleTasks.filter((t) => selected.has(t)).length;
	const allSelected = selectedCount === moduleTasks.length;
	const someSelected = selectedCount > 0 && !allSelected;

	const toggleModule = () => {
		const next = new Set(selected);
		if (allSelected) {
			for (const t of moduleTasks) next.delete(t);
		} else {
			for (const t of moduleTasks) next.add(t);
		}
		onChange(next);
	};

	const toggleTask = (code: string) => {
		const next = new Set(selected);
		if (next.has(code)) next.delete(code);
		else next.add(code);
		onChange(next);
	};

	const [isOpen, setIsOpen] = useState(someSelected || allSelected);

	return (
		<div className={cn(
			"rounded-lg border transition-all",
			allSelected ? "border-primary/40 bg-primary/5" : someSelected ? "border-amber-400/40 bg-amber-50/30 dark:bg-amber-900/5" : "border-border/40",
		)}>
			{/* Module header with toggle */}
			<div className="flex items-center gap-2.5 px-3 py-2.5">
				<button
					type="button"
					className="flex items-center gap-2 flex-1 min-w-0 text-left"
					onClick={() => setIsOpen(!isOpen)}
				>
					<ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-90")} />
					<DynamicLucideIcon name={moduleDef.icon} className={cn("h-4 w-4 shrink-0", moduleDef.color)} />
					<div className="min-w-0 flex-1">
						<span className="text-sm font-medium block truncate">
							{moduleDef.label[lang as "fr" | "en"] || moduleDef.label.fr}
						</span>
						<span className="text-[10px] text-muted-foreground truncate block">
							{moduleDef.description[lang as "fr" | "en"] || moduleDef.description.fr}
						</span>
					</div>
				</button>
				<Badge
					variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}
					className={cn(
						"text-[10px] h-5 min-w-[2rem] justify-center shrink-0",
						allSelected && "bg-emerald-500/90 hover:bg-emerald-500",
					)}
				>
					{selectedCount}/{moduleTasks.length}
				</Badge>
				<Switch
					checked={allSelected}
					onCheckedChange={toggleModule}
					className="shrink-0 scale-90"
				/>
			</div>
			{/* Individual tasks */}
			{isOpen && (
				<div className="px-3 pb-2.5 pt-0 border-t border-border/20 mt-0">
					<div className="grid gap-0.5 pt-1.5">
						{moduleTasks.map((code) => {
							const risk = TASK_RISK[code as TaskCodeValue] ?? "low";
							const style = RISK_STYLE[risk];
							const label = TASK_LABELS[code];
							const isChecked = selected.has(code);
							return (
								<label
									key={code}
									className={cn(
										"flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-all text-xs",
										isChecked ? "bg-primary/5" : "hover:bg-muted/30",
									)}
								>
									<Checkbox
										checked={isChecked}
										onCheckedChange={() => toggleTask(code)}
										className="h-3.5 w-3.5"
									/>
									<span className="flex-1 min-w-0 truncate">
										{label ? label[lang as "fr" | "en"] || label.fr : code}
									</span>
									<Badge className={cn("text-[9px] px-1 py-0 h-3.5 shrink-0", style.bg, style.color)}>
										{style.label[lang as "fr" | "en"] || style.label.fr}
									</Badge>
								</label>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Module Permission Selector ─────────────────────────────────
function ModulePermissionSelector({
	selected,
	onChange,
	lang,
}: {
	selected: Set<string>;
	onChange: (tasks: Set<string>) => void;
	lang: string;
}) {
	const modulesByCategory = useMemo(() => {
		const result: Record<string, string[]> = { core: [], consular: [], diplomatic: [], tools: [], finance: [], admin: [] };
		for (const [code, def] of Object.entries(MODULE_REGISTRY)) {
			const tasks = MODULE_TASKS[code];
			if (tasks && tasks.length > 0) {
				if (!result[def.category]) result[def.category] = [];
				result[def.category].push(code);
			}
		}
		return result;
	}, []);

	return (
		<div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
			{CATEGORY_ORDER.map((cat) => {
				const modules = modulesByCategory[cat];
				if (!modules || modules.length === 0) return null;
				const catLabel = CATEGORY_LABELS[cat];
				return (
					<div key={cat} className="space-y-1.5">
						<h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
							{catLabel[lang as "fr" | "en"] || catLabel.fr}
						</h4>
						<div className="grid gap-1.5">
							{modules.map((moduleCode) => (
								<ModulePermissionCard
									key={moduleCode}
									moduleCode={moduleCode}
									selected={selected}
									onChange={onChange}
									lang={lang}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Position Form Dialog ───────────────────────────────────────
function PositionFormSheet({
	open,
	onOpenChange,
	orgId,
	editPosition,
	lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
	editPosition?: Position | null;
	lang: string;
}) {
	const isEdit = !!editPosition;

	// Fetch org to get its type for position templates
	const { data: org } = useAuthenticatedConvexQuery(api.functions.orgs.getById, { orgId });
	const orgType = org?.type ?? "embassy";

	// Get position templates for this org type
	const [selectedOrgType, setSelectedOrgType] = useState<string>(orgType);
	const positionTemplates = useMemo(() => {
		const template = ORGANIZATION_TEMPLATES.find((t) => t.type === selectedOrgType);
		return template?.positions ?? [];
	}, [selectedOrgType]);

	// All org type templates that have positions
	const orgTypesWithPositions = useMemo(() => {
		return ORGANIZATION_TEMPLATES.filter((t) => t.positions.length > 0);
	}, []);

	// Form state
	const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(
		isEdit ? null : null,
	);

	const [code, setCode] = useState(editPosition?.code ?? "");
	const [titleFr, setTitleFr] = useState(editPosition?.title?.fr ?? "");
	const [titleEn, setTitleEn] = useState(editPosition?.title?.en ?? "");
	const [descFr, setDescFr] = useState(editPosition?.description?.fr ?? "");
	const [level, setLevel] = useState(editPosition?.level ?? 1);
	const [grade, setGrade] = useState(editPosition?.grade ?? "");
	const [isRequired, setIsRequired] = useState(editPosition?.isRequired ?? false);
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
		new Set(editPosition?.tasks ?? []),
	);

	const { mutateAsync: createPosition, isPending: isCreating } =
		useConvexMutationQuery(api.functions.roleConfig.createPosition);
	const { mutateAsync: updatePosition, isPending: isUpdating } =
		useConvexMutationQuery(api.functions.roleConfig.updatePosition);

	const isSaving = isCreating || isUpdating;
	const isFormValid = (isEdit || code.trim()) && titleFr.trim();

	// Handle template selection — auto-fill everything
	const selectTemplate = (template: PositionTemplate | null) => {
		if (!template) {
			// Custom position
			setSelectedTemplateCode("__custom__");
			setCode("");
			setTitleFr("");
			setTitleEn("");
			setDescFr("");
			setLevel(1);
			setGrade("");
			setIsRequired(false);
			setSelectedTasks(new Set());
			return;
		}
		setSelectedTemplateCode(template.code);
		setCode(template.code);
		setTitleFr(template.title.fr);
		setTitleEn(template.title.en);
		setDescFr(template.description.fr);
		setLevel(template.level);
		setGrade(template.grade ?? "");
		setIsRequired(template.isRequired);
		// Resolve taskPresets → actual task codes
		const resolvedTasks = getPresetTasks(template.taskPresets);
		setSelectedTasks(new Set(resolvedTasks));
	};

	const handleSubmit = async () => {
		if (!isFormValid) return;
		try {
			if (isEdit && editPosition) {
				await updatePosition({
					positionId: editPosition._id,
					title: { fr: titleFr, en: titleEn || titleFr },
					description: descFr ? { fr: descFr, en: descFr } : undefined,
					level,
					grade: grade || undefined,
					tasks: Array.from(selectedTasks) as TaskCodeValue[],
				});
				toast.success(lang === "fr" ? "Poste modifié" : "Position updated");
			} else {
				await createPosition({
					orgId,
					code: code.trim().toLowerCase().replace(/\s+/g, "_"),
					title: { fr: titleFr, en: titleEn || titleFr },
					description: descFr ? { fr: descFr, en: descFr } : undefined,
					level,
					grade: grade || undefined,
					tasks: Array.from(selectedTasks) as TaskCodeValue[],
					isRequired,
				});
				toast.success(lang === "fr" ? "Poste créé" : "Position created");
			}
			onOpenChange(false);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	};

	// For create mode, show template selector first
	const showTemplateSelector = !isEdit && selectedTemplateCode === null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[90vw] w-[1200px] max-h-[92vh] overflow-hidden p-0 gap-0">
				{/* Header */}
				<div className="border-b px-6 py-4 shrink-0">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2.5 text-lg">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
								<Shield className="h-5 w-5 text-primary" />
							</div>
							{isEdit
								? lang === "fr" ? "Modifier le poste" : "Edit position"
								: showTemplateSelector
									? lang === "fr" ? "Choisir un poste" : "Choose a position"
									: lang === "fr" ? "Configurer le poste" : "Configure position"}
						</DialogTitle>
						<DialogDescription>
							{isEdit
								? lang === "fr" ? "Modifiez les détails et les permissions" : "Edit details and permissions"
								: showTemplateSelector
									? lang === "fr"
										? "Sélectionnez un poste prédéfini ou créez un poste personnalisé"
										: "Select a predefined position or create a custom one"
									: lang === "fr"
										? "Personnalisez les détails et les permissions du poste"
										: "Customize position details and permissions"}
						</DialogDescription>
					</DialogHeader>
				</div>

				{showTemplateSelector ? (
					/* ─── Template Selector Screen ─── */
					<div className="overflow-y-auto p-5 flex-1 min-h-0">
						{/* Org type tabs — horizontal scroll */}
						<div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
							{orgTypesWithPositions.map((tpl) => {
								const isActive = selectedOrgType === tpl.type;
								const isCurrentOrg = orgType === tpl.type;
								return (
									<button
										key={tpl.type}
										type="button"
										className={cn(
											"flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 border",
											isActive
												? "bg-primary text-primary-foreground border-primary shadow-sm"
												: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
										)}
										onClick={() => setSelectedOrgType(tpl.type)}
									>
										<DynamicLucideIcon name={tpl.icon} className="h-3.5 w-3.5" />
										{tpl.label[lang as "fr" | "en"]}
										{isCurrentOrg && (
											<span className={cn(
												"text-[8px] px-1 py-0 rounded-full",
												isActive ? "bg-primary-foreground/20" : "bg-primary/10 text-primary",
											)}>
												{lang === "fr" ? "actuel" : "current"}
											</span>
										)}
									</button>
								);
							})}
						</div>

						{/* Selected org type header */}
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<DynamicLucideIcon
									name={ORGANIZATION_TEMPLATES.find((t) => t.type === selectedOrgType)?.icon ?? "Building"}
									className="h-4 w-4 text-primary"
								/>
								<span className="text-sm font-medium">
									{ORGANIZATION_TEMPLATES.find((t) => t.type === selectedOrgType)?.label[lang as "fr" | "en"] ??
										(lang === "fr" ? "Représentation" : "Representation")}
								</span>
								<span className="text-xs text-muted-foreground">— {positionTemplates.length} postes</span>
							</div>
						</div>

						{/* Compact position template grid — 4 columns */}
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
							{positionTemplates.map((tpl) => {
								const gradeInfo = tpl.grade ? POSITION_GRADES[tpl.grade] : null;
								const taskCount = getPresetTasks(tpl.taskPresets).length;
								return (
									<button
										key={tpl.code}
										type="button"
										className={cn(
											"group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
											"hover:border-primary/50 hover:bg-primary/5",
											"focus:outline-none focus:ring-2 focus:ring-primary/30",
										)}
										onClick={() => selectTemplate(tpl)}
									>
										{/* Icon */}
										<div className={cn(
											"flex h-8 w-8 items-center justify-center rounded-md shrink-0",
											gradeInfo ? gradeInfo.bgColor : "bg-muted",
										)}>
											<DynamicLucideIcon
												name={gradeInfo ? (GRADE_ICONS[tpl.grade ?? "agent"] ?? "User") : "User"}
												className={cn("h-3.5 w-3.5", gradeInfo?.color ?? "text-muted-foreground")}
											/>
										</div>
										{/* Content */}
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<span className="text-xs font-semibold truncate">
													{tpl.title[lang as "fr" | "en"] || tpl.title.fr}
												</span>
												{tpl.isRequired && (
													<Badge variant="outline" className="text-[8px] h-3.5 px-1 text-amber-600 border-amber-300 shrink-0">
														{lang === "fr" ? "Requis" : "Req."}
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-1.5 mt-0.5">
												{gradeInfo && (
													<span className={cn("text-[9px] font-medium", gradeInfo.color)}>
														{gradeInfo.label[lang as "fr" | "en"]}
													</span>
												)}
												<span className="text-[9px] text-muted-foreground">
													{taskCount} perm.
												</span>
											</div>
										</div>
									</button>
								);
							})}
							{/* Custom position — inline in grid */}
							<button
								type="button"
								className={cn(
									"group flex items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition-all",
									"hover:border-primary/50 hover:bg-primary/5",
									"focus:outline-none focus:ring-2 focus:ring-primary/30",
								)}
								onClick={() => selectTemplate(null)}
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
									<Plus className="h-3.5 w-3.5 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<span className="text-xs font-semibold">
										{lang === "fr" ? "Personnalisé" : "Custom"}
									</span>
									<span className="text-[9px] text-muted-foreground block">
										{lang === "fr" ? "Créer un poste" : "Create position"}
									</span>
								</div>
							</button>
						</div>
					</div>
				) : (
					/* ─── Configuration Screen (two columns) ─── */
					<>
						<div className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0">
							{/* Left column — Position details */}
							<div className="lg:w-[380px] lg:border-r overflow-y-auto p-5 space-y-5 shrink-0">
								{/* Back button (create mode only) */}
								{!isEdit && (
									<button
										type="button"
										className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
										onClick={() => {
											setSelectedTemplateCode(null);
										}}
									>
										<ChevronRight className="h-3 w-3 rotate-180" />
										{lang === "fr" ? "Changer de poste" : "Change position"}
									</button>
								)}

								{/* Selected template indicator */}
								{!isEdit && selectedTemplateCode && selectedTemplateCode !== "__custom__" && (
									<div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-2">
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary shrink-0" />
											<div className="min-w-0 flex-1">
												<span className="text-xs font-medium text-primary block">
													{lang === "fr" ? "Poste prédéfini sélectionné" : "Predefined position selected"}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{lang === "fr"
														? "Modifiez les champs ci-dessous si nécessaire"
														: "Modify the fields below if needed"}
												</span>
											</div>
										</div>
									</div>
								)}

								{/* General info */}
								<div className="space-y-3">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<Edit className="h-3 w-3" />
										{lang === "fr" ? "Informations" : "Information"}
									</h3>
									<div className="space-y-3">
										{/* Titre — select with all org-type positions + custom input */}
										<div className="space-y-1">
											<Label htmlFor="pos-title" className="text-xs">
												{lang === "fr" ? "Titre" : "Title"} <span className="text-destructive">*</span>
											</Label>
											{selectedTemplateCode === "__custom__" ? (
												<Input
													id="pos-title"
													value={titleFr}
													onChange={(e) => {
														setTitleFr(e.target.value);
														setTitleEn(e.target.value);
														setCode(e.target.value.trim().toLowerCase().replace(/[\s']+/g, "_").replace(/[^a-z0-9_]/g, ""));
													}}
													placeholder={lang === "fr" ? "Titre du poste personnalisé" : "Custom position title"}
													className="h-8"
												/>
											) : (
												<Select
													value={selectedTemplateCode ?? ""}
													onValueChange={(val) => {
														if (val === "__custom__") {
															selectTemplate(null);
														} else {
															const tpl = positionTemplates.find((p) => p.code === val);
															if (tpl) selectTemplate(tpl);
														}
													}}
												>
													<SelectTrigger id="pos-title" className="h-8">
														<SelectValue placeholder={lang === "fr" ? "Choisir un poste" : "Select a position"} />
													</SelectTrigger>
													<SelectContent>
														{positionTemplates.map((tpl) => (
															<SelectItem key={tpl.code} value={tpl.code}>
																{tpl.title.fr}
															</SelectItem>
														))}
														<SelectItem value="__custom__">
															{lang === "fr" ? "+ Poste personnalisé" : "+ Custom position"}
														</SelectItem>
													</SelectContent>
												</Select>
											)}
										</div>
										{/* Code — auto-filled, shown read-only */}
										{!isEdit && (
											<div className="space-y-1">
												<Label htmlFor="pos-code" className="text-xs">
													Code
												</Label>
												<Input
													id="pos-code"
													value={code}
													onChange={(e) => setCode(e.target.value)}
													placeholder="auto"
													className="font-mono text-xs h-7 bg-muted/30"
													readOnly={!!selectedTemplateCode && selectedTemplateCode !== "__custom__"}
												/>
											</div>
										)}
										<div className="space-y-1">
											<Label htmlFor="pos-desc" className="text-xs">{lang === "fr" ? "Description" : "Description"}</Label>
											<Input id="pos-desc" value={descFr} onChange={(e) => setDescFr(e.target.value)} placeholder={lang === "fr" ? "Description du rôle" : "Role description"} className="h-8" />
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1">
												<Label htmlFor="pos-level" className="text-xs">{lang === "fr" ? "Niveau" : "Level"}</Label>
												<Input id="pos-level" type="number" min={1} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="h-8" />
											</div>
											<div className="space-y-1">
												<Label htmlFor="pos-grade" className="text-xs">{lang === "fr" ? "Grade" : "Grade"}</Label>
												<Select value={grade} onValueChange={setGrade}>
													<SelectTrigger id="pos-grade" className="h-8">
														<SelectValue placeholder={lang === "fr" ? "Sélectionner" : "Select"} />
													</SelectTrigger>
													<SelectContent>
														{GRADE_OPTIONS.map((g) => (
															<SelectItem key={g.value} value={g.value}>
																{g.label[lang as "fr" | "en"] || g.label.fr}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
										{!isEdit && (
											<label className="flex items-center gap-2 cursor-pointer">
												<Checkbox checked={isRequired} onCheckedChange={(v: boolean) => setIsRequired(v)} className="h-3.5 w-3.5" />
												<span className="text-xs">{lang === "fr" ? "Poste requis (non supprimable)" : "Required (non-deletable)"}</span>
											</label>
										)}
									</div>
								</div>

								{/* Summary of permissions */}
								<div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
									<h4 className="text-xs font-medium flex items-center gap-1.5">
										<Shield className="h-3 w-3 text-primary" />
										{lang === "fr" ? "Résumé des permissions" : "Permission summary"}
									</h4>
									<div className="flex items-center gap-3">
										<div className="text-2xl font-bold text-primary">{selectedTasks.size}</div>
										<div className="text-[10px] text-muted-foreground leading-tight">
											{lang === "fr" ? "permissions\nactivées" : "permissions\nenabled"}
										</div>
									</div>
									{selectedTasks.size > 0 && (
										<button
											type="button"
											className="text-[10px] text-destructive/70 hover:text-destructive transition-colors"
											onClick={() => setSelectedTasks(new Set())}
										>
											{lang === "fr" ? "× Tout désélectionner" : "× Clear all"}
										</button>
									)}
								</div>
							</div>

							{/* Right column — Module permissions */}
							<div className="flex-1 overflow-y-auto p-5 min-w-0">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<Shield className="h-3 w-3" />
										{lang === "fr" ? "Permissions par module" : "Permissions by module"}
									</h3>
									<Badge variant="secondary" className="text-[10px]">
										{selectedTasks.size} {lang === "fr" ? "sélectionnées" : "selected"}
									</Badge>
								</div>
								<ModulePermissionSelector selected={selectedTasks} onChange={setSelectedTasks} lang={lang} />
							</div>
						</div>

						{/* Footer */}
						<div className="shrink-0 border-t px-6 py-3 flex items-center justify-between">
							<div className="text-xs text-muted-foreground flex items-center gap-1.5">
								{selectedTasks.size > 0 && (
									<>
										<Shield className="h-3 w-3" />
										{selectedTasks.size} {lang === "fr" ? "permissions actives" : "active permissions"}
									</>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
									{lang === "fr" ? "Annuler" : "Cancel"}
								</Button>
								<Button size="sm" onClick={handleSubmit} disabled={!isFormValid || isSaving} className="gap-1.5">
									{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
									{isEdit
										? lang === "fr" ? "Enregistrer" : "Save"
										: lang === "fr" ? "Créer le poste" : "Create position"}
								</Button>
							</div>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
// ─── Main Component ─────────────────────────────────────────────

export function OrgPositionsTab({ orgId }: OrgPositionsTabProps) {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	// Form Sheet State
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingPosition, setEditingPosition] = useState<Position | null>(null);

	// Assignment Dialog States
	const [assignTarget, setAssignTarget] = useState<{positionId: Id<"positions">, positionTitle: string} | null>(null);
	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	
	const [selectedMember, setSelectedMember] = useState<{membershipId: Id<"memberships">, firstName?: string, lastName?: string} | null>(null);
	const [changePositionDialogOpen, setChangePositionDialogOpen] = useState(false);

	const [collapsedGrades, setCollapsedGrades] = useState<Set<string>>(new Set());

	// Queries & Mutations
	const { data: orgChart, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		{ orgId },
	);

	const { mutateAsync: deletePosition, isPending: isDeleting } =
		useConvexMutationQuery(api.functions.roleConfig.deletePosition);

	const { mutateAsync: moveGrade } =
		useConvexMutationQuery(api.functions.roleConfig.movePositionGrade);
	const { mutateAsync: changeGrade } =
		useConvexMutationQuery(api.functions.roleConfig.changePositionGrade);
	const { mutateAsync: assignPosition, isPending: isAssigning } =
		useConvexMutationQuery(api.functions.orgs.assignMemberPosition);

	// Drag-and-drop state
	const [draggedPositionId, setDraggedPositionId] = useState<Id<"positions"> | null>(null);
	const [dropTargetGrade, setDropTargetGrade] = useState<string | null>(null);

	// Handlers
	const positionsByGrade = useMemo(() => {
		if (!orgChart) return {};
		return orgChart.positions.reduce<Record<string, Position[]>>(
			(acc, pos) => {
				const grade = pos.grade || "agent";
				if (!acc[grade]) acc[grade] = [];
				acc[grade].push(pos as unknown as Position);
				return acc;
			},
			{},
		);
	}, [orgChart]);

	const toggleGrade = (grade: string) => {
		setCollapsedGrades((prev) => {
			const next = new Set(prev);
			if (next.has(grade)) next.delete(grade);
			else next.add(grade);
			return next;
		});
	};

	const handleDelete = async (positionId: Id<"positions">) => {
		try {
			await deletePosition({ positionId });
			toast.success(lang === "fr" ? "Poste supprimé" : "Position deleted");
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	};



	const handleMoveGrade = async (positionId: Id<"positions">, direction: "up" | "down") => {
		try {
			const result = await moveGrade({ positionId, direction });
			if (result.changed) {
				const gradeLabel = POSITION_GRADES[result.grade as PositionGrade];
				toast.success(
					lang === "fr"
						? `Poste déplacé vers ${gradeLabel?.label.fr ?? result.grade}`
						: `Position moved to ${gradeLabel?.label.en ?? result.grade}`,
				);
			}
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	};

	const handleDrop = useCallback(async (positionId: Id<"positions">, targetGrade: string) => {
		try {
			await changeGrade({ positionId, newGrade: targetGrade });
			const gradeLabel = POSITION_GRADES[targetGrade as PositionGrade];
			toast.success(
				lang === "fr"
					? `Poste déplacé vers ${gradeLabel?.label.fr ?? targetGrade}`
					: `Position moved to ${gradeLabel?.label.en ?? targetGrade}`,
			);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	}, [changeGrade, lang]);

	const handleAssignSubmit = async (membershipId: Id<"memberships">, positionId: Id<"positions"> | null) => {
		try {
			await assignPosition({ orgId, membershipId, positionId });
			toast.success(lang === "fr" ? "Assignation mise à jour" : "Assignment updated");
			setAssignDialogOpen(false);
			setChangePositionDialogOpen(false);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	};

	if (isPending) {
		return (
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
				))}
			</div>
		);
	}

	if (!orgChart) return null;

	const allMembers = [
		...(orgChart.positions.flatMap((p: any) => p.occupants || []) as unknown as UnassignedMember[]),
		...(orgChart.unassignedMembers),
	];

	// Assignment Dialog States
	const selectedAssignId = ""; // React requires these variables for the component below to not conflict with the state. This is just to satisfy the compiler if it was needed inside the main body.
	
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
						<Crown className="h-5 w-5 text-amber-500" />
					</div>
					<div>
						<h3 className="font-semibold">
							{lang === "fr" ? "Postes & Permissions" : "Positions & Permissions"}
						</h3>
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<span>{orgChart.totalPositions} {lang === "fr" ? "postes" : "positions"}</span>
							<span className="text-emerald-600">{orgChart.filledPositions} {lang === "fr" ? "occupés" : "filled"}</span>
							<span className="text-amber-600">{orgChart.vacantPositions} {lang === "fr" ? "vacants" : "vacant"}</span>
						</div>
					</div>
				</div>
				<Button size="sm" onClick={() => { setEditingPosition(null); setSheetOpen(true); }}>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					{lang === "fr" ? "Nouveau poste" : "New position"}
				</Button>
			</div>

			{/* Hierarchy by Grade */}
			<FlatCard>
				<div className="pb-3 pt-3 px-4">
					<div className="flex items-center gap-2 text-base font-semibold">
						<Users className="h-4 w-4" />
						{lang === "fr" ? "Organigramme par grade" : "Org chart by grade"}
					</div>
					<p className="text-sm text-muted-foreground mt-1">
						{lang === "fr"
							? "Postes organisés par grade hiérarchique"
							: "Positions organized by hierarchical grade"}
					</p>
				</div>
				<div className="p-3 lg:p-4 space-y-4">
					{GRADE_ORDER.map((gradeKey) => {
						const grade = POSITION_GRADES[gradeKey];
						const gradePositions = positionsByGrade[gradeKey] ?? [];
						const isCollapsed = collapsedGrades.has(gradeKey);
						const filledCount = gradePositions.reduce((acc, p) => acc + (p.occupants?.length || 0), 0);

						return (
							<div
								key={gradeKey}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setDropTargetGrade(gradeKey);
								}}
								onDragLeave={(e) => {
									// Only reset if we're leaving the container, not entering a child
									const related = e.relatedTarget as HTMLElement | null;
									if (!e.currentTarget.contains(related)) {
										setDropTargetGrade(null);
									}
								}}
								onDrop={async (e) => {
									e.preventDefault();
									setDropTargetGrade(null);
									const posId = e.dataTransfer.getData("text/position-id") as Id<"positions">;
									if (posId && draggedPositionId) {
										// Check if position is already in this grade
										const pos = orgChart?.positions.find((p: any) => p._id === posId);
										if (pos && (pos.grade || "agent") !== gradeKey) {
											await handleDrop(posId, gradeKey);
										}
									}
									setDraggedPositionId(null);
								}}
							>
								{/* Grade header — collapsible */}
								<button
									type="button"
									className={cn(
										`w-full flex items-center gap-2.5 py-2 px-3 rounded-lg transition-all`,
										grade.bgColor,
										"hover:opacity-90",
										dropTargetGrade === gradeKey && "ring-2 ring-primary ring-offset-2 scale-[1.01]",
									)}
									onClick={() => toggleGrade(gradeKey)}
								>
									{isCollapsed ? (
										<ChevronRight className={`h-4 w-4 ${grade.color}`} />
									) : (
										<ChevronDown className={`h-4 w-4 ${grade.color}`} />
									)}
									<DynamicLucideIcon
										name={grade.icon}
										className={`h-4 w-4 ${grade.color}`}
									/>
									<span className={`text-xs font-semibold uppercase tracking-wider ${grade.color}`}>
										{getLocalizedValue(grade.label, lang)}
									</span>
									<Badge
										variant="outline"
										className={`text-[10px] px-1.5 py-0 ml-auto ${grade.borderColor}`}
									>
										{filledCount}/{gradePositions.length}
									</Badge>
								</button>

								{/* Position cards within grade */}
								{!isCollapsed && (
									<div className={cn(
										"mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pl-2 transition-all min-h-[60px]",
										dropTargetGrade === gradeKey && "bg-primary/5 rounded-lg p-2 border-2 border-dashed border-primary/30",
									)}>
										{gradePositions.length === 0 && (
											<div className="col-span-full py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
												{dropTargetGrade === gradeKey
													? (lang === "fr" ? "Déposez le poste ici" : "Drop the position here")
													: (lang === "fr" ? "Aucun poste dans ce grade" : "No positions in this grade")}
											</div>
										)}
										{gradePositions.map((pos) => (
											<div
												key={pos._id}
												draggable
												onDragStart={(e) => {
													e.dataTransfer.setData("text/position-id", pos._id);
													e.dataTransfer.effectAllowed = "move";
													setDraggedPositionId(pos._id);
												}}
												onDragEnd={() => {
													setDraggedPositionId(null);
													setDropTargetGrade(null);
												}}
												className={cn(
													"rounded-xl border transition-all group flex flex-col cursor-grab active:cursor-grabbing",
													pos.occupant
														? "border-border bg-card hover:shadow-md hover:border-primary/30"
														: "border-dashed border-muted-foreground/30 bg-muted/30 hover:border-primary/40",
													draggedPositionId === pos._id && "opacity-50 scale-95 shadow-lg",
												)}
											>
												{/* Position header */}
												<div className="px-3.5 pt-3 pb-2 flex-1">
													<div className="flex items-start justify-between gap-2">
														<div className="min-w-0 flex-1">
															<p className="text-sm font-semibold leading-tight truncate">
																{getLocalizedValue(pos.title, lang)}
															</p>
															<p className="text-[11px] text-muted-foreground mt-0.5">
																Niveau {pos.level}
																{pos.isRequired && " • Requis"}
															</p>
														</div>
														{/* Action buttons (appear on hover) */}
														<div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
															<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveGrade(pos._id, "up")} title={lang === "fr" ? "Monter de grade" : "Move grade up"}>
																<ArrowUp className="h-3 w-3" />
															</Button>
															<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveGrade(pos._id, "down")} title={lang === "fr" ? "Descendre de grade" : "Move grade down"}>
																<ArrowDown className="h-3 w-3" />
															</Button>
															<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingPosition(pos); setSheetOpen(true); }} title="Modifier">
																<Edit className="h-3 w-3" />
															</Button>
															{!pos.isRequired && (
																<Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(pos._id)} disabled={isDeleting} title="Supprimer">
																	<Trash2 className="h-3 w-3" />
																</Button>
															)}
														</div>
													</div>
													{/* Task tags */}
													{pos.tasks?.length > 0 && (
														<div className="flex flex-wrap gap-1 mt-1.5">
							{pos.tasks.slice(0, 3).map((task: string) => {
								const tLabel = TASK_LABELS[task];
								return (
									<Badge key={task} variant="secondary" className="text-[9px] px-1.5 py-0" title={task}>
										{tLabel ? tLabel[lang as "fr" | "en"] || tLabel.fr : task}
									</Badge>
								);
							})}
															{pos.tasks.length > 3 && (
																<Badge variant="secondary" className="text-[9px] px-1.5 py-0">
																	+{pos.tasks.length - 3}
																</Badge>
															)}
														</div>
													)}
												</div>

												{/* Occupants */}
												<div className="px-3.5 py-2.5 space-y-1.5 flex flex-col h-full">
													{pos.occupants && pos.occupants.length > 0 && (
														<div className="space-y-1">
															{pos.occupants.map((occ: any) => (
																<div key={occ.membershipId} className="flex items-center gap-2 relative group/occ bg-muted/20 p-1.5 rounded-lg border border-transparent hover:border-border transition-colors">
																	<Avatar className="h-7 w-7 ring-2 ring-primary/10">
																		<AvatarImage src={occ.avatarUrl} />
																		<AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
																			{(occ.firstName?.[0] || "").toUpperCase()}
																			{(occ.lastName?.[0] || "").toUpperCase()}
																		</AvatarFallback>
																	</Avatar>
																	<div className="flex-1 min-w-0">
																		<p className="text-xs font-medium truncate">
																			{occ.firstName} {occ.lastName}
																		</p>
																		{occ.email && (
																			<p className="text-[10px] text-muted-foreground truncate opacity-80">
																				{occ.email}
																			</p>
																		)}
																	</div>
																	{/* Actions (hover over occupant) */}
																	<div className="absolute right-1 opacity-0 group-hover/occ:opacity-100 transition-opacity bg-card shadow-sm rounded-md border">
																		<DropdownMenu>
																			<DropdownMenuTrigger asChild>
																				<Button variant="ghost" size="icon" className="h-6 w-6">
																					<MoreHorizontal className="h-3.5 w-3.5" />
																				</Button>
																			</DropdownMenuTrigger>
																			<DropdownMenuContent align="end">
																				<DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
																					{occ.firstName} {occ.lastName}
																				</DropdownMenuLabel>
																				<DropdownMenuItem onClick={() => {
																					setSelectedMember(occ);
																					setChangePositionDialogOpen(true);
																				}}>
																					<Shield className="mr-2 h-3.5 w-3.5" />
																					{lang === 'fr' ? "Changer de poste" : "Change position"}
																				</DropdownMenuItem>
																				<DropdownMenuSeparator />
																				<DropdownMenuItem 
																					className="text-destructive focus:text-destructive"
																					onClick={() => handleAssignSubmit(occ.membershipId, null)}
																				>
																					<UserMinus className="mr-2 h-3.5 w-3.5" />
																					{lang === 'fr' ? "Retirer du poste" : "Remove from position"}
																				</DropdownMenuItem>
																			</DropdownMenuContent>
																		</DropdownMenu>
																	</div>
																</div>
															))}
														</div>
													)}

													<div className="mt-auto pt-1">
														<button
															type="button"
															className={cn("w-full flex items-center gap-2 cursor-pointer group/btn rounded-md transition-colors", pos.occupants?.length ? "py-1 hover:bg-muted px-1.5" : "py-1.5")}
															onClick={() => {
																setAssignTarget({ positionId: pos._id, positionTitle: getLocalizedValue(pos.title, lang) });
																setAssignDialogOpen(true);
															}}
														>
															<div className={cn("flex items-center justify-center transition-colors", pos.occupants?.length ? "h-6 w-6 rounded bg-muted-foreground/10 group-hover/btn:bg-primary/20" : "h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover/btn:border-primary/50")}>
																<UserPlus className={cn("text-muted-foreground/50 group-hover/btn:text-primary/80", pos.occupants?.length ? "h-3 w-3" : "h-3.5 w-3.5")} />
															</div>
															<span className={cn("text-muted-foreground group-hover/btn:text-primary transition-colors", pos.occupants?.length ? "text-[11px] font-medium" : "text-xs")}>
																{lang === 'fr' ? "Assigner un membre" : "Assign a member"}
															</span>
														</button>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</FlatCard>

			{/* Unassigned members */}
			{orgChart.unassignedMembers.length > 0 && (
				<FlatCard className="border border-amber-200 dark:border-amber-800/50">
					<div className="pb-3 pt-3 px-4">
						<div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
							<Users className="h-4 w-4" />
							{lang === "fr" ? "Membres sans poste" : "Unassigned members"} ({orgChart.unassignedMembers.length})
						</div>
					</div>
					<div className="p-3 lg:p-4">
						<div className="flex flex-wrap gap-2">
							{orgChart.unassignedMembers.map((member) => (
								<div key={member.membershipId} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:border-primary/40 transition-colors group">
									<Avatar className="h-6 w-6">
										<AvatarImage src={member.avatarUrl} />
										<AvatarFallback className="text-[10px] font-bold text-muted-foreground">
											{(member.firstName?.[0] || "").toUpperCase()}
											{(member.lastName?.[0] || "").toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm">{member.firstName} {member.lastName}</span>
									<Button 
										variant="ghost" 
										size="icon" 
										className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
										onClick={() => {
											setSelectedMember(member);
											setChangePositionDialogOpen(true);
										}}
									>
										<UserPlus className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</FlatCard>
			)}

			{/* Create/Edit Sheet */}
			<PositionFormSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				orgId={orgId}
				editPosition={editingPosition}
				lang={lang}
			/>

			{/* Assign Member to Position Dialog */}
			<AssignMemberDialog
				open={assignDialogOpen}
				onOpenChange={setAssignDialogOpen}
				positionTitle={assignTarget?.positionTitle ?? ""}
				unassignedMembers={orgChart.unassignedMembers}
				allMembers={allMembers}
				onAssign={(membershipId) => {
					if (assignTarget) {
						handleAssignSubmit(membershipId, assignTarget.positionId);
					}
				}}
				lang={lang}
				isAssigning={isAssigning}
			/>

			{/* Change Member's Position Dialog */}
			{selectedMember && (
				<ChangePositionDialog
					open={changePositionDialogOpen}
					onOpenChange={setChangePositionDialogOpen}
					memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
					membershipId={selectedMember.membershipId}
					positions={orgChart.positions as unknown as Position[]}
					onAssign={(membershipId, positionId) => handleAssignSubmit(membershipId, positionId)}
					lang={lang}
					isAssigning={isAssigning}
				/>
			)}
		</div>
	);
}

// ─── Assign Member Dialog ────────────────────────────────────────

function AssignMemberDialog({
	open,
	onOpenChange,
	positionTitle,
	unassignedMembers,
	allMembers,
	onAssign,
	lang,
	isAssigning,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	positionTitle: string;
	unassignedMembers: UnassignedMember[];
	allMembers: UnassignedMember[];
	onAssign: (membershipId: Id<"memberships">) => void;
	lang: string;
	isAssigning: boolean;
}) {
	const [selectedId, setSelectedId] = useState<string>("");
	const [openCombobox, setOpenCombobox] = useState(false);

	const selectedMember = allMembers.find((m) => m.membershipId === selectedId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="h-5 w-5 text-primary" />
						{lang === 'fr' ? "Assigner un membre" : "Assign a member"}
					</DialogTitle>
					<DialogDescription>
						{lang === 'fr' ? "Choisissez un membre pour le poste de " : "Choose a member for the position of "}
						<strong>{positionTitle}</strong>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<Popover open={openCombobox} onOpenChange={setOpenCombobox} modal={true}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								aria-expanded={openCombobox}
								className="w-full justify-between font-normal h-auto py-2"
							>
								{selectedMember ? (
									<div className="flex items-center gap-2">
										<Avatar className="h-5 w-5">
											<AvatarImage src={selectedMember.avatarUrl} />
											<AvatarFallback className="text-[9px]">
												{(selectedMember.firstName?.[0] || "").toUpperCase()}
												{(selectedMember.lastName?.[0] || "").toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span>{selectedMember.firstName} {selectedMember.lastName}</span>
									</div>
								) : (
									<span className="text-muted-foreground">
										{lang === 'fr' ? "Sélectionner un membre..." : "Select a member..."}
									</span>
								)}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
							<Command>
								<CommandInput placeholder={lang === 'fr' ? "Rechercher un membre..." : "Search member..."} />
								<CommandList>
									<CommandEmpty>{lang === 'fr' ? "Aucun résultat." : "No results found."}</CommandEmpty>
									
									{unassignedMembers.length > 0 && (
										<CommandGroup heading={lang === 'fr' ? "— Sans poste —" : "— Unassigned —"}>
											{unassignedMembers.map((m) => (
												<CommandItem
													key={m.membershipId}
													value={`${m.firstName} ${m.lastName} ${m.email}`}
													onSelect={() => {
														setSelectedId(m.membershipId);
														setOpenCombobox(false);
													}}
												>
													<Check className={cn("mr-2 h-4 w-4", selectedId === m.membershipId ? "opacity-100" : "opacity-0")} />
													<div className="flex items-center gap-2">
														<Avatar className="h-5 w-5">
															<AvatarImage src={m.avatarUrl} />
															<AvatarFallback className="text-[9px]">
																{(m.firstName?.[0] || "").toUpperCase()}
																{(m.lastName?.[0] || "").toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span>{m.firstName} {m.lastName}</span>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
									
									{allMembers.length > unassignedMembers.length && (
										<CommandGroup heading={lang === 'fr' ? "— Réassigner depuis un autre poste —" : "— Reassign from another position —"}>
											{allMembers
												.filter((m) => !unassignedMembers.some((u) => u.membershipId === m.membershipId))
												.map((m) => (
												<CommandItem
													key={m.membershipId}
													value={`${m.firstName} ${m.lastName} ${m.email}`}
													onSelect={() => {
														setSelectedId(m.membershipId);
														setOpenCombobox(false);
													}}
												>
													<Check className={cn("mr-2 h-4 w-4", selectedId === m.membershipId ? "opacity-100" : "opacity-0")} />
													<div className="flex items-center gap-2">
														<Avatar className="h-5 w-5">
															<AvatarImage src={m.avatarUrl} />
															<AvatarFallback className="text-[9px]">
																{(m.firstName?.[0] || "").toUpperCase()}
																{(m.lastName?.[0] || "").toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span>{m.firstName} {m.lastName}</span>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
							{lang === 'fr' ? "Annuler" : "Cancel"}
						</Button>
						<Button disabled={!selectedId || isAssigning} onClick={() => onAssign(selectedId as Id<"memberships">)}>
							{isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{lang === 'fr' ? "Assigner" : "Assign"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ─── Change Position Dialog ──────────────────────────────────────

function ChangePositionDialog({
	open,
	onOpenChange,
	memberName,
	membershipId,
	positions,
	onAssign,
	lang,
	isAssigning,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberName: string;
	membershipId: Id<"memberships">;
	positions: Position[];
	onAssign: (membershipId: Id<"memberships">, positionId: Id<"positions">) => void;
	lang: string;
	isAssigning: boolean;
}) {
	const [selectedPositionId, setSelectedPositionId] = useState<string>("");
	const [openCombobox, setOpenCombobox] = useState(false);

	const selectedPosition = positions.find((p) => p._id === selectedPositionId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						{lang === 'fr' ? "Assigner à un poste" : "Assign to a position"}
					</DialogTitle>
					<DialogDescription>
						{lang === 'fr' ? "Choisissez un nouveau poste pour " : "Choose a new position for "}
						<strong>{memberName}</strong>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<Popover open={openCombobox} onOpenChange={setOpenCombobox} modal={true}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								aria-expanded={openCombobox}
								className="w-full justify-between font-normal h-auto py-2"
							>
								{selectedPosition ? (
									<div className="flex items-center gap-2">
										<span>{getLocalizedValue(selectedPosition.title, lang)}</span>
										{selectedPosition.grade && POSITION_GRADES[selectedPosition.grade as PositionGrade] && (
											<Badge variant="outline" className="text-[10px] px-1.5 py-0">
												{getLocalizedValue(POSITION_GRADES[selectedPosition.grade as PositionGrade].label, lang)}
											</Badge>
										)}
									</div>
								) : (
									<span className="text-muted-foreground">
										{lang === 'fr' ? "Sélectionner un poste..." : "Select a position..."}
									</span>
								)}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
							<Command>
								<CommandInput placeholder={lang === 'fr' ? "Rechercher un poste..." : "Search position..."} />
								<CommandList>
									<CommandEmpty>{lang === 'fr' ? "Aucun poste trouvé." : "No positions found."}</CommandEmpty>
									<CommandGroup>
										{positions.map((pos) => {
											const localizedTitle = getLocalizedValue(pos.title, lang);
											return (
												<CommandItem
													key={pos._id}
													value={localizedTitle}
													onSelect={() => {
														setSelectedPositionId(pos._id);
														setOpenCombobox(false);
													}}
												>
													<Check className={cn("mr-2 h-4 w-4", selectedPositionId === pos._id ? "opacity-100" : "opacity-0")} />
													<div className="flex items-center gap-2">
														<span>{localizedTitle}</span>
														{pos.grade && POSITION_GRADES[pos.grade as PositionGrade] && (
															<span className="text-muted-foreground text-[10px]">
																· {getLocalizedValue(POSITION_GRADES[pos.grade as PositionGrade].label, lang)}
															</span>
														)}
													</div>
												</CommandItem>
											);
										})}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
							{lang === 'fr' ? "Annuler" : "Cancel"}
						</Button>
						<Button disabled={!selectedPositionId || isAssigning} onClick={() => onAssign(membershipId, selectedPositionId as Id<"positions">)}>
							{isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{lang === 'fr' ? "Assigner" : "Assign"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
