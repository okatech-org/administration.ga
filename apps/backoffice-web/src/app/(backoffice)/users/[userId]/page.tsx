"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import {
	AlertTriangle,
	ArrowLeft,
	Baby,
	Building2,
	Calendar,
	Edit,
	Eye,
	KeyRound,
	Layers,
	Loader2,
	Lock,
	Mail,
	MapPin,
	Phone,
	Shield,
	ShieldAlert,
	ShieldCheck,
	UserCheck,
	UserX,
	Trash2,
	RotateCcw,
} from "lucide-react";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DiplomaticProfileEditDialog } from "@/components/admin/diplomatic-profile-edit-dialog";
import { MenuPreviewCard } from "@/components/admin/menu-preview-card";
import { MemberPermissionsDialog } from "@/components/org/member-permissions-dialog";
import { UserRoleDialog } from "@/components/admin/user-role-dialog";
import { UserModulesDialog } from "@/components/admin/user-modules-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { MODULE_REGISTRY, type ModuleCodeValue } from "@convex/lib/moduleCodes";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { toast } from "sonner";

const ROLE_BADGE_STYLES: Record<string, string> = {
	super_admin: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-500/30",
	admin_system: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-400 dark:border-violet-500/30",
	admin: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-500/30",
	intel_agent: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/30",
	education_agent: "bg-teal-500/10 text-teal-700 border-teal-300 dark:text-teal-400 dark:border-teal-500/30",
	user: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400 dark:border-zinc-500/30",
};

const ROLE_LABELS: Record<string, string> = {
	super_admin: "Super Admin",
	admin_system: "Admin Système",
	admin: "Admin",
	intel_agent: "Agent Intel",
	education_agent: "Agent Éducation",
	user: "Utilisateur",
};

export default function UserDetailPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { userId } = useParams<{ userId: string }>();
	const { canManageUser, effectiveRole } = useCurrentAdminRole();
	const [permsMembership, setPermsMembership] = useState<{
		membershipId: Id<"memberships">;
		orgId: Id<"orgs">;
		name: string;
		role: string;
	} | null>(null);

	const [showRoleDialog, setShowRoleDialog] = useState(false);
	const [editDiploMembership, setEditDiploMembership] = useState<{
		membershipId: Id<"memberships">;
		name: string;
		diplomaticProfile: any;
	} | null>(null);
	const [showModulesDialog, setShowModulesDialog] = useState(false);

	const { data: user, isPending: isLoadingUser } = useAuthenticatedConvexQuery(
		api.functions.admin.getUser,
		{ userId: userId as Id<"users"> },
	);

	const { data: memberships, isPending: isLoadingMemberships } =
		useAuthenticatedConvexQuery(api.functions.admin.getUserMemberships, {
			userId: userId as Id<"users">,
		});

	const { data: auditLogs, isPending: isLoadingLogs } =
		useAuthenticatedConvexQuery(api.functions.admin.getUserAuditLogs, {
			userId: userId as Id<"users">,
			limit: 10,
		});

	const userRole = (user as any)?.role as string || "user";
	const isBackOfficeOrAgent = ["admin", "admin_system", "intel_agent", "education_agent", "super_admin"].includes(userRole);
	const canManage = canManageUser(userRole);

	const { data: moduleData } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserModules,
		isBackOfficeOrAgent && user ? { userId: userId as Id<"users"> } : "skip",
	);

	// Mutations for quick actions
	const { mutate: enableUserMut, isPending: isEnabling } = useConvexMutationQuery(api.functions.admin.enableUser);
	const { mutate: disableUserMut, isPending: isDisabling } = useConvexMutationQuery(api.functions.admin.disableUser);
	const { mutate: softDeleteMut, isPending: isTrashing } = useConvexMutationQuery(api.functions.admin.softDeleteUser);
	const { mutate: restoreMut, isPending: isRestoring } = useConvexMutationQuery(api.functions.admin.restoreUser);

	const handleToggleStatus = async () => {
		if (!user) return;
		try {
			if (user.isActive) {
				await disableUserMut({ userId: user._id });
				toast.success("Utilisateur désactivé ");
			} else {
				await enableUserMut({ userId: user._id });
				toast.success("Utilisateur activé ");
			}
		} catch {
			toast.error(t("superadmin.common.error"));
		}
	};

	const handleSoftDelete = async () => {
		if (!user) return;
		try {
			await softDeleteMut({ userId: user._id });
			toast.success("Utilisateur déplacé dans la corbeille ");
		} catch {
			toast.error(t("superadmin.common.error"));
		}
	};

	const handleRestore = async () => {
		if (!user) return;
		try {
			await restoreMut({ userId: user._id });
			toast.success("Utilisateur restauré ");
		} catch {
			toast.error(t("superadmin.common.error"));
		}
	};

	if (isLoadingUser) {
		return (
			<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
				<Skeleton className="h-8 w-32" />
				<div className="flex gap-4">
					<Skeleton className="h-20 w-20 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.push("/users")}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
				<div className="text-destructive">Utilisateur non trouvé</div>
			</div>
		);
	}

	const initials =
		`${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
		user.email[0].toUpperCase();

	const isTrashed = !!(user as any).deletedAt;
	const roleBadgeStyle = ROLE_BADGE_STYLES[userRole] || ROLE_BADGE_STYLES.user;
	const roleLabel = ROLE_LABELS[userRole] || "Utilisateur";

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			{/* Header */}
			<PageHeader
				icon={<Eye className="h-5 w-5" />}
				title={`${user.firstName} ${user.lastName}`}
				subtitle={user.email}
				showBackButton
				onBack={() => router.push("/users")}
				actions={
					<div className="flex items-center gap-2 flex-wrap">
						<Badge variant={user.isActive ? "default" : "outline"}>
							{user.isActive
								? t("superadmin.common.active")
								: t("superadmin.common.inactive")}
						</Badge>
						<Badge
							variant="outline"
							className={cn("border", roleBadgeStyle)}
						>
							{roleLabel}
						</Badge>
						{!canManage && (
							<Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 dark:text-amber-400">
								<ShieldAlert className="h-3 w-3 mr-1" />
								Protégé
							</Badge>
						)}
					</div>
				}
			/>

			{/* User Profile Header */}
			<div className="flex items-start gap-6">
				<Avatar className="h-20 w-20">
					<AvatarImage src={user.profileImageUrl} />
					<AvatarFallback className="text-2xl">{initials}</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="text-muted-foreground flex items-center gap-2 mt-1">
						<Mail className="h-4 w-4" />
						{user.email}
					</p>
				</div>
			</div>

			{/* Quick Actions Bar */}
			{canManage && (
				<FlatCard>
					<div className="flex flex-wrap items-center gap-2 p-3 lg:p-4">
						<span className="text-xs font-medium text-muted-foreground mr-2">Actions rapides</span>

						{isTrashed ? (
							<Button
								variant="outline"
								size="sm"
								onClick={handleRestore}
								disabled={isRestoring}
								className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-500/10"
							>
								<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
								Restaurer
							</Button>
						) : (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={handleToggleStatus}
									disabled={isEnabling || isDisabling}
									className={cn(
										user.isActive
											? "text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10"
											: "text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-500/10"
									)}
								>
									{user.isActive ? (
										<>
											<UserX className="h-3.5 w-3.5 mr-1.5" />
											Désactiver
										</>
									) : (
										<>
											<UserCheck className="h-3.5 w-3.5 mr-1.5" />
											Activer
										</>
									)}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowRoleDialog(true)}
								>
									<Shield className="h-3.5 w-3.5 mr-1.5" />
									Changer le rôle
								</Button>
								{isBackOfficeOrAgent && userRole !== "super_admin" && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowModulesDialog(true)}
									>
										<Layers className="h-3.5 w-3.5 mr-1.5" />
										Gérer les modules
									</Button>
								)}
								<div className="flex-1" />
								<Button
									variant="outline"
									size="sm"
									onClick={handleSoftDelete}
									disabled={isTrashing}
									className="text-destructive border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
								>
									<Trash2 className="h-3.5 w-3.5 mr-1.5" />
									Corbeille
								</Button>
							</>
						)}
					</div>
				</FlatCard>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				{/* Details Card */}
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Shield className="h-4 w-4" />}
							title={t("superadmin.users.details.infos")}
						/>
						<dl className="grid gap-3">
							{user.phone && (
								<div className="flex items-center gap-2">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<dd>{user.phone}</dd>
								</div>
							)}
							{user.nationality && (
								<div className="flex items-center gap-2">
									<MapPin className="h-4 w-4 text-muted-foreground" />
									<dd>
										{t("superadmin.users.details.nationality")}:{" "}
										{user.nationality}
									</dd>
								</div>
							)}
							{user.residenceCountry && (
								<div className="flex items-center gap-2">
									<MapPin className="h-4 w-4 text-muted-foreground" />
									<dd>
										{t("superadmin.users.details.residence")}:{" "}
										{user.residenceCountry}
									</dd>
								</div>
							)}
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<dd>
									{t("superadmin.users.details.registered")}{" "}
									{new Date(user.createdAt).toLocaleDateString()}
								</dd>
							</div>
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-muted-foreground" />
								<dd>
									Email{" "}
									{user.isVerified
										? t("superadmin.users.details.verified")
										: t("superadmin.users.details.unverified")}
								</dd>
							</div>
						</dl>
					</div>
				</FlatCard>

				{/* Security & Role Card */}
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<ShieldCheck className="h-4 w-4" />}
							title="Sécurité & Rôle"
						/>
						<p className="text-xs text-muted-foreground mb-3">
							Informations de sécurité et niveau d'accès
						</p>
						<dl className="grid gap-3">
							<div className="flex items-center justify-between">
								<dt className="text-sm text-muted-foreground">Rôle plateforme</dt>
								<dd>
									<Badge variant="outline" className={cn("border", roleBadgeStyle)}>
										{roleLabel}
									</Badge>
								</dd>
							</div>
							<div className="flex items-center justify-between">
								<dt className="text-sm text-muted-foreground">Statut du compte</dt>
								<dd>
									<Badge variant={user.isActive ? "default" : "outline"}>
										{user.isActive ? " Actif" : " Inactif"}
									</Badge>
								</dd>
							</div>
							{isTrashed && (
								<div className="flex items-center justify-between">
									<dt className="text-sm text-muted-foreground">Corbeille</dt>
									<dd>
										<Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-400">
											 En attente de suppression
										</Badge>
									</dd>
								</div>
							)}
							{moduleData && (
								<div className="flex items-center justify-between">
									<dt className="text-sm text-muted-foreground">Modules</dt>
									<dd className="text-sm">
										{moduleData.allowedModules
											? `${moduleData.allowedModules.length} / ${moduleData.allModules.length}`
											: "Accès complet"}
									</dd>
								</div>
							)}
							<div className="flex items-center justify-between">
								<dt className="text-sm text-muted-foreground">Gérable par vous</dt>
								<dd className="text-sm">
									{canManage ? (
										<span className="text-green-600 dark:text-green-400"> Oui</span>
									) : (
										<span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
											<ShieldAlert className="h-3.5 w-3.5" />
											Non — rang supérieur ou égal
										</span>
									)}
								</dd>
							</div>
							{/* PIN Code Status */}
							<PinStatusRow userId={userId as Id<"users">} />
						</dl>
					</div>
				</FlatCard>
			</div>

			{/* Organizations Card */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<Building2 className="h-4 w-4" />}
						title={t("superadmin.users.details.organizations")}
					/>
					<p className="text-xs text-muted-foreground mb-3">
						{t("superadmin.users.details.orgMembership")}
					</p>
					{isLoadingMemberships ? (
						<div className="space-y-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : memberships && memberships.length > 0 ? (
						<div className="space-y-3">
							{memberships.map((membership: any) => (
								<div key={membership._id} className="border rounded-md overflow-hidden">
									<div className="flex items-center justify-between p-3">
										<div>
											<p className="font-medium">
												{membership.org?.name || "—"}
											</p>
											<p className="text-xs text-muted-foreground">
												{t("superadmin.users.details.since")}{" "}
												{new Date(membership.joinedAt).toLocaleDateString()}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{/* Bouton éditer profil diplomatique (si corps admin) */}
											{membership.positionId && (
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													title="Modifier le profil diplomatique"
													onClick={() =>
														setEditDiploMembership({
															membershipId: membership._id as Id<"memberships">,
															name: `${(user as any)?.lastName?.toUpperCase() ?? ""} ${(user as any)?.firstName ?? ""}`.trim() || membership.org?.name || "—",
															diplomaticProfile: (membership as any).diplomaticProfile,
														})
													}
												>
													<Edit className="h-4 w-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												title={t("permissions.dialog.title")}
												onClick={() =>
													setPermsMembership({
														membershipId: membership._id as Id<"memberships">,
														orgId: membership.orgId as Id<"orgs">,
														name: membership.org?.name || "—",
														role: membership.role,
													})
												}
											>
												<ShieldCheck className="h-4 w-4" />
											</Button>
											<Badge variant="secondary">{membership.role}</Badge>
										</div>
									</div>
									{/* Aperçu du menu de cet utilisateur dans cette org */}
									<div className="border-t px-3 py-2 bg-muted/20">
										<MenuPreviewCard
											userId={userId as Id<"users">}
											orgId={membership.orgId as Id<"orgs">}
											compact
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground text-center py-4">
							{t("superadmin.users.details.noOrg")}
						</p>
					)}
				</div>
			</FlatCard>

			{/* Child Profiles Card */}
			<ChildProfilesSection userId={userId as Id<"users">} canManage={canManage} />

			{/* Modules Card (Back-office/Agent users only) */}
			{isBackOfficeOrAgent && moduleData && (
				<FlatCard>
					<div className="p-3 lg:p-4">
						<SectionHeader
							icon={<Layers className="h-4 w-4" />}
							title="Modules autorisés"
						/>
						<p className="text-xs text-muted-foreground mb-3">
							{moduleData.allowedModules
								? `${moduleData.allowedModules.length} modules activés sur ${moduleData.allModules.length}`
								: "Tous les modules sont accessibles"}
						</p>
						{moduleData.allowedModules ? (
							<div className="flex flex-wrap gap-1.5">
								{moduleData.allowedModules.map((code: string) => {
									const mod = MODULE_REGISTRY[code as ModuleCodeValue];
									if (!mod) return null;
									return (
										<Badge
											key={code}
											variant="outline"
											className="flex items-center gap-1.5 text-xs py-1 px-2"
										>
											<DynamicLucideIcon name={mod.icon} className={cn("h-3 w-3", mod.color)} />
											{mod.label.fr}
										</Badge>
									);
								})}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								 Aucune restriction — accès à tous les modules
							</p>
						)}
					</div>
				</FlatCard>
			)}

			{/* Activity History */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<Calendar className="h-4 w-4" />}
						title={t("superadmin.users.details.activity")}
					/>
					<p className="text-xs text-muted-foreground mb-3">
						{t("superadmin.users.details.lastActions")}
					</p>
					{isLoadingLogs ? (
						<div className="space-y-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
					) : auditLogs && auditLogs.length > 0 ? (
						<div className="space-y-2">
							{auditLogs.map((log: any) => (
								<div
									key={log._id}
									className="flex items-center justify-between py-2 border-b last:border-0"
								>
									<div>
										<p className="text-sm font-medium">{log.action}</p>
										<p className="text-xs text-muted-foreground">
											{log.details}
										</p>
									</div>
									<span className="text-xs text-muted-foreground">
										{new Date(log.timestamp).toLocaleString()}
									</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground text-center py-4">
							{t("superadmin.users.details.noActivity")}
						</p>
					)}
				</div>
			</FlatCard>

			{/* Dialogs */}
			{editDiploMembership && (
				<DiplomaticProfileEditDialog
					open={!!editDiploMembership}
					onOpenChange={(open) => !open && setEditDiploMembership(null)}
					membershipId={editDiploMembership.membershipId}
					memberName={editDiploMembership.name}
					currentProfile={editDiploMembership.diplomaticProfile}
				/>
			)}

			{permsMembership && (
				<MemberPermissionsDialog
					open={!!permsMembership}
					onOpenChange={(open) => !open && setPermsMembership(null)}
					orgId={permsMembership.orgId}
					membershipId={permsMembership.membershipId}
					memberName={`${user.firstName} ${user.lastName} @ ${permsMembership.name}`}
					memberRole={permsMembership.role}
				/>
			)}

			{user && (
				<>
					<UserRoleDialog
						user={user as any}
						open={showRoleDialog}
						onOpenChange={setShowRoleDialog}
					/>
					<UserModulesDialog
						user={user as any}
						open={showModulesDialog}
						onOpenChange={setShowModulesDialog}
					/>
				</>
			)}
		</div>
	);
}

// ─── PIN Status Row (inline dans la carte Sécurité) ───────
function PinStatusRow({ userId }: { userId: Id<"users"> }) {
	const pinStatus = useConvexQuery(api.functions.pin.adminGetPinStatus, { userId });
	const adminDeletePin = useConvexMutation(api.functions.pin.adminDeletePin);
	const adminUnlockPin = useConvexMutation(api.functions.pin.adminUnlockPin);
	const [deleting, setDeleting] = useState(false);
	const [unlocking, setUnlocking] = useState(false);

	if (pinStatus === undefined || pinStatus === null) {
		return (
			<div className="flex items-center justify-between">
				<dt className="text-sm text-muted-foreground">Code PIN</dt>
				<dd className="text-sm text-muted-foreground">—</dd>
			</div>
		);
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<dt className="text-sm text-muted-foreground flex items-center gap-1.5">
					<Lock className="h-3.5 w-3.5" /> Code PIN
				</dt>
				<dd className="flex items-center gap-2">
					{pinStatus.hasPin ? (
						<>
							<Badge variant={pinStatus.isLocked ? "destructive" : "default"} className="text-xs">
								{pinStatus.isLocked ? "Verrouillé" : "Actif"}
							</Badge>
							{pinStatus.pinCreatedAt && (
								<span className="text-[10px] text-muted-foreground">
									depuis {new Date(pinStatus.pinCreatedAt).toLocaleDateString("fr-FR")}
								</span>
							)}
						</>
					) : (
						<Badge variant="outline" className="text-xs">Non configuré</Badge>
					)}
				</dd>
			</div>
			{pinStatus.hasPin && (
				<div className="flex items-center justify-between">
					<dt className="text-sm text-muted-foreground">Actions PIN</dt>
					<dd className="flex items-center gap-1.5">
						{pinStatus.isLocked && (
							<Button
								variant="outline"
								size="sm"
								className="h-6 text-[10px] gap-1"
								disabled={unlocking}
								onClick={async () => {
									setUnlocking(true);
									try { await adminUnlockPin({ userId }); } catch {}
									setUnlocking(false);
								}}
							>
								<KeyRound className="h-3 w-3" />
								Déverrouiller
							</Button>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive"
							disabled={deleting}
							onClick={async () => {
								if (!confirm("Supprimer le code PIN de cet utilisateur ?")) return;
								setDeleting(true);
								try { await adminDeletePin({ userId }); } catch {}
								setDeleting(false);
							}}
						>
							<Trash2 className="h-3 w-3" />
							Supprimer
						</Button>
					</dd>
				</div>
			)}
			{pinStatus.hasPin && pinStatus.pinFailedAttempts > 0 && (
				<div className="flex items-center justify-between">
					<dt className="text-sm text-muted-foreground">Tentatives échouées</dt>
					<dd className="text-sm text-amber-600">{pinStatus.pinFailedAttempts}/3</dd>
				</div>
			)}
		</>
	);
}

// ─── Child Profiles Section + delete dialog ───────────────
const CHILD_STATUS_BADGE: Record<string, string> = {
	draft: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400 dark:border-zinc-500/30",
	pending: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-500/30",
	active: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/30",
	inactive: "bg-zinc-500/10 text-zinc-500 border-zinc-300 dark:text-zinc-500 dark:border-zinc-500/30",
};

const CHILD_STATUS_LABEL: Record<string, string> = {
	draft: "Brouillon",
	pending: "En attente",
	active: "Actif",
	inactive: "Inactif",
};

function ChildProfilesSection({
	userId,
	canManage,
}: {
	userId: Id<"users">;
	canManage: boolean;
}) {
	const { data: children, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.listChildProfilesByUser,
		{ userId },
	);

	const [toDelete, setToDelete] = useState<{
		childId: Id<"childProfiles">;
		name: string;
	} | null>(null);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Baby className="h-4 w-4" />}
					title="Profils enfants"
				/>
				<p className="text-xs text-muted-foreground mb-3">
					Enfants rattachés à ce compte parent. La suppression est en cascade
					(documents, inscriptions consulaires, demandes).
				</p>
				{isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				) : !children || children.length === 0 ? (
					<p className="text-muted-foreground text-center py-4 text-sm">
						Aucun profil enfant.
					</p>
				) : (
					<div className="space-y-2">
						{children.map((child: any) => {
							const fullName =
								`${child.firstName ?? ""} ${child.lastName ?? ""}`.trim() ||
								"Enfant";
							const statusStyle =
								CHILD_STATUS_BADGE[child.status] ?? CHILD_STATUS_BADGE.draft;
							return (
								<div
									key={child._id}
									className="flex items-center justify-between border rounded-md p-3"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
											<Baby className="h-4 w-4 text-muted-foreground" />
										</div>
										<div className="min-w-0">
											<p className="font-medium truncate">{fullName}</p>
											<div className="flex items-center gap-2 mt-0.5 flex-wrap">
												<Badge
													variant="outline"
													className={cn("text-xs border", statusStyle)}
												>
													{CHILD_STATUS_LABEL[child.status] ?? child.status}
												</Badge>
												{child.hasRegistrationRequest && (
													<Badge variant="outline" className="text-xs">
														Demande consulaire en cours
													</Badge>
												)}
												{child.nipCode && (
													<span className="text-[10px] text-muted-foreground">
														NIP: {child.nipCode}
													</span>
												)}
											</div>
										</div>
									</div>
									{canManage && (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
											title="Supprimer ce profil enfant"
											onClick={() =>
												setToDelete({
													childId: child._id as Id<"childProfiles">,
													name: fullName,
												})
											}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
			{toDelete && (
				<ChildProfileDeletionDialog
					childId={toDelete.childId}
					name={toDelete.name}
					open={!!toDelete}
					onOpenChange={(open) => !open && setToDelete(null)}
				/>
			)}
		</FlatCard>
	);
}

const CHILD_DELETION_LABELS: Record<string, string> = {
	documents: "Documents",
	consularRegistrations: "Inscriptions consulaires",
	requests: "Demandes",
	events: "Événements",
	agentNotes: "Notes agents",
	printJobs: "Tâches d'impression",
};

function ChildProfileDeletionDialog({
	childId,
	name,
	open,
	onOpenChange,
}: {
	childId: Id<"childProfiles">;
	name: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: preview } = useAuthenticatedConvexQuery(
		api.functions.admin.getChildProfileDeletionPreview,
		open ? { childId } : "skip",
	);

	const { mutate: deleteChild, isPending } = useConvexMutationQuery(
		api.functions.admin.permanentlyDeleteChildProfile,
	);

	const handleConfirm = async () => {
		try {
			await deleteChild({ childId });
			toast.success("Profil enfant supprimé définitivement");
			onOpenChange(false);
		} catch {
			toast.error("Erreur lors de la suppression");
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Suppression du profil enfant
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3">
							<p>
								Cette action est{" "}
								<strong className="text-foreground">irréversible</strong>. Le
								profil de{" "}
								<strong className="text-foreground">{name}</strong> et toutes
								les données rattachées seront supprimés.
							</p>
							{!preview ? (
								<div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Analyse des données…
								</div>
							) : preview.totalItems === 0 ? (
								<p className="text-sm text-muted-foreground py-2">
									Aucune donnée liée — seul le profil sera supprimé.
								</p>
							) : (
								<div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
										Données à supprimer ({preview.totalItems} éléments)
									</p>
									{Object.entries(preview.counts)
										.filter(([, count]) => (count as number) > 0)
										.map(([key, count]) => (
											<div key={key} className="flex justify-between text-sm">
												<span className="text-muted-foreground">
													{CHILD_DELETION_LABELS[key] ?? key}
												</span>
												<span className="font-medium tabular-nums">
													{count as number}
												</span>
											</div>
										))}
									{preview.storageFileCount > 0 && (
										<div className="flex justify-between text-sm pt-1 border-t mt-1">
											<span className="text-muted-foreground">
												Fichiers (storage)
											</span>
											<span className="font-medium tabular-nums">
												{preview.storageFileCount}
											</span>
										</div>
									)}
								</div>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={isPending || !preview}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Suppression…
							</>
						) : (
							"Supprimer définitivement"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
