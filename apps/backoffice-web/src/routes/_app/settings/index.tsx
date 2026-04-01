import { createFileRoute } from "@tanstack/react-router";
import {
	Bell,
	Check,
	KeyRound,
	Loader2,
	LogOut,
	Mail,
	Settings,
	Trash2,
	RotateCcw,
	AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { useConvexMutationQuery, useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { toast } from "sonner";
import {
	SettingsDivider,
	SettingsLayout,
	SettingsRow,
	SettingsSectionHeader,
	type SettingsTab,
} from "@/components/shared/settings-layout";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_app/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t, i18n } = useTranslation();

	const [activeTab, setActiveTab] = useState("general");
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	// ── Session data ──
	const { data: session } = authClient.useSession();

	// ── OTP reset state ──
	const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">(
		"idle",
	);
	const [resetOtp, setResetOtp] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState<string | null>(null);
	const [resetSuccess, setResetSuccess] = useState(false);

	// ── General tab state ──
	const [siteName, setSiteName] = useState("Consulat.ga");
	const [adminEmail, setAdminEmail] = useState("admin@consulat.ga");
	const [generalSaving, setGeneralSaving] = useState(false);

	// ── Notification preferences ──
	const { data: currentUser } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);
	const { mutate: updatePreferences, isPending: prefSaving } = useConvexMutationQuery(
		api.functions.users.updatePreferences,
	);
	const prefs = currentUser?.preferences ?? {};

	const handleSendResetOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "forget-password",
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetStep("otp_sent");
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const handleResetWithOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (resetNewPassword.length < 8) {
			setResetError(t("settings.security.passwordTooShort"));
			return;
		}
		if (resetNewPassword !== confirmPassword) {
			setResetError(t("settings.security.passwordMismatch"));
			return;
		}
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.resetPassword({
				email,
				otp: resetOtp,
				password: resetNewPassword,
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetSuccess(true);
				setResetStep("done");
				setResetOtp("");
				setResetNewPassword("");
				setConfirmPassword("");
				setTimeout(() => {
					setResetSuccess(false);
					setResetStep("idle");
				}, 4000);
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const TABS: SettingsTab[] = [
		{
			id: "general",
			label: t("superadmin.settings.tabs.general"),
			icon: <Settings className="size-4" />,
		},
		{
			id: "notifications",
			label: t("superadmin.settings.tabs.notifications"),
			icon: <Bell className="size-4" />,
		},
		{
			id: "accountSecurity",
			label: t("settings.account.title"),
			icon: <KeyRound className="size-4" />,
		},
		{
			id: "trash",
			label: "Corbeille",
			icon: <Trash2 className="size-4" />,
		},
	];

	// ── Trash data ──
	const convex = useConvex();
	const [trashedUsers, setTrashedUsers] = useState<any[]>([]);
	const [trashLoading, setTrashLoading] = useState(false);
	const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);

	const { mutate: restoreUser, isPending: isRestoring } = useConvexMutationQuery(
		api.functions.admin.restoreUser
	);
	const { mutate: permanentlyDeleteUser, isPending: isPermanentDeleting } = useConvexMutationQuery(
		api.functions.admin.permanentlyDeleteUser
	);

	// Load trashed users when tab is active
	useEffect(() => {
		if (activeTab !== "trash") return;
		let active = true;
		async function loadTrash() {
			setTrashLoading(true);
			try {
				let cursor = null;
				let isDone = false;
				const all: any[] = [];
				while (!isDone && active) {
					const res: any = await convex.query(api.functions.admin.listAllUsersChunk, { cursor });
					const trashed = res.page.filter((u: any) => u.deletedAt);
					all.push(...trashed);
					cursor = res.continueCursor;
					isDone = res.isDone;
				}
				if (active) setTrashedUsers(all);
			} catch (e) {
				console.error("Failed to load trashed users", e);
			} finally {
				if (active) setTrashLoading(false);
			}
		}
		loadTrash();
		return () => { active = false; };
	}, [activeTab, convex]);

	const handleRestore = async (userId: any) => {
		try {
			await restoreUser({ userId });
			setTrashedUsers((prev) => prev.filter((u) => u._id !== userId));
			toast.success("Utilisateur restauré avec succès ");
		} catch {
			toast.error("Erreur lors de la restauration");
		}
	};

	const handlePermanentDelete = async (userId: any) => {
		try {
			await permanentlyDeleteUser({ userId });
			setTrashedUsers((prev) => prev.filter((u) => u._id !== userId));
			setDeleteConfirmUser(null);
			toast.success("Utilisateur supprimé définitivement");
		} catch {
			toast.error("Erreur lors de la suppression");
		}
	};

	return (
		<>
			<SettingsLayout
				title={t("superadmin.settings.title")}
				description={t("superadmin.settings.description")}
				tabs={TABS}
				activeTab={activeTab}
				onTabChange={setActiveTab}
			>
				<div className="max-w-3xl">
					{activeTab === "general" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("superadmin.settings.general.title")}
								description={t("superadmin.settings.general.description")}
							/>
							<div className="space-y-6">
								<div className="grid gap-2 max-w-sm">
									<Label htmlFor="siteName">Nom du site</Label>
									<Input
										id="siteName"
										value={siteName}
										onChange={(e) => setSiteName(e.target.value)}
									/>
								</div>
								<div className="grid gap-2 max-w-sm">
									<Label htmlFor="adminEmail">Email administrateur</Label>
									<Input
										id="adminEmail"
										type="email"
										value={adminEmail}
										onChange={(e) => setAdminEmail(e.target.value)}
									/>
								</div>
								<SettingsDivider />
								<SettingsSectionHeader
									title="Fuseau horaire"
									description="Fuseau horaire utilisé pour l'affichage des dates et heures dans la plateforme"
								/>
								<SettingsRow
									title="Fuseau actuel"
									value={Intl.DateTimeFormat().resolvedOptions().timeZone}
								/>
								<div>
									<Button
										disabled={generalSaving}
										onClick={() => {
											setGeneralSaving(true);
											// Simulate save (these settings would go to a platform settings table)
											setTimeout(() => {
												setGeneralSaving(false);
												toast.success("Paramètres généraux sauvegardés ");
											}, 600);
										}}
									>
										{generalSaving ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : null}
										{t("superadmin.common.save")}
									</Button>
								</div>
							</div>
						</div>
					)}

					{activeTab === "notifications" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("superadmin.settings.notifications.title")}
								description={t("superadmin.settings.notifications.description")}
							/>
							<div className="space-y-4">
								<SettingsRow
									title="Notifications par e-mail"
									description="Recevoir les alertes, les mises à jour de statut et les résumés d'activité par e-mail"
									action={
										<Switch
											checked={prefs.emailNotifications !== false}
											onCheckedChange={(checked) => {
												updatePreferences({ emailNotifications: checked });
												toast.success(checked ? "Notifications e-mail activées" : "Notifications e-mail désactivées");
											}}
											disabled={prefSaving}
										/>
									}
								/>
								<SettingsRow
									title="Notifications push (navigateur)"
									description="Recevoir des notifications en temps réel directement dans votre navigateur"
									action={
										<Switch
											checked={prefs.pushNotifications === true}
											onCheckedChange={(checked) => {
												updatePreferences({ pushNotifications: checked });
												toast.success(checked ? "Notifications push activées" : "Notifications push désactivées");
											}}
											disabled={prefSaving}
										/>
									}
								/>
								<SettingsRow
									title="Notifications SMS"
									description="Recevoir des alertes critiques et rappels de rendez-vous par SMS"
									action={
										<Switch
											checked={prefs.smsNotifications === true}
											onCheckedChange={(checked) => {
												updatePreferences({ smsNotifications: checked });
												toast.success(checked ? "Notifications SMS activées" : "Notifications SMS désactivées");
											}}
											disabled={prefSaving}
										/>
									}
								/>
								<SettingsRow
									title="Notifications WhatsApp"
									description="Recevoir des notifications et confirmations via WhatsApp (Bird integration)"
									action={
										<Switch
											checked={prefs.whatsappNotifications === true}
											onCheckedChange={(checked) => {
												updatePreferences({ whatsappNotifications: checked });
												toast.success(checked ? "Notifications WhatsApp activées" : "Notifications WhatsApp désactivées");
											}}
											disabled={prefSaving}
										/>
									}
								/>
							</div>
							<SettingsDivider />
							<SettingsSectionHeader
								title="Données & Confidentialité"
								description="Gérer le partage de données anonymes pour améliorer la plateforme"
							/>
							<SettingsRow
								title="Partager les données analytiques"
								description="Partager des données d'utilisation anonymes pour aider à améliorer l'expérience de la plateforme"
								action={
									<Switch
										checked={prefs.shareAnalytics === true}
										onCheckedChange={(checked) => {
											updatePreferences({ shareAnalytics: checked });
											toast.success(checked ? "Partage analytique activé" : "Partage analytique désactivé");
										}}
										disabled={prefSaving}
									/>
								}
							/>
						</div>
					)}

					{activeTab === "accountSecurity" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.security.accountInfo")}
								description={t("settings.security.accountInfoDesc")}
							/>
							<div className="mb-8">
								<SettingsRow
									title={t("common.name")}
									value={session?.user?.name || "—"}
								/>
								<SettingsRow
									title={t("common.email")}
									value={session?.user?.email || "—"}
								/>
								<SettingsRow
									title={t("settings.security.memberSince")}
									value={
										session?.user?.createdAt
											? new Date(session.user.createdAt).toLocaleDateString(
													i18n.language,
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)
											: "—"
									}
								/>
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.security.changePassword")}
								description={t("settings.security.changePasswordDesc")}
							/>
							<div className="max-w-md space-y-4 py-2">
								{resetError && (
									<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
										{resetError}
									</div>
								)}
								{resetSuccess && (
									<div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
										<Check className="size-4" />
										{t("settings.security.resetSuccess")}
									</div>
								)}

								{resetStep === "idle" && (
									<Button
										variant="outline"
										onClick={handleSendResetOtp}
										disabled={resetLoading || !session?.user?.email}
									>
										{resetLoading ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Mail className="mr-2 size-4" />
										)}
										{t("settings.security.sendResetCode")}
									</Button>
								)}

								{resetStep === "otp_sent" && (
									<form onSubmit={handleResetWithOtp} className="space-y-4">
										<p className="text-sm text-muted-foreground">
											{t("settings.security.otpSentTo", {
												email: session?.user?.email,
											})}
										</p>
										<div className="space-y-2">
											<Label>{t("settings.security.otpCode")}</Label>
											<Input
												value={resetOtp}
												onChange={(e) => setResetOtp(e.target.value)}
												placeholder="123456"
												required
												autoComplete="one-time-code"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.newPassword")}</Label>
											<Input
												type="password"
												value={resetNewPassword}
												onChange={(e) => setResetNewPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.confirmPassword")}</Label>
											<Input
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="flex gap-2">
											<Button
												type="submit"
												disabled={
													resetLoading ||
													!resetOtp ||
													!resetNewPassword ||
													!confirmPassword ||
													resetNewPassword !== confirmPassword
												}
											>
												{resetLoading && (
													<Loader2 className="mr-2 size-4 animate-spin" />
												)}
												{t("settings.security.resetPassword")}
											</Button>
											<Button
												type="button"
												variant="ghost"
												onClick={() => {
													setResetStep("idle");
													setResetError(null);
													setResetOtp("");
													setResetNewPassword("");
													setConfirmPassword("");
												}}
											>
												{t("common.cancel")}
											</Button>
										</div>
									</form>
								)}
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.account.title")}
								description={t("settings.account.description")}
							/>
							<div className="py-2">
								<SettingsRow
									title={t("common.logout")}
									description={t(
										"common.logoutConfirmDescription",
										"Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à votre espace.",
									)}
									action={
										<Button
											variant="destructive"
											onClick={() => setShowLogoutDialog(true)}
										>
											<LogOut className="mr-2 size-4" />
											{t("common.logout")}
										</Button>
									}
								/>
							</div>
						</div>
					)}

					{activeTab === "trash" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title="Corbeille"
								description="Les comptes supprimés sont conservés pendant 30 jours avant la suppression définitive. Vous pouvez les restaurer ou les supprimer manuellement."
							/>

							{trashLoading ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									<span className="ml-2 text-muted-foreground">Chargement…</span>
								</div>
							) : trashedUsers.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-center">
									<Trash2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
									<p className="text-lg font-medium text-muted-foreground">Corbeille vide</p>
									<p className="text-sm text-muted-foreground/70 mt-1">Aucun compte supprimé pour le moment.</p>
								</div>
							) : (
								<div className="space-y-2">
									<div className="flex items-center gap-2 mb-4">
										<Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-400">
											 {trashedUsers.length} compte{trashedUsers.length > 1 ? "s" : ""} en corbeille
										</Badge>
									</div>

									{trashedUsers.map((user: any) => {
										const daysRemaining = Math.max(0, 30 - Math.floor((Date.now() - user.deletedAt) / (1000 * 60 * 60 * 24)));
										const isExpired = daysRemaining === 0;
										const deletedDate = new Date(user.deletedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
										const initials = user.firstName && user.lastName
											? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
											: (user.email || "??").slice(0, 2).toUpperCase();

										return (
											<div
												key={user._id}
												className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
											>
												<div className="flex items-center gap-3 min-w-0">
													<Avatar className="h-10 w-10">
														<AvatarImage src={user.avatarUrl} alt={user.email} />
														<AvatarFallback className="text-xs bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-semibold">
															{initials}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0">
														<div className="font-medium text-sm truncate">
															{user.firstName && user.lastName
																? `${user.firstName} ${user.lastName}`
																: user.name || user.email}
														</div>
														<div className="text-xs text-muted-foreground truncate">{user.email}</div>
														<div className="flex items-center gap-2 mt-1">
															<span className="text-[10px] text-muted-foreground">Supprimé le {deletedDate}</span>
															<Badge
																variant="outline"
																className={`text-[10px] ${
																	isExpired
																		? "text-red-600 border-red-300 bg-red-50 dark:bg-red-500/10"
																		: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10"
																}`}
															>
																{isExpired ? " Expirée" : ` ${daysRemaining}j restants`}
															</Badge>
														</div>
													</div>
												</div>

												<div className="flex items-center gap-2 shrink-0">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleRestore(user._id)}
														disabled={isRestoring}
														className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-500/10"
													>
														<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
														Restaurer
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => setDeleteConfirmUser(user)}
														disabled={isPermanentDeleting}
													>
														<AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
														Supprimer
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</SettingsLayout>

			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.logoutConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"common.logoutConfirmDescription",
								"Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à votre espace.",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await authClient.signOut();
								window.location.href = "/";
							}}
						>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Permanent delete confirmation dialog */}
			<AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							Suppression définitive
						</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est <strong>irréversible</strong>. Le compte{" "}
							<strong>{deleteConfirmUser?.email}</strong> ainsi que son profil
							et ses affiliations seront supprimés de manière permanente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteConfirmUser && handlePermanentDelete(deleteConfirmUser._id)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer définitivement
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
