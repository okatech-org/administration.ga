"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Loader2,
	MessageSquare,
	Send,
	Shield,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../my-space/flat-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { useOrg } from "../../shell/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

interface ProfileNotesPanelProps {
	profileId: string;
}

export function ProfileNotesPanel({ profileId }: ProfileNotesPanelProps) {
	const { activeOrgId } = useOrg();
	const [content, setContent] = useState("");

	const { data: me } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);

	const { data: notes, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profileNotes.listByProfile,
		activeOrgId
			? {
					profileId: profileId as Id<"profiles"> | Id<"childProfiles">,
					orgId: activeOrgId,
				}
			: "skip",
	);

	const { mutateAsync: addNote, isPending: isSending } = useConvexMutationQuery(
		api.functions.profileNotes.create,
	);
	const { mutateAsync: deleteNote } = useConvexMutationQuery(
		api.functions.profileNotes.remove,
	);

	const handleSend = async () => {
		const trimmed = content.trim();
		if (!trimmed || !activeOrgId) return;
		try {
			await addNote({
				profileId: profileId as Id<"profiles"> | Id<"childProfiles">,
				orgId: activeOrgId,
				content: trimmed,
			});
			setContent("");
			toast.success("Note enregistree");
		} catch (e) {
			toast.error("Impossible d'enregistrer la note");
		}
	};

	const handleDelete = async (noteId: Id<"profileNotes">) => {
		if (!activeOrgId) return;
		try {
			await deleteNote({ noteId, orgId: activeOrgId });
			toast.success("Note supprimee");
		} catch (e) {
			toast.error("Impossible de supprimer la note");
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start gap-3 p-3 rounded-lg bg-warning-light border border-warning/20">
				<Shield className="h-4 w-4 text-warning shrink-0 mt-0.5" />
				<div className="text-xs text-warning">
					<span className="font-semibold">Notes internes agents</span> &mdash; strictement reservees au
					corps administratif, jamais visibles cote citoyen.
				</div>
			</div>

			<FlatCard>
				<div className="p-4 flex flex-col gap-3">
					<p className="text-sm font-medium">Ajouter une note interne</p>
					<Textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Documents verifies, observations particulieres, alertes..."
						rows={3}
						className="resize-none text-sm"
						disabled={!activeOrgId || isSending}
					/>
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={handleSend}
							disabled={isSending || !content.trim() || !activeOrgId}
							className="gap-2"
						>
							{isSending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Send className="h-3.5 w-3.5" />
							)}
							Enregistrer
						</Button>
					</div>
				</div>
			</FlatCard>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-20 w-full rounded-lg" />
					<Skeleton className="h-20 w-full rounded-lg" />
				</div>
			) : !notes || notes.length === 0 ? (
				<FlatCard className="border-dashed">
					<div className="p-4 flex flex-col items-center justify-center py-10 text-center">
						<MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm font-medium text-muted-foreground">
							Aucune note pour ce profil
						</p>
						<p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
							Ajoutez des observations, remarques ou alertes internes sur ce dossier.
						</p>
					</div>
				</FlatCard>
			) : (
				<div className="flex flex-col gap-2">
					{notes.map((note) => {
						const authorName =
							[note.author?.firstName, note.author?.lastName]
								.filter(Boolean)
								.join(" ") || "Agent";
						const isMine = !!me && note.author?._id === me._id;
						return (
							<FlatCard key={note._id}>
								<div className="p-3 flex flex-col gap-2">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 min-w-0">
											<span className="text-sm font-semibold truncate">
												{authorName}
											</span>
											<span className="text-xs text-muted-foreground shrink-0">
												{formatDistanceToNow(new Date(note.createdAt), {
													addSuffix: true,
													locale: fr,
												})}
											</span>
										</div>
										{isMine && (
											<Button
												size="icon"
												variant="ghost"
												className="h-6 w-6 text-muted-foreground hover:text-destructive"
												onClick={() => handleDelete(note._id)}
												title="Supprimer"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										)}
									</div>
									<p className="text-sm whitespace-pre-wrap text-foreground/90">
										{note.content}
									</p>
								</div>
							</FlatCard>
						);
					})}
				</div>
			)}
		</div>
	);
}
