"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Search, UserCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

interface AssignDialogProps {
	open: boolean;
	onClose: () => void;
	itemId: Id<"correspondanceItems">;
	orgId: Id<"orgs">;
	currentAssignedToId?: string;
}

export function AssignDialog({
	open,
	onClose,
	itemId,
	orgId,
	currentAssignedToId,
}: AssignDialogProps) {
	const { t } = useTranslation();
	const [search, setSearch] = useState("");
	const [selectedUserId, setSelectedUserId] = useState<string | null>(
		currentAssignedToId ?? null,
	);

	const { data: members, isPending: membersLoading } =
		useAuthenticatedConvexQuery(
			api.functions.contactSearch.listOrgMembers,
			open ? { orgId, searchTerm: search.trim() || undefined, limit: 100 } : "skip",
		);

	const { mutateAsync: assign, isPending: isAssigning } = useConvexMutationQuery(
		api.functions.correspondanceCore.assignCorrespondance,
	);

	const contacts = useMemo(() => {
		const list = ((members as any)?.contacts ?? []) as Array<{
			id: string;
			displayName: string;
			subline?: string;
			email?: string;
		}>;
		return list
			.map((c) => {
				const userId = c.id.startsWith("team-")
					? c.id.slice("team-".length)
					: c.id.startsWith("net-")
						? c.id.slice("net-".length)
						: c.id;
				return { ...c, userId };
			});
	}, [members]);

	const submit = async () => {
		if (!selectedUserId) return;
		try {
			await assign({
				itemId,
				agentId: selectedUserId as Id<"users">,
			});
			toast.success(t("icorrespondance.assign.toastAssigned"));
			onClose();
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserCheck className="h-4 w-4" />
						{t("icorrespondance.assign.title")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<p className="text-xs text-muted-foreground">
						{t("icorrespondance.assign.hint")}
					</p>
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t("icorrespondance.assign.searchPlaceholder")}
							disabled={isAssigning}
							className="pl-8"
						/>
					</div>
					<div className="max-h-72 overflow-auto rounded-md border border-border/50">
						{membersLoading ? (
							<div className="flex items-center justify-center p-6">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : contacts.length === 0 ? (
							<p className="p-4 text-center text-xs text-muted-foreground">
								{t("icorrespondance.assign.empty")}
							</p>
						) : (
							<ul className="divide-y divide-border/40">
								{contacts.map((c) => {
									const selected = c.userId === selectedUserId;
									return (
										<li key={c.id}>
											<button
												type="button"
												onClick={() => setSelectedUserId(c.userId)}
												disabled={isAssigning}
												className={cn(
													"flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40",
													selected && "bg-primary/10",
												)}
											>
												<div
													className={cn(
														"mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
														selected
															? "border-primary"
															: "border-muted-foreground/30",
													)}
												>
													{selected && (
														<div className="h-1.5 w-1.5 rounded-full bg-primary" />
													)}
												</div>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">
														{c.displayName}
													</p>
													{(c.subline || c.email) && (
														<p className="truncate text-[11px] text-muted-foreground">
															{c.subline ?? c.email}
														</p>
													)}
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isAssigning}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						{t("icorrespondance.actions.cancel")}
					</Button>
					<Button
						onClick={submit}
						disabled={!selectedUserId || isAssigning}
					>
						{isAssigning ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<UserCheck className="mr-1.5 h-3.5 w-3.5" />
						)}
						{t("icorrespondance.actions.assign")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
