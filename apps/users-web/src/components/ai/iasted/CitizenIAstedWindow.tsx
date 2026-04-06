/**
 * CitizenIAstedWindow — Fenetre flottante iAsted citoyen
 *
 * Meme structure visuelle que l'agent (WhatsApp Mobile style),
 * avec restrictions citoyen :
 *   - iChat : Support consulaire (tickets + IA)
 *   - iAppel : Audio uniquement vers les representations
 *   - iContact : Annuaire urgence + standard des representations
 *   -  : Preferences
 *
 * PAS de iReunion (peut recevoir via GlobalCallAlert)
 * PAS d'appels video sortants
 */

import { useRouter } from "next/navigation";
import {
	Bot,
	Contact,
	Maximize2,
	MessageSquare,
	Minus,
	Phone,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDraggable } from "@/hooks/use-draggable";

import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenContactTab } from "./CitizenContactTab";
// Settings tab deplace dans le menu mobile principal

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "icontact", label: "iContact", icon: Contact },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Floating Window ──────────────────────────────────────────
export function CitizenIAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const router = useRouter();

	// Ecoute l'evenement du footer mobile pour ouvrir la fenetre
	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, []);

	const handleExpand = () => {
		setOpen(false);
		router.push("/my-space/iasted");
	};

	return (
		<>
			{/* FAB flottant */}
			<CitizenIAstedFAB isOpen={open} onClick={() => setOpen(true)} />

			{/* Fenetre flottante */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: "100%" }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: "100%" }}
						transition={{ type: "spring", damping: 28, stiffness: 320 }}
						className={cn(
							"fixed bottom-0 left-0 right-0 z-50",
							"sm:left-auto sm:w-[420px] sm:right-6 sm:bottom-6",
							"h-[85dvh] sm:h-[min(640px,calc(100vh-100px))]",
							"rounded-t-2xl sm:rounded-2xl shadow-2xl",
							"bg-card border flat-card-border flex flex-col overflow-hidden",
						)}
					>
						{/* ── Header ── */}
						<div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-border/50">
							<div className="flex items-center gap-3">
								<div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
									<Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<h2 className="text-sm font-bold leading-tight text-foreground">iAsted</h2>
									<p className="text-[10px] text-muted-foreground leading-tight">
										Assistant Consulaire
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleExpand}
									title="Plein ecran"
									className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg hidden lg:flex"
								>
									<Maximize2 className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setOpen(false)}
									title="Reduire"
									className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg"
								>
									<Minus className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* ── Contenu principal ── */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{activeTab === "ichat" && <CitizenChatTab />}
							{activeTab === "icall" && <CitizenCallTab />}
							{activeTab === "icontact" && <CitizenContactTab />}
						</div>

						{/* ── Navigation tabs ── */}
						<div className="border-t border-border/50 bg-card shrink-0">
							<div className="flex items-center justify-around py-2">
								{TABS.map((tab) => {
									const Icon = tab.icon;
									const isActive = activeTab === tab.id;
									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => setActiveTab(tab.id)}
											className={cn(
												"flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors min-w-[60px]",
												isActive
													? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											<Icon className={cn("h-5 w-5", isActive && "text-emerald-600 dark:text-emerald-400")} />
											<span className={cn(
												"text-[9px] font-semibold leading-none",
												isActive && "text-emerald-600 dark:text-emerald-400",
											)}>
												{tab.label}
											</span>
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
