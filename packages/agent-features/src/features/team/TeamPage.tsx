"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { POSITION_GRADES, type PositionGrade } from "@convex/lib/roles";
import {
	Building2,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronsUpDown,
	CircleDot,
	LineChart,
	MoreHorizontal,
	Network,
	Settings2,
	Shield,
	ShieldCheck,
	UserCheck,
	UserMinus,
	UserPlus,
	Users,
	XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams, usePathname } from "@workspace/routing";
import { toast } from "sonner";
import { OrgRolesPanel } from "./components/org-roles-panel";
import { TeamSupervisionPanel } from "./components/team-supervision-panel";
import { CallButton } from "../../components/meetings/call-button";
import { AddMemberDialog } from "../../components/org/add-member-dialog";
import { MemberPermissionsDialog } from "./components/member-permissions-dialog";
import { useOrg } from "../../shell/org-provider";
import { useModuleAccess } from "../../components/shared/access-gate";
import { useOrgModules } from "../../hooks/useOrgModules";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { SectionHeader } from "../../components/my-space/section-header";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { QueryError } from "@workspace/ui/components/query-error";
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
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { getLocalizedValue } from "../../lib/i18n-utils";
import { DynamicLucideIcon } from "../../lib/lucide-icon";


// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type OrgChartOccupant = {
	userId: Id<"users">;
	name: string;
	firstName?: string;
	lastName?: string;
	email: string;
	avatarUrl?: string;
	membershipId: Id<"memberships">;
};

type OrgChartPosition = {
	_id: Id<"positions">;
	code: string;
	title: Record<string, string>;
	description?: Record<string, string>;
	level: number;
	grade?: string;
	isRequired?: boolean;
	tasks?: string[];
	occupant: OrgChartOccupant | null;
	occupants: OrgChartOccupant[];
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

export default function DashboardTeam() {
	const { activeOrgId, activeOrg } = useOrg();
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const { hasMin: hasTeamAccess } = useModuleAccess("team");
	const canAdminTeam = hasTeamAccess("admin");
	const { hasCapability } = useOrgModules();
	const { canDo, isReady } = useCanDoTask(activeOrgId ?? undefined);
	const showSupervision =
		hasCapability("team", "supervise") && isReady && canDo("team.supervise");

	// Sync active tab with the URL (?tab=…) so deep-links + back/forward work.
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const validTabs = useMemo(() => {
		const base = ["orgchart", "config", "permissions"];
		return showSupervision ? [...base, "supervision"] : base;
	}, [showSupervision]);
	const urlTab = searchParams?.get("tab") ?? undefined;
	const activeTab = urlTab && validTabs.includes(urlTab) ? urlTab : "orgchart";
	const handleTabChange = useCallback(
		(value: string) => {
			const next = new URLSearchParams(searchParams?.toString() ?? "");
			if (value === "orgchart") next.delete("tab");
			else next.set("tab", value);
			const qs = next.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname);
		},
		[router, pathname, searchParams],
	);

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
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	// Supervisables — uniquement quand l'onglet supervision est actif
	// (utilisé pour enrichir le contexte iAsted avec les KPIs visibles).
	const { data: supervisables } = useAuthenticatedConvexQuery(
		api.functions.management.listSupervisableMembers,
		activeOrgId && activeTab === "supervision" && showSupervision
			? { orgId: activeOrgId }
			: "skip",
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
		if (!activeOrgId || !userId || !confirm(t("dashboard.team.confirmRemove")))
			return;
		try {
			await removeMember({ orgId: activeOrgId, userId });
			toast.success(t("dashboard.team.memberRemoved"));
		} catch {
			toast.error(t("dashboard.team.removeError"));
		}
	};

	const handleAssignToPosition = async (
		membershipId: Id<"memberships">,
		positionId: Id<"positions">,
	) => {
		if (!activeOrgId) return;
		try {
			await assignPosition({
				orgId: activeOrgId,
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
		if (!activeOrgId) return;
		try {
			await assignPosition({
				orgId: activeOrgId,
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

	// ─── Page context for the AI assistant (iAsted copilote) ──────
	// IMPORTANT : ces hooks doivent rester AVANT tout early return,
	// sinon Rules of Hooks violation entre les rendus pending → loaded.
	const pageEntities = useMemo<PageEntity[]>(() => {
		if (!orgChart) return [];
		const entities: PageEntity[] = [];

		// Sur l'onglet supervision : exposer prioritairement les supervisés
		// (avec KPIs : assigned, traités, RDV à venir).
		if (activeTab === "supervision" && supervisables?.members) {
			for (const m of supervisables.members.slice(0, 30)) {
				entities.push({
					id: m.membershipId,
					type: "supervised-member",
					label: m.name,
					data: {
						position: getLocalizedValue(m.positionTitle, lang),
						email: m.email,
						assigned: m.assigned,
						completed: m.completed,
						completionRate: m.completionRate,
						upcomingAppointments: m.upcomingAppointmentsCount,
					},
				});
			}
			return entities;
		}

		// Sinon : positions occupées + membres sans poste (vue orgchart).
		const occupied = orgChart.positions.filter(
			(p) => p.occupants && p.occupants.length > 0,
		);
		for (const pos of occupied.slice(0, 25)) {
			const occ = pos.occupants?.[0];
			entities.push({
				id: pos._id,
				type: "position",
				label: `${getLocalizedValue(pos.title, lang)} — ${occ?.firstName ?? ""} ${occ?.lastName ?? ""}`.trim(),
				data: {
					grade: pos.grade,
					occupantsCount: pos.occupants?.length ?? 0,
					membershipId: occ?.membershipId,
					email: occ?.email,
				},
			});
		}
		for (const m of orgChart.unassignedMembers.slice(0, 15)) {
			entities.push({
				id: m.membershipId,
				type: "unassigned-member",
				label: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email,
				data: { email: m.email },
			});
		}
		return entities;
	}, [orgChart, supervisables, activeTab, lang]);

	const pageActions = useMemo<PageAction[]>(() => {
		const actions: PageAction[] = [
			{
				id: "switch-tab",
				label: "Changer d'onglet",
				description:
					"Bascule entre les onglets de l'équipe. params.tab ∈ ['orgchart','supervision','config','permissions']",
			},
			{
				id: "toggle-grade",
				label: "Plier/déplier un grade",
				description:
					"Bascule la visibilité d'un grade dans l'organigramme. params.grade ∈ ['chief','counselor','agent','external']",
			},
			{
				id: "view-member-permissions",
				label: "Voir les permissions d'un membre",
				description:
					"Ouvre la fiche permissions d'un membre. params.membershipId requis (depuis les entités visibles).",
			},
		];
		if (canAdminTeam) {
			actions.push({
				id: "open-add-member",
				label: "Inviter un membre",
				description: "Ouvre le dialogue d'invitation d'un nouveau membre",
			});
			actions.push({
				id: "open-assign-position",
				label: "Assigner un membre à un poste",
				description:
					"Ouvre le dialogue d'assignation. params.positionId requis (parmi les positions visibles)",
			});
			actions.push({
				id: "change-member-position",
				label: "Changer le poste d'un membre",
				description:
					"Ouvre le dialogue de changement de poste. params.membershipId requis.",
			});
			actions.push({
				id: "unassign-member",
				label: "Désassigner un membre de son poste",
				description:
					"Retire un membre de son poste (le rend non-assigné). params.membershipId requis.",
				requiresConfirmation: true,
			});
		}
		return actions;
	}, [canAdminTeam]);

	const pageSummary = useMemo(() => {
		if (!orgChart) return "Chargement de l'organigramme…";
		const base = `${orgChart.totalPositions} postes (${orgChart.filledPositions} pourvus, ${orgChart.vacantPositions} vacants), ${orgChart.unassignedMembers.length} membres sans poste.`;
		if (activeTab === "supervision" && supervisables?.members) {
			const totalAssigned = supervisables.members.reduce((s, m) => s + m.assigned, 0);
			const totalUpcoming = supervisables.members.reduce((s, m) => s + m.upcomingAppointmentsCount, 0);
			return `${base} Onglet Supervision : ${supervisables.members.length} agents supervisés, ${totalAssigned} demandes assignées, ${totalUpcoming} RDV à venir.`;
		}
		const tabLabel =
			activeTab === "config"
				? "Configuration"
				: activeTab === "permissions"
					? "Permissions"
					: "Organigramme";
		return `${base} Onglet actif : ${tabLabel}.`;
	}, [orgChart, supervisables, activeTab]);

	usePageContext({
		module: "team",
		title: `Équipe — ${activeOrg?.name ?? "Organisation"}`,
		summary: pageSummary,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: ["getTeamMembers"],
	});

	useRegisterPageAction("switch-tab", async (params) => {
		const tab = (params?.tab as string | undefined) ?? "orgchart";
		if (validTabs.includes(tab)) handleTabChange(tab);
	});
	useRegisterPageAction("open-add-member", async () => {
		if (canAdminTeam) setAddDialogOpen(true);
	});
	useRegisterPageAction("open-assign-position", async (params) => {
		const positionId = params?.positionId as Id<"positions"> | undefined;
		if (!positionId || !orgChart) return;
		const pos = orgChart.positions.find((p) => p._id === positionId);
		if (!pos) return;
		setAssignTarget({
			positionId,
			positionTitle: getLocalizedValue(pos.title, lang),
		});
		setAssignDialogOpen(true);
	});
	useRegisterPageAction("toggle-grade", async (params) => {
		const grade = params?.grade as string | undefined;
		if (grade) toggleGrade(grade);
	});
	useRegisterPageAction("view-member-permissions", async (params) => {
		const membershipId = params?.membershipId as Id<"memberships"> | undefined;
		if (!membershipId || !orgChart) return;
		// Cherche le membre dans positions occupées + non-assignés
		const occ = orgChart.positions
			.flatMap((p) => p.occupants ?? [])
			.find((o) => o.membershipId === membershipId);
		const unass = orgChart.unassignedMembers.find(
			(m) => m.membershipId === membershipId,
		);
		const member = occ ?? unass;
		if (!member) return;
		setSelectedMember(member as UnassignedMember);
		setPermissionsDialogOpen(true);
	});
	useRegisterPageAction("change-member-position", async (params) => {
		if (!canAdminTeam) return;
		const membershipId = params?.membershipId as Id<"memberships"> | undefined;
		if (!membershipId || !orgChart) return;
		const occ = orgChart.positions
			.flatMap((p) => p.occupants ?? [])
			.find((o) => o.membershipId === membershipId);
		const unass = orgChart.unassignedMembers.find(
			(m) => m.membershipId === membershipId,
		);
		const member = occ ?? unass;
		if (!member) return;
		setSelectedMember(member as UnassignedMember);
		setRoleDialogOpen(true);
	});
	useRegisterPageAction("unassign-member", async (params) => {
		if (!canAdminTeam) return;
		const membershipId = params?.membershipId as Id<"memberships"> | undefined;
		if (!membershipId) return;
		await handleUnassignPosition(membershipId);
	});

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
		return <QueryError error={error} />;
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
						{t("admin.nav.organization", "Représentation")}
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t("dashboard.team.description")}
					</p>
				</div>
				{canAdminTeam && (
					<Button onClick={() => setAddDialogOpen(true)} className="gap-2">
						<UserPlus className="h-4 w-4" />
						{t("dashboard.team.addMember")}
					</Button>
				)}
			</div>

			{/* ─── Tabs ──────────────────────────────── */}
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList>
					<TabsTrigger value="orgchart">
						<Network className="h-4 w-4" />
						{t("admin.team.tabs.orgchart", "Organigramme")}
					</TabsTrigger>
					{showSupervision && (
						<TabsTrigger value="supervision">
							<LineChart className="h-4 w-4" />
							{t("admin.team.tabs.supervision", "Supervision")}
						</TabsTrigger>
					)}
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
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
							<Users className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.totalPositions}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("dashboard.team.stats.positions")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
							<UserCheck className="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.filledPositions}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("dashboard.team.stats.filled")}
							</p>
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
							<CircleDot className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="text-2xl font-bold">{orgChart.vacantPositions}</p>
							<p className="text-xs text-muted-foreground font-medium">
								{t("dashboard.team.stats.vacant")}
							</p>
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ─── Org Chart ──────────────────────────────── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
				<SectionHeader icon={<Building2 className="h-4 w-4" />} title={t("dashboard.team.cardTitle")} />
				<p className="text-xs text-muted-foreground mb-3">
					{t(
						"dashboard.team.orgChartDesc",
						"Postes et membres organisés par grade hiérarchique",
					)}
				</p>
				<div className="space-y-4">
					{gradeOrder.map((gradeKey) => {
						const grade = POSITION_GRADES[gradeKey];
						const gradePositions = positionsByGrade[gradeKey] ?? [];
						const isCollapsed = collapsedGrades.has(gradeKey);
						const filledCount = gradePositions.reduce((acc, p) => acc + (p.occupants?.length || 0), 0);

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
										{getLocalizedValue(grade.label, lang)}
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
												orgId={activeOrgId ?? undefined}
												canCreateMeetings={true}
												onAssign={() => {
													setAssignTarget({
														positionId: pos._id,
														positionTitle: getLocalizedValue(pos.title, lang),
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
				</div>
				</div>
			</FlatCard>

			{/* ─── Unassigned Members ──────────────────────────────── */}
			{orgChart.unassignedMembers.length > 0 && (
				<FlatCard>
					<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
						title={
							<span className="text-amber-700 dark:text-amber-400">
								{t("dashboard.team.unassigned.title")}
							</span>
						}
						actions={
							<Badge variant="outline" className="text-[10px]">
								{orgChart.unassignedMembers.length}
							</Badge>
						}
					/>
					<p className="text-xs text-muted-foreground mb-3">
						{t(
							"dashboard.team.unassigned.desc",
							"Ces membres n'ont pas encore de poste assigné",
						)}
					</p>
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
					</div>
				</FlatCard>
			)}
				</TabsContent>

				{/* ═══ Tab Supervision (Management — voir les agents du sous-arbre) ═══ */}
				{showSupervision && activeOrgId && (
					<TabsContent value="supervision" className="mt-4">
						<TeamSupervisionPanel orgId={activeOrgId} />
					</TabsContent>
				)}

				{/* ═══ Tab 2: Configuration (postes & rôles) ═══ */}
				<TabsContent value="config" className="mt-4">
					{activeOrgId && (
						<OrgRolesPanel
							orgId={activeOrgId}
							orgType={activeOrg?.type ?? "consulate"}
						/>
					)}
				</TabsContent>

				{/* ═══ Tab 3: Permissions ═══ */}
				<TabsContent value="permissions" className="mt-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
						<SectionHeader icon={<ShieldCheck className="h-4 w-4" />} title={t("admin.team.permissions.title", "Permissions par membre")} />
						<p className="text-xs text-muted-foreground mb-3">
							{t("admin.team.permissions.description", "Cliquez sur un membre pour gérer ses permissions individuelles.")}
						</p>
							{orgChart ? (
								<div className="space-y-2">
									{[...(orgChart.positions
										.flatMap((p) => (p.occupants || []).map((occ) => ({
											...occ,
											positionTitle: getLocalizedValue(p.title, lang),
										}))) ?? []),
										...(orgChart.unassignedMembers.map((m) => ({
											...m,
											positionTitle: t("admin.team.permissions.noPosition", "Sans poste"),
										})) ?? []),
									].map((member) => (
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
						</div>
					</FlatCard>
				</TabsContent>
			</Tabs>

			{/* ─── Dialogs ──────────────────────────────── */}
			{activeOrgId && (
				<>
					<AddMemberDialog
						open={addDialogOpen}
						onOpenChange={setAddDialogOpen}
						orgId={activeOrgId}
					/>

					{selectedMember && (
						<MemberPermissionsDialog
							open={permissionsDialogOpen}
							onOpenChange={setPermissionsDialogOpen}
							orgId={activeOrgId}
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
	lang,
	orgId,
	canCreateMeetings,
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
					: "border-border bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:border-primary/30"
			}`}
		>
			{/* Position header */}
			<div className="px-3.5 pt-3 pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-sm font-semibold leading-tight truncate">
							{getLocalizedValue(position.title, lang)}
						</p>
						{position.description && (
							<p className="text-[11px] text-muted-foreground mt-0.5 truncate">
								{getLocalizedValue(position.description, lang)}
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
						{getLocalizedValue(grade.label, lang)}
					</Badge>
				)}
			</div>

			{/* Divider */}
			<div className="border-t mx-3" />

			{/* Occupants */}
			<div className="px-3.5 py-2.5">
				{position.occupants && position.occupants.length > 0 && (
					<div className="flex flex-col gap-2">
						{position.occupants.map((occupant: any) => (
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
								{/* Call agent-to-agent button */}
								{canCreateMeetings && orgId && occupant.userId && (
									<CallButton
										orgId={orgId}
										participantUserId={occupant.userId as Id<"users">}
										size="icon"
										variant="ghost"
										className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
										label=""
									/>
								)}
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
						position.occupants && position.occupants.length > 0 && "mt-2"
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
	lang,
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
										<span>{getLocalizedValue(selectedPosition.title, lang)}</span>
										{selectedPosition.grade && POSITION_GRADES[selectedPosition.grade as PositionGrade] && (
											<Badge variant="outline" className="text-[10px] px-1.5 py-0">
												{getLocalizedValue(POSITION_GRADES[selectedPosition.grade as PositionGrade].label, lang)}
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
