/**
 * CitizenIAstedWindow — iAsted citoyen avec restrictions.
 *
 * 3 onglets :
 *   1. iChat — IA épinglé + threads avec agents (pas de "nouveau chat")
 *   2. iAppel — Lignes d'appel des représentations (audio uniquement)
 *   3. ⚙️ — Préférences (langue, notifications)
 *
 * PAS de iContact (annuaire diplomatique réservé aux agents)
 * PAS de iRéunion (mais peut rejoindre via invitation)
 */

import {
	Bot,
	MessageSquare,
	Phone,
	Settings,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenSettingsTab } from "./CitizenSettingsTab";

type TabId = "chat" | "call" | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof MessageSquare }> = [
	{ id: "chat", label: "iChat", icon: MessageSquare },
	{ id: "call", label: "iAppel", icon: Phone },
	{ id: "settings", label: "⚙️", icon: Settings },
];

interface CitizenIAstedWindowProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CitizenIAstedWindow({ isOpen, onClose }: CitizenIAstedWindowProps) {
	const [activeTab, setActiveTab] = useState<TabId>("chat");

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					transition={{ type: "spring", damping: 25, stiffness: 300 }}
					className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(580px,calc(100vh-120px))] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
				>
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-2.5 bg-emerald-600 text-white shrink-0">
						<div className="flex items-center gap-2">
							<div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
								<Bot className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-semibold">iAsted</p>
								<p className="text-[10px] text-white/70">Assistant Consulaire</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="h-7 w-7 text-white hover:bg-white/20"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-hidden flex flex-col">
						{activeTab === "chat" && <CitizenChatTab />}
						{activeTab === "call" && <CitizenCallTab />}
						{activeTab === "settings" && <CitizenSettingsTab />}
					</div>

					{/* Bottom navigation (WhatsApp style) */}
					<div className="border-t bg-background px-2 py-1.5 flex items-center shrink-0">
						{TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={cn(
										"flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors",
										isActive
											? "text-emerald-600"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className={cn("h-4 w-4", isActive && "text-emerald-600")} />
									<span className="text-[9px] font-medium">{tab.label}</span>
								</button>
							);
						})}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

/**
 * CitizenIAstedFAB — Bouton flottant pour ouvrir iAsted.
 */
export function CitizenIAstedFAB({ onClick }: { onClick: () => void }) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 z-40 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
		>
			<Bot className="h-6 w-6" />
		</motion.button>
	);
}
