/**
 * BackofficeCallTab — Onglet iAppel (backoffice).
 * Accepte orgId en prop au lieu de useOrg().
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	Loader2,
	Phone,
	PhoneCall,
	PhoneMissed,
	Search,
	Users,
	Video,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActiveCallDialog } from "@/components/meetings/active-call-dialog";
import { useContactSearch, type ContactSource } from "@/hooks/useContactSearch";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import { cn } from "@/lib/utils";
import {
	usePanelContext,
	useRegisterPageAction,
} from "@workspace/agent-features/hooks";
import { BO_SEGMENTS } from "./segments";

type SubTab = "audio" | "video";

interface BackofficeCallTabProps {
	orgId: Id<"orgs"> | null;
}

export function BackofficeCallTab({ orgId }: BackofficeCallTabProps) {
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(null);
	const [activeMediaType, setActiveMediaType] = useState<SubTab>("audio");
	const [pendingCallUserId, setPendingCallUserId] = useState<string | null>(null);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();

	const { groups, total, isPending: contactsLoading, filters, setSearch, setSource } = useContactSearch(orgId);
	const { mutateAsync: callUser } = useConvexMutationQuery(api.functions.meetings.callUser);
	const { mutateAsync: setCallRinging } = useConvexMutationQuery(api.functions.meetings.setCallRinging);

	const { data: rawMeetings, isPending } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByOrg,
		orgId ? { orgId } : "skip",
	);

	const meetingsArray = Array.isArray(rawMeetings) ? (rawMeetings as any)?.meetings ?? rawMeetings : [];
	const callHistory = useMemo(() => (meetingsArray as any[]).filter((m: any) => m.type === "call").slice(0, 15), [meetingsArray]);

	const handleCall = useCallback(async (targetUserId: string, mediaType: SubTab) => {
		if (!orgId || globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setPendingCallUserId(targetUserId);
		try {
			// mediaType "video" côté token permet audio+vidéo — le paramètre
			// `video` de LiveKitRoom contrôle la publication caméra initiale.
			const result = await callUser({
				orgId,
				targetUserId: targetUserId as Id<"users">,
				mediaType: "video",
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setActiveMediaType(mediaType);
			setGlobalMeetingId(meetingId);
			await setCallRinging({ meetingId });
			toast.success(mediaType === "audio" ? "Appel audio en cours..." : "Appel vidéo en cours...");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
			setActiveMeetingId(null);
			setGlobalMeetingId(null);
		} finally {
			setPendingCallUserId(null);
		}
	}, [orgId, globalActiveMeetingId, callUser, setCallRinging, setGlobalMeetingId]);

	// ── Conscience iAsted : publier le contexte du panneau + actions vocales ──
	const segmentLabel = useMemo(
		() => BO_SEGMENTS.find((s) => s.id === filters.source)?.label ?? "Tous",
		[filters.source],
	);
	const panelEntities = useMemo(
		() =>
			groups
				.flatMap((g: any) =>
					(g.contacts as any[]).slice(0, 8).map((c: any) => ({
						id: c.userId as string,
						type: "contact",
						label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || (c.name as string) || c.userId,
						data: {
							org: g.org.name as string,
							position: (c.position as string) ?? "",
							source: c.source as string,
						},
					})),
				)
				.slice(0, 40),
		[groups],
	);
	usePanelContext({
		panelId: "iasted.icall.backoffice",
		tabId: "icall",
		surface: "backoffice",
		title: "iAppel — Téléphonie BO",
		summary: `Segment « ${segmentLabel} », recherche « ${filters.searchTerm || "(vide)"} », ${total} contact(s) dans ${groups.length} organisation(s).`,
		visibleEntities: panelEntities,
		availableActions: [
			{
				id: "iappel.set_segment",
				label: "Filtrer par segment",
				description:
					"Bascule sur l'un des segments : 'all' (Tous), 'team' (Back-Office), 'network' (Corps Diplomatique), 'citizens' (Ressortissants), 'foreigners' (Étrangers).",
				params: { segment: { type: "string" } },
			},
			{
				id: "iappel.search",
				label: "Rechercher",
				description: "Filtre la liste par nom, poste ou organisation.",
				params: { query: { type: "string" } },
			},
			{
				id: "iappel.clear_search",
				label: "Effacer la recherche",
				description: "Vide le champ de recherche.",
			},
			{
				id: "iappel.call_contact",
				label: "Appeler un contact",
				description:
					"Lance un appel audio ou vidéo vers un contact visible (utiliser l'id exact d'une entité visible). mediaType: 'audio' ou 'video' (défaut 'audio').",
				params: {
					contactId: { type: "string" },
					mediaType: { type: "string" },
				},
			},
		],
	});

	useRegisterPageAction("iappel.set_segment", async (params) => {
		const raw = String(params?.segment ?? "");
		const allowed: Array<ContactSource | "all"> = [
			"all",
			"team",
			"network",
			"citizens",
			"foreigners",
			"administration",
		];
		const next = (allowed as string[]).includes(raw)
			? (raw as ContactSource | "all")
			: "all";
		setSource(next);
		return { success: true, message: `Segment basculé sur « ${next} ».` };
	});
	useRegisterPageAction("iappel.search", async (params) => {
		const q = String(params?.query ?? "").trim();
		setSearch(q);
		return { success: true, message: `Recherche : « ${q || "(vide)"} ».` };
	});
	useRegisterPageAction("iappel.clear_search", async () => {
		setSearch("");
		return { success: true, message: "Recherche effacée." };
	});
	useRegisterPageAction("iappel.call_contact", async (params) => {
		const contactId = String(params?.contactId ?? "");
		const mediaTypeRaw = String(params?.mediaType ?? "audio");
		const mediaType: SubTab = mediaTypeRaw === "video" ? "video" : "audio";
		if (!contactId) {
			return { success: false, message: "contactId manquant." };
		}
		await handleCall(contactId, mediaType);
		return {
			success: true,
			message: `Appel ${mediaType === "video" ? "vidéo" : "audio"} lancé.`,
		};
	});

	const handleDialogClose = () => {
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	};

	if (!orgId) {
		return (
			<div className="flex-1 flex items-center justify-center p-6 text-center">
				<p className="text-xs text-muted-foreground">Sélectionnez une organisation pour passer un appel.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-3 border-b space-y-2 shrink-0">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={filters.searchTerm}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher (nom, poste, org)..."
						className="h-9 pl-8 text-sm"
					/>
				</div>
				<div className="flex items-center gap-1 overflow-x-auto">
					{BO_SEGMENTS.map((seg) => (
						<button
							key={seg.id}
							type="button"
							onClick={() => setSource(seg.id)}
							title={seg.hint}
							className={cn(
								"text-xs px-2.5 py-1 rounded-md font-medium transition-colors shrink-0",
								filters.source === seg.id
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{seg.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1 min-h-0">
				{contactsLoading ? (
					<div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
				) : groups.length > 0 ? (
					<div className="divide-y">
						{groups.map((group: any) => (
							<div key={group.org.id} className="py-1">
								<div className="flex items-center gap-2 px-3 py-1.5">
									<Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
									<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
										{group.org.name}
									</span>
									{group.org.country && (
										<span className="text-[9px] text-muted-foreground/60">
											{group.org.country}
										</span>
									)}
								</div>
								{group.contacts.map((c: any) => {
									const isPendingThis = pendingCallUserId === c.userId;
									const disabled = !!pendingCallUserId || !!globalActiveMeetingId;
									return (
										<div key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30">
											<Avatar className="h-8 w-8 shrink-0">
												<AvatarImage src={c.avatar} />
												<AvatarFallback
													className={cn(
														"text-[10px]",
														c.source === "team"
															? "bg-primary/10 text-primary"
															: c.source === "citizen"
																? "bg-amber-500/10 text-amber-600"
																: c.source === "foreigner"
																	? "bg-rose-500/10 text-rose-600"
																	: "bg-blue-500/10 text-blue-600",
													)}
												>
													{c.name
														?.split(" ")
														.map((w: string) => w[0])
														.join("")
														.toUpperCase()
														.slice(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1.5">
													<p className="text-xs font-bold truncate">{c.lastName}</p>
													<p className="text-xs text-foreground/80 truncate">{c.firstName}</p>
												</div>
												<p className="text-[10px] text-muted-foreground truncate">
													{c.position}
												</p>
											</div>
											<div className="flex items-center gap-0.5 shrink-0">
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
													disabled={disabled}
													title="Appel audio"
													onClick={() => handleCall(c.userId, "audio")}
												>
													{isPendingThis ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : (
														<Phone className="h-3.5 w-3.5" />
													)}
												</Button>
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
													disabled={disabled}
													title="Appel vidéo"
													onClick={() => handleCall(c.userId, "video")}
												>
													<Video className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center py-6 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">
							{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}
						</p>
					</div>
				)}

				<div className="border-t">
					{isPending ? (
						<div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
					) : callHistory.length === 0 ? (
						<div className="flex flex-col items-center py-6 text-center">
							<Phone className="h-8 w-8 text-muted-foreground/30 mb-2" />
							<p className="text-xs text-muted-foreground">Aucun appel récent</p>
						</div>
					) : (
						<div className="p-2">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
								Récents
							</p>
							{callHistory.map((item: any) => {
								const isEnded = item.status === "ended";
								const date = new Date(item.startedAt ?? item._creationTime);
								const duration =
									item.startedAt && item.endedAt
										? Math.floor((item.endedAt - item.startedAt) / 60000)
										: 0;
								return (
									<div key={item._id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/30">
										<div
											className={cn(
												"h-6 w-6 rounded-full flex items-center justify-center shrink-0",
												isEnded ? "bg-emerald-500/10" : "bg-red-500/10",
											)}
										>
											{isEnded ? (
												<PhoneCall className="h-3 w-3 text-emerald-500" />
											) : (
												<PhoneMissed className="h-3 w-3 text-red-500" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium truncate">
												{item.title ?? "Appel"}
											</p>
											<p className="text-[10px] text-muted-foreground">
												{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
												{duration > 0 && ` · ${duration}min`}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</ScrollArea>

			<ActiveCallDialog
				meetingId={activeMeetingId}
				mediaType={activeMediaType}
				onClose={handleDialogClose}
			/>
		</div>
	);
}
