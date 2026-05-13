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
import { useRingtoneMutedPref } from "../../hooks/use-ringtone-muted-pref";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";

// ─── Onglets ─────────────────────────────────────────────────────────────────

// La messagerie vocale n'est plus un onglet à part — elle est désormais
// accessible depuis l'onglet iAppel via un bouton "Messagerie vocale" qui
// ouvre la liste en encart, car la messagerie EST un sous-cas des appels.
// Items affichés dans le rail (haut). Ordre maquette : Discussion → Appel →
// Réunion → Contact. Settings est rendu séparément en bas du rail.
const NAV_ITEMS = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "imeeting", icon: Video, label: "iRéunion" },
	{ id: "icontact", icon: Contact, label: "iContact" },
] as const;

const SETTINGS_TAB = { id: "settings" as const, icon: Settings, label: "Réglages" };

type TabId = (typeof NAV_ITEMS)[number]["id"] | typeof SETTINGS_TAB.id;
const VALID_TAB_IDS: ReadonlySet<string> = new Set([
	...NAV_ITEMS.map((i) => i.id),
	SETTINGS_TAB.id,
]);

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

	// Mute sonnerie partagé entre IAstedPage, GlobalQueuePill et GlobalCallAlert
	// — toggle synchronisé via useRingtoneMutedPref (storage event + custom event).
	const { muted: ringtoneMuted, toggle: toggleRingtoneMute } =
		useRingtoneMutedPref();

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


	// Crumb du topbar — adapte selon la tab active
	const tabLabelMap: Record<TabId, string> = {
		ichat: "iChat",
		icontact: "iContact",
		icall: showVoicemail ? "Messagerie vocale" : "iAppel",
		imeeting: "iRéunion",
		settings: "Réglages",
	};
	const crumbLabel = tabLabelMap[activeTab];

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = [
		{ id: "tab.ichat", type: "icom-tab", label: "iChat", data: { tabId: "ichat", active: activeTab === "ichat", unread: totalChatUnread } },
		{ id: "tab.icontact", type: "icom-tab", label: "iContact", data: { tabId: "icontact", active: activeTab === "icontact" } },
		{ id: "tab.icall", type: "icom-tab", label: "iAppel", data: { tabId: "icall", active: activeTab === "icall", inbound: inboundCount, unreadVoicemail: unreadVm } },
		{ id: "tab.imeeting", type: "icom-tab", label: "iRéunion", data: { tabId: "imeeting", active: activeTab === "imeeting" } },
		{ id: "tab.settings", type: "icom-tab", label: "Réglages", data: { tabId: "settings", active: activeTab === "settings" } },
	];
	const pageActions: PageAction[] = [
		{
			id: "icom.switch_tab",
			label: "Changer d'onglet iCom",
			description:
				"Active un onglet. params.tab ∈ ['ichat','icontact','icall','imeeting','settings'].",
			params: { tab: { type: "string" } },
		},
		{
			id: "icom.toggle_ringtone_mute",
			label: "Basculer la sonnerie",
			description:
				"Mute/unmute la sonnerie d'appel entrant. params.muted (boolean) optionnel.",
			params: { muted: { type: "boolean" } },
		},
		{
			id: "icom.toggle_voicemail",
			label: "Afficher/masquer la messagerie vocale",
			description:
				"Visible uniquement dans l'onglet iAppel. params.show (boolean) optionnel.",
			params: { show: { type: "boolean" } },
		},
		{
			id: "icom.filter_queue_by_line",
			label: "Filtrer la file par ligne",
			description: "params.lineId (string ou 'all').",
			params: { lineId: { type: "string" } },
		},
	];
	usePageContext({
		module: "icom",
		title: `iCom — ${crumbLabel}`,
		summary: `Onglet ${crumbLabel}${totalChatUnread ? ` · ${totalChatUnread} message(s) non lu(s)` : ""}${inboundCount ? ` · ${inboundCount} appel(s) entrant(s)` : ""}${unreadVm ? ` · ${unreadVm} message(s) vocal(s) non lu(s)` : ""}.`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("icom.switch_tab", async (params) => {
		const tab = params?.tab as TabId | undefined;
		if (!tab || !VALID_TAB_IDS.has(tab)) throw new Error("tab invalide");
		setActiveTab(tab);
		return { success: true, tab };
	});
	useRegisterPageAction("icom.toggle_ringtone_mute", async (params) => {
		const next = typeof params?.muted === "boolean" ? params.muted : !ringtoneMuted;
		if (next !== ringtoneMuted) toggleRingtoneMute();
		return { success: true, muted: next };
	});
	useRegisterPageAction("icom.toggle_voicemail", async (params) => {
		const next = typeof params?.show === "boolean" ? params.show : !showVoicemail;
		setShowVoicemail(next);
		return { success: true };
	});
	useRegisterPageAction("icom.filter_queue_by_line", async (params) => {
		const id = params?.lineId as string | undefined;
		if (!id) throw new Error("lineId requis");
		setCallLineFilter(id);
		return { success: true };
	});

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Topbar maquette — `AgTopbar` (titre + crumb + actions) — page-level,
			    s'applique à toutes les tabs iCom. */}
			<div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b">
				<h1 className="text-lg font-bold tracking-tight">iCom</h1>
				{crumbLabel && (
					<span className="text-sm text-muted-foreground">
						/ {crumbLabel}
					</span>
				)}

				{/* Actions tab-specific (LineFilter / ringtone / voicemail pour iCall) */}
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

				{/* iCall : ringtone mute + voicemail toggle */}
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

			{/* Body — rail + content (toutes tabs, fullbleed, plus de cadre) */}
			<div className="flex min-h-0 flex-1 overflow-hidden">
				{/* ── Col 1 : icônes nav verticales ── */}
				<div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
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

					{/* Réglages — bas du rail */}
					<button
						type="button"
						onClick={() => setActiveTab(SETTINGS_TAB.id)}
						title={SETTINGS_TAB.label}
						className={cn(
							"flex h-10 w-10 items-center justify-center rounded-xl transition-all",
							activeTab === SETTINGS_TAB.id
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						<SETTINGS_TAB.icon className="h-5 w-5" />
					</button>
				</div>

				{activeTab === "ichat" ? (
					<IAstedChatColumns onUnreadCountChange={setTotalChatUnread} />
				) : (
					/* ── Onglets non-chat : fullbleed sans sub-header (le topbar est
					    au niveau page) ── */
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
				)}
			</div>
		</div>
	);
}

