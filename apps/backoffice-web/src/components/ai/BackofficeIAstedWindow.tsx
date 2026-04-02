/**
 * BackofficeIAstedWindow — iAsted pour le Back-Office (SuperAdmin).
 *
 * 5 onglets complets :
 *   - iChat : Chat IA + messagerie P2P temps réel
 *   - iContact : Annuaire cross-org avec filtres
 *   - iAppel : Appels audio/vidéo via LiveKit
 *   - iRéunion : Réunions vidéo avec participants
 *   - Réglages : Préférences utilisateur
 *
 * Utilise useOrgSelector() pour le contexte d'organisation
 * (pas de OrgProvider comme dans agent-web).
 */

import {
	Bot,
	Contact,
	MessageSquare,
	Minus,
	Phone,
	Settings,
	Shield,
	Video,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrgSelector } from "@/hooks/use-org-selector";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import { useBackofficeAIChat } from "@/hooks/useBackofficeAIChat";
import { cn } from "@/lib/utils";

// Tab components
import { BackofficeChatTab } from "./tabs/BackofficeChatTab";
import { BackofficeContactTab } from "./tabs/BackofficeContactTab";
import { BackofficeCallTab } from "./tabs/BackofficeCallTab";
import { BackofficeMeetingTab } from "./tabs/BackofficeMeetingTab";

// ─── Tabs ─────────────────────────────────────────────────
const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icontact", label: "iContact", icon: Contact },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "imeeting", label: "iRéunion", icon: Video },
	{ id: "settings", label: "Réglages", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Main Component ───────────────────────────────────────
export function BackofficeIAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");

	// Org selector (remplace OrgProvider)
	const { activeOrgId, OrgSelector } = useOrgSelector();

	// Chat IA
	const chat = useBackofficeAIChat(activeOrgId);

	return (
		<>
			{/* FAB */}
			<AnimatePresence>
				{!open && (
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						transition={{ type: "spring", damping: 20, stiffness: 300 }}
						className="fixed bottom-6 right-6 z-50"
					>
						<Button
							size="lg"
							className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-emerald-600 hover:bg-emerald-700"
							onClick={() => setOpen(true)}
							aria-label="Ouvrir iAsted"
						>
							<Bot className="h-6 w-6" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Fenêtre flottante */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className={cn(
							"fixed bottom-0 right-0 z-50",
							"w-full sm:w-[420px] sm:right-6 sm:bottom-6",
							"h-[100dvh] sm:h-[min(640px,calc(100vh-100px))]",
							"rounded-none sm:rounded-2xl shadow-2xl",
							"bg-background border flex flex-col overflow-hidden",
						)}
					>
						{/* Header */}
						<div className="border-b px-3 py-2 flex items-center justify-between shrink-0 bg-emerald-600 text-white">
							<div className="flex items-center gap-2.5">
								<div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
									<Shield className="h-4 w-4 text-white" />
								</div>
								<div>
									<h2 className="text-xs font-semibold leading-tight">iAsted</h2>
									<p className="text-[9px] text-white/60 leading-tight">
										Administration
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								{/* Org Selector compact */}
								<div className="max-w-[140px]">
									<OrgSelector />
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setOpen(false)}
									title="Réduire"
									className="h-7 w-7 text-white hover:bg-white/20"
								>
									<Minus className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>

						{/* Contenu */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{activeTab === "ichat" && <BackofficeChatTab orgId={activeOrgId} chat={chat} />}
							{activeTab === "icontact" && <BackofficeContactTab orgId={activeOrgId} />}
							{activeTab === "icall" && <BackofficeCallTab orgId={activeOrgId} />}
							{activeTab === "imeeting" && <BackofficeMeetingTab orgId={activeOrgId} />}
							{activeTab === "settings" && <BackofficeSettingsTab />}
						</div>

						{/* Navigation bas */}
						<div className="border-t bg-card shrink-0">
							<div className="flex items-center justify-around py-1.5">
								{TABS.map((tab) => {
									const Icon = tab.icon;
									const isActive = activeTab === tab.id;
									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => setActiveTab(tab.id)}
											className={cn(
												"flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[52px]",
												isActive ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
											)}
										>
											<Icon className={cn("h-5 w-5", isActive && "text-emerald-500")} />
											<span className={cn("text-[9px] font-medium leading-none", isActive && "text-emerald-500")}>
												{tab.label}
											</span>
											{isActive && (
												<motion.div
													layoutId="bo-iasted-tab-indicator"
													className="h-0.5 w-4 bg-emerald-500 rounded-full mt-0.5"
													transition={{ type: "spring", stiffness: 400, damping: 30 }}
												/>
											)}
										</button>
									);
								})}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

// ─── Settings Tab ─────────────────────────────────────────
function BackofficeSettingsTab() {
	const user = useSuperAdminData();

	return (
		<div className="flex-1 p-4 space-y-4">
			<div className="space-y-2">
				<h4 className="text-xs font-semibold text-muted-foreground uppercase">Compte</h4>
				<div className="rounded-lg border p-3 space-y-1">
					<p className="text-sm font-medium">{user.userData?.name ?? "SuperAdmin"}</p>
					<p className="text-xs text-muted-foreground">{user.userData?.email}</p>
					<Badge variant="outline" className="text-[9px] mt-1">
						{user.isSuperAdmin ? "Super Administrateur" : "Administrateur"}
					</Badge>
				</div>
			</div>
			<div className="space-y-2">
				<h4 className="text-xs font-semibold text-muted-foreground uppercase">À propos</h4>
				<div className="rounded-lg border p-3 space-y-1">
					<p className="text-xs text-muted-foreground">iAsted v1.0 — Assistant IA</p>
					<p className="text-xs text-muted-foreground">Plateforme Consulat.ga</p>
				</div>
			</div>
		</div>
	);
}
