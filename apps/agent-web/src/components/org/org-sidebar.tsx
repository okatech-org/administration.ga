"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	Calendar,
	ChevronsLeft,
	ChevronsRight,
	FileText,
	FolderOpen,
	Globe2,
	Home,
	Mail,
	Moon,
	Newspaper,
	Settings2,
	Sun,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { LogoutButton } from "@/components/sidebars/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useOrg } from "./org-provider";
import { OrgSwitcher } from "./org-switcher";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
	requires?: string; // task code required to see this item
}

interface NavSection {
	label?: string;
	items: NavItem[];
}

interface OrgSidebarProps {
	isExpanded?: boolean;
	onToggle?: () => void;
}

/**
 * Text that fades in/out smoothly when the sidebar expands/collapses.
 * Always stays in the DOM — uses opacity + width transitions instead of
 * conditional rendering to avoid jarring layout shifts.
 */
function SidebarText({
	isExpanded,
	children,
	className,
}: {
	isExpanded: boolean;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"truncate text-sm whitespace-nowrap transition-opacity duration-200",
				isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0 overflow-hidden",
				className,
			)}
		>
			{children}
		</span>
	);
}

export function OrgSidebar({ isExpanded = false, onToggle }: OrgSidebarProps) {
	const { data: session } = authClient.useSession();
	const location = useLocation();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { activeOrgId } = useOrg();
	const { canDo, isReady } = useCanDoTask(activeOrgId ?? undefined);

	const navSections: NavSection[] = [
		{
			label: "Commandes",
			items: [
				{ title: "Dashboard", url: "/", icon: Home },
			],
		},
		{
			label: "Opérations",
			items: [
				{ title: "Affaires Diplomatiques", url: "/affaires-diplomatiques", icon: Globe2 },
				{ title: "Affaires Consulaires", url: "/affaires-consulaires", icon: Users, requires: "requests.view" },
				{ title: "Gestion Actualités", url: "/posts", icon: Newspaper, requires: "communication.publish" },
			],
		},
		{
			label: "iBureau",
			items: [
				{ title: "iBoîte", url: "/iboite", icon: Mail },
				{ title: "iCorrespondance", url: "/icorrespondance", icon: FolderOpen },
				{ title: "iDocument", url: "/idocument", icon: FileText },
				{ title: "iAgenda", url: "/iagenda", icon: Calendar },
			],
		},
		{
			label: "Administration",
			items: [
				{ title: "Paramètres", url: "/settings", icon: Settings2 },
			],
		},
	];

	// Filter sections and their items based on permissions
	const filteredSections = navSections
		.map((section) => ({
			...section,
			items: section.items.filter(
				(item) => !item.requires || (isReady && canDo(item.requires)),
			),
		}))
		.filter((section) => section.items.length > 0);

	const isActive = (url: string) => {
		if (url === "/") {
			return location.pathname === "/";
		}
		return location.pathname.startsWith(url);
	};

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const toggleLanguage = () => {
		i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");
	};

	const userName = session?.user?.name || "User";
	const userEmail = session?.user?.email || "";
	const userAvatar = session?.user?.image || "";

	return (
		<TooltipProvider delayDuration={100}>
			<aside
				data-slot="sidebar"
				className={cn(
					"flex flex-col py-3 px-4 bg-card border border-border h-full overflow-hidden",
					"rounded-2xl transition-[width] duration-300 ease-in-out",
					isExpanded ? "w-60 items-stretch" : "w-16 items-center",
				)}
			>
				{/* Org Switcher */}
				<div className={cn("mb-4", isExpanded ? "px-0" : "")}>
					{isExpanded ? (
						<OrgSwitcher />
					) : (
						<Link to="/" className="flex items-center justify-center">
							<div className="size-12 shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
								<img
									src="/icons/apple-icon.png"
									alt="Logo"
									className="w-full h-full object-contain"
								/>
							</div>
						</Link>
					)}
				</div>

				{/* Navigation Items */}
				<nav
					className={cn(
						"flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden",
						!isExpanded && "items-center",
					)}
				>
					{filteredSections.map((section, sectionIdx) => (
						<div key={section.label ?? `section-${sectionIdx}`}>
							{/* Section separator */}
							{sectionIdx > 0 && (
								<div
									className={cn(
										"my-2",
										isExpanded
											? "border-t border-border/40 pt-2"
											: "border-t border-border/40 pt-2 w-8",
									)}
								/>
							)}

							{/* Section label (expanded only) */}
							{isExpanded && section.label && (
								<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1 block">
									{section.label}
								</span>
							)}

							{/* Items */}
							{section.items.map((item) => {
								const active = isActive(item.url);
								const button = (
									<Button
										asChild
										variant="ghost"
										size={isExpanded ? "default" : "icon"}
										className={cn(
											"transition-all duration-200",
											isExpanded
												? "w-full justify-start gap-3 px-3 h-10 rounded-xl"
												: "w-11 h-11 rounded-full",
											active
												? "bg-primary/10 text-primary border border-primary/20 font-semibold hover:bg-primary/15 hover:text-primary"
												: "text-muted-foreground hover:text-foreground hover:bg-muted",
										)}
									>
										<Link to={item.url}>
											<item.icon className="size-5 shrink-0" />
											<SidebarText isExpanded={isExpanded}>
												{item.title}
											</SidebarText>
											{!isExpanded && (
												<span className="sr-only">{item.title}</span>
											)}
										</Link>
									</Button>
								);

								// In collapsed mode, wrap with Tooltip
								if (!isExpanded) {
									return (
										<Tooltip key={item.title}>
											<TooltipTrigger asChild>{button}</TooltipTrigger>
											<TooltipContent side="right" sideOffset={10}>
												{item.title}
											</TooltipContent>
										</Tooltip>
									);
								}

								return <div key={item.title}>{button}</div>;
							})}
						</div>
					))}
				</nav>

				{/* Bottom Controls */}
				<div
					className={cn(
						"flex flex-col gap-1.5 pt-4 border-t border-border/50",
						!isExpanded && "items-center",
					)}
				>
					{/* Language + Collapse + Dark Mode row */}
					<div
						className={`flex items-center gap-1 px-1${!isExpanded ? " flex-col" : ""}`}
					>
						{/* Language Toggle */}
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleLanguage}
							className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-9 px-2"
						>
							<span className="text-base leading-none">
								{currentLang === "fr" ? "🇫🇷" : "🇬🇧"}
							</span>
							<span className="text-xs font-medium uppercase">
								{currentLang}
							</span>
						</Button>

						<div className="flex-1" />

						{/* Toggle Sidebar Button */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 text-muted-foreground hover:text-foreground"
									onClick={onToggle}
								>
									{isExpanded ? (
										<ChevronsLeft className="size-4" />
									) : (
										<ChevronsRight className="size-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{isExpanded
									? t("mySpace.nav.collapse")
									: t("mySpace.nav.expand")}
							</TooltipContent>
						</Tooltip>

						{/* Dark Mode Toggle */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
									className="h-9 w-9 text-muted-foreground hover:text-foreground"
								>
									{theme === "dark" ? (
										<Sun className="size-4" />
									) : (
										<Moon className="size-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{theme === "dark" ? t("theme.light") : t("theme.dark")}
							</TooltipContent>
						</Tooltip>
					</div>

					<div
						className={cn(
							"flex items-center gap-3 pt-2 border-t border-border/50",
							isExpanded ? "px-1" : "justify-center",
						)}
					>
						<Avatar className="h-9 w-9 rounded-full shrink-0">
							<AvatarImage src={userAvatar} alt={userName} />
							<AvatarFallback className="rounded-full text-xs">
								{userName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()
									.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						{isExpanded && (
							<>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{userName}</p>
									<p className="text-xs text-muted-foreground truncate">
										{userEmail}
									</p>
								</div>
								<LogoutButton />
							</>
						)}
						{!isExpanded && <LogoutButton tooltipSide="right" />}
					</div>
				</div>
			</aside>
		</TooltipProvider>
	);
}
