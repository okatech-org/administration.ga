"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	MODULE_REGISTRY,
	type ModuleCategory,
	type ModuleDefinition,
} from "@convex/lib/moduleCodes";
import {
	getPresetTasks,
	type OrganizationTemplate,
	POSITION_GRADES,
	type PositionGrade,
	type TaskPresetDefinition,
} from "@convex/lib/roles";
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
	Sparkles,
	Star,
	Trash2,
	UserCog,
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { DynamicLucideIcon } from "@/lib/lucide-icon";

// ─── Helpers ────────────────────────────────────────────
function toSnakeCase(str: string): string {
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
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
		icon: "🏛️",
		description: "",
	});

	const { data: roleConfig, isPending: configLoading } =
		useAuthenticatedConvexQuery(api.functions.roleConfig.getOrgFullRoleConfig, {
			orgId,
		});

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
				icon: newMinistry.icon || "🏛️",
				sortOrder: ministryGroups.length + 1,
			});
			toast.success(t("admin.roles.ministryCreated"));
			setNewMinistry({ code: "", label: "", icon: "🏛️", description: "" });
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
				<Card className="border-dashed border-2 border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<AlertTriangle className="h-4 w-4 text-amber-500" />
							{t("admin.roles.noConfig.title")}
						</CardTitle>
						<CardDescription>
							{t("admin.roles.noConfig.description")}
						</CardDescription>
					</CardHeader>
				</Card>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{(templates ?? []).map((template: OrganizationTemplate) => {
						const isMatch = template.type === orgType;
						return (
							<Card
								key={template.type}
								className={`transition-all hover:shadow-md cursor-pointer group ${
									isMatch
										? "ring-2 ring-primary border-primary"
										: "hover:border-primary/30"
								}`}
							>
								<CardHeader className="pb-2">
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
									<CardTitle className="text-sm">
										{getLocalizedValue(template.label, lang)}
									</CardTitle>
									<CardDescription className="text-xs">
										{getLocalizedValue(template.description, lang)}
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
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
								</CardContent>
							</Card>
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
			<Card>
				<CardContent className="p-4">
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
				</CardContent>
			</Card>

			{/* ─── Positions — Dual View ─────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div>
							<CardTitle className="flex items-center gap-2 text-base">
								<UserCog className="h-4 w-4" />
								{t("admin.roles.positions.title")} ({positions.length})
							</CardTitle>
							<CardDescription>
								{viewMode === "grade"
									? t("admin.roles.positions.byGradeDesc")
									: t("admin.roles.positions.byMinistryDesc")}
							</CardDescription>
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
							<Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
								<SheetTrigger asChild>
									<Button size="sm" className="gap-1.5">
										<Plus className="h-3.5 w-3.5" />
										{t("admin.roles.addPosition")}
									</Button>
								</SheetTrigger>
								<AddPositionSheetContent
									orgId={orgId}
									systemModules={systemModules as TaskPresetDefinition[]}
									lang={lang}
									onSuccess={() => setShowAddDialog(false)}
								/>
							</Sheet>

							{/* Add ministry group (only in ministry view) */}
							{viewMode === "ministry" && (
								<Sheet
									open={showAddMinistryDialog}
									onOpenChange={setShowAddMinistryDialog}
								>
									<SheetTrigger asChild>
										<Button size="sm" variant="outline" className="gap-1.5">
											<Plus className="h-3.5 w-3.5" />
											{t("admin.roles.addMinistry")}
										</Button>
									</SheetTrigger>
									<SheetContent
										side="bottom"
										className="max-h-[80vh] overflow-y-auto"
									>
										<div className="max-w-3xl mx-auto w-full">
											<SheetHeader>
												<SheetTitle>
													{t("admin.roles.ministry.addTitle")}
												</SheetTitle>
												<SheetDescription>
													{t("admin.roles.ministry.addDescription")}
												</SheetDescription>
											</SheetHeader>
											<div className="space-y-3 py-2">
												<div>
													<Label>{t("admin.roles.ministry.name")}</Label>
													<Input
														value={newMinistry.label}
														onChange={(e) =>
															setNewMinistry((p) => ({
																...p,
																label: e.target.value,
																code: toSnakeCase(e.target.value),
															}))
														}
														placeholder={t(
															"admin.roles.ministry.namePlaceholder",
														)}
													/>
												</div>
												<div className="grid grid-cols-2 gap-2">
													<div>
														<Label>{t("admin.roles.ministry.code")}</Label>
														<Input
															value={newMinistry.code}
															onChange={(e) =>
																setNewMinistry((p) => ({
																	...p,
																	code: e.target.value,
																}))
															}
															placeholder={t(
																"admin.roles.ministry.codePlaceholder",
															)}
														/>
													</div>
													<div>
														<Label>{t("admin.roles.ministry.icon")}</Label>
														<Input
															value={newMinistry.icon}
															onChange={(e) =>
																setNewMinistry((p) => ({
																	...p,
																	icon: e.target.value,
																}))
															}
															placeholder="🏛️"
														/>
													</div>
												</div>
												<div>
													<Label>{t("admin.roles.ministry.description")}</Label>
													<Input
														value={newMinistry.description}
														onChange={(e) =>
															setNewMinistry((p) => ({
																...p,
																description: e.target.value,
															}))
														}
														placeholder={t(
															"admin.roles.ministry.descriptionPlaceholder",
														)}
													/>
												</div>
											</div>
											<SheetFooter>
												<Button
													variant="outline"
													onClick={() => setShowAddMinistryDialog(false)}
												>
													{t("common.cancel")}
												</Button>
												<Button
													onClick={handleCreateMinistryGroup}
													disabled={!newMinistry.label.trim()}
												>
													{t("admin.roles.ministry.create")}
												</Button>
											</SheetFooter>
										</div>
									</SheetContent>
								</Sheet>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
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
												systemModules={systemModules}
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
												systemModules={systemModules}
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
										systemModules={systemModules}
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
				</CardContent>
			</Card>

			{/* ─── Available Role Modules ──────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Sparkles className="h-4 w-4" />
						{t("admin.roles.systemModules.title")} ({systemModules.length})
					</CardTitle>
					<CardDescription>
						{t("admin.roles.systemModules.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-2 sm:grid-cols-2">
						{systemModules.map((mod) => (
							<RoleModuleCard key={mod.code} module={mod} lang={lang} />
						))}
					</div>
				</CardContent>
			</Card>

			{/* ─── Edit Position Sheet ───────────────────── */}
			<Sheet
				open={!!editingPosition}
				onOpenChange={(open) => !open && setEditingPosition(null)}
			>
				{editingPosition && (
					<EditPositionSheetContent
						position={editingPosition}
						systemModules={systemModules as TaskPresetDefinition[]}
						lang={lang}
						onSuccess={() => setEditingPosition(null)}
					/>
				)}
			</Sheet>

			{/* ─── Edit Ministry Group Sheet ───────── */}
			<Sheet
				open={!!editingMinistry}
				onOpenChange={(open) => !open && setEditingMinistry(null)}
			>
				{editingMinistry && (
					<EditMinistryGroupSheet
						group={editingMinistry}
						onSuccess={() => setEditingMinistry(null)}
					/>
				)}
			</Sheet>

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
	systemModules,
	ministryGroups,
	lang,
	onDelete,
	onMove,
	onAssignGrade,
	onAssignMinistry,
	onEdit,
}: {
	position: PositionDoc;
	systemModules: TaskPresetDefinition[];
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
		() =>
			systemModules.filter((preset) =>
				preset.tasks.some((task) => (position.tasks ?? []).includes(task)),
			),
		[position.tasks, systemModules],
	);

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
								{assignedModules.map((mod) => (
									<div
										key={mod.code}
										className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5"
									>
										<DynamicLucideIcon name={mod.icon} className="h-4 w-4" />
										<div>
											<div className="text-[10px] font-medium">
												{getLocalizedValue(mod.label, lang)}
											</div>
											<div className="text-[9px] text-muted-foreground">
												{mod.tasks?.length ?? 0} {t("admin.roles.taskCount")}
											</div>
										</div>
									</div>
								))}
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

function AddPositionSheetContent({
	orgId,
	systemModules,
	lang,
	onSuccess,
}: {
	orgId: Id<"orgs">;
	systemModules: TaskPresetDefinition[];
	lang: string;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const [title, setTitle] = useState("");
	const [code, setCode] = useState("");
	const [description, setDescription] = useState("");
	const [level, setLevel] = useState("3");
	const [selectedModules, setSelectedModules] = useState<string[]>([]);
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

	function toggleModule(moduleCode: string) {
		setSelectedModules((prev) =>
			prev.includes(moduleCode)
				? prev.filter((c) => c !== moduleCode)
				: [...prev, moduleCode],
		);
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
				tasks: getPresetTasks(selectedModules),
				isRequired,
				isUnique,
			});
			toast.success(t("admin.roles.positionCreated"));
			onSuccess();
			setTitle("");
			setCode("");
			setDescription("");
			setLevel("3");
			setSelectedModules([]);
			setIsRequired(false);
			setIsUnique(false);
			setCodeManuallyEdited(false);
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("admin.roles.positionCreateError")));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
			<div className="max-w-3xl mx-auto w-full">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						{t("admin.roles.position.addTitle")}
					</SheetTitle>
					<SheetDescription>
						{t("admin.roles.position.addDescription")}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 py-2">
					{/* Title */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-title`}>
							{t("admin.roles.position.titleLabel")} *
						</Label>
						<Input
							id={`${formId}-title`}
							placeholder={t("admin.roles.position.titlePlaceholder")}
							value={title}
							onChange={(e) => handleTitleChange(e.target.value)}
						/>
					</div>

					{/* Code */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-code`}>
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

					{/* Description */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-desc`}>
							{t("admin.roles.position.descriptionLabel")}
						</Label>
						<Input
							id={`${formId}-desc`}
							placeholder={t("admin.roles.position.descriptionPlaceholder")}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					{/* Level */}
					<div className="space-y-1.5">
						<Label>{t("admin.roles.position.levelLabel")}</Label>
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

					{/* Required */}
					<div className="flex items-center gap-2">
						<Checkbox
							id={`${formId}-required`}
							checked={isRequired}
							onCheckedChange={(v) => setIsRequired(!!v)}
						/>
						<Label htmlFor={`${formId}-required`} className="text-sm">
							{t("admin.roles.position.isRequired", "Ce poste est obligatoire")}
						</Label>
					</div>

					{/* Unique */}
					<div className="flex items-center gap-2">
						<Checkbox
							id={`${formId}-unique`}
							checked={isUnique}
							onCheckedChange={(v) => setIsUnique(!!v)}
						/>
						<Label htmlFor={`${formId}-unique`} className="text-sm">
							{t("admin.roles.position.isUnique", "Ce poste est à titulaire unique (1 seule personne)")}
						</Label>
					</div>

					{/* Module select */}
					<div className="space-y-2">
						<Label>{t("admin.roles.position.assignModules")}</Label>
						<div className="grid gap-1.5 sm:grid-cols-2">
							{systemModules.map((mod) => (
								<button
									type="button"
									key={mod.code}
									className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors text-left"
									onClick={() => toggleModule(mod.code)}
								>
									<Checkbox
										checked={selectedModules.includes(mod.code)}
										onCheckedChange={() => toggleModule(mod.code)}
									/>
									<DynamicLucideIcon name={mod.icon} className="h-4 w-4" />
									<div className="flex-1 min-w-0">
										<div className="text-xs font-medium">
											{getLocalizedValue(mod.label, lang)}
										</div>
										<div className="text-[10px] text-muted-foreground truncate">
											{getLocalizedValue(mod.description, lang)}
										</div>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>

				<SheetFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !title.trim() || !code.trim()}
						className="gap-1"
					>
						{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{t("admin.roles.position.create")}
					</Button>
				</SheetFooter>
			</div>
		</SheetContent>
	);
}

// ═══════════════════════════════════════════════════════════════
// Edit Position Dialog Content
// ═══════════════════════════════════════════════════════════════

function EditPositionSheetContent({
	position,
	systemModules,
	lang,
	onSuccess,
}: {
	position: PositionDoc;
	systemModules: TaskPresetDefinition[];
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

	const currentTasks = (position.tasks ?? []) as string[];
	const initialModules = systemModules
		.filter((m) => m.tasks.every((tc) => currentTasks.includes(tc)))
		.map((m) => m.code);
	const [selectedModules, setSelectedModules] =
		useState<string[]>(initialModules);

	function toggleModule(code: string) {
		setSelectedModules((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	}

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
				tasks: getPresetTasks(selectedModules),
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

	return (
		<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
			<div className="max-w-3xl mx-auto w-full">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Pencil className="h-4 w-4" />
						{t("admin.roles.position.editTitle")}
					</SheetTitle>
					<SheetDescription>
						{t("admin.roles.position.editDescription")}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-4 py-2">
					{/* Code (read-only) */}
					<div className="space-y-1.5">
						<Label>{t("admin.roles.position.codeLabel")}</Label>
						<Input
							value={position.code}
							disabled
							className="font-mono text-muted-foreground"
						/>
					</div>

					{/* Title FR */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-title-fr`}>
							{t("admin.roles.position.titleLabel")} (FR) *
						</Label>
						<Input
							id={`${formId}-title-fr`}
							value={titleFr}
							onChange={(e) => setTitleFr(e.target.value)}
						/>
					</div>

					{/* Title EN */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-title-en`}>
							{t("admin.roles.position.titleLabel")} (EN)
						</Label>
						<Input
							id={`${formId}-title-en`}
							value={titleEn}
							onChange={(e) => setTitleEn(e.target.value)}
							placeholder="English title"
						/>
					</div>

					{/* Description FR */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-desc-fr`}>
							{t("admin.roles.position.descriptionLabel")} (FR)
						</Label>
						<Input
							id={`${formId}-desc-fr`}
							value={descFr}
							onChange={(e) => setDescFr(e.target.value)}
						/>
					</div>

					{/* Description EN */}
					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-desc-en`}>
							{t("admin.roles.position.descriptionLabel")} (EN)
						</Label>
						<Input
							id={`${formId}-desc-en`}
							value={descEn}
							onChange={(e) => setDescEn(e.target.value)}
							placeholder="English description"
						/>
					</div>

					{/* Level */}
					<div className="space-y-1.5">
						<Label>{t("admin.roles.position.levelLabel")}</Label>
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

					<div className="flex items-center gap-2">
						<Checkbox
							id={`${formId}-required`}
							checked={isRequired}
							onCheckedChange={(v) => setIsRequired(!!v)}
						/>
						<Label htmlFor={`${formId}-required`} className="text-sm">
							{t("admin.roles.position.isRequired", "Ce poste est obligatoire")}
						</Label>
					</div>

					{/* Unique */}
					<div className="flex items-center gap-2">
						<Checkbox
							id={`${formId}-unique`}
							checked={isUnique}
							onCheckedChange={(v) => setIsUnique(!!v)}
						/>
						<Label htmlFor={`${formId}-unique`} className="text-sm">
							{t("admin.roles.position.isUnique", "Ce poste est à titulaire unique (1 seule personne)")}
						</Label>
					</div>

					{/* Module select */}
					<div className="space-y-2">
						<Label>{t("admin.roles.position.assignModules")}</Label>
						<div className="grid gap-1.5 sm:grid-cols-2">
							{systemModules.map((mod) => (
								<button
									type="button"
									key={mod.code}
									className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors text-left"
									onClick={() => toggleModule(mod.code)}
								>
									<Checkbox
										checked={selectedModules.includes(mod.code)}
										onCheckedChange={() => toggleModule(mod.code)}
									/>
									<DynamicLucideIcon name={mod.icon} className="h-4 w-4" />
									<div className="flex-1 min-w-0">
										<div className="text-xs font-medium">
											{getLocalizedValue(mod.label, lang)}
										</div>
										<div className="text-[10px] text-muted-foreground truncate">
											{getLocalizedValue(mod.description, lang)}
										</div>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>

				<SheetFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !titleFr.trim()}
						className="gap-1"
					>
						{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{t("common.save")}
					</Button>
				</SheetFooter>
			</div>
		</SheetContent>
	);
}

// ═══════════════════════════════════════════════════════════════
// Edit Ministry Group Sheet
// ═══════════════════════════════════════════════════════════════

function EditMinistryGroupSheet({
	group,
	onSuccess,
}: {
	group: MinistryGroupDoc;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const formId = useId();

	const [labelFr, setLabelFr] = useState(group.label?.fr ?? "");
	const [labelEn, setLabelEn] = useState(group.label?.en ?? "");
	const [descFr, setDescFr] = useState(group.description?.fr ?? "");
	const [descEn, setDescEn] = useState(group.description?.en ?? "");
	const [icon, setIcon] = useState(group.icon ?? "🏛️");
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
				icon: icon.trim() || "🏛️",
			});
			toast.success(t("admin.roles.ministryUpdated"));
			onSuccess();
		} catch (err: unknown) {
			toast.error(getErrorMessage(err, t("common.error")));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
			<div className="max-w-3xl mx-auto w-full">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Pencil className="h-4 w-4" />
						{t("admin.roles.ministry.editTitle")}
					</SheetTitle>
					<SheetDescription>
						{t("admin.roles.ministry.editDescription")}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-3 px-4 py-2">
					<div className="grid grid-cols-[1fr_80px] gap-2">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-label-fr`}>
								{t("admin.roles.ministry.name")} (FR) *
							</Label>
							<Input
								id={`${formId}-label-fr`}
								value={labelFr}
								onChange={(e) => setLabelFr(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-icon`}>
								{t("admin.roles.ministry.icon")}
							</Label>
							<Input
								id={`${formId}-icon`}
								value={icon}
								onChange={(e) => setIcon(e.target.value)}
								placeholder="🏛️"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-label-en`}>
							{t("admin.roles.ministry.name")} (EN)
						</Label>
						<Input
							id={`${formId}-label-en`}
							value={labelEn}
							onChange={(e) => setLabelEn(e.target.value)}
							placeholder="English name"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-desc-fr`}>
							{t("admin.roles.ministry.description")} (FR)
						</Label>
						<Input
							id={`${formId}-desc-fr`}
							value={descFr}
							onChange={(e) => setDescFr(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`${formId}-desc-en`}>
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

				<SheetFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !labelFr.trim()}
						className="gap-1"
					>
						{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{t("common.save")}
					</Button>
				</SheetFooter>
			</div>
		</SheetContent>
	);
}

// ═══════════════════════════════════════════════════════════════
// Organization Modules Management Section
// ═══════════════════════════════════════════════════════════════

const MODULE_CATEGORIES: {
	key: ModuleCategory;
	label: { fr: string; en: string };
}[] = [
	{ key: "core", label: { fr: "Modules de base", en: "Core modules" } },
	{ key: "consular", label: { fr: "Modules consulaires", en: "Consular modules" } },
	{ key: "diplomatic", label: { fr: "Modules diplomatiques", en: "Diplomatic modules" } },
	{ key: "tools", label: { fr: "Communication & Outils", en: "Communication & Tools" } },
	{ key: "finance", label: { fr: "Finance", en: "Finance" } },
	{ key: "admin", label: { fr: "Administration", en: "Administration" } },
];

function OrgModulesSection({
	orgId,
	lang,
}: {
	orgId: Id<"orgs">;
	lang: string;
}) {
	const { t } = useTranslation();
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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Power className="h-4 w-4" />
					{t("admin.roles.modules.title")}
				</CardTitle>
				<CardDescription>
					{t("admin.roles.modules.description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!isSuperAdmin && (
					<div className="bg-muted px-4 py-3 flex gap-3 rounded-lg text-sm text-muted-foreground items-start border">
						<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
						<p>
							{t("admin.roles.modules.readonlyAlert", "Ces modules sont gérés par l'administrateur système. Veuillez contacter le support pour activer ou désactiver des fonctionnalités pour cet organisme.")}
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
			</CardContent>
		</Card>
	);
}

// ═══════════════════════════════════════════════════════════════
// Role Module Card (compact)
// ═══════════════════════════════════════════════════════════════

function RoleModuleCard({
	module: mod,
	lang,
}: {
	module: TaskPresetDefinition;
	lang: string;
}) {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="rounded-lg border hover:border-primary/20 transition-all">
				<CollapsibleTrigger className="w-full text-left px-3 py-2 flex items-center gap-2">
					<DynamicLucideIcon name={mod.icon} className="h-5 w-5" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-medium">
							{getLocalizedValue(mod.label, lang)}
						</div>
						<div className="text-[10px] text-muted-foreground truncate">
							{mod.tasks?.length ?? 0} {t("admin.roles.taskCount")}
						</div>
					</div>
					{isOpen ? (
						<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
					) : (
						<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
					)}
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="border-t px-3 py-2 space-y-1">
						<p className="text-[10px] text-muted-foreground">
							{getLocalizedValue(mod.description, lang)}
						</p>
						<div className="flex flex-wrap gap-1 mt-1">
							{(mod.tasks ?? []).map((taskCode: string) => (
								<Badge
									key={taskCode}
									variant="outline"
									className="text-[9px] px-1.5 py-0 font-mono"
								>
									{taskCode}
								</Badge>
							))}
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
