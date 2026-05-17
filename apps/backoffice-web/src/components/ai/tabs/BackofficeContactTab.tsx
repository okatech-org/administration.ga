/**
 * BackofficeContactTab — Recherche intelligente de contacts (backoffice).
 * Accepte orgId en prop au lieu de useOrg().
 */

import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	Loader2,
	Mail,
	MessageSquare,
	Phone,
	Search,
	Users,
	Video,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CitizenProfileDrawer } from "@workspace/iasted";
import {
	usePanelContext,
	useRegisterPageAction,
} from "@workspace/agent-features/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@convex/_generated/api";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import {
	useContactSearch,
	type ContactGroup,
	type ContactResultItem,
	type ContactSource,
} from "@/hooks/useContactSearch";
import { cn } from "@/lib/utils";
import { BO_SEGMENTS } from "./segments";

const ORG_TYPES = [
	{ value: "", label: "Tous types" },
	{ value: "embassy", label: "Ambassade" },
	{ value: "general_consulate", label: "Consulat" },
	{ value: "permanent_mission", label: "Mission" },
	{ value: "high_commission", label: "Haut-Commissariat" },
];

const GRADES = [
	{ value: "", label: "Tous postes" },
	{ value: "chief", label: "Chef de mission" },
	{ value: "deputy_chief", label: "Adjoint" },
	{ value: "counselor", label: "Conseiller" },
	{ value: "agent", label: "Agent" },
	{ value: "external", label: "Externe" },
];

interface BackofficeContactTabProps {
	orgId: Id<"orgs"> | null;
}

export function BackofficeContactTab({ orgId }: BackofficeContactTabProps) {
	const {
		groups,
		total,
		availableCountries,
		isPending,
		filters,
		setSearch,
		setSource,
		setCountry,
		setOrgType,
		setPositionGrade,
	} = useContactSearch(orgId);

	// État local pour la fiche citoyen + l'appel direct
	const [selectedCitizen, setSelectedCitizen] = useState<{
		id: string;
		name: string;
		firstName?: string;
		lastName?: string;
		avatar?: string;
		phone?: string;
		email?: string;
	} | null>(null);
	const [pendingCallUserId, setPendingCallUserId] = useState<string | null>(null);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	const { mutateAsync: callUser } = useConvexMutationQuery(api.functions.meetings.callUser);

	const handleCall = useCallback(async (targetUserId: string, mediaType: "audio" | "video") => {
		if (!orgId) {
			toast.error("Sélectionnez une organisation pour appeler.");
			return;
		}
		if (globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setPendingCallUserId(targetUserId);
		try {
			const result = await callUser({
				orgId,
				targetUserId: targetUserId as Id<"users">,
				mediaType,
			});
			setGlobalMeetingId(result.meetingId as Id<"meetings">);
			toast.success(mediaType === "audio" ? "Appel audio en cours..." : "Appel vidéo en cours...");
			// Bascule sur l'onglet iAppel pour voir la fenêtre d'appel active
			window.dispatchEvent(new CustomEvent("iasted:open", { detail: { tab: "icall" } }));
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'appel");
		} finally {
			setPendingCallUserId(null);
		}
	}, [orgId, globalActiveMeetingId, callUser, setGlobalMeetingId]);

	const handleMessage = (contact: ContactResultItem) => {
		// Ouvre l'onglet iChat + présélectionne le contact via event bus
		// (BackofficeChatTab écoute `iasted:select-contact` pour pré-remplir).
		window.dispatchEvent(
			new CustomEvent("iasted:select-contact", {
				detail: { userId: contact.userId, contact },
			}),
		);
		window.dispatchEvent(new CustomEvent("iasted:open", { detail: { tab: "ichat" } }));
	};

	const handleContactClick = (contact: ContactResultItem) => {
		// Citoyen → fiche 360°, sinon fallback : ouvrir une conversation
		if (contact.source === "citizen") {
			setSelectedCitizen({
				id: contact.id,
				name: contact.name ?? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim(),
				firstName: contact.firstName,
				lastName: contact.lastName,
				avatar: contact.avatar,
				phone: contact.phone,
				email: contact.email,
			});
		} else {
			handleMessage(contact);
		}
	};

	// En backoffice, l'absence d'org active ne bloque pas : on affiche toujours
	// la vue globale (tous les comptes créés sur la plateforme).
	//
	// Chargement exhaustif : plus de pagination — le serveur livre tout le
	// périmètre d'un coup (plafond de sécurité Convex 10 000).
	const viewportRef = useRef<HTMLDivElement | null>(null);

	// ── Conscience iAsted : publier le contexte du panneau + actions vocales ──
	const segmentLabel = useMemo(
		() => BO_SEGMENTS.find((s) => s.id === filters.source)?.label ?? "Tous",
		[filters.source],
	);
	const panelEntities = useMemo(
		() =>
			groups
				.flatMap((g: ContactGroup) =>
					g.contacts.slice(0, 8).map((c) => ({
						id: c.userId as string,
						type: "contact",
						label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.name || c.userId,
						data: {
							org: g.org.name,
							position: c.position ?? "",
							source: c.source,
						},
					})),
				)
				.slice(0, 40),
		[groups],
	);
	usePanelContext({
		panelId: "iasted.icontact.backoffice",
		tabId: "icontact",
		surface: "backoffice",
		title: "iContact — Annuaire BO",
		summary: `Segment « ${segmentLabel} », recherche « ${filters.searchTerm || "(vide)"} », ${total} contact(s) dans ${groups.length} organisation(s).`,
		visibleEntities: panelEntities,
		availableActions: [
			{
				id: "icontact.set_segment",
				label: "Filtrer par segment",
				description:
					"Bascule sur l'un des segments : 'all', 'team' (Back-Office), 'network' (Corps Diplomatique), 'citizens' (Ressortissants), 'foreigners' (Étrangers).",
				params: { segment: { type: "string" } },
			},
			{
				id: "icontact.search",
				label: "Rechercher",
				description: "Filtre par nom, poste ou organisation.",
				params: { query: { type: "string" } },
			},
			{
				id: "icontact.clear_search",
				label: "Effacer la recherche",
				description: "Vide le champ de recherche.",
			},
			{
				id: "icontact.set_country",
				label: "Filtrer par pays",
				description: "Filtre par code ISO 2 (ex. 'FR', 'ES'). Chaîne vide pour tout afficher.",
				params: { country: { type: "string" } },
			},
			{
				id: "icontact.set_org_type",
				label: "Filtrer par type d'organisation",
				description: "Type : 'embassy', 'general_consulate', 'permanent_mission', 'high_commission' — vide pour tout afficher.",
				params: { orgType: { type: "string" } },
			},
			{
				id: "icontact.call_contact",
				label: "Appeler un contact visible",
				description:
					"Lance un appel audio ou vidéo vers un contact visible (id exact d'une entité). mediaType: 'audio' ou 'video'.",
				params: {
					contactId: { type: "string" },
					mediaType: { type: "string" },
				},
			},
			{
				id: "icontact.open_message",
				label: "Ouvrir une conversation",
				description: "Ouvre iChat avec un contact visible présélectionné.",
				params: { contactId: { type: "string" } },
			},
		],
	});

	useRegisterPageAction("icontact.set_segment", async (params) => {
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
	useRegisterPageAction("icontact.search", async (params) => {
		const q = String(params?.query ?? "").trim();
		setSearch(q);
		return { success: true, message: `Recherche : « ${q || "(vide)"} ».` };
	});
	useRegisterPageAction("icontact.clear_search", async () => {
		setSearch("");
		return { success: true, message: "Recherche effacée." };
	});
	useRegisterPageAction("icontact.set_country", async (params) => {
		const c = String(params?.country ?? "").trim().toUpperCase();
		setCountry(c);
		return { success: true, message: c ? `Pays : ${c}` : "Filtre pays effacé." };
	});
	useRegisterPageAction("icontact.set_org_type", async (params) => {
		const t = String(params?.orgType ?? "").trim();
		setOrgType(t);
		return { success: true, message: t ? `Type : ${t}` : "Filtre type effacé." };
	});
	useRegisterPageAction("icontact.call_contact", async (params) => {
		const contactId = String(params?.contactId ?? "");
		const mediaTypeRaw = String(params?.mediaType ?? "audio");
		const mediaType: "audio" | "video" = mediaTypeRaw === "video" ? "video" : "audio";
		if (!contactId) return { success: false, message: "contactId manquant." };
		await handleCall(contactId, mediaType);
		return {
			success: true,
			message: `Appel ${mediaType === "video" ? "vidéo" : "audio"} lancé.`,
		};
	});
	useRegisterPageAction("icontact.open_message", async (params) => {
		const contactId = String(params?.contactId ?? "");
		if (!contactId) return { success: false, message: "contactId manquant." };
		window.dispatchEvent(
			new CustomEvent("iasted:select-contact", { detail: { userId: contactId } }),
		);
		window.dispatchEvent(
			new CustomEvent("iasted:open", { detail: { tab: "ichat" } }),
		);
		return { success: true, message: "Conversation ouverte dans iChat." };
	});

	return (
		<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
			<div className="p-2 border-b space-y-2 shrink-0">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						value={filters.searchTerm}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher (nom, email, poste, org)..."
						className="h-8 pl-8 text-xs"
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

				<div className="flex items-center gap-1.5 overflow-x-auto">
					<select value={filters.country} onChange={(e) => setCountry(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						<option value=""> Tous pays</option>
						{availableCountries.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.count})</option>))}
					</select>
					<select value={filters.orgType} onChange={(e) => setOrgType(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						{ORG_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
					</select>
					<select value={filters.positionGrade} onChange={(e) => setPositionGrade(e.target.value)} className="text-[10px] px-2 py-1 rounded-md border bg-background text-foreground h-6">
						{GRADES.map((g) => (<option key={g.value} value={g.value}>{g.label}</option>))}
					</select>
				</div>
			</div>

			<ScrollArea viewportRef={viewportRef} className="flex-1 min-h-0 [&>div>div]:!block [&>div>div]:!w-full [&>div>div]:!min-w-0">
				{isPending ? (
					<div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
				) : groups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
						<p className="text-xs text-muted-foreground">{filters.searchTerm ? "Aucun résultat" : "Aucun contact"}</p>
					</div>
				) : (
					<div className="divide-y w-full max-w-full">
						{groups.map((group: ContactGroup) => (
							<div key={group.org.id} className="py-2 w-full max-w-full">
								<div className="flex items-center gap-2 px-3 py-1.5 w-full">
									<Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
									<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{group.org.name}</span>
									{group.org.country && <span className="text-[9px] text-muted-foreground/60">{group.org.country}</span>}
									<Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-auto shrink-0">{group.contacts.length}</Badge>
								</div>
								{group.contacts.map((contact: ContactResultItem) => {
									const isPendingThis = pendingCallUserId === contact.userId;
									const callDisabled = !!pendingCallUserId || !!globalActiveMeetingId;
									return (
										<div
											key={contact.id}
											role="button"
											tabIndex={0}
											onClick={() => handleContactClick(contact)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													handleContactClick(contact);
												}
											}}
											className="group flex items-center gap-2 px-3 py-2 w-full max-w-full hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.995]"
										>
											<Avatar className="h-8 w-8 shrink-0">
												<AvatarImage src={contact.avatar} />
												<AvatarFallback className={cn(
													"text-[10px]",
													contact.source === "team"
														? "bg-primary/10 text-primary"
														: contact.source === "citizen"
															? "bg-amber-500/10 text-amber-600"
															: contact.source === "foreigner"
																? "bg-rose-500/10 text-rose-600"
																: contact.source === "administration"
																	? "bg-slate-600/10 text-slate-700"
																	: "bg-blue-500/10 text-blue-600",
												)}>
													{contact.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0 overflow-hidden">
												<div className="flex items-center gap-1.5 min-w-0">
													<p className="text-xs font-bold truncate min-w-0">{contact.lastName}</p>
													<p className="text-xs text-foreground/80 truncate min-w-0">{contact.firstName}</p>
													<Badge variant="outline" className={cn(
														"text-[7px] h-3.5 px-1 shrink-0",
														contact.source === "team"
															? "text-primary border-primary/20"
															: contact.source === "citizen"
																? "text-amber-600 border-amber-500/20"
																: contact.source === "foreigner"
																	? "text-rose-600 border-rose-500/20"
																	: contact.source === "administration"
																		? "text-slate-700 border-slate-500/30"
																		: "text-blue-600 border-blue-500/20",
													)}>
														{contact.source === "team"
															? "Back-Office"
															: contact.source === "citizen"
																? "Ressortissant"
																: contact.source === "foreigner"
																	? "Étranger"
																	: contact.source === "administration"
																		? "Admin"
																		: "Corps Dipl."}
													</Badge>
												</div>
												{contact.position && <p className="text-[10px] text-muted-foreground truncate">{contact.position}</p>}
												<div className="flex items-center gap-2 text-[9px] text-muted-foreground/70 mt-0.5 min-w-0">
													{contact.email && <span className="flex items-center gap-0.5 truncate min-w-0"><Mail className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{contact.email}</span></span>}
													{contact.phone && <span className="flex items-center gap-0.5 shrink-0"><Phone className="h-2.5 w-2.5 shrink-0" />{contact.phone}</span>}
												</div>
											</div>
											{/* Actions rapides — toujours visibles (message / appel audio / appel vidéo).
											    Anciennement opacity-0 group-hover, mais sur la fenêtre flottante
											    iAsted (420 px desktop, bottom-sheet mobile) le hover est peu
											    pratique et n'existe pas en tactile. */}
											<div className="flex items-center gap-0.5 shrink-0">
												<Button
													type="button"
													size="icon"
													variant="ghost"
													className="h-8 w-8"
													title="Message"
													disabled={!contact.userId}
													onClick={(e) => {
														e.stopPropagation();
														handleMessage(contact);
													}}
												>
													<MessageSquare className="h-3.5 w-3.5" />
												</Button>
												<Button
													type="button"
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
													title="Appel audio"
													disabled={callDisabled || !contact.userId}
													onClick={(e) => {
														e.stopPropagation();
														handleCall(contact.userId, "audio");
													}}
												>
													{isPendingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
												</Button>
												<Button
													type="button"
													size="icon"
													variant="ghost"
													className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
													title="Appel vidéo"
													disabled={callDisabled || !contact.userId}
													onClick={(e) => {
														e.stopPropagation();
														handleCall(contact.userId, "video");
													}}
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
				)}

				{/* Spinner discret pendant le chargement initial */}
				{isPending && groups.length === 0 && (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				)}
			</ScrollArea>

			<div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
				<span>{total} contact{total > 1 ? "s" : ""}</span>
				<span>{groups.length} organisation{groups.length > 1 ? "s" : ""}</span>
			</div>

			{/* Fiche citoyen 360° — ouverte au clic sur un contact citoyen */}
			{selectedCitizen && (
				<CitizenProfileDrawer
					open={!!selectedCitizen}
					onOpenChange={(v) => {
						if (!v) setSelectedCitizen(null);
					}}
					citizenId={selectedCitizen.id}
					name={selectedCitizen.name}
					avatarUrl={selectedCitizen.avatar}
					phone={selectedCitizen.phone}
					email={selectedCitizen.email}
				/>
			)}
		</div>
	);
}
