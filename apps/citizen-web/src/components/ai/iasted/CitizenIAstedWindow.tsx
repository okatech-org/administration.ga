/**
 * CitizenIAstedWindow — Fenetre flottante iAsted citoyen
 *
 * Bouton CircleMenu avec 4 options :
 *   - Mr Ray : Ouvre la page iAsted plein ecran
 *   - iChat : Support consulaire (tickets + IA)
 *   - iAppel : Audio uniquement vers les representations
 *   - iContact : Annuaire urgence + standard des representations
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
import { useCallback, useEffect, useState } from "react";
import { CircleMenu } from "@/components/ui/circle-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenContactTab } from "./CitizenContactTab";

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icall", label: "iAppel", icon: Phone },
	{ id: "icontact", label: "iContact", icon: Contact },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Floating Window + CircleMenu ─────────────────────────────
export function CitizenIAstedWindow() {
	const [windowOpen, setWindowOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");
	const router = useRouter();

	const openWithTab = useCallback((tab: TabId) => {
		setActiveTab(tab);
		setWindowOpen(true);
	}, []);

	// Ecoute l'evenement du footer mobile pour ouvrir la fenetre
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.tab) {
				openWithTab(detail.tab as TabId);
			} else {
				openWithTab("ichat");
			}
		};
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, [openWithTab]);

	const handleExpand = () => {
		setWindowOpen(false);
		router.push("/my-space/iasted");
	};

	// CircleMenu items
	const menuItems = [
		{
			label: "Mr Ray",
			icon: <Bot size={20} className="text-white" />,
			className: "bg-rose-500 hover:bg-rose-600",
			onClick: () => handleExpand(),
		},
		{
			label: "iChat",
			icon: <MessageSquare size={18} className="text-white" />,
			className: "bg-emerald-600 hover:bg-emerald-500",
			onClick: () => openWithTab("ichat"),
		},
		{
			label: "iAppel",
			icon: <Phone size={18} className="text-white" />,
			className: "bg-[#0072B9] hover:bg-[#0080D0]",
			onClick: () => openWithTab("icall"),
		},
		{
			label: "iContact",
			icon: <Contact size={18} className="text-white" />,
			className: "bg-amber-500 hover:bg-amber-400",
			onClick: () => openWithTab("icontact"),
		},
	];

	return (
		<>
			{/* CircleMenu FAB — desktop only (mobile uses nav bar) */}
			{!windowOpen && (
				<div suppressHydrationWarning className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block">
					<CircleMenu
						items={menuItems}
						openIcon={<Bot size={22} className="text-white" />}
						triggerClassName="bg-emerald-600 hover:bg-emerald-500"
					/>
				</div>
			)}

			{/* Fenetre flottante */}
			<AnimatePresence>
				{windowOpen && (
					<motion.div
						initial={{ opacity: 0, y: "100%" }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: "100%" }}
						transition={{ type: "spring", damping: 28, stiffness: 320 }}
						className={cn(
							"fixed bottom-0 left-0 right-0 z-50",
							"sm:left-auto sm:w-[420px] sm:right-6 sm:bottom-6",
							"h-[85dvh] sm:h-[min(640px,calc(100vh-100px))]",
							"rounded-t-2xl sm:rounded-2xl",
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
									onClick={() => setWindowOpen(false)}
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
