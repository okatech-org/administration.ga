/**
 * iAsted — Page plein écran (inspirée du design iBoîte)
 *
 * Layout 3 colonnes comme iBoîte :
 * Sidebar nav (iChat/iContact/iAppel/⚙️) | Contenu de l'onglet
 *
 * Le design reprend les patterns de iBoîte :
 * - Padding p-4 lg:p-6
 * - PageHeader avec icône dans rounded-xl
 * - Card avec border pour le contenu
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Contact, MessageSquare, Minimize2, Phone, Settings, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const NAV_ITEMS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icontact", label: "iContact", icon: Contact },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "settings", label: "Réglages", icon: Settings },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

function IAstedFullPage() {
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const { activeOrg } = useOrg();
	const navigate = useNavigate();
	const chat = useAdminAIChat();
	const voice = useAdminVoiceChat();

	return (
		<div className="flex flex-col gap-4 h-full p-4 lg:p-6">
			{/* Header — même style que iBoîte */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex items-center justify-between shrink-0"
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
						<ShieldCheck className="h-5 w-5 text-emerald-500" />
					</div>
					<div>
						<h1 className="text-xl font-bold">iAsted</h1>
						<p className="text-sm text-muted-foreground">
							{activeOrg?.name ?? "Conscience Numérique"}
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => navigate({ to: "/" })}
					className="gap-1.5"
				>
					<Minimize2 className="h-3.5 w-3.5" />
					Réduire
				</Button>
			</motion.div>

			{/* Contenu principal — Card comme iBoîte */}
			<Card className="flex flex-1 min-h-0 overflow-hidden p-0">
				{/* Sidebar navigation verticale */}
				<aside className="w-14 lg:w-48 border-r flex flex-col shrink-0">
					<nav className="flex-1 py-2 space-y-0.5">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = activeTab === item.id;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => setActiveTab(item.id)}
									className={cn(
										"w-full flex items-center gap-2.5 px-3 lg:px-4 py-2.5 transition-all text-left",
										isActive
											? "bg-primary/10 text-primary border-r-2 border-primary"
											: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
									)}
								>
									<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
									<span className={cn("hidden lg:block text-xs font-medium truncate", isActive && "text-primary")}>
										{item.label}
									</span>
								</button>
							);
						})}
					</nav>
				</aside>

				{/* Zone principale */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{activeTab === "ichat" && <IAstedInstantChatTab chat={chat} voice={voice} />}
					{activeTab === "icontact" && <IAstedContactTab />}
					{activeTab === "icall" && <IAstedCallTab />}
					{activeTab === "settings" && <IAstedSettingsTab />}
				</div>
			</Card>
		</div>
	);
}
