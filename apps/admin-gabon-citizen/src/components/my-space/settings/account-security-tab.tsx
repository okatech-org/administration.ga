import { LogOut, Shield, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
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
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { PinCodeSection } from "./pin-code-section";

interface AccountSecurityTabProps {
	preferences:
		| {
				shareAnalytics?: boolean;
		  }
		| undefined;
	onPrefToggle: (
		key:
			| "emailNotifications"
			| "pushNotifications"
			| "smsNotifications"
			| "whatsappNotifications"
			| "shareAnalytics",
		value: boolean,
	) => void;
}

export function AccountSecurityTab({
	preferences,
	onPrefToggle,
}: AccountSecurityTabProps) {
	const { t, i18n } = useTranslation();
	const { data: session } = authClient.useSession();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	return (
		<>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* ─── Colonne gauche ─── */}
				<div className="flex flex-col gap-4">
					{/* Informations du compte */}
					<FlatCard>
						<CardHeader icon={<User className="h-3.5 w-3.5" />} title={t("settings.security.accountInfo")} />
						<div className="space-y-1 p-3">
							<InfoRow label={t("common.name")} value={session?.user?.name || "—"} />
							<InfoRow label={t("common.email")} value={session?.user?.email || "—"} />
							<InfoRow
								label={t("settings.security.memberSince")}
								value={
									session?.user?.createdAt
										? new Date(session.user.createdAt).toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" })
										: "—"
								}
							/>
						</div>
					</FlatCard>

					{/* Confidentialite */}
					<FlatCard>
						<CardHeader icon={<Shield className="h-3.5 w-3.5" />} title={t("settings.privacy.title")} />
						<div className="p-3">
							<div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDFCFA] px-3 py-2.5 dark:bg-[#21201E]/77">
								<div className="space-y-0.5 pr-2">
									<p className="text-sm font-medium">{t("settings.privacy.analytics")}</p>
									<p className="text-xs text-muted-foreground">{t("settings.privacy.analyticsDesc")}</p>
								</div>
								<Switch
									checked={preferences?.shareAnalytics ?? true}
									onCheckedChange={(checked) => onPrefToggle("shareAnalytics", checked)}
								/>
							</div>
						</div>
					</FlatCard>

					{/* Deconnexion */}
					<FlatCard>
						<CardHeader icon={<LogOut className="h-3.5 w-3.5" />} title={t("settings.account.title")} />
						<div className="p-3">
							<p className="mb-3 text-xs text-muted-foreground">{t("settings.account.description")}</p>
							<Button variant="destructive" size="sm" onClick={() => setShowLogoutDialog(true)} className="w-full gap-2 rounded-xl">
								<LogOut className="size-3.5" />
								{t("common.logout")}
							</Button>
						</div>
					</FlatCard>
				</div>

				{/* ─── Colonne droite ─── */}
				<div className="flex flex-col gap-4">
					{/* Code PIN — méthode principale de connexion rapide */}
					<FlatCard>
						<div className="p-4">
							<PinCodeSection />
						</div>
					</FlatCard>
				</div>
			</div>

			{/* Dialog deconnexion */}
			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("common.logoutConfirmTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{t("common.logoutConfirmDescription")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ─── Card Header iProfil ─────────────────────────────────────

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2 rounded-t-xl bg-[#EBE6DC]/50 px-3 py-2.5 dark:bg-[#383633]/30 md:px-4">
			<div className="rounded-md bg-primary/10 p-1">
				<span className="text-primary">{icon}</span>
			</div>
			<span className="text-sm font-bold">{title}</span>
		</div>
	);
}

// ─── Info Row ────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDFCFA] px-3 py-2 dark:bg-[#21201E]/77">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="ml-3 max-w-[220px] truncate text-sm font-medium">{value}</span>
		</div>
	);
}

