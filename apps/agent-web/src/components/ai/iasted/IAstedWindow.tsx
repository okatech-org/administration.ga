/**
 * IAstedWindow — Fenêtre flottante style WhatsApp Mobile
 *
 * Navigation en bas (5 onglets), contenu principal au centre,
 * header compact en haut. Bouton [+] pour passer en plein écran.
 */

import { useRouter } from "next/navigation";
import { Contact, Maximize2, MessageSquare, Minus, Phone, Plus, Settings, ShieldCheck, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "../useAdminAIChat";
import { useAdminVoiceChat } from "../useAdminVoiceChat";
import { VoiceButton } from "../VoiceButton";

import { IAstedFAB } from "./IAstedFAB";
import { IAstedInstantChatTab } from "./IAstedInstantChatTab";
import { IAstedContactTab } from "./IAstedContactTab";
import { IAstedCallTab } from "./IAstedCallTab";
import { IAstedMeetingTab } from "./IAstedMeetingTab";
import { IAstedSettingsTab } from "./IAstedSettingsTab";

const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icontact", label: "iContact", icon: Contact },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "imeeting", label: "iRéunion", icon: Video },
	{ id: "settings", label: "", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function IAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const { activeOrg } = useOrg();
	const router = useRouter();

	// Hooks IA existants
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const handleExpand = () => {
		setOpen(false);
		router.push("/iasted");
	};

	return (
		<>
			{/* FAB flottant */}
			<IAstedFAB isOpen={open} onClick={() => setOpen(true)} />

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
						{/* ── Header compact ── */}
						<div className="border-b px-3 py-2 flex items-center justify-between shrink-0 bg-emerald-600 text-white">
							<div className="flex items-center gap-2.5">
								<div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
									<ShieldCheck className="h-4 w-4 text-white" />
								</div>
								<div>
									<h2 className="text-xs font-semibold leading-tight">iAsted</h2>
									<p className="text-[9px] text-white/60 leading-tight">
										{activeOrg?.name ?? "Agent IA Diplomate"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-0.5">
								<Button variant="ghost" size="icon" onClick={handleExpand}
									title="Plein écran" className="h-7 w-7 text-white hover:bg-white/20">
									<Maximize2 className="h-3.5 w-3.5" />
								</Button>
								<Button variant="ghost" size="icon" onClick={() => setOpen(false)}
									title="Réduire" className="h-7 w-7 text-white hover:bg-white/20">
									<Minus className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>

						{/* ── Contenu principal ── */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{activeTab === "ichat" && <IAstedInstantChatTab chat={chat} voice={voice} />}
							{activeTab === "icontact" && <IAstedContactTab />}
							{activeTab === "icall" && <IAstedCallTab />}
							{activeTab === "imeeting" && <IAstedMeetingTab />}
							{activeTab === "settings" && <IAstedSettingsTab />}
						</div>

						{/* ── Navigation en bas (style WhatsApp) ── */}
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
												isActive
													? "text-emerald-500"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											<Icon className={cn("h-5 w-5", isActive && "text-emerald-500")} />
											<span className={cn(
												"text-[9px] font-medium leading-none",
												isActive && "text-emerald-500",
											)}>
												{tab.label}
											</span>
											{isActive && (
												<motion.div
													layoutId="iasted-tab-indicator"
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
