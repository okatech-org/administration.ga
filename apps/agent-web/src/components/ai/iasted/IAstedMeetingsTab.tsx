/**
 * IAstedMeetingsTab — Onglet réunions vidéo.
 * Liste les réunions en cours/planifiées, permet de créer/rejoindre.
 */

import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Plus, Users, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrg } from "@/components/org/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export function IAstedMeetingsTab() {
	const { activeOrgId } = useOrg();
	const [newMeetingName, setNewMeetingName] = useState("");

	const { data: rawMeetings = [], isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: createMeeting, isPending: isCreating } = useConvexMutationQuery(
		api.functions.meetings.create,
	);

	const meetings = (rawMeetings as any[])
		.filter((m) => m.type === "meeting")
		.sort((a, b) => (b.startedAt ?? b._creationTime) - (a.startedAt ?? a._creationTime));

	const activeMeetings = meetings.filter((m) => m.status === "active");
	const recentMeetings = meetings.filter((m) => m.status === "ended").slice(0, 10);

	const handleCreate = async () => {
		if (!activeOrgId) return;
		try {
			await createMeeting({
				orgId: activeOrgId,
				title: newMeetingName.trim() || "Réunion instantanée",
				type: "meeting",
			});
			toast.success("Réunion créée ✓");
			setNewMeetingName("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la création");
		}
	};

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			{/* Créer une réunion */}
			<div className="p-3 border-b space-y-2">
				<div className="flex items-center gap-2">
					<Input
						value={newMeetingName}
						onChange={(e) => setNewMeetingName(e.target.value)}
						placeholder="Nom de la réunion..."
						className="h-8 text-xs flex-1"
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					/>
					<Button size="sm" onClick={handleCreate} disabled={isCreating} className="gap-1.5 h-8">
						{isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
						Créer
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="p-2 space-y-3">
						{/* Réunions en cours */}
						{activeMeetings.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
									En cours
								</p>
								<div className="space-y-1">
									{activeMeetings.map((meeting: any) => (
										<div
											key={meeting._id}
											className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5"
										>
											<div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
												<Video className="h-4 w-4 text-emerald-500" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium truncate">{meeting.title ?? "Réunion"}</p>
												<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
													<span className="flex items-center gap-0.5">
														<Users className="h-2.5 w-2.5" />
														{meeting.participants?.length ?? 0}
													</span>
													<Badge className="text-[8px] h-4 bg-emerald-500/15 text-emerald-500">
														● En direct
													</Badge>
												</div>
											</div>
											<Button size="sm" asChild className="h-7 text-[10px] gap-1">
												<Link to="/meetings">
													<ExternalLink className="h-3 w-3" />
													Rejoindre
												</Link>
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Réunions récentes */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
								Récentes
							</p>
							{recentMeetings.length === 0 ? (
								<div className="flex flex-col items-center py-6 text-center">
									<Video className="h-6 w-6 text-muted-foreground/30 mb-2" />
									<p className="text-xs text-muted-foreground">Aucune réunion récente</p>
								</div>
							) : (
								<div className="space-y-0.5">
									{recentMeetings.map((meeting: any) => {
										const date = new Date(meeting.startedAt ?? meeting._creationTime);
										const duration = meeting.startedAt && meeting.endedAt
											? Math.floor((meeting.endedAt - meeting.startedAt) / 60000)
											: 0;

										return (
											<div key={meeting._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30">
												<div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
													<Video className="h-3 w-3 text-muted-foreground" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[11px] font-medium truncate">{meeting.title ?? "Réunion"}</p>
													<p className="text-[9px] text-muted-foreground">
														{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
														{duration > 0 && ` • ${duration}min`}
														{meeting.participants && ` • ${meeting.participants.length} part.`}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
