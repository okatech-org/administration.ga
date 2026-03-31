/**
 * IAstedWindow — Fenêtre unifiée "Conscience Numérique"
 *
 * 4 onglets : IA | iCom | Appels | Réunions
 * Remplace AdminAIAssistant dans le layout.
 */

import { Bot, MessageSquare, Minus, Phone, Plus, ShieldCheck, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "../useAdminAIChat";
import { useAdminVoiceChat } from "../useAdminVoiceChat";
import { VoiceButton } from "../VoiceButton";

import { IAstedFAB } from "./IAstedFAB";
import { IAstedChatTab } from "./IAstedChatTab";
import { IAstedComTab } from "./IAstedComTab";
import { IAstedCallsTab } from "./IAstedCallsTab";
import { IAstedMeetingsTab } from "./IAstedMeetingsTab";

export function IAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("ia");
	const { activeOrg } = useOrg();

	// Hooks IA existants
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	return (
		<>
			{/* FAB flottant */}
			<IAstedFAB isOpen={open} onClick={() => setOpen(true)} />

			{/* Fenêtre principale */}
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
						{/* ── Header ── */}
						<div className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-emerald-600 text-white">
							<div className="flex items-center gap-3">
								<div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
									<ShieldCheck className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-sm font-semibold">iAsted</h2>
									<p className="text-[10px] text-white/70">
										{activeOrg?.name ?? "Consulat"} — Conscience Numérique
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								{activeTab === "ia" && voice.isAvailable && (
									<VoiceButton
										isOpen={voice.isOpen}
										onClick={() => voice.isOpen ? voice.closeOverlay() : voice.openOverlay()}
										className="text-white hover:bg-white/20"
									/>
								)}
								{activeTab === "ia" && (
									<Button variant="ghost" size="icon" onClick={chat.newConversation}
										title="Nouvelle conversation" className="h-8 w-8 text-white hover:bg-white/20">
										<Plus className="h-4 w-4" />
									</Button>
								)}
								<Button variant="ghost" size="icon" onClick={() => setOpen(false)}
									title="Fermer" className="h-8 w-8 text-white hover:bg-white/20">
									<Minus className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* ── Onglets ── */}
						<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
							<TabsList className="grid grid-cols-4 rounded-none border-b bg-muted/30 h-10 px-1 shrink-0">
								<TabsTrigger value="ia" className="text-xs gap-1.5 data-[state=active]:bg-background rounded-lg">
									<Bot className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">IA</span>
								</TabsTrigger>
								<TabsTrigger value="icom" className="text-xs gap-1.5 data-[state=active]:bg-background rounded-lg">
									<MessageSquare className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">iCom</span>
								</TabsTrigger>
								<TabsTrigger value="calls" className="text-xs gap-1.5 data-[state=active]:bg-background rounded-lg">
									<Phone className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Appels</span>
								</TabsTrigger>
								<TabsTrigger value="meetings" className="text-xs gap-1.5 data-[state=active]:bg-background rounded-lg">
									<Video className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Réunions</span>
								</TabsTrigger>
							</TabsList>

							<TabsContent value="ia" className="flex-1 flex flex-col overflow-hidden mt-0">
								<IAstedChatTab chat={chat} voice={voice} />
							</TabsContent>

							<TabsContent value="icom" className="flex-1 flex flex-col overflow-hidden mt-0">
								<IAstedComTab />
							</TabsContent>

							<TabsContent value="calls" className="flex-1 flex flex-col overflow-hidden mt-0">
								<IAstedCallsTab />
							</TabsContent>

							<TabsContent value="meetings" className="flex-1 flex flex-col overflow-hidden mt-0">
								<IAstedMeetingsTab />
							</TabsContent>
						</Tabs>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
