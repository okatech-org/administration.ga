import { Link, useLocation } from "@tanstack/react-router";
import {
	Bot,
	Calendar,
	ClipboardList,
	Home,
	Mail,
	Menu,
	Moon,
	Settings,
	Sun,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { LogoutButton } from "@/components/sidebars/logout-button";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
}

function NavBarItem({
	item,
	isActive,
}: {
	item: NavItem;
	isActive: boolean;
}) {
	const Icon = item.icon;
	return (
		<Link
			to={item.url}
			className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]"
		>
			<div
				className={cn(
					"h-7 w-7 rounded-lg flex items-center justify-center",
					isActive && "bg-primary/10",
				)}
			>
				<Icon
					className={cn(
						"h-4.5 w-4.5",
						isActive ? "text-primary" : "text-muted-foreground",
					)}
				/>
			</div>
			<span
				className={cn(
					"text-[9px] font-medium",
					isActive ? "text-primary" : "text-muted-foreground",
				)}
			>
				{item.title}
			</span>
		</Link>
	);
}

export function AgentMobileNav() {
	const location = useLocation();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const [sheetOpen, setSheetOpen] = useState(false);
	const { data: session } = authClient.useSession();

	const userName = session?.user?.name ?? "Agent";
	const userEmail = session?.user?.email ?? "";
	const userInitial = userName?.[0]?.toUpperCase() ?? "A";

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const mainItems: NavItem[] = [
		{ title: "Dashboard", url: "/", icon: Home },
		{ title: "Demandes", url: "/requests", icon: ClipboardList },
		{ title: "iBoite", url: "/iboite", icon: Mail },
		{ title: "iAgenda", url: "/iagenda", icon: Calendar },
	];

	const sheetItems: NavItem[] = [
		{ title: "Affaires Diplo.", url: "/affaires-diplomatiques", icon: Users },
		{ title: "Affaires Cons.", url: "/affaires-consulaires", icon: Users },
		{ title: "Paramètres", url: "/settings", icon: Settings },
	];

	const isActive = (url: string) => {
		if (url === "/") return location.pathname === "/";
		return location.pathname.startsWith(url);
	};

	const hasSheetActive = sheetItems.some((i) => isActive(i.url));

	return (
		<>
			{/* Fixed bottom nav */}
			<div className="fixed left-3 right-3 z-40 md:hidden bottom-[calc(0.8rem+env(safe-area-inset-bottom,0px))]">
				<div className="bg-[#F4F3ED] dark:bg-[#171616] backdrop-blur-md rounded-2xl">
					<div className="flex items-center justify-around px-2 h-[60px]">
						{mainItems.map((item) => (
							<NavBarItem
								key={item.url}
								item={item}
								isActive={isActive(item.url)}
							/>
						))}

						{/* iAsted FAB centre */}
						<button
							type="button"
							className="h-12 w-12 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 -mt-4 active:scale-[0.97] transition-transform"
						>
							<Bot className="h-6 w-6 text-white" />
						</button>

						{/* Menu button */}
						<button
							type="button"
							onClick={() => setSheetOpen(true)}
							className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]"
						>
							<div
								className={cn(
									"h-7 w-7 rounded-lg flex items-center justify-center",
									hasSheetActive && "bg-primary/10",
								)}
							>
								<Menu
									className={cn(
										"h-4.5 w-4.5",
										hasSheetActive
											? "text-primary"
											: "text-muted-foreground",
									)}
								/>
							</div>
							<span
								className={cn(
									"text-[9px] font-medium",
									hasSheetActive
										? "text-primary"
										: "text-muted-foreground",
								)}
							>
								Menu
							</span>
						</button>
					</div>
				</div>
			</div>

			{/* Bottom Sheet Menu */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent
					side="bottom"
					className="rounded-t-2xl max-h-[75dvh] px-4 bg-[#F4F3ED] dark:bg-[#171616] border-none"
				>
					<SheetHeader className="pb-3">
						<SheetTitle className="sr-only">Menu</SheetTitle>
					</SheetHeader>

					{/* User info */}
					<div className="flex items-center gap-3 mb-4">
						<div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
							<span className="text-sm font-bold text-white">
								{userInitial}
							</span>
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold truncate">{userName}</p>
							<p className="text-xs text-muted-foreground truncate">
								{userEmail}
							</p>
						</div>
					</div>

					<div className="h-px bg-border/50 mb-3" />

					{/* Menu grid */}
					<div className="grid grid-cols-3 gap-2 mb-4">
						{sheetItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.url);
							return (
								<Link
									key={item.url}
									to={item.url}
									onClick={() => setSheetOpen(false)}
									className={cn(
										"flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[68px]",
										active
											? "bg-primary/10 text-primary font-semibold"
											: "bg-muted text-muted-foreground hover:bg-muted/70",
									)}
								>
									<Icon className="size-5" />
									<span className="text-[11px] font-medium leading-tight text-center">
										{item.title}
									</span>
								</Link>
							);
						})}
					</div>

					<div className="h-px bg-border/50 mb-3" />

					{/* Actions row */}
					<div className="flex items-center justify-center gap-3">
						{/* Language toggle */}
						<Button
							variant="ghost"
							size="icon"
							onClick={() =>
								i18n.changeLanguage(currentLang === "fr" ? "en" : "fr")
							}
							className="h-10 w-10 rounded-full bg-muted active:scale-[0.97] transition-transform"
						>
							<span className="text-sm font-medium">
								{currentLang === "fr" ? "FR" : "EN"}
							</span>
						</Button>

						{/* Theme toggle */}
						<Button
							variant="ghost"
							size="icon"
							onClick={() =>
								setTheme(theme === "dark" ? "light" : "dark")
							}
							className="h-10 w-10 rounded-full bg-muted active:scale-[0.97] transition-transform"
						>
							{theme === "dark" ? (
								<Sun className="size-4" />
							) : (
								<Moon className="size-4" />
							)}
						</Button>

						{/* Logout */}
						<LogoutButton />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
