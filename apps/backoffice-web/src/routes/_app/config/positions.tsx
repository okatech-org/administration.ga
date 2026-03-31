import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	ChevronRight,
	GripVertical,
	Pencil,
	Plus,
	Save,
	Shield,
	Trash2,
	Undo2,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { toast } from "sonner";
import {
	ORGANIZATION_TEMPLATES,
	POSITION_GRADES,
	POSITION_TASK_PRESETS,
	type PositionGrade,
	type PositionTemplate,
} from "@convex/lib/roles";

export const Route = createFileRoute("/_app/config/positions")({
	component: PositionsConfigPage,
});

// ─── Grade keys ordered by hierarchy ─────────────────────
const GRADE_KEYS: PositionGrade[] = ["chief", "deputy_chief", "counselor", "agent", "external"];

// ─── Position Card ───────────────────────────────────────
function PositionCard({
	position,
	gradeKey,
	onMoveUp,
	onMoveDown,
	onEdit,
	onDelete,
	onDragStart,
	onDragEnd,
}: {
	position: PositionTemplate;
	gradeKey: PositionGrade;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onDragStart: (e: React.DragEvent) => void;
	onDragEnd: (e: React.DragEvent) => void;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const grade = POSITION_GRADES[gradeKey];
	const presets = POSITION_TASK_PRESETS.filter((p) => position.taskPresets.includes(p.code));
	const gradeIdx = GRADE_KEYS.indexOf(gradeKey);
	const canMoveUp = gradeIdx > 0;
	const canMoveDown = gradeIdx < GRADE_KEYS.length - 1;

	return (
		<div
			className="rounded-lg border bg-card overflow-hidden group/card transition-shadow hover:shadow-md"
			draggable
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
		>
			<div className="flex items-center">
				{/* Drag handle */}
				<div
					className="flex items-center justify-center w-8 h-full cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 self-stretch border-r border-border/50"
					onMouseDown={(e) => e.stopPropagation()}
				>
					<GripVertical className="h-4 w-4" />
				</div>

				{/* Main content */}
				<button
					type="button"
					className="flex-1 flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/30 transition-colors min-w-0"
					onClick={() => setIsExpanded(!isExpanded)}
				>
					{isExpanded ? (
						<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
					) : (
						<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
					)}
					<div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", grade?.bgColor || "bg-muted")}>
						<DynamicLucideIcon
							name={grade?.icon || "User"}
							className={cn("h-4 w-4", grade?.color || "text-muted-foreground")}
						/>
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold truncate">{position.title.fr}</span>
							{position.isRequired && (
								<Badge variant="outline" className="text-[8px] h-4 px-1 text-amber-600 border-amber-300 shrink-0">
									Requis
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span className={grade?.color}>{grade?.label.fr}</span>
							<span>·</span>
							<span className="font-mono text-[10px]">{position.perm} perm.</span>
							<span>·</span>
							<span>{presets.length} profils</span>
						</div>
					</div>
					<span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
						{position.code}
					</span>
				</button>

				{/* Action buttons */}
				<div className="flex items-center gap-0.5 px-2 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
					{/* Move up */}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={!canMoveUp}
						onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
						title="Monter d'un grade"
					>
						<ArrowUp className="h-3.5 w-3.5" />
					</Button>
					{/* Move down */}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={!canMoveDown}
						onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
						title="Descendre d'un grade"
					>
						<ArrowDown className="h-3.5 w-3.5" />
					</Button>
					{/* Edit */}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
						onClick={(e) => { e.stopPropagation(); onEdit(); }}
						title="Modifier"
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					{/* Delete */}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
						onClick={(e) => { e.stopPropagation(); onDelete(); }}
						title="Supprimer"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Expanded details */}
			{isExpanded && (
				<div className="border-t px-4 py-3 bg-muted/20 space-y-3 ml-8">
					<p className="text-xs text-muted-foreground">{position.description.fr}</p>
					<div>
						<h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
							Profils métier associés
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{presets.map((preset) => (
								<div key={preset.code} className="flex items-center gap-2 rounded-md border px-3 py-2 bg-card">
									<DynamicLucideIcon name={preset.icon} className={cn("h-4 w-4", preset.color)} />
									<div className="flex-1 min-w-0">
										<span className="text-xs font-medium">{preset.label.fr}</span>
										<span className="text-[10px] text-muted-foreground block truncate">
											{preset.tasks.length} permissions
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Edit Dialog ─────────────────────────────────────────
function EditPositionDialog({
	position,
	isOpen,
	onClose,
	onSave,
}: {
	position: PositionTemplate | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updated: PositionTemplate) => void;
}) {
	const [title, setTitle] = useState("");
	const [titleEn, setTitleEn] = useState("");
	const [description, setDescription] = useState("");
	const [descriptionEn, setDescriptionEn] = useState("");
	const [code, setCode] = useState("");
	const [grade, setGrade] = useState<PositionGrade>("agent");
	const [isRequired, setIsRequired] = useState(false);
	const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

	// Populate form when position changes
	useMemo(() => {
		if (position) {
			setTitle(position.title.fr);
			setTitleEn(position.title.en);
			setDescription(position.description.fr);
			setDescriptionEn(position.description.en);
			setCode(position.code);
			setGrade((position.grade || "agent") as PositionGrade);
			setIsRequired(position.isRequired);
			setSelectedPresets([...position.taskPresets]);
		}
	}, [position]);

	const togglePreset = (presetCode: string) => {
		setSelectedPresets((prev) =>
			prev.includes(presetCode)
				? prev.filter((c) => c !== presetCode)
				: [...prev, presetCode],
		);
	};

	const handleSave = () => {
		if (!position || !title.trim() || !code.trim()) return;
		onSave({
			...position,
			code: code.trim(),
			title: { fr: title.trim(), en: titleEn.trim() || title.trim() },
			description: { fr: description.trim(), en: descriptionEn.trim() || description.trim() },
			grade,
			isRequired,
			taskPresets: selectedPresets,
		});
		onClose();
	};

	if (!position) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Pencil className="h-4 w-4 text-blue-600" />
						Modifier le poste
					</DialogTitle>
					<DialogDescription>
						Modifier les informations du poste « {position.title.fr} »
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Title FR */}
					<div className="space-y-1.5">
						<Label className="text-xs">Titre</Label>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du poste" />
					</div>

					{/* Title EN */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Title (EN)</Label>
						<Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Position title" />
					</div>

					{/* Code */}
					<div className="space-y-1.5">
						<Label className="text-xs">Code</Label>
						<Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-xs" placeholder="position_code" />
					</div>

					{/* Grade */}
					<div className="space-y-1.5">
						<Label className="text-xs">Grade</Label>
						<Select value={grade} onValueChange={(v) => setGrade(v as PositionGrade)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{GRADE_KEYS.map((g) => (
									<SelectItem key={g} value={g}>
										<span className={POSITION_GRADES[g].color}>{POSITION_GRADES[g].label.fr}</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<Label className="text-xs">Description</Label>
						<Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du poste" />
					</div>

					{/* Required */}
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={isRequired}
							onChange={(e) => setIsRequired(e.target.checked)}
							className="rounded border-border"
						/>
						<span className="text-sm">Poste requis</span>
					</label>

					{/* Task Presets */}
					<div className="space-y-2">
						<Label className="text-xs">Profils métier</Label>
						<div className="grid grid-cols-2 gap-2">
							{POSITION_TASK_PRESETS.map((preset) => {
								const isSelected = selectedPresets.includes(preset.code);
								return (
									<button
										key={preset.code}
										type="button"
										className={cn(
											"flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
											isSelected
												? "border-primary bg-primary/5"
												: "border-border hover:bg-muted/50",
										)}
										onClick={() => togglePreset(preset.code)}
									>
										<DynamicLucideIcon name={preset.icon} className={cn("h-4 w-4", preset.color)} />
										<span className="text-xs font-medium flex-1">{preset.label.fr}</span>
										<span className="text-[10px] text-muted-foreground">{preset.tasks.length}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Annuler</Button>
					<Button onClick={handleSave} disabled={!title.trim() || !code.trim()}>
						<Save className="h-4 w-4 mr-1" />
						Enregistrer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Main Page ───────────────────────────────────────────
function PositionsConfigPage() {
	const [selectedOrgType, setSelectedOrgType] = useState(ORGANIZATION_TEMPLATES[0]?.type || "embassy");

	// Mutable positions state per org type
	const [positionsMap, setPositionsMap] = useState<Record<string, PositionTemplate[]>>(() => {
		const map: Record<string, PositionTemplate[]> = {};
		for (const tpl of ORGANIZATION_TEMPLATES) {
			map[tpl.type] = [...tpl.positions];
		}
		return map;
	});

	// Track if modified
	const [hasChanges, setHasChanges] = useState(false);

	const templates = useMemo(() => ORGANIZATION_TEMPLATES, []);
	const positions = positionsMap[selectedOrgType] || [];

	// Drag state
	const draggedPosition = useRef<{ code: string; fromGrade: PositionGrade } | null>(null);
	const [dropTarget, setDropTarget] = useState<PositionGrade | null>(null);

	// Edit state
	const [editingPosition, setEditingPosition] = useState<PositionTemplate | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Delete state
	const [deletingPosition, setDeletingPosition] = useState<PositionTemplate | null>(null);

	// Group positions by grade
	const positionsByGrade = useMemo(() => {
		const groups: Record<string, PositionTemplate[]> = {};
		for (const pos of positions) {
			const key = pos.grade || "unassigned";
			if (!groups[key]) groups[key] = [];
			groups[key].push(pos);
		}
		return groups;
	}, [positions]);

	// ─── Actions ─────────────────────────────────────────
	const updatePositions = useCallback((orgType: string, newPositions: PositionTemplate[]) => {
		setPositionsMap((prev) => ({ ...prev, [orgType]: newPositions }));
		setHasChanges(true);
	}, []);

	const moveToGrade = useCallback((positionCode: string, newGrade: PositionGrade) => {
		const current = positionsMap[selectedOrgType] || [];
		const updated = current.map((p) =>
			p.code === positionCode ? { ...p, grade: newGrade } : p,
		);
		updatePositions(selectedOrgType, updated);
		toast.success("Poste déplacé vers " + POSITION_GRADES[newGrade].label.fr);
	}, [positionsMap, selectedOrgType, updatePositions]);

	const handleMoveUp = useCallback((positionCode: string, currentGrade: PositionGrade) => {
		const idx = GRADE_KEYS.indexOf(currentGrade);
		if (idx > 0) moveToGrade(positionCode, GRADE_KEYS[idx - 1]);
	}, [moveToGrade]);

	const handleMoveDown = useCallback((positionCode: string, currentGrade: PositionGrade) => {
		const idx = GRADE_KEYS.indexOf(currentGrade);
		if (idx < GRADE_KEYS.length - 1) moveToGrade(positionCode, GRADE_KEYS[idx + 1]);
	}, [moveToGrade]);

	const handleDelete = useCallback(() => {
		if (!deletingPosition) return;
		const current = positionsMap[selectedOrgType] || [];
		updatePositions(selectedOrgType, current.filter((p) => p.code !== deletingPosition.code));
		toast.success(`Poste « ${deletingPosition.title.fr} » supprimé`);
		setDeletingPosition(null);
	}, [deletingPosition, positionsMap, selectedOrgType, updatePositions]);

	const handleEdit = useCallback((updated: PositionTemplate) => {
		const current = positionsMap[selectedOrgType] || [];
		updatePositions(selectedOrgType, current.map((p) => p.code === updated.code ? updated : p));
		toast.success(`Poste « ${updated.title.fr} » modifié`);
	}, [positionsMap, selectedOrgType, updatePositions]);

	const handleReset = useCallback(() => {
		const original = ORGANIZATION_TEMPLATES.find((t) => t.type === selectedOrgType);
		if (original) {
			updatePositions(selectedOrgType, [...original.positions]);
			setHasChanges(false);
			toast.info("Configuration réinitialisée");
		}
	}, [selectedOrgType, updatePositions]);

	const handleAddPosition = useCallback(() => {
		const newPos: PositionTemplate = {
			code: `custom_${Date.now()}`,
			title: { fr: "Nouveau poste", en: "New position" },
			description: { fr: "Description du poste", en: "Position description" },
			level: 5,
			perm: 10,
			grade: "agent",
			taskPresets: [],
			isRequired: false,
		};
		const current = positionsMap[selectedOrgType] || [];
		updatePositions(selectedOrgType, [...current, newPos]);
		setEditingPosition(newPos);
		setIsEditOpen(true);
	}, [positionsMap, selectedOrgType, updatePositions]);

	// ─── Drag & Drop handlers ────────────────────────────
	const handleDragStart = useCallback((e: React.DragEvent, positionCode: string, fromGrade: PositionGrade) => {
		draggedPosition.current = { code: positionCode, fromGrade };
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", positionCode);
		// Add dragging class after a tick
		requestAnimationFrame(() => {
			(e.target as HTMLElement).style.opacity = "0.4";
		});
	}, []);

	const handleDragEnd = useCallback((e: React.DragEvent) => {
		draggedPosition.current = null;
		setDropTarget(null);
		(e.target as HTMLElement).style.opacity = "1";
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent, gradeKey: PositionGrade) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDropTarget(gradeKey);
	}, []);

	const handleDragLeave = useCallback(() => {
		setDropTarget(null);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent, targetGrade: PositionGrade) => {
		e.preventDefault();
		setDropTarget(null);
		const dragged = draggedPosition.current;
		if (!dragged || dragged.fromGrade === targetGrade) return;
		moveToGrade(dragged.code, targetGrade);
		draggedPosition.current = null;
	}, [moveToGrade]);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6 pt-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
							<Shield className="h-5 w-5 text-primary" />
						</div>
						Postes & Profils
					</h1>
					<p className="text-muted-foreground mt-1">
						Templates de postes et profils métier par type de représentation
					</p>
				</div>
				<div className="flex items-center gap-2">
					{hasChanges && (
						<Button variant="outline" size="sm" onClick={handleReset}>
							<Undo2 className="h-4 w-4 mr-1" />
							Réinitialiser
						</Button>
					)}
					<Button size="sm" onClick={handleAddPosition}>
						<Plus className="h-4 w-4 mr-1" />
						Ajouter un poste
					</Button>
				</div>
			</div>

			{/* Org type selector */}
			<div className="flex items-center gap-2 overflow-x-auto pb-1">
				{templates.map((tpl) => {
					const isActive = selectedOrgType === tpl.type;
					return (
						<button
							key={tpl.type}
							type="button"
							className={cn(
								"flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all shrink-0 border",
								isActive
									? "bg-primary text-primary-foreground border-primary shadow-sm"
									: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
							)}
							onClick={() => setSelectedOrgType(tpl.type)}
						>
							<DynamicLucideIcon name={tpl.icon} className="h-4 w-4" />
							{tpl.label.fr}
							<Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
								{(positionsMap[tpl.type] || tpl.positions).length}
							</Badge>
						</button>
					);
				})}
			</div>

			{/* Grade distribution */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
				{GRADE_KEYS.map((key) => {
					const grade = POSITION_GRADES[key];
					const count = positionsByGrade[key]?.length || 0;
					return (
						<Card key={key} className={cn("overflow-hidden", count === 0 && "opacity-40")}>
							<CardContent className="p-3 flex items-center gap-3">
								<div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", grade.bgColor)}>
									<DynamicLucideIcon name={grade.icon} className={cn("h-4 w-4", grade.color)} />
								</div>
								<div>
									<div className="text-sm font-semibold">{count}</div>
									<div className={cn("text-[10px] font-medium", grade.color)}>{grade.label.fr}</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Positions by grade — with drag zones */}
			<div className="space-y-6">
				{GRADE_KEYS.map((gradeKey) => {
					const grade = POSITION_GRADES[gradeKey];
					const gradePositions = positionsByGrade[gradeKey] || [];
					const isDragTarget = dropTarget === gradeKey;
					const gradeColor = gradeKey === "chief" ? "border-red-300" : gradeKey === "deputy_chief" ? "border-amber-300" : gradeKey === "counselor" ? "border-blue-300" : gradeKey === "agent" ? "border-green-300" : "border-gray-300";

					return (
						<div
							key={gradeKey}
							onDragOver={(e) => handleDragOver(e, gradeKey)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, gradeKey)}
							className={cn(
								"rounded-xl p-4 transition-all",
								isDragTarget
									? "bg-primary/5 ring-2 ring-primary/30 ring-dashed"
									: "bg-transparent",
							)}
						>
							<div className="flex items-center gap-2 mb-3">
								<div className={cn("h-6 w-6 rounded flex items-center justify-center", grade.bgColor)}>
									<DynamicLucideIcon name={grade.icon} className={cn("h-3.5 w-3.5", grade.color)} />
								</div>
								<h3 className={cn("text-sm font-bold", grade.color)}>{grade.label.fr}</h3>
								<span className="text-xs text-muted-foreground">
									— {gradePositions.length} poste{gradePositions.length !== 1 ? "s" : ""}
								</span>
								{isDragTarget && (
									<Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 ml-auto animate-pulse">
										Déposer ici
									</Badge>
								)}
							</div>

							{gradePositions.length > 0 ? (
								<div className={cn("space-y-2 pl-4 border-l-2", gradeColor)}>
									{gradePositions.map((pos) => (
										<PositionCard
											key={pos.code}
											position={pos}
											gradeKey={gradeKey}
											onMoveUp={() => handleMoveUp(pos.code, gradeKey)}
											onMoveDown={() => handleMoveDown(pos.code, gradeKey)}
											onEdit={() => { setEditingPosition(pos); setIsEditOpen(true); }}
											onDelete={() => setDeletingPosition(pos)}
											onDragStart={(e) => handleDragStart(e, pos.code, gradeKey)}
											onDragEnd={handleDragEnd}
										/>
									))}
								</div>
							) : (
								<div className={cn("pl-4 border-l-2 border-dashed py-4 text-center text-xs text-muted-foreground", gradeColor)}>
									Aucun poste — glissez un poste ici
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Task Presets / Role modules overview */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Users className="h-4 w-4 text-primary" />
						Profils métier disponibles
					</CardTitle>
					<CardDescription>
						Les profils métier regroupent des permissions prédéfinies pour accélérer la configuration des postes
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{POSITION_TASK_PRESETS.map((preset) => (
							<div key={preset.code} className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
								<div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
									<DynamicLucideIcon name={preset.icon} className={cn("h-4 w-4", preset.color)} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-semibold">{preset.label.fr}</div>
									<div className="text-[10px] text-muted-foreground truncate">{preset.description.fr}</div>
								</div>
								<Badge variant="outline" className="shrink-0 text-[10px]">
									{preset.tasks.length}
								</Badge>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Edit Dialog */}
			<EditPositionDialog
				position={editingPosition}
				isOpen={isEditOpen}
				onClose={() => { setIsEditOpen(false); setEditingPosition(null); }}
				onSave={handleEdit}
			/>

			{/* Delete Confirmation */}
			<AlertDialog open={!!deletingPosition} onOpenChange={() => setDeletingPosition(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer le poste</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer le poste « <strong>{deletingPosition?.title.fr}</strong> » ?
							Cette action est irréversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							<Trash2 className="h-4 w-4 mr-1" />
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
