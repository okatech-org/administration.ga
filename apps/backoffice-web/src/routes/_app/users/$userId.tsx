"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Building2,
	Calendar,
	Eye,
	Layers,
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MenuPreviewCard } from "@/components/admin/menu-preview-card";
import { MemberPermissionsDialog } from "@/components/org/member-permissions-dialog";
import { UserRoleDialog } from "@/components/admin/user-role-dialog";
import { UserModulesDialog } from "@/components/admin/user-modules-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { MODULE_REGISTRY, type ModuleCodeValue } from "@convex/lib/moduleCodes";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users/$userId")({
	component: UserDetailPage,
});

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

function UserDetailPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { userId } = Route.useParams();
	const { canManageUser, effectiveRole } = useCurrentAdminRole();
	const [permsMembership, setPermsMembership] = useState<{
		membershipId: Id<"memberships">;
		orgId: Id<"orgs">;
		name: string;
		role: string;
	} | null>(null);

	const [showRoleDialog, setShowRoleDialog] = useState(false);
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
			<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
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
			<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/users" })}
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
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/users" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
			</div>

			{/* User Profile Header */}
			<div className="flex items-start gap-6">
				<Avatar className="h-20 w-20">
					<AvatarImage src={user.profileImageUrl} />
					<AvatarFallback className="text-2xl">{initials}</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="flex items-center gap-3 flex-wrap">
						<h1 className="text-3xl font-bold tracking-tight">
							{user.firstName} {user.lastName}
						</h1>
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
					<p className="text-muted-foreground flex items-center gap-2 mt-1">
						<Mail className="h-4 w-4" />
						{user.email}
					</p>
				</div>
			</div>

			{/* Quick Actions Bar */}
			{canManage && (
				<Card className="border-dashed">
					<CardContent className="flex flex-wrap items-center gap-2 py-3">
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
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				{/* Details Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							{t("superadmin.users.details.infos")}
						</CardTitle>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>

				{/* Security & Role Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5" />
							Sécurité & Rôle
						</CardTitle>
						<CardDescription>
							Informations de sécurité et niveau d'accès
						</CardDescription>
					</CardHeader>
					<CardContent>
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
						</dl>
					</CardContent>
				</Card>
			</div>

			{/* Organizations Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						{t("superadmin.users.details.organizations")}
					</CardTitle>
					<CardDescription>
						{t("superadmin.users.details.orgMembership")}
					</CardDescription>
				</CardHeader>
				<CardContent>
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
				</CardContent>
			</Card>

			{/* Modules Card (Back-office/Agent users only) */}
			{isBackOfficeOrAgent && moduleData && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Layers className="h-5 w-5" />
							Modules autorisés
						</CardTitle>
						<CardDescription>
							{moduleData.allowedModules
								? `${moduleData.allowedModules.length} modules activés sur ${moduleData.allModules.length}`
								: "Tous les modules sont accessibles"}
						</CardDescription>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>
			)}

			{/* Activity History */}
			<Card>
				<CardHeader>
					<CardTitle>{t("superadmin.users.details.activity")}</CardTitle>
					<CardDescription>
						{t("superadmin.users.details.lastActions")}
					</CardDescription>
				</CardHeader>
				<CardContent>
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
				</CardContent>
			</Card>

			{/* Dialogs */}
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
