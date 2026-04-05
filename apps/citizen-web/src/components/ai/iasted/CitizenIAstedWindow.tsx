/**
 * CitizenIAstedWindow — Fenêtre flottante iAsted citoyen
 *
 * Même structure visuelle que l'agent (WhatsApp Mobile style),
 * avec restrictions citoyen :
 *   - iChat : Support consulaire (tickets + IA)
 *   - iAppel : Audio uniquement vers les représentations
 *   - iContact : Annuaire urgence + standard des représentations
 *   -  : Préférences
 *
 * PAS de iRéunion (peut recevoir via GlobalCallAlert)
 * PAS d'appels vidéo sortants
 */

import { useNavigate } from "@tanstack/react-router";
import {
	Bot,
	Contact,
	Maximize2,
	MessageSquare,
	Minus,
	Phone,
	Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDraggable } from "@/hooks/use-draggable";

import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenContactTab } from "./CitizenContactTab";
import { CitizenSettingsTab } from "./CitizenSettingsTab";

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "icontact", label: "iContact", icon: Contact },
	{ id: "settings", label: "", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Floating Window ──────────────────────────────────────────
export function CitizenIAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const navigate = useNavigate();

	// Ecoute l'événement du footer mobile pour ouvrir la fenêtre
	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, []);

	const handleExpand = () => {
		setOpen(false);
		navigate({ to: "/my-space/iasted" });
	};

	return (
		<>
			{/* FAB flottant */}
			<CitizenIAstedFAB isOpen={open} onClick={() => setOpen(true)} />

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
									<Bot className="h-4 w-4 text-white" />
								</div>
								<div>
									<h2 className="text-xs font-semibold leading-tight">Assistant Consulat</h2>
									<p className="text-[9px] text-white/60 leading-tight">
										Je suis là pour vous aider
									</p>
								</div>
							</div>
							<div className="flex items-center gap-0.5">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleExpand}
									title="Plein écran"
									className="h-7 w-7 text-white hover:bg-white/20 hidden lg:flex"
								>
									<Maximize2 className="h-3.5 w-3.5" />
								</Button>
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

						{/* ── Contenu principal ── */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{activeTab === "ichat" && <CitizenChatTab />}
							{activeTab === "icall" && <CitizenCallTab />}
							{activeTab === "icontact" && <CitizenContactTab />}
							{activeTab === "settings" && <CitizenSettingsTab />}
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
													layoutId="citizen-iasted-tab-indicator"
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

// ─── FAB (Floating Action Button) ─────────────────────────────
export function CitizenIAstedFAB({
	isOpen,
	onClick,
	unreadCount = 0,
}: {
	isOpen?: boolean;
	onClick: () => void;
	unreadCount?: number;
}) {
	// Si isOpen est undefined (ancien usage), toujours montrer
	const shouldShow = isOpen === undefined ? true : !isOpen;
	const draggable = useDraggable("iasted-fab-pos");

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.div
					initial={{ scale: 0, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0, opacity: 0 }}
					transition={{ type: "spring", damping: 20, stiffness: 300 }}
					ref={draggable.ref}
					style={draggable.style}
					className={`${draggable.style ? "" : "fixed bottom-6 right-6"} z-40 touch-none select-none cursor-grab active:cursor-grabbing hidden lg:block`}
					{...draggable.handlers}
				>
					<Button
						size="lg"
						className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-emerald-600 hover:bg-emerald-700 relative"
						onClick={(e) => { if (!draggable.isDragged) onClick(); }}
						aria-label="Ouvrir iAsted"
					>
						<Bot className="h-6 w-6" />
						{unreadCount > 0 && (
							<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
