"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { useConvexMutationQuery } from "@workspace/api/hooks";

type ReturnCategory = "incomplete" | "rejected" | "wrong_recipient" | "other";

const CATEGORIES: ReturnCategory[] = [
	"incomplete",
	"rejected",
	"wrong_recipient",
	"other",
];

interface ReturnToSenderDialogProps {
	open: boolean;
	onClose: () => void;
	item: {
		_id: Id<"correspondanceItems">;
		reference: string;
		title: string;
		senderName: string;
		senderOrg?: string;
	};
	onReturned?: () => void;
}

export function ReturnToSenderDialog({
	open,
	onClose,
	item,
	onReturned,
}: ReturnToSenderDialogProps) {
	const { t } = useTranslation();
	const [category, setCategory] = useState<ReturnCategory>("incomplete");
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) {
			setCategory("incomplete");
			setReason("");
		}
	}, [open]);

	const { mutateAsync: returnToSender, isPending } = useConvexMutationQuery(
		api.functions.correspondanceCore.returnToSender,
	);

	const trimmed = reason.trim();
	const canSubmit = trimmed.length >= 10 && !isPending;

	const submit = async () => {
		if (!canSubmit) return;
		try {
			await returnToSender({
				itemId: item._id,
				reason: trimmed,
				category,
			});
			toast.success(t("icorrespondance.returnToSender.toastReturned"));
			onReturned?.();
			onClose();
		} catch (e: any) {
			toast.error(
				e?.message ?? t("icorrespondance.returnToSender.toastError"),
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Undo2 className="h-4 w-4" />
						{t("icorrespondance.returnToSender.title")} — {item.reference}
					</DialogTitle>
					<DialogDescription>
						{t("icorrespondance.returnToSender.hint")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Expéditeur cible (read-only) */}
					<div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 space-y-0.5">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{t("icorrespondance.returnToSender.recipientLabel")}
						</p>
						<p className="text-sm font-medium">{item.senderName}</p>
						{item.senderOrg ? (
							<p className="text-xs text-muted-foreground">{item.senderOrg}</p>
						) : null}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="return-category" className="text-xs">
							{t("icorrespondance.returnToSender.categoryLabel")}
						</Label>
						<Select
							value={category}
							onValueChange={(v) => setCategory(v as ReturnCategory)}
							disabled={isPending}
						>
							<SelectTrigger id="return-category" className="h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((c) => (
									<SelectItem key={c} value={c}>
										{t(`icorrespondance.returnToSender.categoryOptions.${c}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="return-reason" className="text-xs">
							{t("icorrespondance.returnToSender.reasonLabel")}
						</Label>
						<Textarea
							id="return-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder={t("icorrespondance.returnToSender.reasonPlaceholder")}
							rows={4}
							maxLength={1000}
							disabled={isPending}
							className="resize-none text-xs"
						/>
						<p className="text-[10px] text-muted-foreground">
							{trimmed.length} / 1000 ·{" "}
							{trimmed.length < 10
								? t("icorrespondance.returnToSender.reasonMinHint")
								: ""}
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isPending}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						{t("icorrespondance.actions.cancel")}
					</Button>
					<Button onClick={submit} disabled={!canSubmit} variant="destructive">
						{isPending ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Undo2 className="mr-1.5 h-3.5 w-3.5" />
						)}
						{t("icorrespondance.returnToSender.submit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
