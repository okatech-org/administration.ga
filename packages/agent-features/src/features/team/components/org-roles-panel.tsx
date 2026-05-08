"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	MODULE_ACCESS_TASKS,
	MODULE_REGISTRY,
	type ModuleCategory,
	type ModuleCodeValue,
	type ModuleDefinition,
} from "@convex/lib/moduleCodes";
import {
	getPresetTasks,
	type OrganizationTemplate,
	POSITION_GRADES,
	type PositionGrade,
	type TaskPresetDefinition,
} from "@convex/lib/roles";
import {
	ALL_TASK_CODES,
	TASK_RISK,
	type TaskCodeValue,
} from "@convex/lib/taskCodes";
import type { LocalizedString } from "@convex/lib/validators";
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	Building2,
	ChevronDown,
	ChevronRight,
	GraduationCap,
	Layers,
	Loader2,
	MoreVertical,
	Pencil,
	Play,
	Plus,
	Power,
	RotateCcw,
	Shield,
	Star,
	Trash2,
	UserCog,
	Wand2,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../../components/my-space/flat-card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { getLocalizedValue } from "../../../lib/i18n-utils";
import { DynamicLucideIcon } from "../../../lib/lucide-icon";
import { cn } from "@workspace/ui/lib/utils";

// ─── Helpers ────────────────────────────────────────────
function toSnakeCase(str: string): string {
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

// ─── Shared UI bits ─────────────────────────────────────

function SectionLabel({
	icon: Icon,
	label,
	hint,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	hint?: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<div className="rounded-md bg-foreground/[0.06] p-1 dark:bg-foreground/[0.12]">
				<Icon className="h-3.5 w-3.5 text-muted-foreground" />
			</div>
			<span className="text-sm font-semibold">{label}</span>
			{hint && (
				<span className="text-[10px] font-normal text-muted-foreground">
					{hint}
				</span>
			)}
		</div>
	);
}

function ToggleCard({
	icon: Icon,
	iconClassName,
	title,
	description,
	checked,
	onChange,
}: {
	icon: React.ComponentType<{ className?: string }>;
	iconClassName?: string;
	title: string;
	description: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div
			onClick={() => onChange(!checked)}
			className={cn(
				"flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all",
				checked
					? "border-primary/30 bg-primary/5"
					: "border-border/60 bg-muted/20 hover:bg-muted/40",
			)}
		>
			<div
				className={cn(
					"shrink-0 rounded-lg p-1.5",
					checked ? "bg-primary/10 text-primary" : "bg-muted/50",
					iconClassName,
				)}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
			</div>
			<Switch
				checked={checked}
				onCheckedChange={onChange}
				onClick={(e) => e.stopPropagation()}
			/>
		</div>
	);
}

// ─── Types ──────────────────────────────────────────────

interface PositionDoc {
	_id: Id<"positions">;
	orgId: Id<"orgs">;
	code: string;
	title: LocalizedString;
	description?: LocalizedString;
	level: number;
	grade?: string;
	ministryGroupId?: Id<"ministryGroups">;
	tasks: string[];
	isRequired: boolean;
	isUnique?: boolean;
	isActive: boolean;
}

interface MinistryGroupDoc {
	_id: Id<"ministryGroups">;
	orgId: Id<"orgs">;
	code: string;
	label: LocalizedString;
	description?: LocalizedString;
	icon?: string;
	sortOrder: number;
	parentCode?: string;
	isActive: boolean;
}

function getErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof Error) return err.message;
	return fallback;
}

// ─── Task labels (FR/EN) ────────────────────────────────────────
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
	"documents.manage_templates": { fr: "Gérer les modèles", en: "Manage templates" },
	"documents.sign": { fr: "Signer des documents", en: "Sign documents" },
	"documents.publish": { fr: "Publier des documents", en: "Publish documents" },
	"documents.ai_generation": { fr: "Génération IA de modèles", en: "AI template generation" },
	"appointments.view": { fr: "Consulter les rendez-vous", en: "View appointments" },
	"appointments.manage": { fr: "Gérer les rendez-vous", en: "Manage appointments" },
	"appointments.configure": { fr: "Configurer les créneaux", en: "Configure slots" },
	"profiles.view": { fr: "Consulter les profils", en: "View profiles" },
	"profiles.manage": { fr: "Gérer les profils", en: "Manage profiles" },
	"citizen_profiles.view": { fr: "Consulter les profils citoyens", en: "View citizen profiles" },
	"citizen_profiles.manage": { fr: "Gérer les profils citoyens", en: "Manage citizen profiles" },
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
	"team.supervise": { fr: "Superviser les agents", en: "Supervise agents" },
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
	"intelligence.profiles.view": { fr: "Consulter les profils surveillés", en: "View watched profiles" },
	"intelligence.profiles.search": { fr: "Rechercher des profils", en: "Search profiles" },
	"intelligence.profiles.export": { fr: "Exporter les profils", en: "Export profiles" },
	"intelligence.notes.view": { fr: "Lire les notes confidentielles", en: "Read confidential notes" },
	"intelligence.notes.create": { fr: "Rédiger des notes", en: "Create notes" },
	"intelligence.notes.delete_own": { fr: "Supprimer ses notes", en: "Delete own notes" },
	"intelligence.notes.delete_any": { fr: "Supprimer toute note", en: "Delete any note" },
	"intelligence.map.view": { fr: "Consulter la cartographie", en: "View intelligence map" },
	"intelligence.watchlists.view": { fr: "Consulter les listes de surveillance", en: "View watchlists" },
	"intelligence.watchlists.manage": { fr: "Gérer les listes de surveillance", en: "Manage watchlists" },
	"intelligence.links.view": { fr: "Consulter le graphe relationnel", en: "View relational graph" },
	"intelligence.links.manage": { fr: "Gérer les liens entre cibles", en: "Manage target links" },
	"intelligence.briefing.generate": { fr: "Générer des briefings IA", en: "Generate AI briefings" },
	"intelligence.cases.view": { fr: "Consulter les dossiers d'investigation", en: "View investigation cases" },
	"intelligence.cases.create": { fr: "Ouvrir un dossier", en: "Open a case" },
	"intelligence.cases.edit": { fr: "Modifier un dossier", en: "Edit a case" },
	"intelligence.cases.close": { fr: "Clore un dossier", en: "Close a case" },
	"intelligence.cases.archive": { fr: "Archiver un dossier", en: "Archive a case" },
	"intelligence.configure": { fr: "Configurer le module Renseignement", en: "Configure Intelligence module" },
	"consular_registrations.view": { fr: "Consulter les inscriptions", en: "View registrations" },
	"consular_registrations.manage": { fr: "Gérer les inscriptions", en: "Manage registrations" },
	"consular_notifications.view": { fr: "Consulter les notifications", en: "View notifications" },
	"consular_cards.manage": { fr: "Gérer les cartes consulaires", en: "Manage consular cards" },
	"community_events.view": { fr: "Consulter les événements", en: "View events" },
	"community_events.manage": { fr: "Gérer les événements", en: "Manage events" },
	"meetings.create": { fr: "Créer des réunions", en: "Create meetings" },
	"meetings.join": { fr: "Rejoindre des réunions", en: "Join meetings" },
	"meetings.manage": { fr: "Gérer les réunions", en: "Manage meetings" },
	"meetings.view_history": { fr: "Historique des réunions", en: "Meeting history" },
	"meetings.hold": { fr: "Mettre en attente", en: "Hold calls" },
	"meetings.transfer": { fr: "Transférer les appels", en: "Transfer calls" },
	"meetings.supervise": { fr: "Superviser les appels", en: "Supervise calls" },
	"chats.view": { fr: "Consulter les conversations", en: "View chats" },
	"chats.send": { fr: "Envoyer des messages", en: "Send chat messages" },
	"chats.accessStandardThread": { fr: "Accéder aux threads standards", en: "Access standard threads" },
	"correspondance.view": { fr: "Consulter le courrier", en: "View correspondance" },
	"correspondance.create": { fr: "Rédiger du courrier", en: "Create correspondance" },
	"correspondance.approve": { fr: "Approuver le courrier", en: "Approve correspondance" },
	"correspondance.sign": { fr: "Signer le courrier", en: "Sign correspondance" },
	"correspondance.transmit": { fr: "Transmettre le courrier", en: "Transmit correspondance" },
	"correspondance.supervise": { fr: "Superviser le courrier", en: "Supervise correspondance" },
	"correspondance.configure": { fr: "Configurer le module courrier", en: "Configure correspondance module" },
	"correspondance.admin": { fr: "Administrer le module courrier", en: "Administer correspondance module" },
	"voicemails.view": { fr: "Consulter la messagerie", en: "View voicemails" },
	"voicemails.listen": { fr: "Écouter les messages vocaux", en: "Listen voicemails" },
	"voicemails.delete": { fr: "Supprimer des messages vocaux", en: "Delete voicemails" },
	"callRecordings.start": { fr: "Démarrer un enregistrement", en: "Start recording" },
	"callRecordings.stop": { fr: "Arrêter un enregistrement", en: "Stop recording" },
	"callRecordings.listen": { fr: "Écouter les enregistrements", en: "Listen recordings" },
	"callRecordings.delete": { fr: "Supprimer des enregistrements", en: "Delete recordings" },
	"notifications.push_subscribe": { fr: "S'abonner aux notifications push", en: "Subscribe push notifications" },
	"ai_assistant.view": { fr: "Consulter les suggestions IA", en: "View AI suggestions" },
	"ai_assistant.dismiss": { fr: "Rejeter une suggestion IA", en: "Dismiss AI suggestion" },
	"ai_assistant.apply": { fr: "Appliquer une suggestion IA", en: "Apply AI suggestion" },
	"ai_assistant.configure": { fr: "Configurer ses préférences IA", en: "Configure AI preferences" },
	"ai_assistant.auto_apply": { fr: "Autoriser l'auto-application IA", en: "Allow AI auto-apply" },
	"ai_assistant.admin": { fr: "Administrer l'IA (org)", en: "Administer AI (org)" },
	"ai_assistant.audit": { fr: "Auditer l'activité IA", en: "Audit AI activity" },
};

// ─── Risk style for task badges ─────────────────────────────────
const RISK_STYLE: Record<string, { color: string; bg: string; label: { fr: string; en: string } }> = {
	low: { color: "text-emerald-600", bg: "bg-emerald-500/10", label: { fr: "Faible", en: "Low" } },
	medium: { color: "text-amber-600", bg: "bg-amber-500/10", label: { fr: "Moyen", en: "Medium" } },
	high: { color: "text-orange-600", bg: "bg-orange-500/10", label: { fr: "Élevé", en: "High" } },
	critical: { color: "text-red-600", bg: "bg-red-500/10", label: { fr: "Critique", en: "Critical" } },
};

// ─── Module → tasks mapping (canonical) ─────────────────────────
// Source : MODULE_ACCESS_TASKS — union des 3 niveaux d'accès par module.
const MODULE_TASKS: Record<string, string[]> = (() => {
	const out: Record<string, string[]> = {};
	for (const [code, levels] of Object.entries(MODULE_ACCESS_TASKS)) {
		if (!levels) continue;
		const set = new Set<string>([
			...(levels.reader ?? []),
			...(levels.editor ?? []),
			...(levels.admin ?? []),
		]);
		out[code] = Array.from(set);
	}
	return out;
})();

// ─── Module category labels & order ─────────────────────────────
const MODULE_CATEGORY_LABELS: Record<ModuleCategory, { fr: string; en: string }> = {
	operations: { fr: "Opérations", en: "Operations" },
	ibureau: { fr: "iBureau", en: "iBureau" },
	gestion: { fr: "Gestion", en: "Management" },
	administration: { fr: "Administration", en: "Administration" },
	network: { fr: "Réseau diplomatique", en: "Diplomatic Network" },
	intelligence: { fr: "Renseignement", en: "Intelligence" },
};
const MODULE_CATEGORY_ORDER: ModuleCategory[] = [
	"operations",
	"ibureau",
	"gestion",
	"administration",
	"network",
	"intelligence",
];

// ─── Helpers ────────────────────────────────────────────────────
function getAssignedModuleDefs(
	positionTasks: string[] | undefined,
): ModuleDefinition[] {
	const taskSet = new Set(positionTasks ?? []);
	const out: ModuleDefinition[] = [];
	for (const def of Object.values(MODULE_REGISTRY)) {
		const moduleTasks = MODULE_TASKS[def.code] ?? [];
		if (moduleTasks.some((t) => taskSet.has(t))) {
			out.push(def);
		}
	}
	return out;
}

// ─── Module Permission Card ─────────────────────────────────────
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
	const selectedCount = moduleTasks.filter((t) => selected.has(t)).length;
	const allSelected = moduleTasks.length > 0 && selectedCount === moduleTasks.length;
	const someSelected = selectedCount > 0 && !allSelected;
	const [isOpen, setIsOpen] = useState(someSelected || allSelected);

	if (!moduleDef || moduleTasks.length === 0) return null;

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

	return (
		<div
			className={cn(
				"rounded-lg border transition-all",
				allSelected
					? "border-primary/40 bg-primary/5"
					: someSelected
						? "border-amber-400/40 bg-amber-50/30 dark:bg-amber-900/5"
						: "border-border/40",
			)}
		>
			<div className="flex items-center gap-2.5 px-3 py-2.5">
				<button
					type="button"
					className="flex items-center gap-2 flex-1 min-w-0 text-left"
					onClick={() => setIsOpen(!isOpen)}
				>
					<ChevronRight
						className={cn(
							"h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
							isOpen && "rotate-90",
						)}
					/>
					<DynamicLucideIcon
						name={moduleDef.icon}
						className={cn("h-4 w-4 shrink-0", moduleDef.color)}
					/>
					<div className="min-w-0 flex-1">
						<span className="text-sm font-medium block truncate">
							{getLocalizedValue(moduleDef.label, lang)}
						</span>
						<span className="text-[10px] text-muted-foreground truncate block">
							{getLocalizedValue(moduleDef.description, lang)}
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
			{isOpen && (
				<div className="px-3 pb-2.5 pt-0 border-t border-border/20">
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
										{label ? getLocalizedValue(label, lang) : code}
									</span>
									<Badge
										className={cn(
											"text-[9px] px-1 py-0 h-3.5 shrink-0",
											style.bg,
											style.color,
										)}
									>
										{getLocalizedValue(style.label, lang)}
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

// ─── Module Task Picker (grouped by category, filtered by org.modules) ───
function ModuleTaskPicker({
	orgModules,
	selected,
	onChange,
	lang,
}: {
	orgModules: string[];
	selected: Set<string>;
	onChange: (tasks: Set<string>) => void;
	lang: string;
}) {
	const { t } = useTranslation();
	const activeModules = useMemo(() => new Set(orgModules), [orgModules]);

	const modulesByCategory = useMemo(() => {
		const result: Record<string, string[]> = {};
		for (const [code, def] of Object.entries(MODULE_REGISTRY)) {
			const tasks = MODULE_TASKS[code];
			if (!tasks || tasks.length === 0) continue;
			// Only include modules activated for this org (always include core modules)
			if (!def.isCore && !activeModules.has(code)) continue;
			if (!result[def.category]) result[def.category] = [];
			result[def.category].push(code);
		}
		return result;
	}, [activeModules]);

	const hasAny = Object.values(modulesByCategory).some((arr) => arr.length > 0);

	if (!hasAny) {
		return (
			<div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
				{t(
					"admin.roles.position.noModulesAvailable",
					"Aucun module n'est activé pour cet organisme. Contactez un administrateur système pour activer des modules.",
				)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{MODULE_CATEGORY_ORDER.map((cat) => {
				const modules = modulesByCategory[cat];
				if (!modules || modules.length === 0) return null;
				const catLabel = MODULE_CATEGORY_LABELS[cat];
				return (
					<div key={cat} className="space-y-1.5">
						<h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
							{getLocalizedValue(catLabel, lang)}
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

// ─── Preset Template Applier (uses POSITION_TASK_PRESETS as templates) ───
function PresetTemplateApplier({
	presets,
	onApply,
	lang,
}: {
	presets: TaskPresetDefinition[];
	onApply: (tasks: Set<string>) => void;
	lang: string;
}) {
	const { t } = useTranslation();
	const [value, setValue] = useState<string>("");

	if (presets.length === 0) return null;

	return (
		<div className="rounded-lg border bg-muted/20 p-3 space-y-2">
			<div className="flex items-center gap-2">
				<Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
				<Label className="text-xs font-medium">
					{t("admin.roles.position.applyTemplate", "Appliquer un template")}
				</Label>
			</div>
			<p className="text-[10px] text-muted-foreground">
				{t(
					"admin.roles.position.applyTemplateHint",
					"Préremplit les permissions à partir d'un preset. Vous pouvez ensuite affiner individuellement.",
				)}
			</p>
			<div className="flex items-center gap-2">
				<Select
					value={value}
					onValueChange={(code) => {
						setValue(code);
						const tasks = getPresetTasks([code]);
						onApply(new Set(tasks));
					}}
				>
					<SelectTrigger className="h-8 text-xs flex-1">
						<SelectValue
							placeholder={t(
								"admin.roles.position.selectTemplate",
								"Sélectionner un template…",
							)}
						/>
					</SelectTrigger>
					<SelectContent>
						{presets.map((preset) => (
							<SelectItem key={preset.code} value={preset.code} className="text-xs">
								<span className="inline-flex items-center gap-2">
									<DynamicLucideIcon name={preset.icon} className="h-3.5 w-3.5" />
									{getLocalizedValue(preset.label, lang)}
									<Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
										{preset.tasks.length}
									</Badge>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface OrgRolesPanelProps {
	orgId: Id<"orgs">;
	orgType: string;
}

type ViewMode = "grade" | "ministry";

export function OrgRolesPanel({ orgId, orgType }: OrgRolesPanelProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const [isInitializing, setIsInitializing] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingPosition, setEditingPosition] = useState<PositionDoc | null>(
		null,
	);
	const [editingMinistry, setEditingMinistry] =
		useState<MinistryGroupDoc | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("grade");
	const [showAddMinistryDialog, setShowAddMinistryDialog] = useState(false);
	const [newMinistry, setNewMinistry] = useState({
		code: "",
		label: "",
		icon: "",
		description: "",
	});

	const { data: roleConfig, isPending: configLoading } =
		useAuthenticatedConvexQuery(api.functions.roleConfig.getOrgFullRoleConfig, {
			orgId,
		});

	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);
	const orgModules = ((org?.modules as string[]) ?? []) as string[];

	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.roleConfig.getOrgTemplates,
		{},
	);

	const { mutateAsync: initFromTemplate } = useConvexMutationQuery(
		api.functions.roleConfig.initializeFromTemplate,
	);
	const { mutateAsync: resetToTemplateMut } = useConvexMutationQuery(
		api.functions.roleConfig.resetToTemplate,
	);
	const { mutateAsync: deletePositionMut } = useConvexMutationQuery(
		api.functions.roleConfig.deletePosition,
	);
	const { mutateAsync: movePositionMut } = useConvexMutationQuery(
		api.functions.roleConfig.movePositionLevel,
	);
	const { mutateAsync: updatePositionMut } = useConvexMutationQuery(
		api.functions.roleConfig.updatePosition,
	);
	const { mutateAsync: createMinistryGroupMut } = useConvexMutationQuery(
		api.functions.roleConfig.createMinistryGroup,
	);
	const { mutateAsync: deleteMinistryGroupMut } = useConvexMutationQuery(
		api.functions.roleConfig.deleteMinistryGroup,
	);

	const positions = (roleConfig?.positions ?? []) as PositionDoc[];
	const hasConfig = positions.length > 0;
	const systemModules = (roleConfig?.systemModules ??
		[]) as TaskPresetDefinition[];
	const ministryGroups = ((
		roleConfig as { ministryGroups?: MinistryGroupDoc[] }
	)?.ministryGroups ?? []) as MinistryGroupDoc[];

	// Group positions by grade
	const gradeOrder: PositionGrade[] = [
		"chief",
		"counselor",
		"agent",
		"external",
	];
	const positionsByGrade = useMemo(
		() =>
			positions.reduce(
				(acc: Record<string, PositionDoc[]>, pos: PositionDoc) => {
					const grade = pos.grade || "agent";
					if (!acc[grade]) acc[grade] = [];
					acc[grade].push(pos);
					return acc;
				},
				{},
			),
		[positions],
	);

	// Group positions by ministry
	const positionsByMinistry = useMemo(
		() =>
			positions.reduce(
				(acc: Record<string, PositionDoc[]>, pos: PositionDoc) => {
					const mgId = pos.ministryGroupId || "unassigned";
					if (!acc[mgId]) acc[mgId] = [];
					acc[mgId].push(pos);
					return acc;
				},
				{},
			),
		[positions],
	);

	const topLevelMinistries = ministryGroups.filter(
		(mg: MinistryGroupDoc) => !mg.parentCode,
	);

	// ─── Initialize from template ─────────────────────────
	async function handleInitialize(templateType: string) {
		setIsInitializing(true);
		try {
			const result = await initFromTemplate({ orgId, templateType });
			toast.success(
				t("admin.roles.initSuccess", {
					count: result.positionsCreated,
				}),
			);
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.initError")));
		} finally {
			setIsInitializing(false);
		}
	}

	// ─── Reset to template ────────────────────────────────
	async function handleReset(templateType: string) {
		setIsResetting(true);
		try {
			const result = await resetToTemplateMut({ orgId, templateType });
			toast.success(
				t("admin.roles.resetSuccess", {
					count: result.positionsCreated,
				}),
			);
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.resetError")));
		} finally {
			setIsResetting(false);
		}
	}

	// ─── Delete position ──────────────────────────────────
	async function handleDeletePosition(positionId: Id<"positions">) {
		try {
			await deletePositionMut({ positionId });
			toast.success(t("admin.roles.positionDeleted"));
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.positionDeleteError")));
		}
	}

	// ─── Move position level ──────────────────────────────
	async function handleMovePosition(
		positionId: Id<"positions">,
		direction: "up" | "down",
	) {
		try {
			const newLevel = await movePositionMut({ positionId, direction });
			toast.success(t("admin.roles.positionMoved", { level: newLevel }));
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.positionMoveError")));
		}
	}

	// ─── Assign grade ─────────────────────────────────────
	async function handleAssignGrade(positionId: Id<"positions">, grade: string) {
		try {
			await updatePositionMut({ positionId, grade });
			toast.success(t("admin.roles.gradeUpdated"));
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		}
	}

	// ─── Assign ministry group ────────────────────────────
	async function handleAssignMinistry(
		positionId: Id<"positions">,
		ministryGroupId: Id<"ministryGroups"> | undefined,
	) {
		try {
			await updatePositionMut({
				positionId,
				ministryGroupId: ministryGroupId as Id<"ministryGroups">,
			});
			toast.success(t("admin.roles.ministryUpdated"));
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		}
	}

	// ─── Create ministry group ────────────────────────────
	async function handleCreateMinistryGroup() {
		if (!newMinistry.label.trim()) return;
		try {
			const code = newMinistry.code || toSnakeCase(newMinistry.label);
			await createMinistryGroupMut({
				orgId,
				code,
				label: { fr: newMinistry.label, en: newMinistry.label },
				description: newMinistry.description
					? {
							fr: newMinistry.description,
							en: newMinistry.description,
						}
					: undefined,
				icon: newMinistry.icon || "",
				sortOrder: ministryGroups.length + 1,
			});
			toast.success(t("admin.roles.ministryCreated"));
			setNewMinistry({ code: "", label: "", icon: "", description: "" });
			setShowAddMinistryDialog(false);
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.ministryCreateError")));
		}
	}

	// ─── Delete ministry group ────────────────────────────
	async function handleDeleteMinistryGroup(groupId: Id<"ministryGroups">) {
		try {
			await deleteMinistryGroupMut({ groupId });
			toast.success(t("admin.roles.ministryDeleted"));
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.ministryDeleteError")));
		}
	}

	if (configLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-32" />
				<Skeleton className="h-48" />
			</div>
		);
	}

	// ═══════════════════════════════════════════════════════
	// STATE 1: No template — Template picker
	// ═══════════════════════════════════════════════════════
	if (!hasConfig) {
		return (
			<div className="space-y-4">
				<FlatCard className="border-dashed border-2 border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
					<div className="p-3 lg:p-4">
						<h4 className="flex items-center gap-2 text-base">
							<AlertTriangle className="h-4 w-4 text-amber-500" />
							{t("admin.roles.noConfig.title")}
						</h4>
						<p className="text-sm text-muted-foreground mt-1">
							{t("admin.roles.noConfig.description")}
						</p>
					</div>
				</FlatCard>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{(templates ?? []).map((template: OrganizationTemplate) => {
						const isMatch = template.type === orgType;
						return (
							<FlatCard
								key={template.type}
								className={`transition-all cursor-pointer group ${
									isMatch
										? "ring-2 ring-primary"
										: "hover:border-primary/30"
								}`}
							>
								<div className="pb-2">
									<div className="flex items-center justify-between">
										<DynamicLucideIcon
											name={template.icon}
											className="h-7 w-7"
										/>
										{isMatch && (
											<Badge variant="default" className="text-[10px] gap-1">
												<Star className="h-3 w-3" />
												{t("admin.roles.recommended")}
											</Badge>
										)}
									</div>
									<h4 className="text-sm">
										{getLocalizedValue(template.label, lang)}
									</h4>
									<p className="text-xs">
										{getLocalizedValue(template.description, lang)}
									</p>
								</div>
								<div className="pt-0">
									<div className="flex items-center justify-between">
										<span className="text-xs text-muted-foreground">
											{t("admin.roles.positionsCount", {
												count: template.positions.length,
											})}
										</span>
										<Button
											size="sm"
											variant={isMatch ? "default" : "outline"}
											className="h-7 text-xs gap-1"
											disabled={isInitializing}
											onClick={() => handleInitialize(template.type)}
										>
											{isInitializing ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<Play className="h-3 w-3" />
											)}
											{t("admin.roles.initialize")}
										</Button>
									</div>
								</div>
							</FlatCard>
						);
					})}
				</div>
			</div>
		);
	}

	// ═══════════════════════════════════════════════════════
	// STATE 2: Template applied — Show hierarchy with CRUD
	// ═══════════════════════════════════════════════════════
	const currentTemplate = templates?.find(
		(tmpl: OrganizationTemplate) => tmpl.type === orgType,
	);

	return (
		<div className="space-y-4">
			{/* ─── Header ──────────────────────────────── */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
					<Shield className="h-6 w-6 text-primary" />
					{t("admin.roles.title")}
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					{t("admin.roles.subtitle")}
				</p>
			</div>

			{/* ─── Config Status Bar ───────────────────────── */}
			<FlatCard>
				<div className="p-4">
					<div className="flex items-center justify-between flex-wrap gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
								<Shield className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="font-medium text-sm">
									{t("admin.roles.template")}:{" "}
									{currentTemplate
										? getLocalizedValue(currentTemplate.label, lang)
										: orgType}
								</p>
								<div className="flex items-center gap-2 mt-0.5">
									<span className="text-xs text-muted-foreground">
										{t("admin.roles.positionsCount", {
											count: positions.length,
										})}
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="gap-1 text-destructive hover:text-destructive"
									>
										<RotateCcw className="h-3.5 w-3.5" />
										{t("admin.roles.reset")}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											{t("admin.roles.resetConfirm.title")}
										</AlertDialogTitle>
										<AlertDialogDescription>
											{t("admin.roles.resetConfirm.description")}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => handleReset(orgType)}
											disabled={isResetting}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{isResetting ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : null}
											{t("admin.roles.reset")}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				</div>
			</FlatCard>

			{/* ─── Positions — Dual View ─────────────────────── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div>
							<h4 className="flex items-center gap-2 text-base">
								<UserCog className="h-4 w-4" />
								{t("admin.roles.positions.title")} ({positions.length})
							</h4>
							<p className="text-sm text-muted-foreground mt-1">
								{viewMode === "grade"
									? t("admin.roles.positions.byGradeDesc")
									: t("admin.roles.positions.byMinistryDesc")}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{/* View mode toggle */}
							<Tabs
								value={viewMode}
								onValueChange={(v) => setViewMode(v as "grade" | "ministry")}
							>
								<TabsList>
									<TabsTrigger value="grade">
										<GraduationCap className="h-3.5 w-3.5" />
										{t("admin.roles.view.byGrade")}
									</TabsTrigger>
									<TabsTrigger value="ministry">
										<Building2 className="h-3.5 w-3.5" />
										{t("admin.roles.view.byMinistry")}
									</TabsTrigger>
								</TabsList>
							</Tabs>

							{/* Add position */}
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setShowAddDialog(true)}
							>
								<Plus className="h-3.5 w-3.5" />
								{t("admin.roles.addPosition")}
							</Button>

							{/* Add ministry group (only in ministry view) */}
							{viewMode === "ministry" && (
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5"
									onClick={() => setShowAddMinistryDialog(true)}
								>
									<Plus className="h-3.5 w-3.5" />
									{t("admin.roles.addMinistry")}
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className="space-y-3">
					{/* ─── GRADE VIEW ─────────────────────── */}
					{viewMode === "grade" && (
						<div className="space-y-3">
							{gradeOrder.map((gradeKey) => {
								const grade = POSITION_GRADES[gradeKey];
								const gradePositions = positionsByGrade[gradeKey] ?? [];

								return (
									<div key={gradeKey} className="space-y-1.5">
										<div
											className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${grade.bgColor}`}
										>
											<DynamicLucideIcon
												name={grade.icon}
												className={`h-4 w-4 ${grade.color}`}
											/>
											<span
												className={`text-[10px] font-semibold uppercase tracking-wider ${grade.color}`}
											>
												{getLocalizedValue(grade.label, lang)}
											</span>
											<Badge
												variant="outline"
												className="text-[9px] px-1 py-0 ml-auto"
											>
												{t("admin.roles.positionsCount", {
													count: gradePositions.length,
												})}
											</Badge>
										</div>
										{gradePositions.length === 0 && (
											<div className="py-3 text-center text-[10px] text-muted-foreground border border-dashed rounded-md mx-2">
												{t("admin.roles.noPositions")}
											</div>
										)}
										{gradePositions.map((pos) => (
											<PositionCard
												key={pos._id}
												position={pos}
												ministryGroups={ministryGroups}
												lang={lang}
												onDelete={handleDeletePosition}
												onMove={handleMovePosition}
												onAssignGrade={handleAssignGrade}
												onAssignMinistry={handleAssignMinistry}
												onEdit={setEditingPosition}
											/>
										))}
									</div>
								);
							})}
						</div>
					)}

					{/* ─── MINISTRY VIEW ──────────────────── */}
					{viewMode === "ministry" && (
						<div className="space-y-3">
							{topLevelMinistries.map((mg) => {
								const directPositions = positionsByMinistry[mg._id] ?? [];
								const totalCount = directPositions.length;

								return (
									<div key={mg._id} className="space-y-1.5">
										<div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/50 group/ministry">
											<span className="text-base">{mg.icon}</span>
											<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												{getLocalizedValue(mg.label, lang)}
											</span>
											<Badge
												variant="outline"
												className="text-[9px] px-1 py-0 ml-auto"
											>
												{t("admin.roles.positionsCount", {
													count: totalCount,
												})}
											</Badge>
											<Button
												variant="ghost"
												size="icon"
												className="h-5 w-5 opacity-0 group-hover/ministry:opacity-100 text-muted-foreground hover:text-primary"
												onClick={(e) => {
													e.stopPropagation();
													setEditingMinistry(mg);
												}}
											>
												<Pencil className="h-3 w-3" />
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-5 w-5 opacity-0 group-hover/ministry:opacity-100 text-muted-foreground hover:text-destructive"
														onClick={(e) => e.stopPropagation()}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															{t("admin.roles.ministry.deleteConfirm.title", {
																name: getLocalizedValue(mg.label, lang),
															})}
														</AlertDialogTitle>
														<AlertDialogDescription>
															{t(
																"admin.roles.ministry.deleteConfirm.description",
																{ count: totalCount },
															)}
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>
															{t("common.cancel")}
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleDeleteMinistryGroup(mg._id)}
															className="bg-destructive text-destructive-foreground"
														>
															{t("common.delete")}
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
										{directPositions.length === 0 && (
											<div className="py-3 text-center text-[10px] text-muted-foreground border border-dashed rounded-md mx-2">
												{t("admin.roles.noPositions")}
											</div>
										)}
										{directPositions.map((pos) => (
											<PositionCard
												key={pos._id}
												position={pos}
												ministryGroups={ministryGroups}
												lang={lang}
												onDelete={handleDeletePosition}
												onMove={handleMovePosition}
												onAssignGrade={handleAssignGrade}
												onAssignMinistry={handleAssignMinistry}
												onEdit={setEditingPosition}
											/>
										))}
									</div>
								);
							})}

							{/* Unassigned positions */}
							<div className="space-y-1.5">
								<div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 border border-dashed">
									<Layers className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
										{t("admin.roles.unassigned")}
									</span>
									<Badge
										variant="outline"
										className="text-[9px] px-1 py-0 ml-auto"
									>
										{t("admin.roles.positionsCount", {
											count: (positionsByMinistry.unassigned ?? []).length,
										})}
									</Badge>
								</div>
								{(positionsByMinistry.unassigned ?? []).map((pos) => (
									<PositionCard
										key={pos._id}
										position={pos}
										ministryGroups={ministryGroups}
										lang={lang}
										onDelete={handleDeletePosition}
										onMove={handleMovePosition}
										onAssignGrade={handleAssignGrade}
										onAssignMinistry={handleAssignMinistry}
										onEdit={setEditingPosition}
									/>
								))}
							</div>
						</div>
					)}

					{positions.length === 0 && (
						<div className="text-center py-8">
							<Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
							<p className="mt-2 text-muted-foreground text-sm">
								{t("admin.roles.noPositionsConfigured")}
							</p>
						</div>
					)}
				</div>
			</FlatCard>

			{/* ─── Add Position Sheet ────────────────────── */}
			<AddPositionSheet
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				orgId={orgId}
				presets={systemModules as TaskPresetDefinition[]}
				orgModules={orgModules}
				lang={lang}
				onSuccess={() => setShowAddDialog(false)}
			/>

			{/* ─── Edit Position Sheet ───────────────────── */}
			{editingPosition && (
				<EditPositionSheet
					key={editingPosition._id}
					open={!!editingPosition}
					onOpenChange={(open) => !open && setEditingPosition(null)}
					position={editingPosition}
					presets={systemModules as TaskPresetDefinition[]}
					orgModules={orgModules}
					lang={lang}
					onSuccess={() => setEditingPosition(null)}
				/>
			)}

			{/* ─── Add Ministry Group Sheet ──────────────── */}
			<AddMinistryGroupSheet
				open={showAddMinistryDialog}
				onOpenChange={setShowAddMinistryDialog}
				newMinistry={newMinistry}
				setNewMinistry={setNewMinistry}
				onCreate={handleCreateMinistryGroup}
			/>

			{/* ─── Edit Ministry Group Sheet ─────────────── */}
			{editingMinistry && (
				<EditMinistryGroupSheet
					key={editingMinistry._id}
					open={!!editingMinistry}
					onOpenChange={(open) => !open && setEditingMinistry(null)}
					group={editingMinistry}
					onSuccess={() => setEditingMinistry(null)}
				/>
			)}

			{/* ─── Org Modules Management ─────────────── */}
			<OrgModulesSection orgId={orgId} lang={lang} />
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Position Card
// ═══════════════════════════════════════════════════════════════

function PositionCard({
	position,
	ministryGroups,
	lang,
	onDelete,
	onMove,
	onAssignGrade,
	onAssignMinistry,
	onEdit,
}: {
	position: PositionDoc;
	ministryGroups: MinistryGroupDoc[];
	lang: string;
	onDelete: (id: Id<"positions">) => void;
	onMove: (id: Id<"positions">, direction: "up" | "down") => void;
	onAssignGrade: (id: Id<"positions">, grade: string) => void;
	onAssignMinistry: (
		id: Id<"positions">,
		mgId: Id<"ministryGroups"> | undefined,
	) => void;
	onEdit: (position: PositionDoc) => void;
}) {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const grade =
		position.grade && POSITION_GRADES[position.grade as PositionGrade];

	const assignedModules = useMemo(
		() => getAssignedModuleDefs(position.tasks),
		[position.tasks],
	);

	const moduleTaskCount = useMemo(() => {
		const tasks = new Set(position.tasks ?? []);
		const map: Record<string, number> = {};
		for (const mod of assignedModules) {
			const modTasks = MODULE_TASKS[mod.code] ?? [];
			map[mod.code] = modTasks.filter((t) => tasks.has(t)).length;
		}
		return map;
	}, [assignedModules, position.tasks]);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="rounded-lg border hover:border-primary/30 transition-all ml-2">
				<CollapsibleTrigger className="w-full text-left px-4 py-2.5 flex items-center gap-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm">
								{getLocalizedValue(position.title, lang)}
							</span>
							<code className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
								{position.code}
							</code>
							{position.isRequired && (
								<Badge variant="destructive" className="text-[9px] h-4 px-1">
									{t("admin.roles.required")}
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-1.5 mt-1">
							{grade && (
								<Badge
									variant="outline"
									className={`text-[9px] px-1.5 py-0.5 flex items-center gap-1 ${grade.color}`}
								>
									<DynamicLucideIcon name={grade.icon} className="h-3 w-3" />
									{getLocalizedValue(grade.label, lang)}
								</Badge>
							)}
							{assignedModules.slice(0, 3).map((mod) => (
								<span
									key={mod.code}
									className="text-[10px] bg-muted rounded-full px-2 py-0.5 inline-flex items-center gap-1"
								>
									<DynamicLucideIcon
										name={mod.icon}
										className="h-3 w-3 shrink-0"
									/>
									{getLocalizedValue(mod.label, lang)}
								</span>
							))}
							{assignedModules.length > 3 && (
								<span className="text-[10px] text-muted-foreground">
									+{assignedModules.length - 3}
								</span>
							)}
						</div>
					</div>

					{/* Action menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-max">
							<DropdownMenuItem onClick={() => onMove(position._id, "up")}>
								<ArrowUp className="mr-2 h-3.5 w-3.5" />
								{t("admin.roles.position.moveUp")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onMove(position._id, "down")}>
								<ArrowDown className="mr-2 h-3.5 w-3.5" />
								{t("admin.roles.position.moveDown")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onEdit(position)}>
								<Pencil className="mr-2 h-3.5 w-3.5" />
								{t("common.edit")}
							</DropdownMenuItem>
							<DropdownMenuSeparator />

							{/* Grade submenu */}
							{(["chief", "counselor", "agent", "external"] as const).map(
								(g) => (
									<DropdownMenuItem
										key={g}
										onClick={() => onAssignGrade(position._id, g)}
										className={position.grade === g ? "bg-muted" : ""}
									>
										<DynamicLucideIcon
											name={POSITION_GRADES[g].icon}
											className="mr-2 h-4 w-4"
										/>
										{getLocalizedValue(POSITION_GRADES[g].label, lang)}
									</DropdownMenuItem>
								),
							)}
							<DropdownMenuSeparator />

							{/* Ministry assignment */}
							{ministryGroups.length > 0 && (
								<>
									{ministryGroups.map((mg) => (
										<DropdownMenuItem
											key={mg._id}
											onClick={() => onAssignMinistry(position._id, mg._id)}
											className={
												position.ministryGroupId === mg._id ? "bg-muted" : ""
											}
										>
											<span className="mr-2">{mg.icon}</span>
											{getLocalizedValue(mg.label, lang)}
										</DropdownMenuItem>
									))}
									<DropdownMenuItem
										onClick={() => onAssignMinistry(position._id, undefined)}
										className={!position.ministryGroupId ? "bg-muted" : ""}
									>
										<Layers className="mr-2 h-3.5 w-3.5" />
										{t("admin.roles.unassigned")}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}

							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => onDelete(position._id)}
							>
								<Trash2 className="mr-2 h-3.5 w-3.5" />
								{t("common.delete")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{isOpen ? (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
					)}
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="border-t px-4 py-3 space-y-3">
						{position.description && (
							<p className="text-xs text-muted-foreground">
								{getLocalizedValue(position.description, lang)}
							</p>
						)}
						<div>
							<h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
								{t("admin.roles.assignedModules")}
							</h4>
							<div className="flex flex-wrap gap-1.5">
								{assignedModules.map((mod) => {
									const total = (MODULE_TASKS[mod.code] ?? []).length;
									const count = moduleTaskCount[mod.code] ?? 0;
									return (
										<div
											key={mod.code}
											className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5"
										>
											<DynamicLucideIcon
												name={mod.icon}
												className={cn("h-4 w-4", mod.color)}
											/>
											<div>
												<div className="text-[10px] font-medium">
													{getLocalizedValue(mod.label, lang)}
												</div>
												<div className="text-[9px] text-muted-foreground">
													{count}/{total} {t("admin.roles.taskCount")}
												</div>
											</div>
										</div>
									);
								})}
								{assignedModules.length === 0 && (
									<span className="text-xs text-muted-foreground">
										{t("admin.roles.noModulesAssigned")}
									</span>
								)}
							</div>
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

// ═══════════════════════════════════════════════════════════════
// Add Position Dialog Content
// ═══════════════════════════════════════════════════════════════

function AddPositionSheet({
	open,
	onOpenChange,
	orgId,
	presets,
	orgModules,
	lang,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
	presets: TaskPresetDefinition[];
	orgModules: string[];
	lang: string;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const [title, setTitle] = useState("");
	const [code, setCode] = useState("");
	const [description, setDescription] = useState("");
	const [level, setLevel] = useState("3");
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [isRequired, setIsRequired] = useState(false);
	const [isUnique, setIsUnique] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

	const { mutateAsync: createPosition } = useConvexMutationQuery(
		api.functions.roleConfig.createPosition,
	);

	function handleTitleChange(value: string) {
		setTitle(value);
		if (!codeManuallyEdited) {
			setCode(toSnakeCase(value));
		}
	}

	function resetForm() {
		setTitle("");
		setCode("");
		setDescription("");
		setLevel("3");
		setSelectedTasks(new Set());
		setIsRequired(false);
		setIsUnique(false);
		setCodeManuallyEdited(false);
	}

	async function handleSubmit() {
		if (!title.trim() || !code.trim()) {
			toast.error(t("admin.roles.position.titleCodeRequired"));
			return;
		}
		setIsSubmitting(true);
		try {
			await createPosition({
				orgId,
				code: code.trim(),
				title: { fr: title.trim(), en: title.trim() },
				description: description.trim()
					? { fr: description.trim(), en: description.trim() }
					: undefined,
				level: parseInt(level, 10),
				tasks: Array.from(selectedTasks) as TaskCodeValue[],
				isRequired,
				isUnique,
			});
			toast.success(t("admin.roles.positionCreated"));
			onSuccess();
			resetForm();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.positionCreateError")));
		} finally {
			setIsSubmitting(false);
		}
	}

	const footer = (
		<div className="flex items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
				<Shield className="h-3.5 w-3.5 shrink-0" />
				<span className="truncate">
					<span className="font-medium text-foreground">{selectedTasks.size}</span>
					{" "}
					{t("admin.roles.position.tasksSelected", "tâche(s)")}
				</span>
			</div>
			<Button
				onClick={handleSubmit}
				disabled={isSubmitting || !title.trim() || !code.trim()}
				className="gap-1.5"
				size="sm"
			>
				{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
				{t("admin.roles.position.create")}
			</Button>
		</div>
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("admin.roles.position.addTitle")}
			icon={
				<div className="rounded-lg bg-primary/10 p-1.5 text-primary">
					<Plus className="h-4 w-4" />
				</div>
			}
			footer={footer}
			maxWidthClass="max-w-3xl"
			maxHeight="90vh"
		>
			<div className="space-y-5 p-4 sm:p-5">
				<p className="text-sm leading-relaxed text-muted-foreground">
					{t("admin.roles.position.addDescription")}
				</p>

				{/* ── Section: Identité ───────────────────────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={UserCog}
						label={t("admin.roles.position.section.identity", "Identité du poste")}
					/>
					<div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-title`} className="text-xs">
								{t("admin.roles.position.titleLabel")} *
							</Label>
							<Input
								id={`${formId}-title`}
								placeholder={t("admin.roles.position.titlePlaceholder")}
								value={title}
								onChange={(e) => handleTitleChange(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-code`} className="text-xs">
								{t("admin.roles.position.codeLabel")} *
							</Label>
							<Input
								id={`${formId}-code`}
								placeholder={t("admin.roles.position.codePlaceholder")}
								value={code}
								onChange={(e) => {
									setCode(e.target.value);
									setCodeManuallyEdited(true);
								}}
								className="font-mono text-xs"
							/>
							<p className="text-[10px] text-muted-foreground">
								{t("admin.roles.position.codeHint")}
							</p>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-desc`} className="text-xs">
								{t("admin.roles.position.descriptionLabel")}
							</Label>
							<Input
								id={`${formId}-desc`}
								placeholder={t("admin.roles.position.descriptionPlaceholder")}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>
				</section>

				<Separator />

				{/* ── Section: Hiérarchie & contraintes ───────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={Layers}
						label={t("admin.roles.position.section.hierarchy", "Hiérarchie et contraintes")}
					/>

					<div className="space-y-1.5">
						<Label className="text-xs">
							{t("admin.roles.position.levelLabel")}
						</Label>
						<Select value={level} onValueChange={setLevel}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[1, 2, 3, 4, 5, 6, 7].map((l) => (
									<SelectItem key={l} value={String(l)}>
										{t("admin.roles.position.levelOption", { level: l })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<ToggleCard
						icon={AlertTriangle}
						iconClassName={
							isRequired ? "" : "text-amber-600/70 dark:text-amber-400/70"
						}
						title={t("admin.roles.position.isRequired", "Poste obligatoire")}
						description={t(
							"admin.roles.position.isRequiredDesc",
							"Ce poste doit exister dans la structure — impossible à supprimer.",
						)}
						checked={isRequired}
						onChange={setIsRequired}
					/>

					<ToggleCard
						icon={Star}
						title={t(
							"admin.roles.position.isUnique",
							"Titulaire unique",
						)}
						description={t(
							"admin.roles.position.isUniqueDesc",
							"Un seul agent peut occuper ce poste simultanément.",
						)}
						checked={isUnique}
						onChange={setIsUnique}
					/>
				</section>

				<Separator />

				{/* ── Section: Template (optional) ────────────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={Wand2}
						label={t("admin.roles.position.section.template", "Partir d'un template")}
						hint={t("admin.roles.position.section.templateHint", "(optionnel)")}
					/>

					<PresetTemplateApplier
						presets={presets}
						onApply={setSelectedTasks}
						lang={lang}
					/>
				</section>

				<Separator />

				{/* ── Section: Permissions ────────────────────── */}
				<section className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<SectionLabel
							icon={Shield}
							label={t("admin.roles.position.assignModules")}
						/>
						<Badge variant="outline" className="shrink-0 text-[10px]">
							{selectedTasks.size}{" "}
							{t("admin.roles.position.tasksSelected", "tâche(s)")}
						</Badge>
					</div>

					<ModuleTaskPicker
						orgModules={orgModules}
						selected={selectedTasks}
						onChange={setSelectedTasks}
						lang={lang}
					/>
				</section>
			</div>
		</BottomSheet>
	);
}

// ═══════════════════════════════════════════════════════════════
// Edit Position Dialog Content
// ═══════════════════════════════════════════════════════════════

function EditPositionSheet({
	open,
	onOpenChange,
	position,
	presets,
	orgModules,
	lang,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	position: PositionDoc;
	presets: TaskPresetDefinition[];
	orgModules: string[];
	lang: string;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const [titleFr, setTitleFr] = useState(position.title?.fr ?? "");
	const [titleEn, setTitleEn] = useState(position.title?.en ?? "");
	const [descFr, setDescFr] = useState(position.description?.fr ?? "");
	const [descEn, setDescEn] = useState(position.description?.en ?? "");
	const [level, setLevel] = useState(String(position.level ?? 5));
	const [isRequired, setIsRequired] = useState(position.isRequired ?? false);
	const [isUnique, setIsUnique] = useState(position.isUnique ?? false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
		() => new Set((position.tasks ?? []) as string[]),
	);

	const { mutateAsync: updatePosition } = useConvexMutationQuery(
		api.functions.roleConfig.updatePosition,
	);

	async function handleSubmit() {
		if (!titleFr.trim()) {
			toast.error(t("admin.roles.position.titleCodeRequired"));
			return;
		}
		setIsSubmitting(true);
		try {
			await updatePosition({
				positionId: position._id,
				title: { fr: titleFr.trim(), en: titleEn.trim() || titleFr.trim() },
				description:
					descFr.trim() || descEn.trim()
						? { fr: descFr.trim(), en: descEn.trim() || descFr.trim() }
						: undefined,
				level: parseInt(level, 10),
				tasks: Array.from(selectedTasks) as TaskCodeValue[],
				isRequired,
				isUnique,
			});
			toast.success(t("admin.roles.positionUpdated"));
			onSuccess();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		} finally {
			setIsSubmitting(false);
		}
	}

	const footer = (
		<div className="flex items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
				<Shield className="h-3.5 w-3.5 shrink-0" />
				<span className="truncate">
					<span className="font-medium text-foreground">{selectedTasks.size}</span>
					{" "}
					{t("admin.roles.position.tasksSelected", "tâche(s)")}
				</span>
			</div>
			<Button
				onClick={handleSubmit}
				disabled={isSubmitting || !titleFr.trim()}
				className="gap-1.5"
				size="sm"
			>
				{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
				{t("common.save")}
			</Button>
		</div>
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("admin.roles.position.editTitle")}
			icon={
				<div className="rounded-lg bg-primary/10 p-1.5 text-primary">
					<Pencil className="h-4 w-4" />
				</div>
			}
			footer={footer}
			maxWidthClass="max-w-3xl"
			maxHeight="90vh"
		>
			<div className="space-y-5 p-4 sm:p-5">
				<p className="text-sm leading-relaxed text-muted-foreground">
					{t("admin.roles.position.editDescription")}
				</p>

				{/* ── Section: Identité ───────────────────────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={UserCog}
						label={t("admin.roles.position.section.identity", "Identité du poste")}
					/>
					<div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
						<div className="space-y-1.5">
							<Label className="text-xs">
								{t("admin.roles.position.codeLabel")}
							</Label>
							<Input
								value={position.code}
								disabled
								className="font-mono text-muted-foreground"
							/>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-title-fr`} className="text-xs">
									{t("admin.roles.position.titleLabel")} (FR) *
								</Label>
								<Input
									id={`${formId}-title-fr`}
									value={titleFr}
									onChange={(e) => setTitleFr(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-title-en`} className="text-xs">
									{t("admin.roles.position.titleLabel")} (EN)
								</Label>
								<Input
									id={`${formId}-title-en`}
									value={titleEn}
									onChange={(e) => setTitleEn(e.target.value)}
									placeholder="English title"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-desc-fr`} className="text-xs">
									{t("admin.roles.position.descriptionLabel")} (FR)
								</Label>
								<Input
									id={`${formId}-desc-fr`}
									value={descFr}
									onChange={(e) => setDescFr(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-desc-en`} className="text-xs">
									{t("admin.roles.position.descriptionLabel")} (EN)
								</Label>
								<Input
									id={`${formId}-desc-en`}
									value={descEn}
									onChange={(e) => setDescEn(e.target.value)}
									placeholder="English description"
								/>
							</div>
						</div>
					</div>
				</section>

				<Separator />

				{/* ── Section: Hiérarchie & contraintes ───────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={Layers}
						label={t("admin.roles.position.section.hierarchy", "Hiérarchie et contraintes")}
					/>

					<div className="space-y-1.5">
						<Label className="text-xs">
							{t("admin.roles.position.levelLabel")}
						</Label>
						<Select value={level} onValueChange={setLevel}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[1, 2, 3, 4, 5, 6, 7].map((l) => (
									<SelectItem key={l} value={String(l)}>
										{t("admin.roles.position.levelOption", { level: l })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<ToggleCard
						icon={AlertTriangle}
						iconClassName={
							isRequired ? "" : "text-amber-600/70 dark:text-amber-400/70"
						}
						title={t("admin.roles.position.isRequired", "Poste obligatoire")}
						description={t(
							"admin.roles.position.isRequiredDesc",
							"Ce poste doit exister dans la structure — impossible à supprimer.",
						)}
						checked={isRequired}
						onChange={setIsRequired}
					/>

					<ToggleCard
						icon={Star}
						title={t(
							"admin.roles.position.isUnique",
							"Titulaire unique",
						)}
						description={t(
							"admin.roles.position.isUniqueDesc",
							"Un seul agent peut occuper ce poste simultanément.",
						)}
						checked={isUnique}
						onChange={setIsUnique}
					/>
				</section>

				<Separator />

				{/* ── Section: Template (optional) ────────────── */}
				<section className="space-y-3">
					<SectionLabel
						icon={Wand2}
						label={t("admin.roles.position.section.template", "Partir d'un template")}
						hint={t("admin.roles.position.section.templateHint", "(optionnel)")}
					/>

					<PresetTemplateApplier
						presets={presets}
						onApply={setSelectedTasks}
						lang={lang}
					/>
				</section>

				<Separator />

				{/* ── Section: Permissions ────────────────────── */}
				<section className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<SectionLabel
							icon={Shield}
							label={t("admin.roles.position.assignModules")}
						/>
						<Badge variant="outline" className="shrink-0 text-[10px]">
							{selectedTasks.size}{" "}
							{t("admin.roles.position.tasksSelected", "tâche(s)")}
						</Badge>
					</div>

					<ModuleTaskPicker
						orgModules={orgModules}
						selected={selectedTasks}
						onChange={setSelectedTasks}
						lang={lang}
					/>
				</section>
			</div>
		</BottomSheet>
	);
}

// ═══════════════════════════════════════════════════════════════
// Edit Ministry Group Sheet
// ═══════════════════════════════════════════════════════════════

function AddMinistryGroupSheet({
	open,
	onOpenChange,
	newMinistry,
	setNewMinistry,
	onCreate,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	newMinistry: {
		label: string;
		code: string;
		icon: string;
		description: string;
	};
	setNewMinistry: React.Dispatch<
		React.SetStateAction<{
			label: string;
			code: string;
			icon: string;
			description: string;
		}>
	>;
	onCreate: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const footer = (
		<div className="flex items-center justify-end gap-2">
			<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
				{t("common.cancel")}
			</Button>
			<Button
				size="sm"
				onClick={onCreate}
				disabled={!newMinistry.label.trim()}
				className="gap-1.5"
			>
				{t("admin.roles.ministry.create")}
			</Button>
		</div>
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("admin.roles.ministry.addTitle")}
			icon={
				<div className="rounded-lg bg-primary/10 p-1.5 text-primary">
					<Plus className="h-4 w-4" />
				</div>
			}
			footer={footer}
			maxWidthClass="max-w-2xl"
			maxHeight="85vh"
		>
			<div className="space-y-5 p-4 sm:p-5">
				<p className="text-sm leading-relaxed text-muted-foreground">
					{t("admin.roles.ministry.addDescription")}
				</p>

				<section className="space-y-3">
					<SectionLabel
						icon={Building2}
						label={t("admin.roles.ministry.section.identity", "Identification")}
					/>
					<div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-label`} className="text-xs">
								{t("admin.roles.ministry.name")} *
							</Label>
							<Input
								id={`${formId}-label`}
								value={newMinistry.label}
								onChange={(e) =>
									setNewMinistry((p) => ({
										...p,
										label: e.target.value,
										code: toSnakeCase(e.target.value),
									}))
								}
								placeholder={t("admin.roles.ministry.namePlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-[1fr_120px] gap-3">
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-code`} className="text-xs">
									{t("admin.roles.ministry.code")}
								</Label>
								<Input
									id={`${formId}-code`}
									value={newMinistry.code}
									onChange={(e) =>
										setNewMinistry((p) => ({ ...p, code: e.target.value }))
									}
									placeholder={t("admin.roles.ministry.codePlaceholder")}
									className="font-mono text-xs"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-icon`} className="text-xs">
									{t("admin.roles.ministry.icon")}
								</Label>
								<Input
									id={`${formId}-icon`}
									value={newMinistry.icon}
									onChange={(e) =>
										setNewMinistry((p) => ({ ...p, icon: e.target.value }))
									}
									placeholder="Building2"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-desc`} className="text-xs">
								{t("admin.roles.ministry.description")}
							</Label>
							<Input
								id={`${formId}-desc`}
								value={newMinistry.description}
								onChange={(e) =>
									setNewMinistry((p) => ({
										...p,
										description: e.target.value,
									}))
								}
								placeholder={t("admin.roles.ministry.descriptionPlaceholder")}
							/>
						</div>
					</div>
				</section>
			</div>
		</BottomSheet>
	);
}

function EditMinistryGroupSheet({
	open,
	onOpenChange,
	group,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: MinistryGroupDoc;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const [labelFr, setLabelFr] = useState(group.label?.fr ?? "");
	const [labelEn, setLabelEn] = useState(group.label?.en ?? "");
	const [descFr, setDescFr] = useState(group.description?.fr ?? "");
	const [descEn, setDescEn] = useState(group.description?.en ?? "");
	const [icon, setIcon] = useState(group.icon ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { mutateAsync: updateMinistryGroup } = useConvexMutationQuery(
		api.functions.roleConfig.updateMinistryGroup,
	);

	async function handleSubmit() {
		if (!labelFr.trim()) return;
		setIsSubmitting(true);
		try {
			await updateMinistryGroup({
				groupId: group._id,
				label: { fr: labelFr.trim(), en: labelEn.trim() || labelFr.trim() },
				description:
					descFr.trim() || descEn.trim()
						? { fr: descFr.trim(), en: descEn.trim() || descFr.trim() }
						: undefined,
				icon: icon.trim() || "",
			});
			toast.success(t("admin.roles.ministryUpdated"));
			onSuccess();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		} finally {
			setIsSubmitting(false);
		}
	}

	const footer = (
		<div className="flex items-center justify-end">
			<Button
				onClick={handleSubmit}
				disabled={isSubmitting || !labelFr.trim()}
				size="sm"
				className="gap-1.5"
			>
				{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
				{t("common.save")}
			</Button>
		</div>
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("admin.roles.ministry.editTitle")}
			icon={
				<div className="rounded-lg bg-primary/10 p-1.5 text-primary">
					<Pencil className="h-4 w-4" />
				</div>
			}
			footer={footer}
			maxWidthClass="max-w-2xl"
			maxHeight="85vh"
		>
			<div className="space-y-5 p-4 sm:p-5">
				<p className="text-sm leading-relaxed text-muted-foreground">
					{t("admin.roles.ministry.editDescription")}
				</p>

				<section className="space-y-3">
					<SectionLabel
						icon={Building2}
						label={t("admin.roles.ministry.section.identity", "Identification")}
					/>
					<div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
						<div className="grid grid-cols-[1fr_120px] gap-3">
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-label-fr`} className="text-xs">
									{t("admin.roles.ministry.name")} (FR) *
								</Label>
								<Input
									id={`${formId}-label-fr`}
									value={labelFr}
									onChange={(e) => setLabelFr(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-icon`} className="text-xs">
									{t("admin.roles.ministry.icon")}
								</Label>
								<Input
									id={`${formId}-icon`}
									value={icon}
									onChange={(e) => setIcon(e.target.value)}
									placeholder="Building2"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-label-en`} className="text-xs">
								{t("admin.roles.ministry.name")} (EN)
							</Label>
							<Input
								id={`${formId}-label-en`}
								value={labelEn}
								onChange={(e) => setLabelEn(e.target.value)}
								placeholder="English name"
							/>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-desc-fr`} className="text-xs">
									{t("admin.roles.ministry.description")} (FR)
								</Label>
								<Input
									id={`${formId}-desc-fr`}
									value={descFr}
									onChange={(e) => setDescFr(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${formId}-desc-en`} className="text-xs">
									{t("admin.roles.ministry.description")} (EN)
								</Label>
								<Input
									id={`${formId}-desc-en`}
									value={descEn}
									onChange={(e) => setDescEn(e.target.value)}
									placeholder="English description"
								/>
							</div>
						</div>
					</div>
				</section>
			</div>
		</BottomSheet>
	);
}

// ═══════════════════════════════════════════════════════════════
// Organization Modules Management Section
// ═══════════════════════════════════════════════════════════════

const MODULE_CATEGORIES: {
	key: ModuleCategory;
	label: { fr: string; en: string };
}[] = [
	{ key: "operations", label: { fr: "Opérations", en: "Operations" } },
	{ key: "ibureau", label: { fr: "iBureau", en: "iBureau" } },
	{ key: "gestion", label: { fr: "Gestion", en: "Management" } },
	{ key: "administration", label: { fr: "Administration", en: "Administration" } },
];

function OrgModulesSection({
	orgId,
	lang,
}: {
	orgId: Id<"orgs">;
	lang: string;
}) {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{
			orgId,
		},
	);
	const { data: me } = useAuthenticatedConvexQuery(api.functions.users.getMe, {});
	const isSuperAdmin = Boolean(me?.isSuperadmin);

	const { mutateAsync: updateOrgModules } = useConvexMutationQuery(
		api.functions.roleConfig.updateOrgModules,
	);

	const activeModules = new Set<string>((org?.modules as string[]) ?? []);
	const allModules = Object.values(MODULE_REGISTRY);
	const toggleableModules = allModules.filter((m) => !m.isCore);
	const activeCount = toggleableModules.filter((m) =>
		activeModules.has(m.code),
	).length;

	async function handleToggle(code: string, enabled: boolean) {
		const current = Array.from(activeModules);
		const updated = enabled
			? [...current, code]
			: current.filter((c) => c !== code);

		try {
			await updateOrgModules({ orgId, modules: updated as string[] as any });
			toast.success(
				enabled
					? t("admin.roles.modules.enabled")
					: t("admin.roles.modules.disabled"),
			);
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		}
	}

	return (
		<FlatCard>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger className="w-full text-left px-3 lg:px-4 py-3 flex items-center gap-3 hover:bg-muted/30 rounded-t-lg transition-colors">
					<Power className="h-4 w-4 shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-medium text-sm">
								{t("admin.roles.modules.title")}
							</span>
							<Badge variant="secondary" className="text-[10px] h-5">
								{activeCount}/{toggleableModules.length}
							</Badge>
							{!isSuperAdmin && (
								<Badge variant="outline" className="text-[10px] h-5 gap-1">
									<AlertTriangle className="h-3 w-3" />
									{t("admin.roles.modules.readonly", "Lecture seule")}
								</Badge>
							)}
						</div>
					</div>
					{isOpen ? (
						<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
					) : (
						<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
					)}
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-3 lg:px-4 pb-3 lg:pb-4 space-y-4 border-t">
						<p className="text-xs text-muted-foreground mt-3">
							{t("admin.roles.modules.description")}
						</p>
						{!isSuperAdmin && (
							<div className="bg-muted px-3 py-2 flex gap-2 rounded-lg text-xs text-muted-foreground items-start border">
								<AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
								<p>
									{t(
										"admin.roles.modules.readonlyAlert",
										"Ces modules sont gérés par l'administrateur système. Veuillez contacter le support pour activer ou désactiver des fonctionnalités pour cet organisme.",
									)}
								</p>
							</div>
						)}

						{MODULE_CATEGORIES.map((cat) => {
							const modules = allModules.filter((m) => m.category === cat.key);
							if (modules.length === 0) return null;

							return (
								<div key={cat.key} className="space-y-1.5">
									<h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										{getLocalizedValue(cat.label, lang)}
									</h4>
									<div className="grid sm:grid-cols-2 gap-2">
										{modules.map((mod) => {
											const isActive = activeModules.has(mod.code);
											return (
												<div
													key={mod.code}
													className="flex items-center gap-3 rounded-lg border px-3 py-2"
												>
													<DynamicLucideIcon
														name={mod.icon}
														className={`h-4 w-4 ${mod.color}`}
													/>
													<div className="flex-1 min-w-0">
														<div className="text-xs font-medium">
															{getLocalizedValue(mod.label, lang)}
														</div>
														<div className="text-[10px] text-muted-foreground truncate">
															{getLocalizedValue(mod.description, lang)}
														</div>
													</div>
													{mod.isCore ? (
														<Badge
															variant="secondary"
															className="text-[9px] shrink-0"
														>
															{t("admin.roles.modules.core")}
														</Badge>
													) : (
														<Switch
															checked={isActive}
															disabled={!isSuperAdmin}
															onCheckedChange={(v) => handleToggle(mod.code, v)}
														/>
													)}
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</FlatCard>
	);
}

