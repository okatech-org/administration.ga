"use client";

import { api } from "@convex/_generated/api";
import { Link, useLocation } from "@tanstack/react-router";
import {
	Baby,
	Bot,
	Briefcase,
	Calendar,
	FileText,
	Globe,
	LogOut,
	Mail,
	Menu,
	Moon,
	Plus,
	Settings,
	Sun,
	User,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
}

export function MobileNavBar() {
	const location = useLocation();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const [sheetOpen, setSheetOpen] = useState(false);
	const { data: session } = authClient.useSession();
	const { data: childProfiles } = useAuthenticatedConvexQuery(api.functions.childProfiles.getMine, {});

	const children = childProfiles ?? [];
	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const userName = session?.user?.name ?? "";
	const userEmail = session?.user?.email ?? "";
	const userInitial = userName?.[0]?.toUpperCase() ?? "U";

	// Items principaux du footer (5 slots)
	const mainItems: NavItem[] = [
		{ title: "iProfil", url: "/my-space", icon: User },
		{ title: "iBoite", url: "/my-space/iboite", icon: Mail },
		// iAsted au centre — rendu separement
		{ title: "iDocument", url: "/my-space/idocument", icon: FileText },
		// Menu — rendu separement
	];

	// Items dans le sheet
	const sheetItems: NavItem[] = [
		{ title: "iAgenda", url: "/my-space/iagenda", icon: Calendar },
		{ title: "Mes Démarches", url: "/my-space/services-demarches", icon: Briefcase },
		{ title: t("mySpace.nav.settings"), url: "/my-space/settings", icon: Settings },
	];

	const isActive = (url: string) => {
		if (url === "/my-space") {
			return location.pathname === "/my-space" || location.pathname === "/my-space/";
		}
		return location.pathname.startsWith(url);
	};

	const isIAstedActive = isActive("/my-space/iasted");
	const hasSheetActive = sheetItems.some(i => isActive(i.url)) || (children.length > 0 && location.pathname.startsWith("/my-space/children"));

	const handleLogout = async () => {
		setSheetOpen(false);
		await authClient.signOut();
		window.location.href = "/";
	};

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

						{/* iAsted — centre sureleve */}
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
									<X className="h-4.5 w-4.5 text-primary" />
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

			{/* ── Sheet menu complet ── */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[75vh] px-4 bg-card border-t border-border">
					<SheetHeader className="sr-only">
						<SheetTitle>{t("mySpace.nav.navigation")}</SheetTitle>
					</SheetHeader>

					<div className="space-y-4 pb-6">

						{/* ── Profil utilisateur + Quitter ── */}
						<div className="flex items-center gap-3 py-2">
							<div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
								<span className="text-sm font-bold text-white">{userInitial}</span>
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-foreground truncate">{userName}</p>
								<p className="text-xs text-muted-foreground truncate">{userEmail}</p>
							</div>
							<button
								type="button"
								onClick={handleLogout}
								className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/15 transition-colors shrink-0"
								title="Déconnexion"
							>
								<LogOut className="h-3.5 w-3.5" />
								<span>Quitter</span>
							</button>
						</div>

						<div className="h-px bg-border/50" />

						{/* ── Navigation ── */}
						<div className="grid grid-cols-3 gap-2">
							{sheetItems.map((item) => (
								<Link
									key={item.url}
									to={item.url}
									onClick={() => setSheetOpen(false)}
									className={cn(
										"flex flex-col items-center justify-center gap-1.5 p-3 text-center rounded-xl min-h-[68px] transition-colors",
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
								</Link>
							))}

							{/* Enfants — conditionnel */}
							{children.length > 0 && (
								<Link
									to="/my-space/children/$childId"
									params={{ childId: (children[0] as any)._id }}
									onClick={() => setSheetOpen(false)}
									className={cn(
										"flex flex-col items-center justify-center gap-1.5 p-3 text-center rounded-xl min-h-[68px] transition-colors relative",
										location.pathname.startsWith("/my-space/children")
											? "bg-primary/10 text-primary font-semibold"
											: "bg-muted text-muted-foreground hover:bg-muted/70",
									)}
								>
									<Users className={cn(
										"size-5",
										location.pathname.startsWith("/my-space/children") ? "text-primary" : "text-muted-foreground",
									)} />
									<span className="text-[11px] font-medium leading-tight">
										Enfants
									</span>
									<span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
										{children.length}
									</span>
								</Link>
							)}
						</div>

						<div className="h-px bg-border/50" />

						{/* ── Controles ── */}
						<div className="flex items-center gap-2">
							{/* Toggle langue */}
							<button
								type="button"
								onClick={() => i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")}
								className="flex items-center gap-2 flex-1 h-10 px-3 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
							>
								<Globe className="h-4 w-4 shrink-0" />
								<span className="text-xs font-semibold uppercase">{currentLang}</span>
							</button>

							{/* Toggle theme */}
							<button
								type="button"
								onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
								className="flex items-center gap-2 flex-1 h-10 px-3 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
							>
								{theme === "dark" ? (
									<Sun className="h-4 w-4 text-amber-500 shrink-0" />
								) : (
									<Moon className="h-4 w-4 shrink-0" />
								)}
								<span className="text-xs font-semibold">{theme === "dark" ? "Clair" : "Sombre"}</span>
							</button>
						</div>

						{/* ── CTA ── */}
						<Button
							className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white border-0"
							onClick={() => setSheetOpen(false)}
							asChild
						>
							<Link to="/services">
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
