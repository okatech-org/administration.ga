"use client";

import { Link, usePathname } from "@workspace/routing";
import {
	BarChart3,
	Calendar,
	ChevronsLeft,
	ChevronsRight,
	CreditCard,
	Eye,
	FileText,
	FolderOpen,
	Globe2,
	Handshake,
	Home,
	Mailbox,
	MessagesSquare,
	Moon,
	Network,
	Newspaper,
	Settings2,
	Sun,
	UserCircle,
	Users,
	Users2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useCanDoTask } from "../hooks/useCanDoTask";
import { useModuleAccessLevel } from "../hooks/useModuleAccessLevel";
import { useOrgModules } from "../hooks/useOrgModules";
import { useAuthClient } from "./auth-client-provider";
import { LogoutButton } from "./logout-button";
import { useOrg } from "./org-provider";
import { OrgSwitcher } from "./org-switcher";
import { UnifiedSearchTrigger } from "./unified-search";

export interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
	requires?: string; // task code required to see this item
	moduleCode?: string; // module code for access level detection
}

export interface NavSection {
	label?: string;
	items: NavItem[];
}

export interface OrgSidebarProps {
	isExpanded?: boolean;
	onToggle?: () => void;
	/**
	 * Nav sections injected by the host app (e.g. agent-desktop adds
	 * "Impression" which doesn't exist on web). Appended after the shared
	 * sections, before "Administration".
	 */
	extraSections?: NavSection[];
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
				"truncate text-[15.5px] font-semibold whitespace-nowrap transition-opacity duration-200",
				isExpanded ? "opacity-100 delay-100" : "opacity-0 w-0 overflow-hidden",
				className,
			)}
		>
			{children}
		</span>
	);
}

export function OrgSidebar({ isExpanded = false, onToggle, extraSections }: OrgSidebarProps) {
	const authClient = useAuthClient();
	const { data: session } = authClient.useSession();
	const pathname = usePathname();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { activeOrgId } = useOrg();
	const { canDo, isReady } = useCanDoTask(activeOrgId ?? undefined);
	const { isReadOnly } = useModuleAccessLevel(activeOrgId ?? undefined);
	const { isModuleEnabled } = useOrgModules();

	const navSections: NavSection[] = [
		{
			label: "Commandes",
			items: [
				{ title: "Dashboard", url: "/", icon: Home },
				{ title: "iProfil", url: "/iprofil", icon: UserCircle, moduleCode: "profile" },
			],
		},
		{
			label: "Opérations",
			items: [
				{ title: "Affaires Diplomatiques", url: "/affaires-diplomatiques", icon: Globe2, requires: "intelligence.view", moduleCode: "diplomatic_affairs" },
				{ title: "Affaires Consulaires", url: "/affaires-consulaires", icon: Users, requires: "requests.view", moduleCode: "consular_affairs" },
				{ title: "Actualités", url: "/posts", icon: Newspaper, requires: "communication.publish", moduleCode: "news" },
			],
		},
		{
			label: "iBureau",
			items: [
				{ title: "iCorrespondance", url: "/icorrespondance", icon: FolderOpen, requires: "correspondance.view", moduleCode: "correspondence" },
				{ title: "iDocument", url: "/idocument", icon: FileText, requires: "documents.view", moduleCode: "documents" },
				{ title: "iAgenda", url: "/iagenda", icon: Calendar, requires: "appointments.view", moduleCode: "calendar" },
				{ title: "iCom", url: "/icom", icon: MessagesSquare, moduleCode: "messaging" },
			],
		},
		{
			label: "Gestion",
			items: [
				{ title: "Équipe", url: "/team", icon: Users2, requires: "team.view", moduleCode: "team" },
				{ title: "Paiements", url: "/payments", icon: CreditCard, requires: "finance.view", moduleCode: "payments" },
				{ title: "Statistiques", url: "/statistics", icon: BarChart3, requires: "analytics.view", moduleCode: "statistics" },
			],
		},
		{
			// Réseau diplomatique — visible uniquement pour les organismes de
			// type ministry (les modules network_* ne peuvent être activés
			// qu'à ce niveau, le filtre `isModuleEnabled` les masque ailleurs).
			label: "Réseau diplomatique",
			items: [
				{ title: "Pipeline réseau", url: "/network/diplomatic-pipeline", icon: Network, requires: "network.diplomatic.view", moduleCode: "network_diplomatic_oversight" },
				{ title: "Correspondance réseau", url: "/network/correspondence", icon: Mailbox, requires: "network.correspondence.view", moduleCode: "network_correspondence_oversight" },
				{ title: "Intelligence réseau", url: "/network/intelligence", icon: BarChart3, requires: "network.intelligence.view", moduleCode: "network_intelligence" },
			],
		},
		...(extraSections ?? []),
		{
			label: "Administration",
			items: [
				{ title: "Paramètres", url: "/settings", icon: Settings2, requires: "settings.view", moduleCode: "settings" },
			],
		},
	];

	// Filter sections and their items based on org modules + permissions
	const filteredSections = navSections
		.map((section) => ({
			...section,
			items: section.items.filter((item) => {
				// 1. Module actif dans l'org ?
				if (item.moduleCode && !isModuleEnabled(item.moduleCode)) return false;
				// 2. Permission utilisateur ?
				if (item.requires && !(isReady && canDo(item.requires))) return false;
				return true;
			}),
		}))
		.filter((section) => section.items.length > 0);

	const isActive = (url: string) => {
		if (url === "/") {
			return pathname === "/";
		}
		return !!pathname && pathname.startsWith(url);
	};

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const toggleLanguage = () => {
		i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");
	};

	const userName = session?.user?.name || "User";
	const userEmail = session?.user?.email || "";
	// biome-ignore lint/suspicious/noExplicitAny: image optional on SharedAuthClient
	const userAvatar = ((session?.user as any)?.image as string | undefined) || "";

	return (
		<TooltipProvider delayDuration={100}>
			<aside
				data-slot="sidebar"
				className={cn(
					"flex flex-col py-3 px-3 h-full overflow-hidden",
					"transition-[width] duration-300 ease-in-out",
					isExpanded ? "w-56 items-stretch" : "w-[68px] items-center",
				)}
			>
				{/* Org Switcher */}
				<div className={cn("mb-3", isExpanded ? "px-0" : "")}>
					{isExpanded ? (
						<OrgSwitcher />
					) : (
						<Link href="/" className="flex items-center justify-center">
							<div className="size-12 shrink-0 rounded-full bg-[#FDFCFA] dark:bg-[#21201E]/77 flex items-center justify-center overflow-hidden">
								<img
									src="/icons/apple-icon.png"
									alt="Logo"
									className="w-full h-full object-contain"
								/>
							</div>
						</Link>
					)}
				</div>

				{/* Recherche unifiée (Phase 5 — alignement iCorr ↔ iDoc) */}
				<div className={cn("mb-4", isExpanded ? "px-0" : "")}>
					<UnifiedSearchTrigger expanded={isExpanded} />
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
											? "border-t border-foreground/5 pt-2"
											: "border-t border-foreground/5 pt-2 w-8",
									)}
								/>
							)}

							{/* Section label (expanded only) */}
							{isExpanded && section.label && (
								<span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1 block">
									{section.label}
								</span>
							)}

							{/* Items */}
							{section.items.map((item) => {
								const active = isActive(item.url);
								const readOnly = item.moduleCode ? isReadOnly(item.moduleCode) : false;
								const button = (
									<Button
										asChild
										variant="ghost"
										size={isExpanded ? "default" : "icon"}
										className={cn(
											"transition-all duration-200 active:scale-[0.97]",
											isExpanded
												? "w-full justify-start gap-3 px-3 h-11 rounded-lg"
												: "w-11 h-11 rounded-full",
											active
												? "bg-primary/10 dark:bg-primary/20 text-primary font-bold hover:bg-primary/15 hover:text-primary"
												: "text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/50",
											readOnly && "opacity-70",
										)}
									>
										<Link href={item.url}>
											<item.icon className="size-5 shrink-0" />
											<SidebarText isExpanded={isExpanded}>
												{item.title}
											</SidebarText>
											{/* Indicateur lecture seule */}
											{isExpanded && readOnly && (
												<Eye className="size-3 text-blue-500/60 ml-auto shrink-0" />
											)}
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
						"flex flex-col gap-1.5 pt-4 border-t border-foreground/5",
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
							className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-9 px-2 active:scale-[0.97] transition-transform"
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
									className="h-9 w-9 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
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
									className="h-9 w-9 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
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
							"flex items-center gap-3 pt-2 border-t border-foreground/5",
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
