/**
 * iAsted — Page plein écran (layout WhatsApp Desktop)
 * 4 sections : iChat, iContact, iAppel, Réglages
 * Bouton rétraction pour revenir à la fenêtre flottante.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Contact, MessageSquare, Minimize2, Phone, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/components/org/org-provider";
import { useAdminAIChat } from "@/components/ai/useAdminAIChat";
import { useAdminVoiceChat } from "@/components/ai/useAdminVoiceChat";
import { IAstedInstantChatTab } from "@/components/ai/iasted/IAstedInstantChatTab";
import { IAstedContactTab } from "@/components/ai/iasted/IAstedContactTab";
import { IAstedCallTab } from "@/components/ai/iasted/IAstedCallTab";
import { IAstedSettingsTab } from "@/components/ai/iasted/IAstedSettingsTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/iasted")({
	component: IAstedFullPage,
});

const SIDEBAR_ITEMS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare, description: "Messagerie & IA" },
	{ id: "icontact", label: "iContact", icon: Contact, description: "Annuaire unifié" },
	{ id: "icall", label: "iAppel", icon: Phone, description: "Audio, Vidéo, iRéunion" },
	{ id: "settings", label: "Réglages", icon: Settings, description: "Paramètres" },
] as const;

type TabId = (typeof SIDEBAR_ITEMS)[number]["id"];

function IAstedFullPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const { activeOrg } = useOrg();
	const navigate = useNavigate();
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();
	const activeItem = SIDEBAR_ITEMS.find((i) => i.id === activeTab);

	const handleMinimize = () => {
		navigate({ to: "/" });
	};

	return (
		<div className="flex h-full overflow-hidden">
			{/* ── Sidebar gauche ── */}
			<aside className="w-16 lg:w-56 border-r flex flex-col shrink-0">
				{/* Header avec bouton rétraction */}
				<div className="p-3 lg:p-4 border-b shrink-0">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
								<ShieldCheck className="h-4 w-4 text-emerald-500" />
							</div>
							<div className="hidden lg:block min-w-0">
								<h1 className="text-sm font-bold">iAsted</h1>
								<p className="text-[10px] text-muted-foreground truncate">
									{activeOrg?.name ?? "Conscience Numérique"}
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleMinimize}
							title="Réduire"
							className="h-7 w-7 text-muted-foreground hover:text-foreground"
						>
							<Minimize2 className="h-3.5 w-3.5" />
						</Button>
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
									"w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 transition-all text-left",
									isActive
										? "bg-primary/10 text-primary border-r-2 border-primary"
										: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
								)}
							>
								<Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
								<div className="hidden lg:block min-w-0">
									<p className={cn("text-xs font-medium truncate", isActive && "text-primary")}>{item.label}</p>
									<p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
								</div>
							</button>
						);
					})}
				</nav>
			</aside>

			{/* ── Zone principale ── */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* Header zone */}
				<div className="border-b px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
					{activeItem && (
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
								<activeItem.icon className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h2 className="text-base font-semibold">{activeItem.label}</h2>
								<p className="text-xs text-muted-foreground">{activeItem.description}</p>
							</div>
						</div>
					)}
				</div>

				{/* Contenu */}
				<div className="flex-1 overflow-hidden">
					{activeTab === "ichat" && <IAstedInstantChatTab chat={chat} voice={voice} />}
					{activeTab === "icontact" && <IAstedContactTab />}
					{activeTab === "icall" && <IAstedCallTab />}
					{activeTab === "settings" && <IAstedSettingsTab />}
				</div>
			</main>
		</div>
	);
}
