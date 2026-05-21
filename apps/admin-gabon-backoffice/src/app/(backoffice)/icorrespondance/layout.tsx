"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Globe2, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";

/**
 * Layout iCorrespondance — sous-menu horizontal pour les 3 vues :
 *   - Réseau (super_admin / admin_system uniquement)
 *   - Exploitation (tous)
 *   - Réglages (tous)
 *
 * Remplace le dropdown précédemment affiché dans la sidebar : la navigation
 * inter-vues reste à un seul clic mais ne pollue plus le menu principal.
 */

type TabDef = {
	href: string;
	label: string;
	icon: LucideIcon;
	/** Restreint l'onglet à super_admin / admin_system. */
	networkOnly?: boolean;
};

const TABS: TabDef[] = [
	{
		href: "/icorrespondance/network",
		label: "Réseau",
		icon: Globe2,
		networkOnly: true,
	},
	{
		href: "/icorrespondance/operate",
		label: "Exploitation",
		icon: FolderOpen,
	},
	{
		href: "/icorrespondance/settings",
		label: "Réglages",
		icon: Settings,
	},
];

export default function ICorrespondanceLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { isSuperAdmin, isAdminSystem } = useCurrentAdminRole();
	const canSeeNetwork = isSuperAdmin || isAdminSystem;

	const visibleTabs = TABS.filter((t) => !t.networkOnly || canSeeNetwork);

	return (
		<div className="flex flex-col">
			<nav
				role="tablist"
				aria-label="iCorrespondance"
				className="mb-4 flex items-center gap-1 border-b border-border/60"
			>
				{visibleTabs.map((tab) => {
					// Active si le pathname est exactement la cible OU commence par
					// la cible suivie de "/" (sous-routes futures).
					const active =
						pathname === tab.href || pathname.startsWith(`${tab.href}/`);
					const Icon = tab.icon;
					return (
						<Link
							key={tab.href}
							href={tab.href}
							role="tab"
							aria-selected={active}
							className={cn(
								"-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
								active
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</Link>
					);
				})}
			</nav>
			<div>{children}</div>
		</div>
	);
}
