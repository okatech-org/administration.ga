"use client";

/**
 * iAsted — page plein écran (layout WhatsApp Desktop).
 *
 * Conserve la structure visuelle historique (3 colonnes dans une Card) :
 *   [icônes nav] | [liste conversations] | [zone contenu]
 *
 * Le shell (header + nav icons) vit ici dans le package partagé.
 * Tout le contenu fonctionnel (chat, contacts, appels, réunions, réglages,
 * messagerie vocale) dépend lourdement de code agent-web (hooks LLM,
 * composants call-center, tabs iAsted) et est donc injecté via props.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter, useSearchParams } from "@workspace/routing";
import { useEffect, useState, type ComponentType } from "react";
import {
	Bell,
	BellOff,
	Contact,
	MessageSquare,
	Minimize2,
	Phone,
	Settings,
	ShieldCheck,
	Video,
	Voicemail as VoicemailIcon,
	X,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { useOrg } from "../../shell";
import { LineFilterDropdown } from "../../components/call-center/LineFilterDropdown";

// ─── Onglets ─────────────────────────────────────────────────────────────────

// La messagerie vocale n'est plus un onglet à part — elle est désormais
// accessible depuis l'onglet iAppel via un bouton "Messagerie vocale" qui
// ouvre la liste en encart, car la messagerie EST un sous-cas des appels.
const NAV_ITEMS = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icontact", icon: Contact, label: "iContact" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "imeeting", icon: Video, label: "iRéunion" },
	{ id: "settings", icon: Settings, label: "Réglages" },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];
const VALID_TAB_IDS: ReadonlySet<string> = new Set(NAV_ITEMS.map((i) => i.id));

// ─── DI props ────────────────────────────────────────────────────────────────

export interface IAstedChatColumnsProps {
	/** Called by the injected chat component whenever the total unread count
	 * for P2P conversations changes — used to drive the nav badge. */
	onUnreadCountChange: (count: number) => void;
}

export interface VoicemailsListInjectedProps {
	orgId: Id<"orgs"> | null;
}

export interface IAstedCallTabProps {
	selectedLineId?: string | "all";
	onSelectLineId?: (id: string | "all") => void;
	ringtoneMuted?: boolean;
}

export interface IAstedPageProps {
	/**
	 * Renders the two right-hand columns of the iChat layout:
	 *   [conversations list] | [conversation OR voice overlay]
	 *
	 * Owns the shared `useIAstedChat` state, the LLM chat/voice hooks and
	 * the list/conversation/voice-overlay subcomponents. Reports the total
	 * P2P unread count upward for the nav badge.
	 */
	IAstedChatColumns: ComponentType<IAstedChatColumnsProps>;
	IAstedContactTab: ComponentType;
	IAstedCallTab: ComponentType<IAstedCallTabProps>;
	IAstedMeetingTab: ComponentType;
	IAstedSettingsTab: ComponentType;
	VoicemailsList: ComponentType<VoicemailsListInjectedProps>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IAstedPage({
	IAstedChatColumns,
	IAstedContactTab,
	IAstedCallTab,
	IAstedMeetingTab,
	IAstedSettingsTab,
	VoicemailsList,
}: IAstedPageProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { activeOrg, activeOrgId } = useOrg();

	// ── Tab actif (single source of truth : le query param) ──
	const activeTab: TabId = (() => {
		const t = searchParams?.get("tab");
		return t && VALID_TAB_IDS.has(t) ? (t as TabId) : "ichat";
	})();

	const setActiveTab = (next: TabId) => {
		if (next === activeTab) return;
		const params = new URLSearchParams(searchParams?.toString() ?? "");
		params.set("tab", next);
		router.replace(`/icom?${params.toString()}`, { scroll: false });
	};

	// Normalise l'URL au premier mount (si `?tab=` absent/invalide).
	useEffect(() => {
		const current = searchParams?.get("tab");
		if (current !== activeTab) {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			params.set("tab", activeTab);
			router.replace(`/icom?${params.toString()}`, { scroll: false });
		}
	}, [activeTab, router, searchParams]);

	// ── Badges inbound call ──
	const { data: inboundCalls } = useAuthenticatedConvexQuery(
		api.functions.meetings.listInboundOrgCalls,
		{},
	);
	const inboundCount = inboundCalls?.length ?? 0;

	// ── Total unread P2P remonté depuis le sous-composant chat ──
	const [totalChatUnread, setTotalChatUnread] = useState<number>(0);

	// ── Toggle messagerie vocale (visible uniquement dans iAppel) ──
	const [showVoicemail, setShowVoicemail] = useState(false);
	useEffect(() => {
		// Sortir de la messagerie quand on quitte l'onglet iAppel.
		if (activeTab !== "icall" && showVoicemail) setShowVoicemail(false);
	}, [activeTab, showVoicemail]);

	// Compte non-lus de messagerie pour le badge sur le bouton.
	const { data: vmList } = useAuthenticatedConvexQuery(
		api.functions.voicemails.listForOrg,
		activeOrgId && activeTab === "icall" ? { orgId: activeOrgId } : "skip",
	);
	const unreadVm = ((vmList as any[]) ?? []).filter((v) => !v.isRead).length;

	// Mute sonnerie persistant en localStorage. L'agent peut couper la sonnerie
	// sans masquer la file d'attente.
	const [ringtoneMuted, setRingtoneMuted] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem("call-center-ringtone-muted") === "true";
	});
	const toggleRingtoneMute = () => {
		setRingtoneMuted((prev) => {
			const next = !prev;
			try {
				localStorage.setItem("call-center-ringtone-muted", String(next));
			} catch {
				/* storage indisponible */
			}
			return next;
		});
	};

	// Filtre de ligne — état partagé avec le CallCenterShell. La query queue
	// est dédupliquée par Convex, donc l'appeler ici en plus de dans
	// useCallCenter ne crée pas de subscription supplémentaire.
	const [callLineFilter, setCallLineFilter] = useState<string | "all">("all");
	useEffect(() => {
		// Reset le filtre quand on quitte iAppel pour éviter qu'il persiste.
		if (activeTab !== "icall" && callLineFilter !== "all") setCallLineFilter("all");
	}, [activeTab, callLineFilter]);
	const { data: queueData } = useAuthenticatedConvexQuery(
		api.functions.callCenter.listQueuedCallsForAgent,
		activeTab === "icall" && !showVoicemail ? {} : "skip",
	);
	const queueRows = (queueData as Array<any> | undefined) ?? [];
	const totalQueueCount = queueRows.length;
	const urgentQueueCount = queueRows.filter(
		(q) => q.priority === "urgent",
	).length;

	// ── Libellé du header de la colonne 3 (hors iChat) ──
	const tabTitle = (() => {
		switch (activeTab) {
			case "icontact":
				return "iContact";
			case "icall":
				return "iAppel";
			case "imeeting":
				return "iRéunion";
			case "settings":
				return "Réglages";
			default:
				return "";
		}
	})();

	return (
		<div className="flex h-full flex-col gap-4 overflow-hidden">
			{/* Header — pattern iBoîte */}
			<div className="flex shrink-0 items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/8 dark:bg-foreground/5">
						<ShieldCheck className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h1 className="text-xl font-bold">iCom</h1>
						<p className="text-sm text-muted-foreground">
							Votre hub des communications{activeOrg?.name ? ` — ${activeOrg.name}` : ""}
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/")}
					className="gap-1.5"
				>
					<Minimize2 className="h-3.5 w-3.5" />
					Réduire
				</Button>
			</div>

			{/* Card principale — 3 colonnes WhatsApp Desktop */}
			<div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border bg-[#FDFCFA] dark:bg-[#21201E]/77">
				{/* ── Col 1 : icônes nav verticales ── */}
				<div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
					{/* Logo */}
					<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/8 dark:bg-foreground/5">
						<ShieldCheck className="h-4 w-4 text-primary" />
					</div>

					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeTab === item.id;
						const showBadge =
							(item.id === "icall" && inboundCount > 0) ||
							(item.id === "ichat" && totalChatUnread > 0);
						const badgeCount =
							item.id === "icall" ? inboundCount : totalChatUnread;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setActiveTab(item.id)}
								title={item.label}
								className={cn(
									"relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
									isActive
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
								)}
							>
								<Icon className="h-5 w-5" />
								{showBadge && (
									<span
										className={cn(
											"absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground",
											item.id === "icall" && "animate-pulse",
										)}
									>
										{badgeCount}
									</span>
								)}
							</button>
						);
					})}

					<div className="flex-1" />

					{/* Réduire */}
					<button
						type="button"
						onClick={() => router.push("/")}
						title="Réduire"
						className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
					>
						<Minimize2 className="h-5 w-5" />
					</button>
				</div>

				{activeTab === "ichat" ? (
					<IAstedChatColumns onUnreadCountChange={setTotalChatUnread} />
				) : (
					/* ── Onglets non-chat : pleine largeur, même header ── */
					<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
						<div className="shrink-0 border-b px-4 py-2.5 flex items-center gap-3">
							<h2 className="text-base font-semibold shrink-0">
								{activeTab === "icall" && showVoicemail
									? "Messagerie vocale"
									: tabTitle}
							</h2>
							{/* Filtre de ligne — directement à côté du label iAppel,
							    discret, en mode pill. Caché en mode messagerie. */}
							{activeTab === "icall" && !showVoicemail && (
								<LineFilterDropdown
									queue={queueRows}
									selectedLineId={callLineFilter}
									onSelect={setCallLineFilter}
									totalCount={totalQueueCount}
									urgentCount={urgentQueueCount}
								/>
							)}
							<div className="flex-1" />
							{/* Mute sonnerie — bouton icône (BellOff/Bell). Préférence
							    persistée en localStorage. */}
							{activeTab === "icall" && !showVoicemail && (
								<TooltipProvider delayDuration={150}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant={ringtoneMuted ? "default" : "ghost"}
												size="icon"
												onClick={toggleRingtoneMute}
												className="h-8 w-8 shrink-0"
												aria-pressed={ringtoneMuted}
												aria-label={
													ringtoneMuted
														? "Réactiver la sonnerie"
														: "Couper la sonnerie"
												}
											>
												{ringtoneMuted ? (
													<BellOff className="h-4 w-4" />
												) : (
													<Bell className="h-4 w-4" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											{ringtoneMuted
												? "Sonnerie coupée — réactiver"
												: "Couper la sonnerie"}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{/* Messagerie vocale — bouton icône avec tooltip, badge
							    non-lus uniquement si > 0. */}
							{activeTab === "icall" && (
								<TooltipProvider delayDuration={150}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant={showVoicemail ? "default" : "ghost"}
												size="icon"
												onClick={() => setShowVoicemail((v) => !v)}
												className="relative h-8 w-8 shrink-0"
												aria-pressed={showVoicemail}
												aria-label={
													showVoicemail
														? "Retour aux appels"
														: "Messagerie vocale"
												}
											>
												{showVoicemail ? (
													<X className="h-4 w-4" />
												) : (
													<VoicemailIcon className="h-4 w-4" />
												)}
												{!showVoicemail && unreadVm > 0 && (
													<span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
														{unreadVm}
													</span>
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											{showVoicemail
												? "Retour aux appels"
												: unreadVm > 0
												? `Messagerie vocale (${unreadVm} non lu${unreadVm > 1 ? "s" : ""})`
												: "Messagerie vocale"}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
							{activeTab === "icontact" && <IAstedContactTab />}
							{activeTab === "icall" &&
								(showVoicemail ? (
									<div className="h-full overflow-y-auto p-3 lg:p-4">
										<VoicemailsList orgId={activeOrgId} />
									</div>
								) : (
									<IAstedCallTab
										selectedLineId={callLineFilter}
										onSelectLineId={setCallLineFilter}
										ringtoneMuted={ringtoneMuted}
									/>
								))}
							{activeTab === "imeeting" && <IAstedMeetingTab />}
							{activeTab === "settings" && <IAstedSettingsTab />}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

