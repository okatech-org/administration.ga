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
	Contact,
	MessageSquare,
	Minimize2,
	Phone,
	Settings,
	ShieldCheck,
	Video,
	Voicemail as VoicemailIcon,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { useOrg } from "../../shell";

// ─── Onglets ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
	{ id: "ichat", icon: MessageSquare, label: "iChat" },
	{ id: "icontact", icon: Contact, label: "iContact" },
	{ id: "icall", icon: Phone, label: "iAppel" },
	{ id: "voicemail", icon: VoicemailIcon, label: "Messagerie" },
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
	IAstedCallTab: ComponentType;
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

	// ── Libellé du header de la colonne 3 (hors iChat) ──
	const tabTitle = (() => {
		switch (activeTab) {
			case "icontact":
				return "iContact";
			case "icall":
				return "iAppel";
			case "voicemail":
				return "Messagerie vocale";
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
						<div className="shrink-0 border-b px-4 py-3">
							<h2 className="text-base font-semibold">{tabTitle}</h2>
						</div>
						<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
							{activeTab === "icontact" && <IAstedContactTab />}
							{/* Fullscreen → CallCenterShell complet (PAS de prop `compact`). */}
							{activeTab === "icall" && <IAstedCallTab />}
							{activeTab === "voicemail" && (
								<div className="h-full overflow-y-auto p-3 lg:p-4">
									<VoicemailsList orgId={activeOrgId} />
								</div>
							)}
							{activeTab === "imeeting" && <IAstedMeetingTab />}
							{activeTab === "settings" && <IAstedSettingsTab />}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

