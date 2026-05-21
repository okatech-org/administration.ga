"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
	Activity,
	Archive,
	Award,
	BookOpen,
	Building2,
	Calendar,
	ChevronDown,
	FileText,
	FolderOpen,
	Files,
	Globe,
	Globe2,
	LayoutDashboard,
	LayoutGrid,
	LifeBuoy,
	LogOut,
	Moon,
	Newspaper,
	Palette,
	ScrollText,
	Settings,
	Shield,
	Sun,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
	title: string;
	url: string;
	icon: React.ElementType;
	moduleCode?: string;
	badge?: string;
	count?: number;
	/**
	 * Sous-items affichés en accordéon. Quand présents, cliquer sur l'item
	 * parent déploie la liste au lieu de naviguer ; les enfants restent des
	 * liens normaux. Utilisé pour iCorrespondance (Réseau / Exploitation /
	 * Réglages).
	 */
	children?: NavItem[];
};

type NavSection = {
	label: string;
	items: NavItem[];
};

/**
 * Sidebar Super-Admin V2 — adopte le design language warm-beige.
 * Conserve la structure de navigation existante + module-gating + i18n
 * + theme toggle + déconnexion. Le rendu visuel est piloté par
 * `dashboard-v2.css` (classes `.sa-*`).
 */
export function SuperadminSidebarV2() {
	const pathname = usePathname();
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const user = useSuperAdminData();
	const [logoutOpen, setLogoutOpen] = useState(false);

	const sections: NavSection[] = [
		{
			label: "Réseau",
			items: [
				{
					title: t("superadmin.nav.dashboard", "Tableau de bord"),
					url: "/",
					icon: LayoutDashboard,
				},
				{
					title: t("superadmin.nav.representations", "Administrations"),
					url: "/reps",
					icon: Building2,
					moduleCode: "team",
				},
				{
					title: t(
						"superadmin.nav.affairesConsulaires",
						"Démarches administratives",
					),
					url: "/affaires-consulaires",
					icon: Globe,
					moduleCode: "consular_affairs",
				},
				{
					title: t(
						"superadmin.nav.affairesDiplomatiques",
						"Pilotage stratégique",
					),
					url: "/affaires-diplomatiques",
					icon: Globe2,
					moduleCode: "diplomatic_affairs",
				},
			],
		},
		{
			label: "Population",
			items: [
				{
					title: t("superadmin.nav.users", "Utilisateurs"),
					url: "/users",
					icon: Users,
					moduleCode: "team",
				},
				{
					title: "Corps Diplomatique",
					url: "/corps-diplomatique",
					icon: Shield,
					moduleCode: "team",
				},
				{
					title: t("superadmin.nav.skills", "Compétences & Métiers"),
					url: "/skills",
					icon: Award,
				},
			],
		},
		{
			label: "iBureau",
			items: [
				{
					// Item simple — les sous-vues (Réseau / Exploitation /
					// Réglages) sont rendues comme onglets horizontaux DANS
					// la page via `app/(backoffice)/icorrespondance/layout.tsx`,
					// pas comme accordéon dans la sidebar.
					title: "iCorrespondance",
					url: "/icorrespondance",
					icon: FolderOpen,
					moduleCode: "correspondence",
				},
				{
					title: "iDocument",
					url: "/idocument",
					icon: FileText,
					moduleCode: "documents",
				},
				{
					title: "iArchive",
					url: "/iarchive",
					icon: Archive,
					moduleCode: "documents",
				},
				{
					title: "Modèles de documents",
					url: "/config/templates",
					icon: Files,
					moduleCode: "documents",
				},
				{
					title: "iAgenda",
					url: "/iagenda",
					icon: Calendar,
					moduleCode: "calendar",
				},
			],
		},
		{
			label: "Éditorial",
			items: [
				{
					title: t("superadmin.nav.posts", "Actualités"),
					url: "/posts",
					icon: Newspaper,
					moduleCode: "news",
				},
				{
					title: t("superadmin.nav.tutorials", "Médiathèque"),
					url: "/tutorials",
					icon: Palette,
					moduleCode: "news",
				},
				{
					title: t("superadmin.nav.events", "Évènements"),
					url: "/events",
					icon: BookOpen,
					moduleCode: "community",
				},
			],
		},
		{
			label: "Gouvernance",
			items: [
				{
					// Catalogue National des Modules (Phase 5 administration.ga) :
					// vue en lecture du registre canonique + actions d'activation
					// globale (placeholders MVP).
					title: t(
						"superadmin.nav.catalogueModules",
						"Catalogue des Modules",
					),
					url: "/catalogue-modules",
					icon: LayoutGrid,
				},
			],
		},
		{
			label: "Sécurité & Système",
			items: [
				{
					title: t("superadmin.nav.auditLogs", "Journaux d'audit"),
					url: "/audit-logs",
					icon: ScrollText,
					moduleCode: "statistics",
				},
				{
					title: t("superadmin.nav.monitoring", "Monitoring"),
					url: "/monitoring",
					icon: Activity,
					moduleCode: "statistics",
				},
				{
					title: t("superadmin.nav.support", "Support & Tickets"),
					url: "/support",
					icon: LifeBuoy,
					moduleCode: "calendar",
				},
			],
		},
	];

	// Module-gating : super_admin / admin_system voient tout. Les admins avec
	// `allowedModules` ne voient que les items dont moduleCode est listé.
	const allowedModules = user.userData?.allowedModules as string[] | undefined;
	const hasModuleRestriction =
		!!allowedModules && allowedModules.length > 0 && !user.isSuperAdmin;

	const groups = hasModuleRestriction
		? sections
				.map((s) => ({
					...s,
					items: s.items.filter(
						(it) => !it.moduleCode || allowedModules.includes(it.moduleCode),
					),
				}))
				.filter((s) => s.items.length > 0)
		: sections;

	const isActive = (url: string) => {
		if (url === "/") return pathname === "/";
		return pathname === url || pathname.startsWith(`${url}/`);
	};

	const roleLabel =
		user.userData?.role === "admin_system"
			? "Administration Système"
			: user.userData?.role === "admin"
				? "Administration"
				: "Super Administration";

	const firstName = user.userData?.firstName ?? "";
	const lastName = user.userData?.lastName ?? "";
	const displayName =
		`${firstName} ${lastName}`.trim() || user.userData?.email || "Utilisateur";
	const email = user.userData?.email ?? "";
	const initials =
		(firstName[0] ?? "") + (lastName[0] ?? "") ||
		(email[0] ?? "U").toUpperCase();

	const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
	const toggleLang = () => {
		const next = i18n.language?.startsWith("en") ? "fr" : "en";
		i18n.changeLanguage(next);
	};

	return (
		<aside className="sa-sidebar">
			{/* Brand */}
			<Link href="/" className="sa-brand">
				<div className="logo-mark">G</div>
				<div style={{ minWidth: 0 }}>
					<div className="sa-brand-title">CONSULAT.GA</div>
					<div className="sa-brand-sub">{roleLabel}</div>
				</div>
			</Link>

			{/* Sections */}
			<nav className="sa-nav citizen-scrollbar">
				{groups.map((section) => (
					<div className="sa-section" key={section.label}>
						<div className="sa-section-label">{section.label}</div>
						{section.items.map((item) => (
							<SidebarItem
								key={item.url}
								item={item}
								isActive={isActive}
							/>
						))}
					</div>
				))}
			</nav>

			{/* Footer */}
			<div className="sa-footer">
				<div className="sa-footer-row">
					<button type="button" className="sa-lang" onClick={toggleLang}>
						<span style={{ fontSize: 14 }}>
							{i18n.language?.startsWith("en") ? "🇬🇧" : "🇫🇷"}
						</span>
						<span style={{ fontWeight: 600, fontSize: 11.5 }}>
							{i18n.language?.startsWith("en") ? "EN" : "FR"}
						</span>
						<ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
					</button>
					<div className="row items-center" style={{ gap: 4 }}>
						<Link
							href="/settings"
							className="sa-icon-btn"
							aria-label={t("superadmin.nav.settings", "Paramètres")}
							title={t("superadmin.nav.settings", "Paramètres")}
						>
							<Settings size={14} />
						</Link>
						<button
							type="button"
							className="sa-icon-btn"
							aria-label={
								theme === "dark"
									? t("theme.light", "Mode clair")
									: t("theme.dark", "Mode sombre")
							}
							onClick={toggleTheme}
						>
							{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
						</button>
					</div>
				</div>
				<div className="sa-user">
					<div
						className="avatar sm"
						style={{ background: "var(--gabon-green-v2)" }}
					>
						{initials.slice(0, 2).toUpperCase()}
					</div>
					<div className="sa-user-info">
						<div className="sa-user-name">{displayName}</div>
						<div className="sa-user-mail">{email}</div>
					</div>
					<button
						type="button"
						className="sa-icon-btn"
						aria-label={t("common.logout", "Déconnexion")}
						onClick={() => setLogoutOpen(true)}
					>
						<LogOut size={14} />
					</button>
				</div>
			</div>

			<AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.logoutConfirmTitle", "Confirmer la déconnexion")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"common.logoutConfirmDescription",
								"Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à votre espace.",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("common.cancel", "Annuler")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								captureEvent("user_logged_out");
								await authClient.signOut();
								window.location.href = "/";
							}}
						>
							{t("common.logout", "Déconnexion")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</aside>
	);
}

/**
 * Item sidebar individuel — gère le cas "feuille" (Link normal) ET le cas
 * "groupe expandable" quand `item.children` est défini. Le groupe est
 * auto-déplié si l'URL active correspond à un de ses enfants.
 */
function SidebarItem({
	item,
	isActive,
}: {
	item: NavItem;
	isActive: (url: string) => boolean;
}) {
	const hasChildren = item.children && item.children.length > 0;
	const childActive = hasChildren
		? item.children!.some((c) => isActive(c.url))
		: false;
	const [open, setOpen] = useState(childActive);
	const active = !hasChildren && isActive(item.url);
	const Icon = item.icon;

	// Si la route active passe à un enfant après le mount (navigation
	// directe), on déplie automatiquement.
	useEffect(() => {
		if (childActive) setOpen(true);
	}, [childActive]);

	if (!hasChildren) {
		return (
			<Link
				href={item.url}
				className={cn("sa-item", active && "is-active")}
			>
				<Icon size={16} strokeWidth={2} />
				<span className="sa-item-label">{item.title}</span>
				{item.badge && <span className="sa-item-badge">{item.badge}</span>}
				{typeof item.count === "number" && (
					<span className="sa-item-count">{item.count}</span>
				)}
			</Link>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={cn("sa-item", childActive && "is-active")}
				aria-expanded={open}
			>
				<Icon size={16} strokeWidth={2} />
				<span className="sa-item-label">{item.title}</span>
				<ChevronDown
					size={14}
					className={cn(
						"transition-transform",
						open && "rotate-180",
					)}
					style={{ color: "var(--text-muted)" }}
				/>
			</button>
			{open ? (
				<div className="sa-subnav" style={{ paddingLeft: 28 }}>
					{item.children!.map((child) => {
						const ChildIcon = child.icon;
						const childIsActive = isActive(child.url);
						return (
							<Link
								key={child.url}
								href={child.url}
								className={cn(
									"sa-item",
									childIsActive && "is-active",
								)}
							>
								<ChildIcon size={14} strokeWidth={2} />
								<span className="sa-item-label">{child.title}</span>
							</Link>
						);
					})}
				</div>
			) : null}
		</>
	);
}
