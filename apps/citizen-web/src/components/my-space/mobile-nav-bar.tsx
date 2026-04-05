"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	Bot,
	Briefcase,
	Calendar,
	FileText,
	Mail,
	Menu,
	Plus,
	Settings,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
}

export function MobileNavBar() {
	const location = useLocation();
	const { t } = useTranslation();
	const [sheetOpen, setSheetOpen] = useState(false);

	// Items principaux du footer (5 slots)
	const mainItems: NavItem[] = [
		{ title: "iProfil", url: "/my-space", icon: User },
		{ title: "iBoite", url: "/my-space/iboite", icon: Mail },
		// iAsted au centre (index 2) — rendu séparément
		{ title: "iDocument", url: "/my-space/idocument", icon: FileText },
		// Menu (index 4) — rendu séparément
	];

	// Items secondaires dans le Sheet
	const sheetSections = [
		{
			label: t("mySpace.nav.sectionIdentity"),
			items: [
				{ title: "iAgenda", url: "/my-space/iagenda", icon: Calendar },
			],
		},
		{
			label: t("mySpace.nav.sectionServices"),
			items: [
				{ title: "Mes Démarches", url: "/my-space/services-demarches", icon: Briefcase },
				{ title: t("mySpace.nav.settings"), url: "/my-space/settings", icon: Settings },
			],
		},
	];

	const isActive = (url: string) => {
		if (url === "/my-space") {
			return location.pathname === "/my-space" || location.pathname === "/my-space/";
		}
		return location.pathname.startsWith(url);
	};

	const isIAstedActive = isActive("/my-space/iasted");
	const hasSheetActive = sheetSections.some(s => s.items.some(i => isActive(i.url)));

	return (
		<>
			{/* ── Footer bar fixe — mobile uniquement ── */}
			<nav className="fixed bottom-3 left-3 right-3 z-40 md:hidden" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
				<div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-lg">
					<div className="flex items-end justify-around px-2 h-14">
						{/* iProfil */}
						<NavBarItem item={mainItems[0]} active={isActive(mainItems[0].url)} onClick={() => setSheetOpen(false)} />

						{/* iBoite */}
						<NavBarItem item={mainItems[1]} active={isActive(mainItems[1].url)} onClick={() => setSheetOpen(false)} />

						{/* iAsted — centre surélevé, ouvre la fenêtre de chat */}
						<button
							type="button"
							onClick={() => {
								setSheetOpen(false);
								window.dispatchEvent(new CustomEvent("iasted:open"));
							}}
							className="flex flex-col items-center -mt-4"
						>
							<div className={cn(
								"h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
								isIAstedActive
									? "bg-emerald-500 ring-2 ring-emerald-500/30"
									: "bg-emerald-600 hover:bg-emerald-500",
							)}>
								<Bot className="h-6 w-6 text-white" />
							</div>
						</button>

						{/* iDocument */}
						<NavBarItem item={mainItems[2]} active={isActive(mainItems[2].url)} onClick={() => setSheetOpen(false)} />

						{/* Menu */}
						<button
							type="button"
							onClick={() => setSheetOpen(prev => !prev)}
							className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]"
						>
							<div className={cn(
								"h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
								sheetOpen || hasSheetActive ? "bg-primary/10" : "",
							)}>
								{sheetOpen ? (
									<X className={cn("h-4.5 w-4.5", "text-primary")} />
								) : (
									<Menu className={cn("h-4.5 w-4.5", hasSheetActive ? "text-primary" : "text-muted-foreground")} />
								)}
							</div>
							<span className={cn(
								"text-[9px] font-medium",
								sheetOpen || hasSheetActive ? "text-primary" : "text-muted-foreground",
							)}>
								Menu
							</span>
						</button>
					</div>
				</div>
			</nav>

			{/* ── Sheet menu secondaire ── */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] px-4 bg-card border-t border-border">
					<SheetHeader className="pb-3 pt-1">
						<SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							{t("mySpace.nav.navigation")}
						</SheetTitle>
					</SheetHeader>

					<div className="overflow-y-auto citizen-scrollbar space-y-4 pb-6">
						{sheetSections.map((section) => (
							<div key={section.label}>
								<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1 mb-2">
									{section.label}
								</p>
								<div className="grid grid-cols-3 gap-2">
									{section.items.map((item) => (
										<Link
											key={item.url}
											to={item.url}
											onClick={() => setSheetOpen(false)}
											className={cn(
												"flex flex-col items-center justify-center gap-2 p-3 text-center rounded-xl min-h-[76px] transition-colors",
												isActive(item.url)
													? "bg-primary/10 text-primary font-semibold"
													: "bg-muted text-muted-foreground hover:bg-muted/70",
											)}
										>
											<item.icon className={cn(
												"size-5",
												isActive(item.url) ? "text-primary" : "text-muted-foreground",
											)} />
											<span className="text-[11px] font-medium leading-tight">
												{item.title}
											</span>
											{isActive(item.url) && (
												<div className="w-1.5 h-1.5 rounded-full bg-primary -mt-0.5" />
											)}
										</Link>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Bouton action principal */}
					<div className="pb-4 mt-auto">
						<Button
							className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white border-0"
							onClick={() => setSheetOpen(false)}
							asChild
						>
							<Link to="/my-space/services">
								<Plus className="mr-2 h-4 w-4" />
								{t("mySpace.actions.newRequest", "Nouvelle démarche")}
							</Link>
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

// Composant pour les items standard du footer
function NavBarItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
	return (
		<Link
			to={item.url}
			onClick={onClick}
			className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]"
		>
			<div className={cn(
				"h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
				active && "bg-primary/10",
			)}>
				<item.icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
			</div>
			<span className={cn(
				"text-[9px] font-medium",
				active ? "text-primary" : "text-muted-foreground",
			)}>
				{item.title}
			</span>
			{active && <div className="w-1 h-1 rounded-full bg-primary" />}
		</Link>
	);
}
