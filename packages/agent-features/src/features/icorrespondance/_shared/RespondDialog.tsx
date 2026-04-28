"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Reply, X } from "lucide-react";
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

const TYPE_LABELS: Record<CorrespondenceType, string> = {
	note_verbale: "Note verbale",
	lettre_officielle: "Lettre officielle",
	circulaire: "Circulaire",
	telegramme: "Télégramme",
	memorandum: "Mémorandum",
	communique: "Communiqué",
};

export function RespondDialog({
	open,
	onClose,
	originalItem,
	onResponseCreated,
}: RespondDialogProps) {
	const [title, setTitle] = useState("");
	const [type, setType] = useState<CorrespondenceType>(originalItem.type);
	const [priority, setPriority] = useState<Priority>(
		originalItem.priority ?? "normal",
	);

	useEffect(() => {
		if (open) {
			setTitle(`Réponse à ${originalItem.reference}`);
			setType(originalItem.type);
			setPriority(originalItem.priority ?? "normal");
		}
	}, [open, originalItem]);

	const { mutateAsync: respond, isPending } = useConvexMutationQuery(
		api.functions.correspondanceCore.respondToCorrespondance,
	);

	const submit = async () => {
		if (!title.trim()) {
			toast.error("Le titre est requis");
			return;
		}
		try {
			const result = await respond({
				itemId: originalItem._id,
				title: title.trim(),
				type,
				priority,
			});
			toast.success("Brouillon de réponse créé");
			onClose();
			if (result?.responseId) {
				onResponseCreated?.(result.responseId);
			}
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la création de la réponse");
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Reply className="h-4 w-4" />
						Répondre — {originalItem.reference}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<p className="text-xs text-muted-foreground">
						Une nouvelle correspondance sera créée en brouillon avec
						l'expéditeur et le destinataire inversés. Vous pourrez ensuite y
						joindre des documents et la soumettre.
					</p>
					<div className="space-y-1.5">
						<Label htmlFor="resp-title">Titre *</Label>
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
							<Label htmlFor="resp-type">Type</Label>
							<Select
								value={type}
								onValueChange={(v) => setType(v as CorrespondenceType)}
								disabled={isPending}
							>
								<SelectTrigger id="resp-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(TYPE_LABELS) as CorrespondenceType[]).map(
										(t) => (
											<SelectItem key={t} value={t}>
												{TYPE_LABELS[t]}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="resp-priority">Priorité</Label>
							<Select
								value={priority}
								onValueChange={(v) => setPriority(v as Priority)}
								disabled={isPending}
							>
								<SelectTrigger id="resp-priority">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="normal">Normale</SelectItem>
									<SelectItem value="urgent">Urgente</SelectItem>
									<SelectItem value="confidentiel">Confidentielle</SelectItem>
								</SelectContent>
							</Select>
						</div>
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
							<Reply className="mr-1.5 h-3.5 w-3.5" />
						)}
						Créer la réponse
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
