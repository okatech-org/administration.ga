"use client";

import {
	Edit,
	ExternalLink,
	FileText,
	Mail,
	Package,
	Phone,
	Settings2,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
	orgId: Id<"orgs">;
	orgSlug: string;
}

/**
 * W-J — Raccourcis d'administration. Réservé super-admin.
 */
export function QuickActions({ orgId, orgSlug }: QuickActionsProps) {
	const { t } = useTranslation();

	const actions = [
		{
			icon: Edit,
			label: t(
				"superadmin.organizations.overview.quickActions.edit",
				"Modifier",
			),
			href: `/reps/${orgId}/edit`,
			external: false,
		},
		{
			icon: ExternalLink,
			label: t(
				"superadmin.organizations.overview.quickActions.public",
				"Page publique",
			),
			href: `/reps/${orgSlug}`,
			external: true,
		},
		{
			icon: Package,
			label: t(
				"superadmin.organizations.overview.quickActions.modules",
				"Modules",
			),
			href: `/reps/${orgId}?tab=modules`,
			external: false,
		},
		{
			icon: Phone,
			label: t(
				"superadmin.organizations.overview.quickActions.calls",
				"Lignes d'appel",
			),
			href: `/reps/${orgId}?tab=calls`,
			external: false,
		},
		{
			icon: FileText,
			label: t(
				"superadmin.organizations.overview.quickActions.services",
				"Services",
			),
			href: `/reps/${orgId}?tab=services`,
			external: false,
		},
		{
			icon: Mail,
			label: t(
				"superadmin.organizations.overview.quickActions.correspondance",
				"Correspondance",
			),
			href: `/correspondance?orgId=${orgId}`,
			external: false,
		},
	];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Zap className="h-4 w-4" />}
					iconBgClass="bg-amber-500/10"
					iconTextClass="text-amber-600 dark:text-amber-400"
					title={t(
						"superadmin.organizations.overview.quickActions.title",
						"Actions rapides",
					)}
				/>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
					{actions.map((action) => (
						<Button
							key={action.label}
							asChild
							variant="outline"
							size="sm"
							className="justify-start font-normal h-auto py-2 hover:bg-muted"
						>
							{action.external ? (
								<a
									href={action.href}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<action.icon className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate text-xs">{action.label}</span>
								</a>
							) : (
								<Link
									href={action.href}
									className="flex items-center gap-2"
								>
									<action.icon className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate text-xs">{action.label}</span>
								</Link>
							)}
						</Button>
					))}
					<Button
						asChild
						variant="outline"
						size="sm"
						className="justify-start font-normal h-auto py-2 hover:bg-muted"
					>
						<Link
							href={`/reps/${orgId}?tab=settings`}
							className="flex items-center gap-2"
						>
							<Settings2 className="h-3.5 w-3.5 shrink-0" />
							<span className="truncate text-xs">
								{t(
									"superadmin.organizations.overview.quickActions.settings",
									"Paramètres",
								)}
							</span>
						</Link>
					</Button>
				</div>
			</div>
		</FlatCard>
	);
}
