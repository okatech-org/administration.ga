/**
 * AnnotationsPanel — Commentaires libres sur un dossier de correspondance.
 *
 * Notes humaines (instructions de traitement, remarques internes), distinctes
 * de l'audit trail système (workflowSteps).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, Loader2, MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	const [draft, setDraft] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingContent, setEditingContent] = useState("");

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

	const { mutateAsync: updateAnnotation, isPending: isUpdating } = useConvexMutationQuery(
		api.functions.correspondanceAnnotations.updateAnnotation,
	);

	const handleAdd = async () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		try {
			await addAnnotation({ itemId, content: trimmed });
			setDraft("");
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	const handleDelete = async (annotationId: Id<"correspondanceAnnotations">) => {
		try {
			await deleteAnnotation({ annotationId });
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	const startEdit = (a: { _id: string; content: string }) => {
		setEditingId(a._id);
		setEditingContent(a.content);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditingContent("");
	};

	const submitEdit = async () => {
		if (!editingId || !editingContent.trim()) return;
		try {
			await updateAnnotation({
				annotationId: editingId as Id<"correspondanceAnnotations">,
				content: editingContent.trim(),
			});
			cancelEdit();
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.toasts.genericError"));
		}
	};

	return (
		<div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
			<div className="flex items-center gap-2">
				<MessageCircle className="h-4 w-4 text-muted-foreground" />
				<h4 className="text-sm font-semibold">{t("icorrespondance.comments.title")}</h4>
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
											<span className="ml-1 italic">{t("icorrespondance.comments.edited")}</span>
										)}
									</span>
								</div>
								{a.authorId === currentUserId && editingId !== a._id && (
									<div className="flex items-center gap-0.5">
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-muted-foreground hover:text-foreground"
											onClick={() => startEdit({ _id: a._id, content: a.content })}
											aria-label="Modifier"
										>
											<Pencil className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-muted-foreground hover:text-destructive"
											onClick={() => handleDelete(a._id)}
											aria-label="Supprimer"
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								)}
							</div>
							{editingId === a._id ? (
								<div className="space-y-1.5">
									<Textarea
										value={editingContent}
										onChange={(e) => setEditingContent(e.target.value)}
										rows={2}
										className="text-xs resize-none"
										disabled={isUpdating}
										autoFocus
									/>
									<div className="flex justify-end gap-1">
										<Button
											variant="outline"
											size="sm"
											onClick={cancelEdit}
											disabled={isUpdating}
											className="h-7 gap-1 px-2 text-[11px]"
										>
											<X className="h-3 w-3" />
											{t("icorrespondance.actions.cancel")}
										</Button>
										<Button
											size="sm"
											onClick={submitEdit}
											disabled={isUpdating || !editingContent.trim()}
											className="h-7 gap-1 px-2 text-[11px]"
										>
											{isUpdating ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<Check className="h-3 w-3" />
											)}
											{t("icorrespondance.comments.save")}
										</Button>
									</div>
								</div>
							) : (
								<p className="text-xs whitespace-pre-wrap">{a.content}</p>
							)}
						</div>
					))}
				</div>
			) : (
				<p className="text-xs text-muted-foreground italic">
					{t("icorrespondance.comments.empty")}
				</p>
			)}

			<div className="space-y-2 pt-2 border-t border-border/40">
				<Textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder={t("icorrespondance.comments.placeholder")}
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
						{t("icorrespondance.actions.publish")}
					</Button>
				</div>
			</div>
		</div>
	);
}
