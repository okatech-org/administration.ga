/**
 * iAsted — Page plein écran (layout WhatsApp Desktop)
 *
 * Sidebar gauche : navigation verticale (5 sections)
 * Zone principale droite : contenu de l'onglet actif
 * Accessible via le bouton [+] dans le FAB flottant.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
	Bot,
	Contact,
	MessageSquare,
	Phone,
	ShieldCheck,
	Video,
} from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "@/components/ai/useAdminAIChat";
import { useAdminVoiceChat } from "@/components/ai/useAdminVoiceChat";
import { VoiceButton } from "@/components/ai/VoiceButton";
import { IAstedChatTab } from "@/components/ai/iasted/IAstedChatTab";
import { IAstedInstantChatTab } from "@/components/ai/iasted/IAstedInstantChatTab";
import { IAstedContactTab } from "@/components/ai/iasted/IAstedContactTab";
import { IAstedCallsTab } from "@/components/ai/iasted/IAstedCallsTab";
import { IAstedMeetingsTab } from "@/components/ai/iasted/IAstedMeetingsTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/iasted")({
	component: IAstedFullPage,
});

const SIDEBAR_ITEMS = [
	{ id: "ia", label: "iAsted IA", icon: Bot, description: "Assistant intelligent" },
	{ id: "ichat", label: "iChat", icon: MessageSquare, description: "Messagerie instantanée" },
	{ id: "icontact", label: "iContact", icon: Contact, description: "Annuaire unifié" },
	{ id: "calls", label: "Appels", icon: Phone, description: "VoIP & historique" },
	{ id: "meetings", label: "Réunions", icon: Video, description: "Visioconférence" },
] as const;

type TabId = (typeof SIDEBAR_ITEMS)[number]["id"];

function IAstedFullPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ia");
	const { activeOrg } = useOrg();

	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	const activeItem = SIDEBAR_ITEMS.find((i) => i.id === activeTab);

	return (
		<div className="flex h-full overflow-hidden">
			{/* ── Sidebar gauche ── */}
			<aside className="w-16 lg:w-56 border-r bg-card flex flex-col shrink-0">
				{/* Header */}
				<div className="p-3 lg:p-4 border-b shrink-0">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
							<ShieldCheck className="h-4 w-4 text-emerald-500" />
						</div>
						<div className="hidden lg:block min-w-0">
							<h1 className="text-sm font-bold">iAsted</h1>
							<p className="text-[10px] text-muted-foreground truncate">
								{activeOrg?.name ?? "Conscience Numérique"}
							</p>
						</div>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
					{SIDEBAR_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = activeTab === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => setActiveTab(item.id)}
								className={cn(
									"w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 transition-colors text-left",
									isActive
										? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-r-2 border-emerald-500"
										: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
								)}
							>
								<Icon className={cn("h-5 w-5 shrink-0", isActive && "text-emerald-500")} />
								<div className="hidden lg:block min-w-0">
									<p className="text-xs font-medium truncate">{item.label}</p>
									<p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
								</div>
							</button>
						);
					})}
				</nav>

				{/* Footer */}
				{activeTab === "ia" && voice.isAvailable && (
					<div className="border-t p-2 lg:p-3 shrink-0">
						<VoiceButton
							isOpen={voice.isOpen}
							onClick={() => voice.isOpen ? voice.closeOverlay() : voice.openOverlay()}
							className="w-full justify-center lg:justify-start"
						/>
					</div>
				)}
			</aside>

			{/* ── Zone principale ── */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* Header zone */}
				<div className="border-b px-4 lg:px-6 py-3 flex items-center justify-between shrink-0 bg-card">
					<div className="flex items-center gap-3">
						{activeItem && (
							<>
								<div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
									<activeItem.icon className="h-4 w-4 text-emerald-500" />
								</div>
								<div>
									<h2 className="text-sm font-semibold">{activeItem.label}</h2>
									<p className="text-[10px] text-muted-foreground">{activeItem.description}</p>
								</div>
							</>
						)}
					</div>
					{activeTab === "ia" && (
						<button
							type="button"
							onClick={chat.newConversation}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							Nouvelle conversation
						</button>
					)}
				</div>

				{/* Contenu */}
				<div className="flex-1 overflow-hidden">
					{activeTab === "ia" && <IAstedChatTab chat={chat} voice={voice} />}
					{activeTab === "ichat" && <IAstedInstantChatTab />}
					{activeTab === "icontact" && <IAstedContactTab />}
					{activeTab === "calls" && <IAstedCallsTab />}
					{activeTab === "meetings" && <IAstedMeetingsTab />}
				</div>
			</main>
		</div>
	);
}
