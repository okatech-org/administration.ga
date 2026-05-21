"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Check,
	Loader2,
	Plus,
	RotateCcw,
	ShieldCheck,
	ShieldX,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

import { ALL_TASK_CODES } from "@convex/lib/taskCodes";

// ── Props ──────────────────────────────────────────────────────────────────
interface MemberPermissionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: Id<"orgs">;
	membershipId: Id<"memberships">;
	memberName?: string;
	memberRole?: string;
}

export function MemberPermissionsDialog({
	open,
	onOpenChange,
	orgId,
	membershipId,
	memberName,
	memberRole,
}: MemberPermissionsDialogProps) {
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
					taskCode: permission as (typeof ALL_TASK_CODES)[number],
					effect: effect as import("@convex/lib/constants").PermissionEffect,
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
				await removePermission({ orgId, membershipId, taskCode: taskCode as (typeof ALL_TASK_CODES)[number] });
				toast.success(t("permissions.toast.removed"));
			} catch {
				toast.error(
					t("permissions.toast.removeError"),
				);
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
			toast.success(t("permissions.toast.reset", "Permissions réinitialisées"));
		} catch {
			toast.error(
				t("permissions.toast.resetError"),
			);
		}
	}, [resetAllPermissions, orgId, membershipId, t]);

	// Compute which permissions are already set
	const existingKeys = new Set(permissions?.map((p) => p.taskCode) ?? []);
	const availablePresets = ALL_TASK_CODES.filter(
		(p) => !existingKeys.has(p)
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
								{t("permissions.dialog.active")} (
								{permissions.length})
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
												variant={
													perm.effect === "grant" ? "default" : "destructive"
												}
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
