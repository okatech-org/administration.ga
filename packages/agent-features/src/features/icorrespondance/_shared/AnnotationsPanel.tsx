/**
 * AnnotationsPanel — Commentaires libres sur un dossier de correspondance.
 *
 * Notes humaines (instructions de traitement, remarques internes), distinctes
 * de l'audit trail système (workflowSteps).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

interface AnnotationsPanelProps {
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
}

function formatRelativeDate(ts: number): string {
	const d = new Date(ts);
	return d.toLocaleString("fr-FR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AnnotationsPanel({ itemId, currentUserId }: AnnotationsPanelProps) {
	const [draft, setDraft] = useState("");

	const { data: annotations, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondanceAnnotations.listAnnotations,
		{ itemId },
	);

	const { mutateAsync: addAnnotation, isPending: isAdding } = useConvexMutationQuery(
		api.functions.correspondanceAnnotations.addAnnotation,
	);

	const { mutateAsync: deleteAnnotation } = useConvexMutationQuery(
		api.functions.correspondanceAnnotations.deleteAnnotation,
	);

	const handleAdd = async () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		try {
			await addAnnotation({ itemId, content: trimmed });
			setDraft("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'ajout du commentaire");
		}
	};

	const handleDelete = async (annotationId: Id<"correspondanceAnnotations">) => {
		try {
			await deleteAnnotation({ annotationId });
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la suppression");
		}
	};

	return (
		<div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
			<div className="flex items-center gap-2">
				<MessageCircle className="h-4 w-4 text-muted-foreground" />
				<h4 className="text-sm font-semibold">Commentaires</h4>
				{annotations && annotations.length > 0 && (
					<span className="text-[10px] text-muted-foreground">
						({annotations.length})
					</span>
				)}
			</div>

			{isPending ? (
				<div className="flex justify-center py-4">
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				</div>
			) : annotations && annotations.length > 0 ? (
				<div className="space-y-2">
					{annotations.map((a) => (
						<div
							key={a._id}
							className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex flex-col">
									<span className="text-xs font-medium">{a.authorName}</span>
									<span className="text-[10px] text-muted-foreground">
										{formatRelativeDate(a.createdAt)}
										{a.updatedAt && a.updatedAt !== a.createdAt && (
											<span className="ml-1 italic">(modifié)</span>
										)}
									</span>
								</div>
								{a.authorId === currentUserId && (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-muted-foreground hover:text-destructive"
										onClick={() => handleDelete(a._id)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								)}
							</div>
							<p className="text-xs whitespace-pre-wrap">{a.content}</p>
						</div>
					))}
				</div>
			) : (
				<p className="text-xs text-muted-foreground italic">
					Aucun commentaire pour ce dossier.
				</p>
			)}

			<div className="space-y-2 pt-2 border-t border-border/40">
				<Textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Ajouter un commentaire interne…"
					rows={2}
					className="text-xs resize-none"
				/>
				<div className="flex justify-end">
					<Button
						size="sm"
						onClick={handleAdd}
						disabled={isAdding || !draft.trim()}
						className="gap-1.5"
					>
						{isAdding ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Send className="h-3.5 w-3.5" />
						)}
						Publier
					</Button>
				</div>
			</div>
		</div>
	);
}
