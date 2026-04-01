/**
 * BackofficeIAstedWindow — iAsted pour le Back-Office (SuperAdmin).
 *
 * Version simplifiée du FAB iAsted :
 *   - iChat : Chat IA basique
 *   - iContact : Annuaire des représentations
 *   - Réglages : Préférences
 *
 * Pas de iAppel ni iRéunion (le SuperAdmin ne fait pas de VoIP).
 * Pas de dépendance à OrgProvider.
 */

import { api } from "@convex/_generated/api";
import {
	Bot,
	Building2,
	ChevronRight,
	Contact,
	Globe,
	Loader2,
	Maximize2,
	MessageSquare,
	Minus,
	Search,
	Settings,
	Shield,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import { cn } from "@/lib/utils";

// ─── Tabs ─────────────────────────────────────────────────
const TABS = [
	{ id: "ichat", label: "iChat", icon: MessageSquare },
	{ id: "icontact", label: "iContact", icon: Contact },
	{ id: "settings", label: "", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Org type labels ──────────────────────────────────────
const ORG_TYPE_LABELS: Record<string, string> = {
	embassy: "Ambassade",
	general_consulate: "Consulat Général",
	consulate: "Consulat",
	permanent_mission: "Mission Permanente",
	high_commission: "Haut-Commissariat",
};

// ─── Main Component ───────────────────────────────────────
export function BackofficeIAstedWindow() {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabId>("ichat");

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
							<div className="flex items-center gap-0.5">
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
							{activeTab === "ichat" && <BackofficeChatTab />}
							{activeTab === "icontact" && <BackofficeContactTab />}
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

// ─── iChat Tab ────────────────────────────────────────────
function BackofficeChatTab() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
			<div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
				<MessageSquare className="h-7 w-7 text-emerald-500" />
			</div>
			<h3 className="text-sm font-semibold">Bienvenue !</h3>
			<p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
				Je suis l'assistant IA de la plateforme. Comment puis-je vous aider ?
			</p>
			<div className="flex flex-wrap gap-2 mt-4 justify-center">
				{["Statistiques globales", "État des représentations", "Demandes en attente"].map((suggestion) => (
					<button
						key={suggestion}
						type="button"
						className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted/50 transition-colors"
					>
						{suggestion}
					</button>
				))}
			</div>
		</div>
	);
}

// ─── iContact Tab ─────────────────────────────────────────
function BackofficeContactTab() {
	const [search, setSearch] = useState("");
	const { data: allOrgs, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const filtered = useMemo(() => {
		if (!allOrgs) return [];
		const q = search.trim().toLowerCase();
		const orgs = allOrgs as any[];
		if (!q) return orgs;
		return orgs.filter(
			(org) =>
				org.name.toLowerCase().includes(q) ||
				(org.country ?? "").toLowerCase().includes(q),
		);
	}, [allOrgs, search]);

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			<div className="px-3 pt-3 pb-1.5 shrink-0">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher une représentation..."
						className="pl-7 h-8 text-xs"
					/>
				</div>
			</div>
			<ScrollArea className="flex-1 px-3 pb-2">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center py-8 text-center">
						<Building2 className="h-6 w-6 text-muted-foreground/30 mb-2" />
						<p className="text-[11px] text-muted-foreground">
							{search ? "Aucun résultat" : "Aucune représentation"}
						</p>
					</div>
				) : (
					<div className="space-y-1.5">
						{filtered.map((org: any) => (
							<div key={org._id} className="rounded-lg border bg-card p-2.5 hover:bg-muted/20 transition-colors">
								<div className="flex items-center gap-2">
									<Building2 className="h-4 w-4 text-primary shrink-0" />
									<div className="flex-1 min-w-0">
										<p className="text-xs font-semibold truncate">{org.name}</p>
										<p className="text-[9px] text-muted-foreground">
											{ORG_TYPE_LABELS[org.type] ?? org.type}
											{org.country && ` · ${org.country}`}
										</p>
									</div>
									{org.phone && (
										<Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">
											{org.phone}
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</ScrollArea>
		</div>
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
