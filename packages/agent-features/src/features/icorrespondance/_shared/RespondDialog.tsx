"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Reply, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { useConvexMutationQuery } from "@workspace/api/hooks";

type CorrespondenceType =
	| "note_verbale"
	| "lettre_officielle"
	| "circulaire"
	| "telegramme"
	| "memorandum"
	| "communique";

type Priority = "normal" | "urgent" | "confidentiel";

interface RespondDialogProps {
	open: boolean;
	onClose: () => void;
	originalItem: {
		_id: Id<"correspondanceItems">;
		reference: string;
		title: string;
		type: CorrespondenceType;
		priority?: Priority;
	};
	onResponseCreated?: (responseId: Id<"correspondanceItems">) => void;
}

const TYPE_KEYS: CorrespondenceType[] = [
	"note_verbale",
	"lettre_officielle",
	"circulaire",
	"telegramme",
	"memorandum",
	"communique",
];

export function RespondDialog({
	open,
	onClose,
	originalItem,
	onResponseCreated,
}: RespondDialogProps) {
	const { t } = useTranslation();
	const [title, setTitle] = useState("");
	const [type, setType] = useState<CorrespondenceType>(originalItem.type);
	const [priority, setPriority] = useState<Priority>(
		originalItem.priority ?? "normal",
	);

	useEffect(() => {
		if (open) {
			setTitle(
				t("icorrespondance.respond.prefilledTitle", {
					ref: originalItem.reference,
				}),
			);
			setType(originalItem.type);
			setPriority(originalItem.priority ?? "normal");
		}
	}, [open, originalItem, t]);

	const { mutateAsync: respond, isPending } = useConvexMutationQuery(
		api.functions.correspondanceCore.respondToCorrespondance,
	);

	const submit = async () => {
		if (!title.trim()) {
			toast.error(t("icorrespondance.editDraft.titleField"));
			return;
		}
		try {
			const result = await respond({
				itemId: originalItem._id,
				title: title.trim(),
				type,
				priority,
			});
			toast.success(t("icorrespondance.respond.toastCreated"));
			onClose();
			if (result?.responseId) {
				onResponseCreated?.(result.responseId);
			}
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Reply className="h-4 w-4" />
						{t("icorrespondance.respond.title")} — {originalItem.reference}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<p className="text-xs text-muted-foreground">
						{t("icorrespondance.respond.hint")}
					</p>
					<div className="space-y-1.5">
						<Label htmlFor="resp-title">
							{t("icorrespondance.editDraft.titleField")}
						</Label>
						<Input
							id="resp-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={isPending}
							autoFocus
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="resp-type">
								{t("icorrespondance.respond.type")}
							</Label>
							<Select
								value={type}
								onValueChange={(v) => setType(v as CorrespondenceType)}
								disabled={isPending}
							>
								<SelectTrigger id="resp-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPE_KEYS.map((tk) => (
										<SelectItem key={tk} value={tk}>
											{t(`icorrespondance.types.${tk}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="resp-priority">
								{t("icorrespondance.editDraft.priority")}
							</Label>
							<Select
								value={priority}
								onValueChange={(v) => setPriority(v as Priority)}
								disabled={isPending}
							>
								<SelectTrigger id="resp-priority">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="normal">
										{t("icorrespondance.priority.normal")}
									</SelectItem>
									<SelectItem value="urgent">
										{t("icorrespondance.priority.urgent")}
									</SelectItem>
									<SelectItem value="confidentiel">
										{t("icorrespondance.priority.confidentiel")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isPending}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						{t("icorrespondance.actions.cancel")}
					</Button>
					<Button onClick={submit} disabled={isPending || !title.trim()}>
						{isPending ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Reply className="mr-1.5 h-3.5 w-3.5" />
						)}
						{t("icorrespondance.respond.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
