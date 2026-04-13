import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	AlertDialog,
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
import { authClient } from "@/lib/auth-client";

export function DangerZoneTab() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<ExportDataCard />
			<DeleteAccountCard />
		</div>
	);
}

// ─── Export Card ─────────────────────────────────────────────

function ExportDataCard() {
	const { t } = useTranslation();
	const [exporting, setExporting] = useState(false);
	const [fetchEnabled, setFetchEnabled] = useState(false);
	const exportData = useQuery(api.functions.users.exportMyData, fetchEnabled ? {} : "skip");

	useEffect(() => {
		if (!fetchEnabled || !exportData || exporting) return;
		setExporting(true);
		try {
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `mes-donnees-consulaires-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success(t("settings.dangerZone.exportData.success"));
		} catch { toast.error(t("common.error")); }
		finally { setExporting(false); setFetchEnabled(false); }
	}, [exportData, fetchEnabled, exporting, t]);

	return (
		<FlatCard>
			<div className="flex items-center gap-2 rounded-t-xl bg-[#EBE6DC]/50 px-3 py-2.5 dark:bg-[#383633]/30 md:px-4">
				<div className="rounded-md bg-primary/10 p-1">
					<span className="text-primary"><Download className="h-3.5 w-3.5" /></span>
				</div>
				<span className="text-sm font-bold">{t("settings.dangerZone.exportData.title")}</span>
			</div>
			<div className="space-y-3 p-3">
				<p className="text-xs text-muted-foreground leading-relaxed">{t("settings.dangerZone.exportData.description")}</p>
				<Button variant="outline" size="sm" onClick={() => setFetchEnabled(true)} disabled={exporting || fetchEnabled} className="gap-2 w-full rounded-xl">
					{(exporting || fetchEnabled) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
					{(exporting || fetchEnabled) ? t("settings.dangerZone.exportData.exporting") : t("settings.dangerZone.exportData.button")}
				</Button>
			</div>
		</FlatCard>
	);
}

// ─── Delete Account Card ─────────────────────────────────────

function DeleteAccountCard() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const requestDeletion = useMutation(api.functions.users.requestAccountDeletion);
	const [showDialog, setShowDialog] = useState(false);
	const [confirmEmail, setConfirmEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const userEmail = session?.user?.email ?? "";

	const handleRequestDeletion = async () => {
		if (confirmEmail !== userEmail) return;
		setLoading(true); setError(null);
		try {
			await requestDeletion({ confirmEmail });
			toast.success(t("settings.dangerZone.deleteAccount.success"));
			setShowDialog(false); setConfirmEmail("");
		} catch (e: unknown) { setError((e as Error).message ?? t("common.error")); }
		finally { setLoading(false); }
	};

	return (
		<>
			<FlatCard>
				<div className="flex items-center gap-2 rounded-t-xl bg-destructive/5 px-3 py-2.5 md:px-4">
					<div className="rounded-md bg-destructive/10 p-1">
						<Trash2 className="h-3.5 w-3.5 text-destructive" />
					</div>
					<span className="text-sm font-bold text-destructive">{t("settings.dangerZone.deleteAccount.title")}</span>
				</div>
				<div className="space-y-3 p-3">
					<div className="flex items-start gap-2.5">
						<AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
						<p className="text-xs text-muted-foreground leading-relaxed">{t("settings.dangerZone.deleteAccount.warning")}</p>
					</div>
					<Button variant="destructive" size="sm" onClick={() => setShowDialog(true)} className="gap-2 w-full rounded-xl">
						<Trash2 className="h-3.5 w-3.5" />{t("settings.dangerZone.deleteAccount.button")}
					</Button>
				</div>
			</FlatCard>

			<AlertDialog open={showDialog} onOpenChange={setShowDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings.dangerZone.deleteAccount.title")}</AlertDialogTitle>
						<AlertDialogDescription>{t("settings.dangerZone.deleteAccount.warning")}</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-3 py-2">
						<Label className="text-sm">{t("settings.dangerZone.deleteAccount.confirmLabel")}</Label>
						<Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={t("settings.dangerZone.deleteAccount.confirmPlaceholder")} autoComplete="off" />
						{error && <p className="text-xs text-destructive">{error}</p>}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => { setConfirmEmail(""); setError(null); }}>{t("common.cancel")}</AlertDialogCancel>
						<Button variant="destructive" onClick={handleRequestDeletion} disabled={loading || confirmEmail !== userEmail}>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("settings.dangerZone.deleteAccount.button")}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
