"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	Baby,
	Bot,
	Briefcase,
	Calendar,
	ChevronDown,
	ChevronsLeft,
	ChevronsRight,
	FileText,
	Globe,
	Mail,
	Moon,
	Settings,
	Sun,
	User,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { LogoutButton } from "@/components/sidebars/logout-button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
	color?: string;
}

interface NavSection {
	label?: string;
	items: NavItem[];
}

interface MySpaceSidebarProps {
	isExpanded?: boolean;
	onToggle?: () => void;
}

/**
 * Text that fades in/out smoothly when the sidebar expands/collapses.
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
				"truncate text-[15px] whitespace-nowrap transition-opacity duration-200",
				isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0 overflow-hidden",
				className,
			)}
		>
			{children}
		</span>
	);
}

export function MySpaceSidebar({
	isExpanded = false,
	onToggle,
}: MySpaceSidebarProps) {
	const location = useLocation();
	const { data: session } = authClient.useSession();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();

	const isActive = (url: string) => {
		if (url === "/my-space") {
			return location.pathname === "/my-space" || location.pathname === "/my-space/";
		}
		return location.pathname.startsWith(url);
	};

	// Dynamic children data
	const { data: childProfiles } = useAuthenticatedConvexQuery(api.functions.childProfiles.getMine, {});
	const children = (childProfiles ?? []) as any[];
	const [childrenOpen, setChildrenOpen] = useState(false);

	const navSections: NavSection[] = [
		{
			label: t("mySpace.nav.sectionIdentity", "Identité"),
			items: [
				{
					title: "iProfil",
					url: "/my-space",
					icon: User,
				},
				{
					title: "iDocument",
					url: "/my-space/idocument",
					icon: FileText,
				},
			],
		},
		{
			label: t("mySpace.nav.sectionTools", "Outils"),
			items: [
				{
					title: "iBoîte",
					url: "/my-space/iboite",
					icon: Mail,
				},
				{
					title: "iAsted",
					url: "/my-space/iasted",
					icon: Bot,
				},
				{
					title: "iAgenda",
					url: "/my-space/iagenda",
					icon: Calendar,
				},
			],
		},
		{
			label: t("mySpace.nav.sectionRequests", "Demandes"),
			items: [
				{
					title: "Mes Démarches",
					url: "/my-space/services-demarches",
					icon: Briefcase,
				},
			],
		},
	];

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const toggleLanguage = () => {
		i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");
	};

	return (
		<TooltipProvider delayDuration={100}>
			<aside
				data-slot="sidebar"
				className={cn(
					" flex flex-col py-3 px-3 h-full overflow-hidden",
					"transition-[width] duration-300 ease-in-out",
					isExpanded ? "w-56 items-stretch" : "w-[68px] items-center",
				)}
			>
				{/* ─── Logo with Gabon branding ─── */}
				<div className={cn("mb-3", isExpanded ? "px-1" : "")}>
					<Link
						to="/"
						className={cn("flex items-center", isExpanded && "gap-2.5")}
					>
						<div className="size-11 shrink-0 rounded-xl  flex items-center justify-center overflow-hidden bg-white dark:bg-gray-800">
							<img
								src="/icons/apple-icon.png"
								alt="Logo"
								className="w-full h-full object-contain"
							/>
						</div>
						<div
							className={cn(
								"flex flex-col transition-opacity duration-200 overflow-hidden whitespace-nowrap",
								isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0",
							)}
						>
							<span className="text-sm font-bold  ">
								CONSULAT
							</span>
							<span className="text-[10px] text-muted-foreground font-medium">
								Espace Numérique
							</span>
						</div>
					</Link>
				</div>

				{/* Separator */}
				<div className={cn("border-t border-border mb-3", !isExpanded && "w-8 mx-auto")} />

				{/* ─── Navigation Items ─── */}
				<nav
					className={cn(
						"flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden citizen-scrollbar",
						!isExpanded && "items-center",
					)}
				>
					{navSections.map((section, sectionIdx) => (
						<div key={section.label ?? `section-${sectionIdx}`}>
							{/* Section separator */}
							{sectionIdx > 0 && (
								<div
									className={cn(
										"my-2.5",
										isExpanded
											? "border-t border-foreground/5 pt-2"
											: "border-t border-foreground/5 pt-2 w-8",
									)}
								/>
							)}

							{/* Section label (expanded only) */}
							{isExpanded && section.label && (
								<span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1.5 block">
									{section.label}
								</span>
							)}

							{/* Items */}
							{section.items.map((item) => {
								const active = isActive(item.url);
								const button = (
									<Link
										to={item.url}
										className={cn(
											" flex items-center transition-all duration-200",
											isExpanded
												? "w-full gap-3 px-3 h-10"
												: "w-11 h-11 justify-center",
											active && "active",
											active
												? "font-semibold text-teal-600 dark:text-teal-400"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<item.icon className={cn(
											"size-[18px] shrink-0 transition-colors",
											active && "text-teal-600 dark:text-teal-400",
										)} />
										<SidebarText isExpanded={isExpanded}>
											{item.title}
										</SidebarText>
										{!isExpanded && (
											<span className="sr-only">{item.title}</span>
										)}
										{/* Active indicator dot */}
										{active && isExpanded && (
											<div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
										)}
									</Link>
								);

								if (!isExpanded) {
									return (
										<Tooltip key={item.title}>
											<TooltipTrigger asChild>{button}</TooltipTrigger>
											<TooltipContent side="right" sideOffset={10} className=" bg-card border-0">
												{item.title}
											</TooltipContent>
										</Tooltip>
									);
								}

								return <div key={item.title}>{button}</div>;
							})}
						</div>
					))}

					{/* ─── Tuteur : Mes Enfants — Collapsible dropdown ─── */}
					{children.length > 0 && (
						<div>
							<div className={cn("my-2.5", isExpanded ? "border-t border-foreground/5 pt-2" : "border-t border-foreground/5 pt-2 w-8")} />

							{isExpanded && (
								<span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1.5 block">
									{t("mySpace.nav.sectionTutor", "Tuteur")}
								</span>
							)}

							{/* Toggle button */}
							{isExpanded ? (
								<>
									<button
										type="button"
										onClick={() => setChildrenOpen(!childrenOpen)}
										className={cn(
											" w-full flex items-center gap-3 px-3 h-10 transition-all duration-200 text-[15px]",
											childrenOpen
												? "active bg-pink-500/8 text-pink-600 font-semibold"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<Users className="size-[18px] shrink-0" />
										<span className="flex-1 text-left truncate">Mes Enfants</span>
										<span className="text-[8px] bg-pink-500/12 text-pink-500 font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
											{children.length}
										</span>
										<ChevronDown className={cn("size-3 transition-transform duration-200", childrenOpen && "rotate-180")} />
									</button>

									{/* Dropdown children list */}
									<div className={cn(
										"overflow-hidden transition-all duration-200 ease-in-out",
										childrenOpen ? "max-h-60 opacity-100 mt-0.5" : "max-h-0 opacity-0",
									)}>
										<div className="pl-4 space-y-0.5">
											{children.map((child: any) => {
												const childUrl = `/my-space/children/${child._id}`;
												const active = isActive(childUrl);
												return (
													<Link
														key={child._id}
														to={childUrl as any}
														className={cn(
															" flex items-center gap-2.5 px-3 h-9 text-[14px]",
															active
																? "active text-pink-600 font-semibold"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														<Baby className="size-4 shrink-0" />
														<span className="truncate">{child.identity?.firstName ?? "Enfant"}</span>
													</Link>
												);
											})}
										</div>
									</div>
								</>
							) : (
								/* Collapsed: single icon with tooltip */
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											title="Mes Enfants"
											aria-label="Mes Enfants"
											className={cn(
												"flex items-center justify-center w-11 h-11",
												children.some((c: any) => isActive(`/my-space/children/${c._id}`))
													? "active text-pink-600"
													: "text-muted-foreground hover:text-foreground",
											)}
											onClick={() => setChildrenOpen(!childrenOpen)}
										>
											<Users className="size-[18px]" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="right" sideOffset={10} className=" bg-card border-0">
										Mes Enfants ({children.length})
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					)}
					
					{/* ─── Paramètres ─── */}
					<div className={cn("mt-auto pb-2 min-h-[44px]", isExpanded ? "" : "")}>
						{isExpanded ? (
							<Link
								to="/my-space/settings"
								className={cn(
									" flex items-center transition-all duration-200 w-full gap-3 px-3 h-10",
									isActive("/my-space/settings") ? "active text-teal-600 dark:text-teal-400 font-semibold" : "text-muted-foreground hover:text-foreground"
								)}
							>
								<Settings className={cn("size-[18px] shrink-0 transition-colors", isActive("/my-space/settings") && "text-teal-600 dark:text-teal-400")} />
								<SidebarText isExpanded={isExpanded}>{t("mySpace.nav.settings")}</SidebarText>
								{isActive("/my-space/settings") && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
							</Link>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<Link
										to="/my-space/settings"
										className={cn(
											" flex items-center transition-all duration-200 w-11 h-11 justify-center",
											isActive("/my-space/settings") ? "active text-teal-600 dark:text-teal-400 font-semibold" : "text-muted-foreground hover:text-foreground"
										)}
									>
										<Settings className={cn("size-[18px] shrink-0 transition-colors", isActive("/my-space/settings") && "text-teal-600 dark:text-teal-400")} />
										<span className="sr-only">{t("mySpace.nav.settings")}</span>
									</Link>
								</TooltipTrigger>
								<TooltipContent side="right" sideOffset={10} className=" bg-card border-0">
									{t("mySpace.nav.settings")}
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</nav>

				{/* ─── Bottom Controls ─── */}
				<div
					className={cn(
						"flex flex-col gap-1.5 pt-3",
						!isExpanded && "items-center",
					)}
				>
					{/* Separator */}
					<div className={cn("border-t border-border mb-2", !isExpanded && "w-8")} />

					{/* Language + Collapse + Dark Mode row */}
					<div
						className={cn(
							"flex items-center gap-0.5 px-0.5",
							!isExpanded && "flex-col",
						)}
					>
						{/* Language Toggle */}
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={toggleLanguage}
									className=" flex items-center gap-1.5 h-9 px-2 text-muted-foreground hover:text-foreground"
								>
									<Globe className="size-3.5" />
									<span className="text-[10px] font-bold uppercase">
										{currentLang}
									</span>
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{currentLang === "fr" ? "Switch to English" : "Passer en Français"}
							</TooltipContent>
						</Tooltip>

						{isExpanded && <div className="flex-1" />}

						{/* Toggle Sidebar Button */}
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className=" flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground"
									onClick={onToggle}
								>
									{isExpanded ? (
										<ChevronsLeft className="size-4" />
									) : (
										<ChevronsRight className="size-4" />
									)}
								</button>
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
								<button
									type="button"
									onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
									className=" flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground"
								>
									{theme === "dark" ? (
										<Sun className="size-4 text-amber-500" />
									) : (
										<Moon className="size-4" />
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{theme === "dark" ? t("theme.light") : t("theme.dark")}
							</TooltipContent>
						</Tooltip>
					</div>

					{/* User info + Logout */}
					<div
						className={cn(
							"flex items-center gap-3 pt-2 mt-1",
							isExpanded ? "px-1" : "justify-center",
						)}
					>
						{/* Avatar with Gabon ring */}
						<div className="relative">
							<div className="size-9 rounded-xl  bg-teal-500/10 flex items-center justify-center shrink-0">
								<span className="text-xs font-bold text-teal-600 dark:text-teal-400">
									{session?.user?.name?.[0] || "U"}
								</span>
							</div>
							{/* Online indicator */}
							<div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-card" />
						</div>
						{isExpanded && (
							<>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-semibold truncate">
										{session?.user?.name || "Utilisateur"}
									</p>
									<p className="text-[10px] text-muted-foreground truncate">
										{session?.user?.email || ""}
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
