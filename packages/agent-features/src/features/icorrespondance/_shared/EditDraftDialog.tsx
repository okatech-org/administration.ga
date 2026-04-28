"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { useConvexMutationQuery } from "@workspace/api/hooks";

type Priority = "normal" | "urgent" | "confidentiel";

interface EditDraftDialogProps {
	open: boolean;
	onClose: () => void;
	item: {
		_id: Id<"correspondanceItems">;
		title: string;
		comment?: string;
		priority?: Priority;
		tags?: string[];
	};
}

export function EditDraftDialog({ open, onClose, item }: EditDraftDialogProps) {
	const [title, setTitle] = useState(item.title);
	const [comment, setComment] = useState(item.comment ?? "");
	const [priority, setPriority] = useState<Priority>(item.priority ?? "normal");
	const [tagsInput, setTagsInput] = useState((item.tags ?? []).join(", "));

	useEffect(() => {
		if (open) {
			setTitle(item.title);
			setComment(item.comment ?? "");
			setPriority(item.priority ?? "normal");
			setTagsInput((item.tags ?? []).join(", "));
		}
	}, [open, item]);

	const { mutateAsync: updateItem, isPending } = useConvexMutationQuery(
		api.functions.correspondance.updateItem,
	);

	const submit = async () => {
		if (!title.trim()) {
			toast.error("Le titre est requis");
			return;
		}
		try {
			const tags = tagsInput
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await updateItem({
				itemId: item._id,
				title: title.trim(),
				comment: comment.trim() || undefined,
				priority,
				tags,
			});
			toast.success("Brouillon mis à jour");
			onClose();
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la mise à jour");
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Pencil className="h-4 w-4" />
						Modifier le brouillon
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="edit-title">Titre *</Label>
						<Input
							id="edit-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={isPending}
							autoFocus
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-priority">Priorité</Label>
						<Select
							value={priority}
							onValueChange={(v) => setPriority(v as Priority)}
							disabled={isPending}
						>
							<SelectTrigger id="edit-priority">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="normal">Normale</SelectItem>
								<SelectItem value="urgent">Urgente</SelectItem>
								<SelectItem value="confidentiel">Confidentielle</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-tags">Tags (séparés par des virgules)</Label>
						<Input
							id="edit-tags"
							value={tagsInput}
							onChange={(e) => setTagsInput(e.target.value)}
							placeholder="protocole, urgent, 2026"
							disabled={isPending}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-comment">Commentaire interne</Label>
						<Textarea
							id="edit-comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							rows={4}
							disabled={isPending}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isPending}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						Annuler
					</Button>
					<Button onClick={submit} disabled={isPending || !title.trim()}>
						{isPending ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Pencil className="mr-1.5 h-3.5 w-3.5" />
						)}
						Enregistrer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
