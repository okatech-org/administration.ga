"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Activity,
	BookOpen,
	Building2,
	Calendar,
	ChevronsLeft,
	ChevronsRight,
	Crown,
	FileText,
	FolderOpen,
	Globe,
	LayoutDashboard,
	LifeBuoy,
	Mail,
	Moon,
	Newspaper,
	ScrollText,
	Settings,
	Sun,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { LogoutButton } from "@/components/sidebars/logout-button";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────
interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
	/** Module code — when set, item is shown only if user has this module in allowedModules */
	moduleCode?: string;
}

interface NavSection {
	label: string;
	items: NavItem[];
}

interface SuperadminSidebarProps {
	isExpanded?: boolean;
	onToggle?: () => void;
}

// ─── Sub-components ─────────────────────────────────────

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
				"truncate text-sm whitespace-nowrap transition-opacity duration-200",
				isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0 overflow-hidden",
				className,
			)}
		>
			{children}
		</span>
	);
}

// ─── Main Component ─────────────────────────────────────
export function SuperadminSidebar({
	isExpanded = false,
	onToggle,
}: SuperadminSidebarProps) {
	const pathname = usePathname();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const user = useSuperAdminData();


	// ─── Navigation Sections (4 axes) ───────────────────
	const allNavSections: NavSection[] = [
		// ═══════════════════════════════════════════════════
		//  AXE 1 — RÉSEAU (Les Organismes)
		// ═══════════════════════════════════════════════════
		{
			label: "Réseau",
			items: [
				{
					title: t("superadmin.nav.dashboard"),
					url: "/",
					icon: LayoutDashboard,
					// Dashboard always visible — no moduleCode
				},
				{
					title: t("superadmin.nav.representations", "Représentations"),
					url: "/reps",
					icon: Building2,
					moduleCode: "team",
				},
				{
					title: t("superadmin.nav.affairesConsulaires", "Affaires Consulaires"),
					url: "/affaires-consulaires",
					icon: Globe,
					moduleCode: "requests",
				},
				{
					title: t("superadmin.nav.affairesDiplomatiques", "Affaires Diplomatiques"),
					url: "/affaires-diplomatiques",
					icon: Globe,
					moduleCode: "intelligence",
				},
				{
					title: t("superadmin.nav.associations", "Associations"),
					url: "/associations",
					icon: Building2,
					moduleCode: "associations",
				},
			],
		},

		// ═══════════════════════════════════════════════════
		//  AXE 2 — POPULATION (Les Utilisateurs)
		// ═══════════════════════════════════════════════════
		{
			label: "Population",
			items: [
				{
					title: t("superadmin.nav.users"),
					url: "/users",
					icon: Users,
					moduleCode: "profiles",
				},
				{
					title: t("superadmin.nav.support"),
					url: "/support",
					icon: LifeBuoy,
					moduleCode: "appointments",
				},
			],
		},

		// ═══════════════════════════════════════════════════
		//  AXE 3 — iBUREAU (Les Volets métier)
		// ═══════════════════════════════════════════════════
		{
			label: "iBureau",
			items: [
				{
					title: "iBoîte",
					url: "/iboite",
					icon: Mail,
					moduleCode: "digital_mail",
				},
				{
					title: "iCorrespondance",
					url: "/icorrespondance",
					icon: FolderOpen,
					moduleCode: "correspondance",
				},
				{
					title: "iDocument",
					url: "/idocument",
					icon: FileText,
					moduleCode: "documents",
				},
				{
					title: "iAgenda",
					url: "/iagenda",
					icon: Calendar,
					moduleCode: "appointments",
				},
			],
		},

		// ═══════════════════════════════════════════════════
		//  AXE 4 — SÉCURITÉ & SYSTÈME
		// ═══════════════════════════════════════════════════
		{
			label: "Sécurité & Système",
			items: [
				{
					title: t("superadmin.nav.auditLogs"),
					url: "/audit-logs",
					icon: ScrollText,
					moduleCode: "analytics",
				},
				{
					title: t("superadmin.nav.monitoring", "Monitoring"),
					url: "/monitoring",
					icon: Activity,
					moduleCode: "monitoring",
				},
				{
					title: t("superadmin.nav.settings"),
					url: "/settings",
					icon: Settings,
					moduleCode: "platform_settings",
				},
			],
		},

		// ═══════════════════════════════════════════════════
		//  AXE 5 — ÉDITORIAL (Contenu public)
		// ═══════════════════════════════════════════════════
		{
			label: "Éditorial",
			items: [
				{
					title: t("superadmin.nav.posts"),
					url: "/posts",
					icon: Newspaper,
					moduleCode: "communication",
				},
				{
					title: t("superadmin.nav.tutorials"),
					url: "/tutorials",
					icon: BookOpen,
					moduleCode: "tutorials",
				},
				{
					title: t("superadmin.nav.events"),
					url: "/events",
					icon: Calendar,
					moduleCode: "community_events",
				},
			],
		},
	];

	// ─── Module-based filtering ─────────────────────────
	// SuperAdmin/AdminSystem with no allowedModules restriction → see everything
	// Admins with specific allowedModules → only see items whose moduleCode is in the list
	const allowedModules = user.userData?.allowedModules as string[] | undefined;
	const hasModuleRestriction = !!allowedModules && allowedModules.length > 0 && !user.isSuperAdmin;

	const groups = hasModuleRestriction
		? allNavSections
				.map((section) => ({
					...section,
					items: section.items.filter(
						(item) => !item.moduleCode || allowedModules.includes(item.moduleCode),
					),
				}))
				.filter((section) => section.items.length > 0)
		: allNavSections;

	const isActive = (url: string) => {
		if (url === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(url);
	};

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const toggleLanguage = () => {
		i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");
	};

	return (
		<TooltipProvider delayDuration={100}>
			<aside
				data-slot="sidebar"
				className={cn(
					"flex flex-col py-3 px-3 h-full overflow-hidden",
					"transition-[width] duration-300 ease-in-out",
					isExpanded ? "w-64 items-stretch" : "w-[68px] items-center",
				)}
			>
				{/* ─── Logo ─────────────────────────────────── */}
				<div className={cn("mb-3", isExpanded ? "px-2" : "")}>
					<Link
						href="/"
						className={`flex items-center${isExpanded ? " gap-2" : ""}`}
					>
						<div className="size-10 shrink-0 rounded-full bg-[#FDFCFA] dark:bg-[#21201E] flex items-center justify-center overflow-hidden">
							<img
								src="/icons/apple-icon.png"
								alt="Logo"
								className="w-full h-full object-contain"
							/>
						</div>
						<div
							className={cn(
								"flex flex-col text-foreground transition-opacity duration-200 overflow-hidden whitespace-nowrap",
								isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0",
							)}
						>
							<span className="text-sm font-bold">CONSULAT.GA</span>
							<span className="text-foreground/60 text-xs">
								{user.userData?.role === "admin_system"
									? "Administration Système"
									: user.userData?.role === "admin"
										? "Administration"
										: "Super Administration"}
							</span>
						</div>
					</Link>
				</div>

				{/* ─── Navigation ───────────────────────────── */}
				<nav
					className={cn(
						"flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden citizen-scrollbar",
						!isExpanded && "items-center",
					)}
				>
					{groups.map((section, sectionIdx) => (
						<div key={section.label}>
							{/* Section separator */}
							{sectionIdx > 0 && (
								<div
									className={cn(
										"my-2",
										isExpanded
											? "border-t border-foreground/5 pt-2"
											: "border-t border-foreground/5 pt-2 w-8",
									)}
								/>
							)}

							{/* Section label (expanded only) */}
							{isExpanded && (
								<span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1 block">
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
											"transition-all duration-200 group/item",
											isExpanded
												? "w-full justify-start gap-3 px-3 h-9 rounded-xl"
												: "w-11 h-11 rounded-full",
											active
												? "bg-primary/10 text-primary font-bold hover:bg-primary/15 hover:text-primary"
												: "text-muted-foreground hover:text-foreground hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
										)}
									>
										<Link href={item.url}>
											<item.icon className="size-[18px] shrink-0" />
											<SidebarText isExpanded={isExpanded}>
												{item.title}
											</SidebarText>
											{!isExpanded && (
												<span className="sr-only">{item.title}</span>
											)}
										</Link>
									</Button>
								);

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

				{/* ─── Footer Controls ──────────────────────── */}
				<div
					className={cn(
						"flex flex-col gap-1.5 pt-3 border-t border-foreground/5",
						!isExpanded && "items-center",
					)}
				>
					{/* Language + Collapse + Dark Mode row */}
					<div
						className={
							`flex items-center gap-1 px-1${!isExpanded ? " flex-col" : ""}`
						}
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

					{/* User info + Logout */}
					<div
						className={cn(
							"flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#EBE6DC]/50 dark:bg-[#383633]/50",
							!isExpanded && "justify-center px-0 bg-transparent",
						)}
					>
						<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-xs font-bold text-primary">
								{user.userData?.firstName?.[0] || "A"}
							</span>
						</div>
						{isExpanded && (
							<>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate">
										{user.userData?.firstName && user.userData?.lastName
											? `${user.userData.firstName} ${user.userData.lastName}`
											: user.userData?.firstName || "Admin"}
									</p>
									<p className="text-[10px] text-muted-foreground truncate">
										{user.userData?.email || ""}
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
