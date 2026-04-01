import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	MODULE_REGISTRY,
	type ModuleCategory,
} from "@convex/lib/moduleCodes";
import {
	getPresetTasks,
	type OrganizationTemplate,
	POSITION_GRADES,
	type PositionGrade,
	type TaskPresetDefinition,
} from "@convex/lib/roles";
import type { LocalizedString } from "@convex/lib/validators";
import { ALL_TASK_CODES, type TaskCodeValue } from "@convex/lib/taskCodes";
import { PermissionEffect } from "@convex/lib/constants";
import {
	Activity,
	Award,
	Banknote,
	BarChart3,
	Bell,
	BookOpen,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CalendarDays,
	CalendarHeart,
	ChartLine,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	CircleDot,
	ClipboardList,
	Cog,
	CreditCard,
	Crown,
	Eye,
	FileEdit,
	FileText,
	FileUser,
	Gavel,
	Globe,
	HandHelping,
	Handshake,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	LineChart,
	Link,
	Lock,
	type LucideIcon,
	Mail,
	Medal,
	Megaphone,
	MoreHorizontal,
	Network,
	Newspaper,
	Phone,
	ScrollText,
	Settings,
	Settings2,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Stamp,
	Star,
	Ticket,
	User,
	UserCheck,
	UserMinus,
	UserPlus,
	Users,
	Video,
	Wallet,
	Wrench,
	XCircle,
	Search,
	Loader2,
	ShieldX,
	Plus,
	RotateCcw,
	X,
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	GraduationCap,
	MoreVertical,
	Pencil,
	Play,
	Power,
	Sparkles,
	Trash2,
	UserCog,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "../../hooks/useOrg";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@workspace/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn, localizedText } from "../../lib/utils";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Switch } from "@workspace/ui/components/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@workspace/ui/components/sheet";
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@workspace/ui/components/field";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { getLocalizedValue } from "@workspace/shared/utils/i18n";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "../../hooks/useConvexHooks";

// ═══════════════════════════════════════════════════════════════
// DynamicLucideIcon (inlined from web)
// ═══════════════════════════════════════════════════════════════

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
	Activity,
	Award,
	Banknote,
	BarChart3,
	Bell,
	BookOpen,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CalendarDays,
	CalendarHeart,
	CheckCircle,
	ChartLine,
	ClipboardList,
	Cog,
	CreditCard,
	Crown,
	Eye,
	FileEdit,
	FileText,
	FileUser,
	Gavel,
	Globe,
	HandHelping,
	Handshake,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	Link,
	Lock,
	Mail,
	Medal,
	Megaphone,
	Newspaper,
	Phone,
	ScrollText,
	Settings,
	Shield,
	ShieldAlert,
	Stamp,
	Star,
	Ticket,
	User,
	Users,
	Video,
	Wallet,
	Wrench,
	LineChart,
};

function DynamicLucideIcon({
	name,
	className,
	size,
}: {
	name: string;
	className?: string;
	size?: number;
}) {
	const IconComponent = LUCIDE_ICON_MAP[name];
	if (!IconComponent) {
		return <span className={className}>{name}</span>;
	}
	return <IconComponent className={className} size={size} />;
}

// ═══════════════════════════════════════════════════════════════
// useCanDoTask (inlined from web)
// ═══════════════════════════════════════════════════════════════

function useCanDoTask(orgId: Id<"orgs"> | undefined) {
	const { data: taskCodes, isPending } = useAuthenticatedConvexQuery(
		api.functions.permissions.getMyTasks,
		orgId ? { orgId } : "skip",
	);

	const taskSet = useMemo(() => new Set(taskCodes ?? []), [taskCodes]);

	const canDo = useMemo(
		() =>
			(taskCode: string): boolean => {
				if (!taskCodes) return false;
				return taskSet.has(taskCode);
			},
		[taskCodes, taskSet],
	);

	return {
		canDo,
		isReady: !isPending && taskCodes !== undefined,
		isPending,
		taskCodes: taskCodes ?? [],
	};
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type OrgChartPosition = {
	_id: Id<"positions">;
	code: string;
	title: Record<string, string>;
	description?: Record<string, string>;
	level: number;
	grade?: string;
	isRequired?: boolean;
	tasks?: string[];
	occupant: {
		userId: Id<"users">;
		name: string;
		firstName?: string;
		lastName?: string;
		email: string;
		avatarUrl?: string;
		membershipId: Id<"memberships">;
	} | null;
};

type UnassignedMember = {
	userId: Id<"users">;
	name: string;
	firstName?: string;
	lastName?: string;
	email: string;
	avatarUrl?: string;
	membershipId: Id<"memberships">;
	role?: string;
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export function TeamPage() {
	const { orgId } = useOrg();
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const { canDo: _canDo } = useCanDoTask(orgId ?? undefined);

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<UnassignedMember | null>(
		null,
	);
	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	const [assignTarget, setAssignTarget] = useState<{
		positionId: Id<"positions">;
		positionTitle: string;
	} | null>(null);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [collapsedGrades, setCollapsedGrades] = useState<Set<string>>(
		new Set(),
	);

	const {
		data: orgChart,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		orgId ? { orgId } : "skip",
	);

	const { mutateAsync: removeMember } = useConvexMutationQuery(
		api.functions.orgs.removeMember,
	);
	const { mutateAsync: assignPosition } = useConvexMutationQuery(
		api.functions.orgs.assignMemberPosition,
	);

	// Group positions by grade
	const positionsByGrade = useMemo(() => {
		if (!orgChart) return {};
		return orgChart.positions.reduce<Record<string, OrgChartPosition[]>>(
			(acc, pos) => {
				const grade = pos.grade || "agent";
				if (!acc[grade]) acc[grade] = [];
				acc[grade].push(pos as OrgChartPosition);
				return acc;
			},
			{},
		);
	}, [orgChart]);

	const handleRemove = async (userId?: Id<"users">) => {
		if (!orgId || !userId || !confirm(t("dashboard.team.confirmRemove")))
			return;
		try {
			await removeMember({ orgId, userId });
			toast.success(t("dashboard.team.memberRemoved"));
		} catch {
			toast.error(t("dashboard.team.removeError"));
		}
	};

	const handleAssignToPosition = async (
		membershipId: Id<"memberships">,
		positionId: Id<"positions">,
	) => {
		if (!orgId) return;
		try {
			await assignPosition({
				orgId,
				membershipId,
				positionId,
			});
			toast.success(t("dashboard.team.positionAssigned"));
			setAssignDialogOpen(false);
			setAssignTarget(null);
		} catch {
			toast.error(t("dashboard.team.assignError"));
		}
	};

	const handleUnassignPosition = async (membershipId: Id<"memberships">) => {
		if (!orgId) return;
		try {
			await assignPosition({
				orgId,
				membershipId,
				positionId: undefined,
			});
			toast.success(t("dashboard.team.positionUnassigned"));
		} catch {
			toast.error(t("dashboard.team.assignError"));
		}
	};

	const toggleGrade = (grade: string) => {
		setCollapsedGrades((prev) => {
			const next = new Set(prev);
			if (next.has(grade)) next.delete(grade);
			else next.add(grade);
			return next;
		});
	};

	if (isPending) {
		return (
			<div className="p-6 space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="grid gap-3 sm:grid-cols-3">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<Skeleton className="h-[400px]" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<Card className="border-destructive/50">
					<CardContent className="p-6 text-center text-destructive">
						<p className="text-sm">{error.message || t("common.error")}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!orgChart) return null;

	const gradeOrder: PositionGrade[] = [
		"chief",
		"counselor",
		"agent",
		"external",
	];

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* ─── Header ──────────────────────────────── */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
						<Building2 className="h-6 w-6 text-primary" />
						{t("admin.nav.organization", "Organisation")}
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t("dashboard.team.description")}
					</p>
				</div>
				<Button onClick={() => setAddDialogOpen(true)} className="gap-2">
					<UserPlus className="h-4 w-4" />
					{t("dashboard.team.addMember")}
				</Button>
			</div>

			{/* ─── Tabs ──────────────────────────────── */}
			<Tabs defaultValue="orgchart">
				<TabsList>
					<TabsTrigger value="orgchart">
						<Network className="h-4 w-4" />
						{t("admin.team.tabs.orgchart", "Organigramme")}
					</TabsTrigger>
					<TabsTrigger value="config">
						<Settings2 className="h-4 w-4" />
						{t("admin.team.tabs.config", "Configuration")}
					</TabsTrigger>
					<TabsTrigger value="permissions">
						<ShieldCheck className="h-4 w-4" />
						{t("admin.team.tabs.permissions", "Permissions")}
					</TabsTrigger>
				</TabsList>

				{/* ═══ Tab 1: Organigramme ═══ */}
				<TabsContent value="orgchart" className="space-y-6 mt-4">

			{/* ─── Stats ──────────────────────────────── */}
			<div className="grid gap-3 sm:grid-cols-3">
				<Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
							<Users className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.totalPositions}</p>
							<p className="text-xs text-muted-foreground">
								{t("dashboard.team.stats.positions")}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
							<UserCheck className="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.filledPositions}</p>
							<p className="text-xs text-muted-foreground">
								{t("dashboard.team.stats.filled")}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
							<CircleDot className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.vacantPositions}</p>
							<p className="text-xs text-muted-foreground">
								{t("dashboard.team.stats.vacant")}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ─── Org Chart ──────────────────────────────── */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Building2 className="h-4 w-4" />
						{t("dashboard.team.cardTitle")}
					</CardTitle>
					<CardDescription>
						{t(
							"dashboard.team.orgChartDesc",
							"Postes et membres organisés par grade hiérarchique",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{gradeOrder.map((gradeKey) => {
						const grade = POSITION_GRADES[gradeKey];
						const gradePositions = positionsByGrade[gradeKey] ?? [];
						const isCollapsed = collapsedGrades.has(gradeKey);
						const filledCount = gradePositions.reduce((acc, p) => acc + ((p as any).occupants?.length || 0), 0);

						return (
							<div key={gradeKey}>
								{/* Grade header */}
								<button
									type="button"
									className={`w-full flex items-center gap-2.5 py-2 px-3 rounded-lg transition-colors ${grade.bgColor} hover:opacity-90`}
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
									<span
										className={`text-xs font-semibold uppercase tracking-wider ${grade.color}`}
									>
										{localizedText(grade.label)}
									</span>
									<Badge
										variant="outline"
										className={`text-[10px] px-1.5 py-0 ml-auto ${grade.borderColor}`}
									>
										{filledCount}/{gradePositions.length}
									</Badge>
								</button>

								{/* Position cards */}
								{!isCollapsed && (
									<div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pl-2">
										{gradePositions.length === 0 && (
											<div className="col-span-full py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
												{t(
													"dashboard.team.noPositions",
													"Aucun poste dans ce grade",
												)}
											</div>
										)}
										{gradePositions.map((pos: OrgChartPosition) => (
											<PositionCard
												key={pos._id}
												position={pos}
												lang={lang}
												orgId={orgId ?? undefined}
												canCreateMeetings={true}
												onAssign={() => {
													setAssignTarget({
														positionId: pos._id,
														positionTitle: localizedText(pos.title),
													});
													setAssignDialogOpen(true);
												}}
												onUnassign={(membershipId) => {
													handleUnassignPosition(membershipId);
												}}
												onViewPermissions={(member) => {
													setSelectedMember(member);
													setPermissionsDialogOpen(true);
												}}
												onChangeRole={(member) => {
													setSelectedMember(member);
													setRoleDialogOpen(true);
												}}
												onRemove={(userId) => handleRemove(userId)}
											/>
										))}
									</div>
								)}
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* ─── Unassigned Members ──────────────────────────────── */}
			{orgChart.unassignedMembers.length > 0 && (
				<Card className="border-amber-200 dark:border-amber-800/50">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
							<Users className="h-4 w-4" />
							{t("dashboard.team.unassigned.title")}
							<Badge variant="outline" className="ml-auto text-[10px]">
								{orgChart.unassignedMembers.length}
							</Badge>
						</CardTitle>
						<CardDescription>
							{t(
								"dashboard.team.unassigned.desc",
								"Ces membres n'ont pas encore de poste assigné",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{orgChart.unassignedMembers.map((member: UnassignedMember) => (
								<div
									key={member.membershipId}
									className="flex items-center gap-3 p-3 rounded-lg border border-dashed hover:border-primary/30 transition-colors group"
								>
									<Avatar className="h-9 w-9">
										<AvatarImage src={member.avatarUrl} />
										<AvatarFallback className="text-xs">
											{member.firstName?.[0]}
											{member.lastName?.[0]}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{member.firstName} {member.lastName}
										</p>
										<p className="text-xs text-muted-foreground truncate">
											{member.email}
										</p>
									</div>
									<Badge variant="secondary" className="text-[10px] shrink-0">
										{member.role === "admin" && (
											<Shield className="mr-1 h-3 w-3" />
										)}
										{member.role}
									</Badge>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="min-w-[180px]">
											<DropdownMenuLabel>
												{t("dashboard.team.columns.actions")}
											</DropdownMenuLabel>
											<DropdownMenuItem
												onClick={() => {
													setSelectedMember(member as UnassignedMember);
													setRoleDialogOpen(true);
												}}
											>
												{t("dashboard.team.actions.assignPosition", "Assigner à un poste")}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => {
													setSelectedMember(member);
													setPermissionsDialogOpen(true);
												}}
											>
												<ShieldCheck className="mr-2 h-4 w-4" />
												{t("dashboard.team.actions.permissions")}
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onClick={() => handleRemove(member.userId)}
											>
												<XCircle className="mr-2 h-4 w-4" />
												{t("dashboard.team.actions.remove")}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
				</TabsContent>

				{/* ═══ Tab 2: Configuration (postes & rôles) ═══ */}
				<TabsContent value="config" className="mt-4">
					{orgId && (
						<OrgRolesPanel
							orgId={orgId}
						/>
					)}
				</TabsContent>

				{/* ═══ Tab 3: Permissions ═══ */}
				<TabsContent value="permissions" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<ShieldCheck className="h-4 w-4" />
								{t("admin.team.permissions.title", "Permissions par membre")}
							</CardTitle>
							<CardDescription>
								{t("admin.team.permissions.description", "Cliquez sur un membre pour gérer ses permissions individuelles.")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{orgChart ? (
								<div className="space-y-2">
									{[...(orgChart.positions
										.flatMap((p) => ((p as any).occupants || []).map((occ: any) => ({
											...occ,
											positionTitle: localizedText(p.title),
										}))) ?? []),
										...(orgChart.unassignedMembers.map((m) => ({
											...m,
											positionTitle: t("admin.team.permissions.noPosition", "Sans poste"),
										})) ?? []),
									].map((member: any) => (
										<button
											type="button"
											key={member.membershipId}
											className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-colors text-left"
											onClick={() => {
												setSelectedMember(member);
												setPermissionsDialogOpen(true);
											}}
										>
											<Avatar className="h-9 w-9">
												<AvatarImage src={member.avatarUrl} />
												<AvatarFallback className="text-xs">
													{member.firstName?.[0]}{member.lastName?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{member.firstName} {member.lastName}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{member.positionTitle}
												</p>
											</div>
											<Badge variant="outline" className="text-xs shrink-0">
												<ShieldCheck className="mr-1 h-3 w-3" />
												{t("admin.team.permissions.manage", "Gérer")}
											</Badge>
										</button>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground text-center py-8">
									{t("admin.team.permissions.empty", "Aucun membre dans l'organisation.")}
								</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* ─── Dialogs ──────────────────────────────── */}
			{orgId && (
				<>
					<AddMemberDialog
						open={addDialogOpen}
						onOpenChange={setAddDialogOpen}
						orgId={orgId}
					/>

					{selectedMember && (
						<MemberPermissionsDialog
							open={permissionsDialogOpen}
							onOpenChange={setPermissionsDialogOpen}
							orgId={orgId}
							membershipId={selectedMember.membershipId}
							memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
							memberRole={selectedMember.role}
						/>
					)}

					{/* Assign member to position dialog */}
					<AssignMemberDialog
						open={assignDialogOpen}
						onOpenChange={setAssignDialogOpen}
						positionTitle={assignTarget?.positionTitle ?? ""}
						unassignedMembers={orgChart?.unassignedMembers ?? []}
						allMembers={[
							...(orgChart?.positions
								.filter((p) => p.occupant)
								.map((p) => p.occupant!) ?? []),
							...(orgChart?.unassignedMembers ?? []),
						]}
						onAssign={(membershipId) => {
							if (assignTarget) {
								handleAssignToPosition(membershipId, assignTarget.positionId);
							}
						}}
					/>

					{/* Change position dialog */}
					{selectedMember && (
						<ChangePositionDialog
							open={roleDialogOpen}
							onOpenChange={setRoleDialogOpen}
							memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
							membershipId={selectedMember.membershipId}
							positions={orgChart?.positions ?? []}
							onAssign={(membershipId, positionId) =>
								handleAssignToPosition(membershipId, positionId)
							}
							lang={lang}
						/>
					)}
				</>
			)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Position Card
// ═══════════════════════════════════════════════════════════════

function PositionCard({
	position,
	lang: _lang,
	orgId: _orgId,
	canCreateMeetings: _canCreateMeetings,
	onAssign,
	onUnassign,
	onViewPermissions,
	onChangeRole,
	onRemove,
}: {
	position: OrgChartPosition;
	lang: string;
	orgId?: Id<"orgs">;
	canCreateMeetings?: boolean;
	onAssign: () => void;
	onUnassign: (membershipId: Id<"memberships">) => void;
	onViewPermissions: (member: UnassignedMember) => void;
	onChangeRole: (member: UnassignedMember) => void;
	onRemove: (userId: Id<"users">) => void;
}) {
	const { t } = useTranslation();
	const grade =
		position.grade && POSITION_GRADES[position.grade as PositionGrade];
	const isVacant = !position.occupant;

	return (
		<div
			className={`rounded-xl border transition-all ${
				isVacant
					? "border-dashed border-muted-foreground/30 bg-muted/30 hover:border-primary/40"
					: "border-border bg-card hover:shadow-md hover:border-primary/30"
			}`}
		>
			{/* Position header */}
			<div className="px-3.5 pt-3 pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-sm font-semibold leading-tight truncate">
							{localizedText(position.title)}
						</p>
						{position.description && (
							<p className="text-[11px] text-muted-foreground mt-0.5 truncate">
								{localizedText(position.description)}
							</p>
						)}
					</div>
					{position.isRequired && (
						<Badge
							variant="destructive"
							className="text-[9px] h-4 px-1 shrink-0"
						>
							{t("admin.roles.required")}
						</Badge>
					)}
				</div>
				{grade && (
					<Badge
						variant="outline"
						className={`text-[9px] px-1.5 py-0 mt-1.5 flex items-center gap-1 w-fit ${grade.color} ${grade.borderColor}`}
					>
						<DynamicLucideIcon name={grade.icon} className="h-2.5 w-2.5" />
						{localizedText(grade.label)}
					</Badge>
				)}
			</div>

			{/* Divider */}
			<div className="border-t mx-3" />

			{/* Occupants */}
			<div className="px-3.5 py-2.5">
				{(position as any).occupants && (position as any).occupants.length > 0 && (
					<div className="flex flex-col gap-2">
						{(position as any).occupants.map((occupant: any) => (
							<div key={occupant.userId} className="flex items-center gap-2.5 group">
								<Avatar className="h-8 w-8 ring-2 ring-green-400/30">
									<AvatarImage src={occupant.avatarUrl} />
									<AvatarFallback className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
										{occupant.firstName?.[0]}
										{occupant.lastName?.[0]}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate">
										{occupant.firstName} {occupant.lastName}
									</p>
									<p className="text-[10px] text-muted-foreground truncate">
										{occupant.email}
									</p>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<MoreHorizontal className="h-3.5 w-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="min-w-[180px]">
										<DropdownMenuLabel>
											{occupant.firstName} {occupant.lastName}
										</DropdownMenuLabel>
										<DropdownMenuItem
											onClick={() =>
												onChangeRole({
													userId: occupant.userId,
													name: occupant.name,
													firstName: occupant.firstName,
													lastName: occupant.lastName,
													email: occupant.email,
													avatarUrl: occupant.avatarUrl,
													membershipId: occupant.membershipId,
													role: occupant.role,
												} as any)
											}
										>
											<Shield className="mr-2 h-3.5 w-3.5" />
											{t("dashboard.team.actions.assignOtherPosition", "Assigner à un autre poste")}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												onViewPermissions({
													userId: occupant.userId,
													name: occupant.name,
													firstName: occupant.firstName,
													lastName: occupant.lastName,
													email: occupant.email,
													avatarUrl: occupant.avatarUrl,
													membershipId: occupant.membershipId,
													role: occupant.role,
												} as any)
											}
										>
											<ShieldCheck className="mr-2 h-3.5 w-3.5" />
											{t("dashboard.team.actions.permissions")}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={() => onUnassign(occupant.membershipId)}>
											<UserMinus className="mr-2 h-3.5 w-3.5" />
											{t("dashboard.team.actions.unassign")}
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={() => onRemove(occupant.userId as Id<"users">)}
										>
											<XCircle className="mr-2 h-3.5 w-3.5" />
											{t("dashboard.team.actions.remove")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))}
					</div>
				)}

				<button
					type="button"
					className={cn(
						"w-full flex items-center gap-2.5 py-1 cursor-pointer group transition-colors",
						(position as any).occupants && (position as any).occupants.length > 0 && "mt-2"
					)}
					onClick={onAssign}
				>
					<div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
						<UserPlus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
					</div>
					<span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
						{t("dashboard.team.assignMember")}
					</span>
				</button>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Assign Member Dialog
// ═══════════════════════════════════════════════════════════════

function AssignMemberDialog({
	open,
	onOpenChange,
	positionTitle,
	unassignedMembers,
	allMembers,
	onAssign,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	positionTitle: string;
	unassignedMembers: UnassignedMember[];
	allMembers: UnassignedMember[];
	onAssign: (membershipId: Id<"memberships">) => void;
}) {
	const { t } = useTranslation();
	const [selectedId, setSelectedId] = useState<string>("");
	const [openCombobox, setOpenCombobox] = useState(false);

	const selectedMember = allMembers.find((m) => m.membershipId === selectedId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="h-5 w-5 text-primary" />
						{t("dashboard.team.assignDialog.title")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"dashboard.team.assignDialog.desc",
							"Choisissez un membre pour le poste de",
						)}{" "}
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
										<span>{selectedMember.firstName} {selectedMember.lastName}</span>
										<span className="text-muted-foreground text-xs">· {selectedMember.role}</span>
									</div>
								) : (
									<span className="text-muted-foreground">
										{t(
											"dashboard.team.assignDialog.placeholder",
											"Sélectionner un membre...",
										)}
									</span>
								)}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
							<Command>
								<CommandInput placeholder={t("common.search", "Rechercher...")} />
								<CommandList>
									<CommandEmpty>{t("common.noResult", "Aucun résultat trouvé.")}</CommandEmpty>

									{unassignedMembers.length > 0 && (
										<CommandGroup heading={t(
												"dashboard.team.assignDialog.unassigned",
												"— Sans poste —",
											)}>
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
														<span>{m.firstName} {m.lastName}</span>
														<span className="text-muted-foreground text-xs">· {m.role}</span>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{allMembers.length > unassignedMembers.length && (
										<CommandGroup heading={t(
												"dashboard.team.assignDialog.reassign",
												"— Réassigner depuis un autre poste —",
											)}>
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
														<span>{m.firstName} {m.lastName}</span>
														<span className="text-muted-foreground text-xs">· {m.role}</span>
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
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							disabled={!selectedId}
							onClick={() => onAssign(selectedId as Id<"memberships">)}
						>
							{t("dashboard.team.assignDialog.assign")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ═══════════════════════════════════════════════════════════════
// Change Position Dialog
// ═══════════════════════════════════════════════════════════════

function ChangePositionDialog({
	open,
	onOpenChange,
	memberName,
	membershipId,
	positions,
	onAssign,
	lang: _lang,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberName: string;
	membershipId: Id<"memberships">;
	positions: OrgChartPosition[];
	onAssign: (
		membershipId: Id<"memberships">,
		positionId: Id<"positions">,
	) => void;
	lang: string;
}) {
	const { t } = useTranslation();
	const [selectedPositionId, setSelectedPositionId] = useState<string>("");
	const [openCombobox, setOpenCombobox] = useState(false);

	const selectedPosition = positions.find((p) => p._id === selectedPositionId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						{t("dashboard.team.actions.changeRole")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"dashboard.team.changePosition.desc",
							"Choisissez un nouveau poste pour",
						)}{" "}
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
										<span>{localizedText(selectedPosition.title)}</span>
										{selectedPosition.grade && POSITION_GRADES[selectedPosition.grade as PositionGrade] && (
											<Badge variant="outline" className="text-[10px] px-1.5 py-0">
												{localizedText(POSITION_GRADES[selectedPosition.grade as PositionGrade].label)}
											</Badge>
										)}
									</div>
								) : (
									<span className="text-muted-foreground">
										{t(
											"dashboard.team.changePosition.placeholder",
											"Sélectionner un poste...",
										)}
									</span>
								)}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
							<Command>
								<CommandInput placeholder={t("common.search", "Rechercher...")} />
								<CommandList>
									<CommandEmpty>{t("common.noResult", "Aucun résultat trouvé.")}</CommandEmpty>
									<CommandGroup>
										{positions.map((pos) => {
											const posTitle = localizedText(pos.title);
											return (
												<CommandItem
													key={pos._id}
													value={posTitle}
													onSelect={() => {
														setSelectedPositionId(pos._id);
														setOpenCombobox(false);
													}}
												>
													<Check className={cn("mr-2 h-4 w-4", selectedPositionId === pos._id ? "opacity-100" : "opacity-0")} />
													<div className="flex items-center gap-2">
														<span>{posTitle}</span>
														{pos.grade && POSITION_GRADES[pos.grade as PositionGrade] && (
															<span className="text-muted-foreground text-[10px]">
																· {localizedText(POSITION_GRADES[pos.grade as PositionGrade].label)}
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
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							disabled={!selectedPositionId}
							onClick={() => {
								onAssign(membershipId, selectedPositionId as Id<"positions">);
								onOpenChange(false);
							}}
						>
							{t("dashboard.team.assignDialog.assign")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ═══════════════════════════════════════════════════════════════
// AddMemberDialog (ported from agent-web)
// ═══════════════════════════════════════════════════════════════

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	useEffect(() => {
		const handler = setTimeout(() => setDebouncedValue(value), delay);
		return () => clearTimeout(handler);
	}, [value, delay]);
	return debouncedValue;
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
	if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
	if (email) return email.slice(0, 2).toUpperCase();
	return "U";
}

interface AddMemberSearchResult {
	_id: Id<"users">;
	email: string;
	firstName?: string;
	lastName?: string;
	profileImageUrl?: string;
}

const GRADE_BADGE: Record<string, { label: string; className: string }> = {
	chief: { label: "Chef", className: "bg-amber-500/15 text-amber-600" },
	counselor: { label: "Conseiller", className: "bg-blue-500/15 text-blue-600" },
	agent: { label: "Agent", className: "bg-emerald-500/15 text-emerald-600" },
	external: { label: "Externe", className: "bg-zinc-500/15 text-zinc-600" },
};

interface VacantPosition {
	_id: Id<"positions">;
	title: Record<string, string>;
	grade?: string;
	level: number;
}

function PositionSelector({
	selectedPositionId,
	onPositionChange,
	vacantPositions,
	lang,
}: {
	selectedPositionId: string;
	onPositionChange: (id: string) => void;
	vacantPositions: VacantPosition[];
	lang: string;
}) {
	return (
		<Field>
			<FieldLabel>
				Poste{" "}
				<span className="text-muted-foreground font-normal">(optionnel)</span>
			</FieldLabel>
			<Select value={selectedPositionId} onValueChange={onPositionChange}>
				<SelectTrigger>
					<SelectValue placeholder="Assigner à un poste..." />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Aucun poste</SelectItem>
					{vacantPositions.map((pos) => (
						<SelectItem key={pos._id} value={pos._id}>
							<div className="flex items-center gap-2">
								<span>{getLocalizedValue(pos.title, lang)}</span>
								{pos.grade && GRADE_BADGE[pos.grade] && (
									<Badge
										variant="secondary"
										className={`text-[10px] px-1 py-0 ${GRADE_BADGE[pos.grade].className}`}
									>
										{GRADE_BADGE[pos.grade].label}
									</Badge>
								)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}

function AddMemberDialog({
	open,
	onOpenChange,
	orgId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
}) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const formId = useId();
	const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUser, setSelectedUser] = useState<AddMemberSearchResult | null>(null);
	const [selectedPositionId, setSelectedPositionId] = useState<string>("");

	// New user form state (replacing @tanstack/react-form)
	const [newFirstName, setNewFirstName] = useState("");
	const [newLastName, setNewLastName] = useState("");
	const [newEmail, setNewEmail] = useState("");

	const debouncedSearch = useDebounce(searchQuery, 300);
	const shouldSearch = debouncedSearch.length >= 3;

	const { data: searchResults, isPending: isSearching } =
		useAuthenticatedConvexQuery(
			api.functions.users.search,
			shouldSearch ? { query: debouncedSearch, limit: 10 } : "skip",
		);

	// Fetch org chart for vacant positions
	const { data: orgChart } = useAuthenticatedConvexQuery(
		api.functions.orgs.getOrgChart,
		open ? { orgId } : "skip",
	);

	// Extract vacant positions
	const vacantPositions: VacantPosition[] = (orgChart?.positions ?? [])
		.filter(
			(p: {
				occupant: unknown;
				_id: string;
				title: Record<string, string>;
				grade?: string;
				level: number;
			}) => !p.occupant,
		)
		.map(
			(p: {
				_id: string;
				title: Record<string, string>;
				grade?: string;
				level: number;
			}) => ({
				_id: p._id as Id<"positions">,
				title: p.title,
				grade: p.grade,
				level: p.level,
			}),
		)
		.sort((a: VacantPosition, b: VacantPosition) => a.level - b.level);

	const { mutateAsync: addMemberById, isPending: isAddingById } =
		useConvexMutationQuery(api.functions.orgs.addMember);

	const { mutateAsync: createAccount, isPending: isCreating } =
		useConvexMutationQuery(api.functions.orgs.createAccount);

	// Reset state when dialog closes
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setSearchQuery("");
			setSelectedUser(null);
			setSelectedPositionId("");
			setActiveTab("existing");
			setNewFirstName("");
			setNewLastName("");
			setNewEmail("");
		}
		onOpenChange(newOpen);
	};

	const isPending = isAddingById || isCreating;

	async function handleSubmitExisting() {
		if (!selectedUser) {
			toast.error(t("dashboard.dialogs.addMember.selectUser"));
			return;
		}
		try {
			const positionId =
				selectedPositionId && selectedPositionId !== "none"
					? (selectedPositionId as Id<"positions">)
					: undefined;
			await addMemberById({ orgId, userId: selectedUser._id, positionId });
			toast.success(t("dashboard.dialogs.addMember.successExisting"));
			handleOpenChange(false);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : t("common.error");
			toast.error(msg);
		}
	}

	async function handleSubmitNew() {
		if (!newEmail.trim()) {
			toast.error(t("dashboard.dialogs.addMember.emailRequired"));
			return;
		}
		try {
			const { userId } = await createAccount({
				orgId,
				email: newEmail.trim(),
				firstName: newFirstName,
				lastName: newLastName,
			});
			const positionId =
				selectedPositionId && selectedPositionId !== "none"
					? (selectedPositionId as Id<"positions">)
					: undefined;
			await addMemberById({
				orgId,
				userId: userId as Id<"users">,
				positionId,
			});
			toast.success(t("dashboard.dialogs.addMember.successNew"));
			handleOpenChange(false);
		} catch (error: unknown) {
			console.error(error);
			const msg = error instanceof Error ? error.message : t("common.error");
			toast.error(msg);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("dashboard.dialogs.addMember.title")}</DialogTitle>
					<DialogDescription>
						{t("dashboard.dialogs.addMember.description")}
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as "existing" | "new")}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="existing" className="flex items-center gap-2">
							<User className="h-4 w-4" />
							{t("dashboard.dialogs.addMember.existingUser")}
						</TabsTrigger>
						<TabsTrigger value="new" className="flex items-center gap-2">
							<UserPlus className="h-4 w-4" />
							{t("dashboard.dialogs.addMember.newAccount")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="existing">
						<form
							id={`${formId}-existing`}
							onSubmit={(e) => {
								e.preventDefault();
								handleSubmitExisting();
							}}
						>
							<FieldGroup>
								{/* Search */}
								<div className="space-y-2">
									<FieldLabel>
										{t("dashboard.dialogs.addMember.searchByEmail")}
									</FieldLabel>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											type="email"
											placeholder={t("dashboard.dialogs.addMember.emailPlaceholder")}
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>

								{/* Results */}
								<div className="space-y-2">
									{isSearching && debouncedSearch.length >= 3 && (
										<div className="flex items-center justify-center py-4">
											<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
										</div>
									)}

									{!isSearching &&
										(searchResults as AddMemberSearchResult[]) &&
										(searchResults as AddMemberSearchResult[]).length > 0 && (
											<div className="max-h-48 overflow-y-auto rounded-md border">
												{(searchResults as AddMemberSearchResult[]).map((user) => (
													<button
														key={user._id}
														type="button"
														onClick={() => setSelectedUser(user)}
														className={cn(
															"flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
															selectedUser?._id === user._id && "bg-primary/10",
														)}
													>
														<Avatar className="h-8 w-8">
															<AvatarImage src={user.profileImageUrl} />
															<AvatarFallback className="text-xs">
																{getInitials(user.firstName, user.lastName, user.email)}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 min-w-0">
															<p className="font-medium text-sm truncate">
																{user.firstName && user.lastName
																	? `${user.firstName} ${user.lastName}`
																	: user.email}
															</p>
															{user.firstName && user.lastName && (
																<p className="text-xs text-muted-foreground truncate">
																	{user.email}
																</p>
															)}
														</div>
														{selectedUser?._id === user._id && (
															<Check className="h-4 w-4 text-primary shrink-0" />
														)}
													</button>
												))}
											</div>
										)}

									{!isSearching &&
										debouncedSearch.length >= 3 &&
										searchResults?.length === 0 && (
											<p className="text-sm text-muted-foreground text-center py-4">
												{t("dashboard.dialogs.addMember.noUserFound")}
											</p>
										)}

									{selectedUser && (
										<div className="flex items-center gap-3 p-3 bg-primary/5 rounded-md border border-primary/20">
											<Avatar className="h-10 w-10">
												<AvatarImage src={selectedUser.profileImageUrl} />
												<AvatarFallback>
													{getInitials(selectedUser.firstName, selectedUser.lastName, selectedUser.email)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<p className="font-medium">
													{selectedUser.firstName && selectedUser.lastName
														? `${selectedUser.firstName} ${selectedUser.lastName}`
														: selectedUser.email}
												</p>
												{selectedUser.firstName && selectedUser.lastName && (
													<p className="text-sm text-muted-foreground">
														{selectedUser.email}
													</p>
												)}
											</div>
										</div>
									)}
								</div>

								{/* Position selector */}
								{vacantPositions.length > 0 && (
									<PositionSelector
										selectedPositionId={selectedPositionId}
										onPositionChange={setSelectedPositionId}
										vacantPositions={vacantPositions}
										lang={lang}
									/>
								)}
							</FieldGroup>

							<div className="flex justify-end gap-2 mt-6">
								<Button
									variant="outline"
									type="button"
									onClick={() => handleOpenChange(false)}
								>
									{t("dashboard.dialogs.addMember.cancel")}
								</Button>
								<Button type="submit" disabled={isPending || !selectedUser}>
									{isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										t("dashboard.dialogs.addMember.add")
									)}
								</Button>
							</div>
						</form>
					</TabsContent>

					<TabsContent value="new">
						<form
							id={`${formId}-new`}
							onSubmit={(e) => {
								e.preventDefault();
								handleSubmitNew();
							}}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor={`${formId}-firstName`}>
										{t("dashboard.dialogs.addMember.firstName")}
									</FieldLabel>
									<Input
										id={`${formId}-firstName`}
										value={newFirstName}
										onChange={(e) => setNewFirstName(e.target.value)}
									/>
								</Field>

								<Field>
									<FieldLabel htmlFor={`${formId}-lastName`}>
										{t("dashboard.dialogs.addMember.lastName")}
									</FieldLabel>
									<Input
										id={`${formId}-lastName`}
										value={newLastName}
										onChange={(e) => setNewLastName(e.target.value)}
									/>
								</Field>

								<Field>
									<FieldLabel htmlFor={`${formId}-email`}>
										{t("dashboard.dialogs.addMember.emailLabel")}
									</FieldLabel>
									<Input
										id={`${formId}-email`}
										type="email"
										value={newEmail}
										onChange={(e) => setNewEmail(e.target.value)}
										required
									/>
								</Field>

								{/* Position selector */}
								{vacantPositions.length > 0 && (
									<PositionSelector
										selectedPositionId={selectedPositionId}
										onPositionChange={setSelectedPositionId}
										vacantPositions={vacantPositions}
										lang={lang}
									/>
								)}
							</FieldGroup>

							<div className="flex justify-end gap-2 mt-6">
								<Button
									variant="outline"
									type="button"
									onClick={() => handleOpenChange(false)}
								>
									{t("dashboard.dialogs.addMember.cancel")}
								</Button>
								<Button type="submit" disabled={isPending}>
									{isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										t("dashboard.dialogs.addMember.add")
									)}
								</Button>
							</div>
						</form>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

// ═══════════════════════════════════════════════════════════════
// MemberPermissionsDialog (ported from agent-web)
// ═══════════════════════════════════════════════════════════════

function MemberPermissionsDialog({
	open,
	onOpenChange,
	orgId,
	membershipId,
	memberName,
	memberRole,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
	membershipId: Id<"memberships">;
	memberName: string;
	memberRole?: string;
}) {
	const { t } = useTranslation();
	const [newPermission, setNewPermission] = useState("");
	const [newEffect, setNewEffect] = useState<"grant" | "deny">("grant");
	const [showCustomInput, setShowCustomInput] = useState(false);

	// ── Data ──────────────────────────────────────────────────────────────
	const { data: permissions, isPending } = useAuthenticatedConvexQuery(
		api.functions.permissions.listByOrgMember,
		open ? { orgId, membershipId } : "skip",
	);

	// ── Mutations ─────────────────────────────────────────────────────────
	const { mutateAsync: setPermission, isPending: isSettingPermission } =
		useConvexMutationQuery(api.functions.permissions.setForOrgMember);

	const { mutateAsync: removePermission, isPending: isRemoving } =
		useConvexMutationQuery(api.functions.permissions.removeForOrgMember);

	const { mutateAsync: resetAllPermissions, isPending: isResetting } =
		useConvexMutationQuery(api.functions.permissions.resetAllForOrgMember);

	const isBusy = isSettingPermission || isRemoving || isResetting;

	// ── Handlers ──────────────────────────────────────────────────────────
	const handleAdd = useCallback(
		async (permission: string, effect: "grant" | "deny") => {
			try {
				await setPermission({
					orgId,
					membershipId,
					taskCode: permission as TaskCodeValue,
					effect: effect === "grant" ? PermissionEffect.Grant : PermissionEffect.Deny,
				});
				toast.success(t("permissions.toast.added"));
				setNewPermission("");
				setShowCustomInput(false);
			} catch {
				toast.error(t("permissions.toast.addError"));
			}
		},
		[setPermission, orgId, membershipId, t],
	);

	const handleRemove = useCallback(
		async (taskCode: string) => {
			try {
				await removePermission({ orgId, membershipId, taskCode: taskCode as TaskCodeValue });
				toast.success(t("permissions.toast.removed"));
			} catch {
				toast.error(t("permissions.toast.removeError"));
			}
		},
		[removePermission, orgId, membershipId, t],
	);

	const handleResetAll = useCallback(async () => {
		if (
			!confirm(
				t(
					"permissions.confirm.resetAll",
					"Réinitialiser toutes les permissions de ce membre ?",
				),
			)
		) {
			return;
		}
		try {
			await resetAllPermissions({ orgId, membershipId });
			toast.success(
				t("permissions.toast.reset", "Permissions réinitialisées"),
			);
		} catch {
			toast.error(t("permissions.toast.resetError"));
		}
	}, [resetAllPermissions, orgId, membershipId, t]);

	// Compute which permissions are already set
	const existingKeys = new Set(permissions?.map((p) => p.taskCode) ?? []);
	const availablePresets = ALL_TASK_CODES.filter(
		(p) => !existingKeys.has(p),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						{t("permissions.dialog.title")}
					</DialogTitle>
					<DialogDescription>
						{memberName && (
							<span className="block">
								{memberName}
								{memberRole && (
									<Badge variant="secondary" className="ml-2">
										{memberRole}
									</Badge>
								)}
							</span>
						)}
						{t(
							"permissions.dialog.description",
							"Gérez les permissions dynamiques pour ce membre. Elles s'ajoutent aux permissions par défaut du rôle.",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-2">
					{/* ── Loading ─────────────────────────────────── */}
					{isPending && (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					)}

					{/* ── Current Permissions ─────────────────────── */}
					{!isPending && permissions && permissions.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-muted-foreground">
								{t("permissions.dialog.active")} ({permissions.length})
							</h4>
							<div className="space-y-1.5">
								{permissions.map((perm) => (
									<div
										key={perm.taskCode}
										className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-card group"
									>
										<div className="flex items-center gap-2 min-w-0">
											{perm.effect === "grant" ? (
												<ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
											) : (
												<ShieldX className="h-4 w-4 text-red-500 shrink-0" />
											)}
											<code className="text-sm truncate">
												{perm.taskCode}
											</code>
											<Badge
												variant={perm.effect === "grant" ? "default" : "destructive"}
												className="text-xs shrink-0"
											>
												{perm.effect}
											</Badge>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => handleRemove(perm.taskCode)}
											disabled={isBusy}
										>
											<X className="h-3.5 w-3.5" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}

					{!isPending && permissions?.length === 0 && (
						<div className="text-center py-6 text-sm text-muted-foreground">
							{t(
								"permissions.dialog.empty",
								"Aucune permission personnalisée. Ce membre utilise uniquement les permissions de son rôle.",
							)}
						</div>
					)}

					{/* ── Add Permission ──────────────────────────── */}
					{!isPending && (
						<div className="space-y-3 border-t pt-3">
							<h4 className="text-sm font-medium text-muted-foreground">
								{t("permissions.dialog.add")}
							</h4>

							{/* Preset buttons grid */}
							{availablePresets.length > 0 && !showCustomInput && (
								<div className="flex flex-wrap gap-1.5">
									{availablePresets.map((preset) => (
										<button
											key={preset}
											type="button"
											className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
											onClick={() => setNewPermission(preset)}
										>
											{preset.startsWith("feature.") ? (
												<ShieldCheck className="h-3 w-3 text-blue-500" />
											) : (
												<ShieldCheck className="h-3 w-3 text-muted-foreground" />
											)}
											<code>{preset}</code>
										</button>
									))}
									<button
										type="button"
										className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border-dashed border bg-background hover:bg-muted transition-colors cursor-pointer"
										onClick={() => setShowCustomInput(true)}
									>
										<Plus className="h-3 w-3" />
										{t("permissions.dialog.custom")}
									</button>
								</div>
							)}

							{/* Custom input */}
							{showCustomInput && (
								<div className="flex gap-2">
									<Input
										value={newPermission}
										onChange={(e) => setNewPermission(e.target.value)}
										placeholder="resource.action"
										className="text-sm font-mono"
									/>
									<Button
										variant="ghost"
										size="icon"
										className="shrink-0"
										onClick={() => {
											setShowCustomInput(false);
											setNewPermission("");
										}}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							)}

							{/* Effect selector + confirm when permission selected */}
							{newPermission && (
								<div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
									<code className="text-sm flex-1 truncate">
										{newPermission}
									</code>
									<Select
										value={newEffect}
										onValueChange={(v) => setNewEffect(v as "grant" | "deny")}
									>
										<SelectTrigger className="w-24 h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="grant">
												<span className="flex items-center gap-1">
													<Check className="h-3 w-3 text-emerald-500" />
													Grant
												</span>
											</SelectItem>
											<SelectItem value="deny">
												<span className="flex items-center gap-1">
													<X className="h-3 w-3 text-red-500" />
													Deny
												</span>
											</SelectItem>
										</SelectContent>
									</Select>
									<Button
										size="sm"
										onClick={() => handleAdd(newPermission, newEffect)}
										disabled={isBusy || !newPermission}
									>
										{isSettingPermission ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
									</Button>
								</div>
							)}
						</div>
					)}
				</div>

				<DialogFooter className="flex items-center justify-between border-t pt-3 gap-2">
					{permissions && permissions.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={handleResetAll}
							disabled={isBusy}
						>
							<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
							{t("permissions.dialog.resetAll")}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("common.close")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ═══════════════════════════════════════════════════════════════
// OrgRolesPanel (ported from agent-web)
// ═══════════════════════════════════════════════════════════════

function toSnakeCase(str: string): string {
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

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
	isUnique?: boolean;
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

type ViewMode = "grade" | "ministry";

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

function OrgRolesPanel({
	orgId,
}: {
	orgId: Id<"orgs">;
}) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	// Fetch orgType from org data
	const { data: orgData } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);
	const orgType = (orgData as { type?: string } | undefined)?.type ?? "embassy";

	const [isInitializing, setIsInitializing] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingPosition, setEditingPosition] = useState<PositionDoc | null>(null);
	const [editingMinistry, setEditingMinistry] = useState<MinistryGroupDoc | null>(null);
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
	const systemModules = (roleConfig?.systemModules ?? []) as TaskPresetDefinition[];
	const ministryGroups = (
		(roleConfig as { ministryGroups?: MinistryGroupDoc[] })?.ministryGroups ?? []
	) as MinistryGroupDoc[];

	// Group positions by grade
	const gradeOrder: PositionGrade[] = ["chief", "counselor", "agent", "external"];
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
				t("admin.roles.initSuccess", { count: result.positionsCreated }),
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
				t("admin.roles.resetSuccess", { count: result.positionsCreated }),
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
					? { fr: newMinistry.description, en: newMinistry.description }
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
														placeholder={t("admin.roles.ministry.namePlaceholder")}
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
															placeholder={t("admin.roles.ministry.codePlaceholder")}
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
															placeholder=""
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
														placeholder={t("admin.roles.ministry.descriptionPlaceholder")}
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
											<RolesPositionCard
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
											<RolesPositionCard
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
									<RolesPositionCard
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
// Roles Position Card (used in OrgRolesPanel)
// ═══════════════════════════════════════════════════════════════

function RolesPositionCard({
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
// Add Position Sheet Content
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
							{t(
								"admin.roles.position.isUnique",
								"Ce poste est à titulaire unique (1 seule personne)",
							)}
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
// Edit Position Sheet Content
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
							{t(
								"admin.roles.position.isUnique",
								"Ce poste est à titulaire unique (1 seule personne)",
							)}
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
								placeholder=""
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
		{ orgId },
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
			await updateOrgModules({ orgId, modules: updated as string[] as never[] });
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
