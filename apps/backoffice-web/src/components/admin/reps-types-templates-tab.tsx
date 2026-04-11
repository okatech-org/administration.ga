/**
 * Types & Templates tab — Extracted from representations.tsx
 *
 * Affiche les statistiques, le sélecteur de représentation,
 * les cartes templates par type et les profils métier (task presets).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Building2,
	Check,
	ChevronDown,
	ChevronRight,
	Edit,
	Globe,
	Layers,
	Loader2,
	MoreVertical,
	Pencil,
	Plus,
	RotateCcw,
	Save,
	Shield,
	Trash2,
	Users,
	X,
	Zap,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	ORGANIZATION_TEMPLATES,
	POSITION_GRADES,
	POSITION_TASK_PRESETS,
	type PositionTemplate,
} from "@convex/lib/roles";
import {
	MODULE_REGISTRY,
	ACCESS_LEVEL_META,
	type ModuleCodeValue,
	type ModuleAccessLevel,
} from "@convex/lib/moduleCodes";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Icon mapping ──────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
	Landmark: "Landmark",
	Building: "Building",
	Building2: "Building2",
	Home: "Home",
	Globe: "Globe",
	Star: "Star",
	Crown: "Crown",
	Settings: "Shield",
	Handshake: "Users",
};

const GRADE_OPTIONS = Object.entries(POSITION_GRADES).map(([key, grade]) => ({
	value: key,
	label: grade.label,
	color: grade.color,
}));

// ─── Props ───────────────────────────────────────────────────────
interface RepsTypesTemplatesTabProps {
	lang: string;
	allOrgs: any[] | undefined;
	editingOrgId: Id<"orgs"> | null;
	setEditingOrgId: (id: Id<"orgs"> | null) => void;
	editingOrg: any | null;
	pendingModuleChanges: Map<string, boolean>;
	setPendingModuleChanges: React.Dispatch<
		React.SetStateAction<Map<string, boolean>>
	>;
	selectedOrgType: string | null;
	setSelectedOrgType: (type: string | null) => void;
}

// ─── Position Badge (expandable, optionnellement editable) ──────
function PositionBadge({
	position,
	lang,
	editable,
	onEdit,
	onDelete,
}: {
	position: PositionTemplate | any;
	lang: string;
	editable?: boolean;
	onEdit?: () => void;
	onDelete?: () => void;
}) {
	const gradeKey = position.grade;
	const grade = gradeKey
		? POSITION_GRADES[gradeKey as keyof typeof POSITION_GRADES]
		: null;
	const [expanded, setExpanded] = useState(false);
	const moduleAccess = position.moduleAccess ?? [];

	return (
		<div className="rounded-lg border bg-card overflow-hidden group/pos">
			<div className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-muted/30 transition-colors">
				<button
					type="button"
					onClick={() => moduleAccess.length > 0 && setExpanded(!expanded)}
					className="flex items-center gap-2 flex-1 min-w-0"
				>
					{moduleAccess.length > 0 ? (
						expanded ? (
							<ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
						) : (
							<ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
						)
					) : (
						<div className="w-3" />
					)}
					<div
						className={cn(
							"h-2 w-2 rounded-full shrink-0",
							grade?.color?.replace("text-", "bg-") || "bg-gray-400",
						)}
					/>
					<span className="text-sm font-medium truncate flex-1">
						{position.title?.[lang as "fr" | "en"] ||
							position.title?.fr ||
							position.code}
					</span>
				</button>
				{grade && (
					<span
						className={cn(
							"text-[10px] font-medium shrink-0",
							grade.color,
						)}
					>
						{grade.shortLabel[lang as "fr" | "en"] ||
							grade.shortLabel.fr}
					</span>
				)}
				{position.isRequired && (
					<Badge
						variant="outline"
						className="text-[8px] h-4 px-1 text-amber-600 border-amber-300 shrink-0"
					>
						{lang === "fr" ? "Requis" : "Required"}
					</Badge>
				)}
				{moduleAccess.length > 0 && (
					<Badge
						variant="secondary"
						className="text-[9px] h-4 px-1 shrink-0"
					>
						{moduleAccess.length} mod.
					</Badge>
				)}
				{editable && (
					<div className="flex items-center gap-0.5 opacity-0 group-hover/pos:opacity-100 transition-all shrink-0">
						{onEdit && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onEdit();
								}}
								className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
								title={lang === "fr" ? "Modifier" : "Edit"}
							>
								<Pencil className="h-3 w-3" />
							</button>
						)}
						{onDelete && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
								className="h-5 w-5 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-all"
								title={lang === "fr" ? "Supprimer" : "Delete"}
							>
								<Trash2 className="h-3 w-3" />
							</button>
						)}
					</div>
				)}
			</div>
			{expanded && moduleAccess.length > 0 && (
				<div className="px-3 pb-2 pt-0 border-t border-border/30">
					<div className="flex flex-wrap gap-1 pt-1.5">
						{moduleAccess.map(
							(ma: {
								moduleCode: string;
								accessLevel: string;
							}) => {
								const mod =
									MODULE_REGISTRY[
										ma.moduleCode as ModuleCodeValue
									];
								const meta =
									ACCESS_LEVEL_META[
										ma.accessLevel as ModuleAccessLevel
									];
								if (!mod || !meta) return null;
								return (
									<span
										key={ma.moduleCode}
										className={cn(
											"inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
											meta.color,
										)}
									>
										{mod.label[lang as "fr" | "en"] ||
											mod.label.fr}
									</span>
								);
							},
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Template Card Actions (dropdown) ────────────────────────────
function TemplateCardActions({
	lang,
	onApply,
	onReset,
}: {
	lang: string;
	onApply: () => void;
	onReset: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem onClick={onApply}>
					<Zap className="mr-2 h-3.5 w-3.5" />
					{lang === "fr"
						? "Appliquer à une représentation..."
						: "Apply to a representation..."}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={onReset}
					className="text-destructive focus:text-destructive"
				>
					<RotateCcw className="mr-2 h-3.5 w-3.5" />
					{lang === "fr"
						? "Réinitialiser une représentation..."
						: "Reset a representation..."}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// ─── Apply Template Dialog ───────────────────────────────────────
function ApplyTemplateDialog({
	open,
	onOpenChange,
	templateType,
	orgs,
	lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateType: string;
	orgs: any[];
	lang: string;
}) {
	const [selectedOrgId, setSelectedOrgId] = useState<string>("");
	const [isApplying, setIsApplying] = useState(false);
	const { mutateAsync: applyTemplate } = useConvexMutationQuery(
		api.functions.roleConfig.initializeFromTemplate,
	);

	const templateLabel =
		ORGANIZATION_TEMPLATES.find((t) => t.type === templateType)?.label[
			lang as "fr" | "en"
		] ?? templateType;

	const handleApply = async () => {
		if (!selectedOrgId) return;
		setIsApplying(true);
		try {
			const result = await applyTemplate({
				orgId: selectedOrgId as Id<"orgs">,
				templateType,
			});
			toast.success(
				lang === "fr"
					? `Template appliqué : ${result.positionsCreated} postes créés`
					: `Template applied: ${result.positionsCreated} positions created`,
			);
			onOpenChange(false);
			setSelectedOrgId("");
		} catch (e: any) {
			const msg = e?.data?.message ?? e?.message ?? "";
			if (msg.includes("ALREADY_INITIALIZED")) {
				toast.error(
					lang === "fr"
						? "Cette représentation a déjà été initialisée. Utilisez 'Réinitialiser' pour écraser."
						: "This representation is already initialized. Use 'Reset' to overwrite.",
				);
			} else {
				toast.error(
					lang === "fr"
						? "Erreur lors de l'application du template"
						: "Error applying template",
				);
			}
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{lang === "fr"
							? `Appliquer le template "${templateLabel}"`
							: `Apply "${templateLabel}" template`}
					</DialogTitle>
					<DialogDescription>
						{lang === "fr"
							? "Sélectionnez la représentation à initialiser avec ce template. Les postes et modules par défaut seront créés."
							: "Select the representation to initialize with this template. Default positions and modules will be created."}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[300px]">
					<div className="space-y-1.5 pr-3">
						{orgs.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								{lang === "fr"
									? "Aucune représentation de ce type"
									: "No representations of this type"}
							</p>
						) : (
							orgs.map((org) => (
								<button
									key={org._id}
									type="button"
									onClick={() => setSelectedOrgId(org._id)}
									className={cn(
										"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
										selectedOrgId === org._id
											? "bg-primary/10 border border-primary/30"
											: "hover:bg-muted/50 border border-transparent",
									)}
								>
									<div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
										<Building2 className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{org.name}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{org.country}
										</p>
									</div>
									{selectedOrgId === org._id && (
										<Check className="h-4 w-4 text-primary shrink-0" />
									)}
								</button>
							))
						)}
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{lang === "fr" ? "Annuler" : "Cancel"}
					</Button>
					<Button
						onClick={handleApply}
						disabled={!selectedOrgId || isApplying}
					>
						{isApplying ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Zap className="mr-1.5 h-3.5 w-3.5" />
						)}
						{lang === "fr" ? "Appliquer" : "Apply"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Reset Template Dialog ───────────────────────────────────────
function ResetTemplateDialog({
	open,
	onOpenChange,
	templateType,
	orgs,
	lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateType: string;
	orgs: any[];
	lang: string;
}) {
	const [selectedOrgId, setSelectedOrgId] = useState<string>("");
	const [isResetting, setIsResetting] = useState(false);
	const { mutateAsync: resetTemplate } = useConvexMutationQuery(
		api.functions.roleConfig.resetToTemplate,
	);

	const templateLabel =
		ORGANIZATION_TEMPLATES.find((t) => t.type === templateType)?.label[
			lang as "fr" | "en"
		] ?? templateType;

	const handleReset = async () => {
		if (!selectedOrgId) return;
		setIsResetting(true);
		try {
			const result = await resetTemplate({
				orgId: selectedOrgId as Id<"orgs">,
				templateType,
			});
			toast.success(
				lang === "fr"
					? `Représentation réinitialisée : ${result.positionsCreated} postes recréés`
					: `Representation reset: ${result.positionsCreated} positions recreated`,
			);
			onOpenChange(false);
			setSelectedOrgId("");
		} catch {
			toast.error(
				lang === "fr"
					? "Erreur lors de la réinitialisation"
					: "Error resetting representation",
			);
		} finally {
			setIsResetting(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{lang === "fr"
							? `Réinitialiser au template "${templateLabel}"`
							: `Reset to "${templateLabel}" template`}
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-3">
						<span className="block text-destructive font-medium">
							{lang === "fr"
								? " Cette action supprimera tous les postes existants et les recréera depuis le template."
								: " This will delete all existing positions and recreate them from the template."}
						</span>
						<span className="block">
							{lang === "fr"
								? "Sélectionnez la représentation à réinitialiser :"
								: "Select the representation to reset:"}
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<ScrollArea className="max-h-[200px]">
					<div className="space-y-1.5 pr-3">
						{orgs.map((org) => (
							<button
								key={org._id}
								type="button"
								onClick={() => setSelectedOrgId(org._id)}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
									selectedOrgId === org._id
										? "bg-destructive/10 border border-destructive/30"
										: "hover:bg-muted/50 border border-transparent",
								)}
							>
								<Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
								<span className="text-sm font-medium truncate">
									{org.name}
								</span>
								{selectedOrgId === org._id && (
									<Check className="h-4 w-4 text-destructive shrink-0 ml-auto" />
								)}
							</button>
						))}
					</div>
				</ScrollArea>

				<AlertDialogFooter>
					<AlertDialogCancel>
						{lang === "fr" ? "Annuler" : "Cancel"}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleReset}
						disabled={!selectedOrgId || isResetting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isResetting ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
						)}
						{lang === "fr" ? "Réinitialiser" : "Reset"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ─── Add Position Dialog ─────────────────────────────────────────
function AddPositionDialog({
	open,
	onOpenChange,
	orgId,
	lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
	lang: string;
}) {
	const [code, setCode] = useState("");
	const [titleFr, setTitleFr] = useState("");
	const [titleEn, setTitleEn] = useState("");
	const [grade, setGrade] = useState("agent");
	const [isRequired, setIsRequired] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const { mutateAsync: createPosition } = useConvexMutationQuery(
		api.functions.roleConfig.createPosition,
	);

	const resetForm = () => {
		setCode("");
		setTitleFr("");
		setTitleEn("");
		setGrade("agent");
		setIsRequired(false);
	};

	const handleCreate = async () => {
		if (!code.trim() || !titleFr.trim()) return;
		setIsSaving(true);
		try {
			await createPosition({
				orgId,
				code: code.trim().toLowerCase().replace(/\s+/g, "_"),
				title: { fr: titleFr.trim(), en: titleEn.trim() || titleFr.trim() },
				level:
					grade === "chief"
						? 1
						: grade === "deputy_chief"
							? 2
							: grade === "counselor"
								? 3
								: grade === "agent"
									? 4
									: 5,
				grade: grade as any,
				isRequired,
				tasks: [],
			});
			toast.success(
				lang === "fr"
					? `Poste "${titleFr}" créé avec succès`
					: `Position "${titleFr}" created successfully`,
			);
			resetForm();
			onOpenChange(false);
		} catch (e: any) {
			const msg = e?.data?.message ?? e?.message ?? "";
			if (msg.includes("DUPLICATE") || msg.includes("already exists")) {
				toast.error(
					lang === "fr"
						? `Le code "${code}" existe déjà pour cette représentation`
						: `Code "${code}" already exists for this representation`,
				);
			} else {
				toast.error(
					lang === "fr"
						? "Erreur lors de la création du poste"
						: "Error creating position",
				);
			}
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{lang === "fr" ? "Ajouter un poste" : "Add a position"}
					</DialogTitle>
					<DialogDescription>
						{lang === "fr"
							? "Créer un nouveau poste pour cette représentation."
							: "Create a new position for this representation."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">
								{lang === "fr" ? "Code" : "Code"}
							</Label>
							<Input
								value={code}
								onChange={(e) => setCode(e.target.value)}
								placeholder="ex: attaché_defense"
								className="h-8 text-sm"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">
								{lang === "fr" ? "Grade" : "Grade"}
							</Label>
							<Select value={grade} onValueChange={setGrade}>
								<SelectTrigger className="h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{GRADE_OPTIONS.map((g) => (
										<SelectItem key={g.value} value={g.value}>
											<span className={g.color}>
												{g.label[lang as "fr" | "en"] ||
													g.label.fr}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">
							{lang === "fr" ? "Titre (FR)" : "Title (FR)"}
						</Label>
						<Input
							value={titleFr}
							onChange={(e) => setTitleFr(e.target.value)}
							placeholder="ex: Attaché de Défense"
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">
							{lang === "fr" ? "Titre (EN)" : "Title (EN)"}
						</Label>
						<Input
							value={titleEn}
							onChange={(e) => setTitleEn(e.target.value)}
							placeholder="ex: Defense Attaché"
							className="h-8 text-sm"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={isRequired}
							onCheckedChange={setIsRequired}
						/>
						<Label className="text-xs">
							{lang === "fr"
								? "Poste obligatoire"
								: "Required position"}
						</Label>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{lang === "fr" ? "Annuler" : "Cancel"}
					</Button>
					<Button
						onClick={handleCreate}
						disabled={!code.trim() || !titleFr.trim() || isSaving}
					>
						{isSaving ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Plus className="mr-1.5 h-3.5 w-3.5" />
						)}
						{lang === "fr" ? "Créer" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Edit Position Dialog ────────────────────────────────────────
function EditPositionDialog({
	open,
	onOpenChange,
	position,
	lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	position: any;
	lang: string;
}) {
	const [titleFr, setTitleFr] = useState(position?.title?.fr ?? "");
	const [titleEn, setTitleEn] = useState(position?.title?.en ?? "");
	const [grade, setGrade] = useState(position?.grade ?? "agent");
	const [isRequired, setIsRequired] = useState(
		position?.isRequired ?? false,
	);
	const [isSaving, setIsSaving] = useState(false);

	const { mutateAsync: updatePosition } = useConvexMutationQuery(
		api.functions.roleConfig.updatePosition,
	);

	// Sync form when position changes
	useMemo(() => {
		if (position) {
			setTitleFr(position.title?.fr ?? "");
			setTitleEn(position.title?.en ?? "");
			setGrade(position.grade ?? "agent");
			setIsRequired(position.isRequired ?? false);
		}
	}, [position?._id]);

	const handleSave = async () => {
		if (!position?._id || !titleFr.trim()) return;
		setIsSaving(true);
		try {
			await updatePosition({
				positionId: position._id as Id<"positions">,
				title: {
					fr: titleFr.trim(),
					en: titleEn.trim() || titleFr.trim(),
				},
				grade: grade as any,
				isRequired,
				level:
					grade === "chief"
						? 1
						: grade === "deputy_chief"
							? 2
							: grade === "counselor"
								? 3
								: grade === "agent"
									? 4
									: 5,
			});
			toast.success(
				lang === "fr"
					? `Poste "${titleFr}" mis à jour`
					: `Position "${titleFr}" updated`,
			);
			onOpenChange(false);
		} catch {
			toast.error(
				lang === "fr"
					? "Erreur lors de la modification"
					: "Error updating position",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{lang === "fr" ? "Modifier le poste" : "Edit position"}
					</DialogTitle>
					<DialogDescription>
						{lang === "fr"
							? `Modifier les informations du poste "${position?.title?.fr ?? position?.code}".`
							: `Edit position "${position?.title?.en ?? position?.code}" details.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label className="text-xs">Code</Label>
						<Input
							value={position?.code ?? ""}
							disabled
							className="h-8 text-sm bg-muted/50"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">
							{lang === "fr" ? "Grade" : "Grade"}
						</Label>
						<Select value={grade} onValueChange={setGrade}>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{GRADE_OPTIONS.map((g) => (
									<SelectItem key={g.value} value={g.value}>
										<span className={g.color}>
											{g.label[lang as "fr" | "en"] ||
												g.label.fr}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">
							{lang === "fr" ? "Titre (FR)" : "Title (FR)"}
						</Label>
						<Input
							value={titleFr}
							onChange={(e) => setTitleFr(e.target.value)}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">
							{lang === "fr" ? "Titre (EN)" : "Title (EN)"}
						</Label>
						<Input
							value={titleEn}
							onChange={(e) => setTitleEn(e.target.value)}
							className="h-8 text-sm"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={isRequired}
							onCheckedChange={setIsRequired}
						/>
						<Label className="text-xs">
							{lang === "fr"
								? "Poste obligatoire"
								: "Required position"}
						</Label>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{lang === "fr" ? "Annuler" : "Cancel"}
					</Button>
					<Button
						onClick={handleSave}
						disabled={!titleFr.trim() || isSaving}
					>
						{isSaving ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Save className="mr-1.5 h-3.5 w-3.5" />
						)}
						{lang === "fr" ? "Enregistrer" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Org Positions List (live data with CRUD) ────────────────────
function OrgPositionsList({
	orgId,
	lang,
}: {
	orgId: Id<"orgs">;
	lang: string;
}) {
	const { data: positions, isPending } = useAuthenticatedConvexQuery(
		api.functions.roleConfig.getOrgPositions,
		{ orgId },
	);
	const { mutateAsync: deletePosition } = useConvexMutationQuery(
		api.functions.roleConfig.deletePosition,
	);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [editingPosition, setEditingPosition] = useState<any>(null);

	const handleDelete = async (positionId: Id<"positions">, name: string) => {
		const confirmed = window.confirm(
			lang === "fr"
				? `Supprimer le poste "${name}" ? Cette action est irréversible.`
				: `Delete position "${name}"? This action is irreversible.`,
		);
		if (!confirmed) return;

		try {
			await deletePosition({ positionId });
			toast.success(
				lang === "fr" ? "Poste supprimé" : "Position deleted",
			);
		} catch (e: any) {
			const msg = e?.data?.message ?? e?.message ?? "";
			if (msg.includes("required") || msg.includes("REQUIRED")) {
				toast.error(
					lang === "fr"
						? "Impossible de supprimer un poste obligatoire"
						: "Cannot delete a required position",
				);
			} else {
				toast.error(
					lang === "fr"
						? "Erreur lors de la suppression"
						: "Error deleting position",
				);
			}
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-6">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!positions || positions.length === 0) {
		return (
			<div className="flex flex-col items-center py-6 text-center">
				<Users className="h-8 w-8 text-muted-foreground/20 mb-2" />
				<p className="text-xs text-muted-foreground">
					{lang === "fr"
						? "Aucun poste configuré"
						: "No positions configured"}
				</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-2 h-7 text-xs gap-1"
					onClick={() => setAddDialogOpen(true)}
				>
					<Plus className="h-3 w-3" />
					{lang === "fr" ? "Ajouter un poste" : "Add a position"}
				</Button>
				<AddPositionDialog
					open={addDialogOpen}
					onOpenChange={setAddDialogOpen}
					orgId={orgId}
					lang={lang}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
				{(positions as any[]).map((pos) => (
					<PositionBadge
						key={pos._id}
						position={pos}
						lang={lang}
						editable
						onEdit={() => setEditingPosition(pos)}
						onDelete={() =>
							handleDelete(
								pos._id,
								pos.title?.[lang as "fr" | "en"] ||
									pos.title?.fr ||
									pos.code,
							)
						}
					/>
				))}
			</div>
			<Button
				variant="outline"
				size="sm"
				className="w-full mt-2 h-7 text-xs gap-1 border-dashed"
				onClick={() => setAddDialogOpen(true)}
			>
				<Plus className="h-3 w-3" />
				{lang === "fr" ? "Ajouter un poste" : "Add a position"}
			</Button>
			<AddPositionDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
				orgId={orgId}
				lang={lang}
			/>
			{editingPosition && (
				<EditPositionDialog
					open={!!editingPosition}
					onOpenChange={(open) => !open && setEditingPosition(null)}
					position={editingPosition}
					lang={lang}
				/>
			)}
		</>
	);
}

// ─── Task Presets Section (Profils metier) ───────────────────────
function TaskPresetsSection({ lang }: { lang: string }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<FlatCard>
			<div
				className="p-3 lg:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-primary" />
						<p className="text-base font-semibold">
							{lang === "fr"
								? "Profils métier"
								: "Role profiles"}
						</p>
						<Badge variant="secondary" className="text-[10px] h-5">
							{POSITION_TASK_PRESETS.length}
						</Badge>
					</div>
					{expanded ? (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					{lang === "fr"
						? "Catalogue des profils de permissions assignables aux postes. Chaque profil regroupe un ensemble de tâches autorisées."
						: "Catalog of permission profiles assignable to positions. Each profile groups a set of authorized tasks."}
				</p>
			</div>
			{expanded && (
				<div className="p-3 lg:p-4 pt-0">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{POSITION_TASK_PRESETS.map((preset) => (
							<div
								key={preset.code}
								className="rounded-xl border bg-card p-3 space-y-2"
							>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											"h-8 w-8 rounded-lg flex items-center justify-center",
											"bg-muted/50",
										)}
									>
										<DynamicLucideIcon
											name={preset.icon}
											className={cn(
												"h-4 w-4",
												preset.color,
											)}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="text-sm font-semibold truncate">
											{preset.label[
												lang as "fr" | "en"
											] || preset.label.fr}
										</h4>
										<p className="text-[10px] text-muted-foreground truncate">
											{preset.description[
												lang as "fr" | "en"
											] || preset.description.fr}
										</p>
									</div>
									<Badge
										variant="outline"
										className="text-[9px] h-4 px-1 shrink-0"
									>
										{preset.tasks.length} tâches
									</Badge>
								</div>
								<div className="flex flex-wrap gap-1">
									{preset.tasks.slice(0, 5).map((task) => (
										<Badge
											key={task}
											variant="secondary"
											className="text-[8px] h-4 px-1"
										>
											{task}
										</Badge>
									))}
									{preset.tasks.length > 5 && (
										<Badge
											variant="outline"
											className="text-[8px] h-4 px-1 text-muted-foreground"
										>
											+{preset.tasks.length - 5}
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</FlatCard>
	);
}

// ─── Main Export ──────────────────────────────────────────────────
export function RepsTypesTemplatesTab({
	lang,
	allOrgs,
	editingOrgId,
	setEditingOrgId,
	editingOrg,
	pendingModuleChanges: _pendingModuleChanges,
	setPendingModuleChanges,
	selectedOrgType: _selectedOrgType,
	setSelectedOrgType,
}: RepsTypesTemplatesTabProps) {
	// ── Computed data ──
	const templates = useMemo(
		() =>
			ORGANIZATION_TEMPLATES.filter(
				(t) => t.type !== "third_party" && t.type !== "custom",
			),
		[],
	);

	const orgCountByType = useMemo(() => {
		if (!allOrgs) return {} as Record<string, number>;
		return (allOrgs as any[]).reduce(
			(acc, org) => {
				const t = org.type ?? "custom";
				acc[t] = (acc[t] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);
	}, [allOrgs]);

	const orgsByType = useMemo(() => {
		if (!allOrgs) return {} as Record<string, any[]>;
		return (allOrgs as any[]).reduce(
			(acc, org) => {
				const t = org.type ?? "custom";
				if (!acc[t]) acc[t] = [];
				acc[t].push(org);
				return acc;
			},
			{} as Record<string, any[]>,
		);
	}, [allOrgs]);

	const totalModules = Object.keys(MODULE_REGISTRY).length;
	const coreModules = Object.values(MODULE_REGISTRY).filter(
		(m) => m.isCore,
	).length;
	const totalPositions = templates.reduce(
		(s, t) => s + t.positions.length,
		0,
	);
	const totalOrgs = allOrgs ? (allOrgs as any[]).length : 0;

	// ── Dialog state ──
	const [applyDialog, setApplyDialog] = useState<{
		open: boolean;
		templateType: string;
	}>({ open: false, templateType: "" });
	const [resetDialog, setResetDialog] = useState<{
		open: boolean;
		templateType: string;
	}>({ open: false, templateType: "" });

	return (
		<div className="flex flex-col gap-6">
			{/* ─── Header ─── */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
							<Globe className="h-5 w-5 text-primary" />
						</div>
						{lang === "fr"
							? "Représentations diplomatiques"
							: "Diplomatic representations"}
					</h1>
					<p className="text-muted-foreground mt-1">
						{lang === "fr"
							? "Types de représentations, postes, modules et niveaux d'accès par défaut"
							: "Representation types, positions, modules and default access levels"}
					</p>
				</div>
				<Button asChild>
					<Link to="/reps/new">
						<Plus className="mr-1.5 h-4 w-4" />
						{lang === "fr"
							? "Nouvelle représentation"
							: "New representation"}
					</Link>
				</Button>
			</div>

			{/* ─── Stats ─── */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-primary">
							{templates.length}
						</div>
						<div className="text-xs text-muted-foreground">Types</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-amber-600">
							{totalPositions}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr"
								? "Postes prédéfinis"
								: "Predefined positions"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-blue-600">
							{totalModules}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr"
								? "Modules disponibles"
								: "Available modules"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-emerald-600">
							{coreModules}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr"
								? "Modules obligatoires"
								: "Core modules"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-purple-600">
							{totalOrgs}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr"
								? "Représentations actives"
								: "Active representations"}
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── Selecteur de representation (mode edition) ─── */}
			<FlatCard className="border border-dashed">
				<div className="p-3 lg:p-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 flex-1">
							<Edit className="h-4 w-4 text-muted-foreground shrink-0" />
							<span className="text-sm font-medium">
								{lang === "fr"
									? "Mode édition :"
									: "Edit mode:"}
							</span>
							<Select
								value={editingOrgId ?? "none"}
								onValueChange={(v) => {
									if (v === "none") {
										setEditingOrgId(null);
										setPendingModuleChanges(new Map());
									} else {
										setEditingOrgId(v as Id<"orgs">);
										setPendingModuleChanges(new Map());
										const org = (allOrgs as any[])?.find(
											(o) => o._id === v,
										);
										if (org?.type)
											setSelectedOrgType(org.type);
									}
								}}
							>
								<SelectTrigger className="w-[320px] h-8 text-sm">
									<SelectValue
										placeholder={
											lang === "fr"
												? "Sélectionner une représentation..."
												: "Select a representation..."
										}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										{lang === "fr"
											? "— Aucune (mode lecture)"
											: "— None (read mode)"}
									</SelectItem>
									{(allOrgs as any[])?.map((org) => (
										<SelectItem
											key={org._id}
											value={org._id}
										>
											{org.name}{" "}
											<span className="text-muted-foreground">
												({org.type})
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{editingOrgId && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setEditingOrgId(null);
									setPendingModuleChanges(new Map());
								}}
								className="gap-1.5"
							>
								<X className="h-3.5 w-3.5" />
								{lang === "fr"
									? "Quitter l'édition"
									: "Exit editing"}
							</Button>
						)}
					</div>
					{editingOrg && (
						<p className="text-xs text-muted-foreground mt-2 ml-6">
							{lang === "fr"
								? `Édition de "${editingOrg.name}" (${editingOrg.type}) — Les postes et la matrice affichent les données live.`
								: `Editing "${editingOrg.name}" (${editingOrg.type}) — Positions and matrix show live data.`}
						</p>
					)}
				</div>
			</FlatCard>

			{/* ─── Templates par type ─── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{templates.map((tpl) => {
					const requiredPositions = tpl.positions.filter(
						(p) => p.isRequired,
					).length;
					const gradeDistribution = Object.entries(POSITION_GRADES)
						.map(([key, grade]) => ({
							key,
							label:
								grade.label[lang as "fr" | "en"] ||
								grade.label.fr,
							color: grade.color,
							bgColor: grade.bgColor,
							count: tpl.positions.filter((p) => p.grade === key)
								.length,
						}))
						.filter((g) => g.count > 0);
					const positionsWithMA = tpl.positions.filter(
						(p) =>
							p.moduleAccess && p.moduleAccess.length > 0,
					).length;
					const orgCount = orgCountByType[tpl.type] || 0;
					const isLiveMode =
						editingOrg?.type === tpl.type &&
						editingOrgId !== null;

					return (
						<FlatCard
							key={tpl.type}
							className={cn(
								isLiveMode &&
									"ring-2 ring-primary/30",
							)}
						>
							<div className="p-3 lg:p-4 pb-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
											<DynamicLucideIcon
												name={
													ICON_MAP[tpl.icon] ||
													"Building2"
												}
												className="h-5 w-5 text-primary"
											/>
										</div>
										<div>
											<p className="text-base font-semibold">
												{tpl.label[
													lang as "fr" | "en"
												] || tpl.label.fr}
											</p>
											<p className="text-xs text-muted-foreground">
												{tpl.description[
													lang as "fr" | "en"
												] || tpl.description.fr}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1.5">
										{orgCount > 0 && (
											<Badge
												variant="secondary"
												className="text-[10px] h-5"
											>
												{orgCount} repr.
											</Badge>
										)}
										<Badge
											variant="outline"
											className="shrink-0 text-xs"
										>
											{tpl.type}
										</Badge>
										<TemplateCardActions
											lang={lang}
											onApply={() =>
												setApplyDialog({
													open: true,
													templateType: tpl.type,
												})
											}
											onReset={() =>
												setResetDialog({
													open: true,
													templateType: tpl.type,
												})
											}
										/>
									</div>
								</div>
								{isLiveMode && (
									<Badge className="mt-2 w-fit bg-primary/10 text-primary border-primary/20 text-[10px]">
										<Edit className="h-2.5 w-2.5 mr-1" />
										{lang === "fr"
											? `Données live : ${editingOrg.name}`
											: `Live data: ${editingOrg.name}`}
									</Badge>
								)}
								<div className="flex items-center gap-2 mt-3 flex-wrap">
									{gradeDistribution.map((g) => (
										<span
											key={g.key}
											className={cn(
												"inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
												g.bgColor,
												g.color,
											)}
										>
											{g.label}: {g.count}
										</span>
									))}
								</div>
							</div>
							<div className="p-3 lg:p-4 pt-0 space-y-3">
								<div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-3">
									<span className="flex items-center gap-1">
										<Users className="h-3.5 w-3.5" />
										{tpl.positions.length}{" "}
										{lang === "fr"
											? "postes"
											: "positions"}
									</span>
									<span className="text-amber-600">
										{requiredPositions}{" "}
										{lang === "fr"
											? "requis"
											: "required"}
									</span>
									<span className="flex items-center gap-1">
										<Layers className="h-3.5 w-3.5" />
										{tpl.modules.length} modules
									</span>
									{positionsWithMA > 0 && (
										<span className="flex items-center gap-1 text-emerald-600">
											<Shield className="h-3.5 w-3.5" />
											{positionsWithMA}{" "}
											{lang === "fr"
												? "avec accès modulaire"
												: "with module access"}
										</span>
									)}
								</div>

								{/* Postes : live ou statique */}
								{isLiveMode ? (
									<OrgPositionsList
										orgId={editingOrgId!}
										lang={lang}
									/>
								) : (
									<div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
										{tpl.positions.map((pos) => (
											<PositionBadge
												key={pos.code}
												position={pos}
												lang={lang}
											/>
										))}
									</div>
								)}

								<div className="border-t pt-3">
									<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
										{lang === "fr"
											? "Modules activés"
											: "Enabled modules"}
									</p>
									<div className="flex flex-wrap gap-1">
										{tpl.modules
											.slice(0, 12)
											.map((mod) => {
												const def =
													MODULE_REGISTRY[
														mod as ModuleCodeValue
													];
												if (!def) return null;
												return (
													<Badge
														key={mod}
														variant="outline"
														className="text-[9px] px-1.5 py-0 h-4"
													>
														{def.label[
															lang as
																| "fr"
																| "en"
														] || def.label.fr}
													</Badge>
												);
											})}
										{tpl.modules.length > 12 && (
											<Badge
												variant="secondary"
												className="text-[9px] px-1.5 py-0 h-4"
											>
												+{tpl.modules.length - 12}
											</Badge>
										)}
									</div>
								</div>
							</div>
						</FlatCard>
					);
				})}

				{/* Carte "Nouvelle Representation" */}
				<FlatCard className="border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
					<Link
						to="/reps/new"
						className="flex flex-col items-center justify-center h-full min-h-[280px] p-6 text-center"
					>
						<div className="h-14 w-14 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
							<Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>
						<p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
							{lang === "fr"
								? "Nouvelle Représentation"
								: "New Representation"}
						</p>
						<p className="text-xs text-muted-foreground/60 mt-1">
							{lang === "fr"
								? "Créer une ambassade, consulat ou mission"
								: "Create an embassy, consulate or mission"}
						</p>
					</Link>
				</FlatCard>
			</div>

			{/* ─── Profils metier (Task Presets) ─── */}
			<TaskPresetsSection lang={lang} />

			{/* ─── Dialogs ─── */}
			<ApplyTemplateDialog
				open={applyDialog.open}
				onOpenChange={(open) =>
					setApplyDialog((prev) => ({ ...prev, open }))
				}
				templateType={applyDialog.templateType}
				orgs={orgsByType[applyDialog.templateType] ?? []}
				lang={lang}
			/>
			<ResetTemplateDialog
				open={resetDialog.open}
				onOpenChange={(open) =>
					setResetDialog((prev) => ({ ...prev, open }))
				}
				templateType={resetDialog.templateType}
				orgs={orgsByType[resetDialog.templateType] ?? []}
				lang={lang}
			/>
		</div>
	);
}
