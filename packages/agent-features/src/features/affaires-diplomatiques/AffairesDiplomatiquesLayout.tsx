"use client";

/**
 * Affaires Diplomatiques — Layout Route
 *
 * Pipeline IA en 5 phases : Cibles → Plan → Lettre → Rapport → Projet
 * Affiche le stepper de navigation + Outlet pour les sous-routes.
 */

import React from "react";
import { api } from "@convex/_generated/api";
import { Link, usePathname } from "@workspace/routing";
import { Globe2, LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";
import { useOrg } from "../../shell/org-provider";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import {
	PipelineStepper,
	type PhaseCounts,
} from "./_shared/PipelineStepper";

export default function AffairesDiplomatiquesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { activeOrgId } = useOrg();
	const pathname = usePathname();

	// Compteurs par phase pour le stepper
	const { data: overview } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.getPipelineOverview,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const counts: PhaseCounts | undefined = overview
		? {
				targeting: overview.phases.targeting,
				strategy: overview.phases.strategy,
				outreach: overview.phases.outreach,
				reporting: overview.phases.reporting,
				project: overview.phases.project,
				unassigned: overview.phases.unassigned,
			}
		: undefined;

	const isIndex =
		pathname === "/affaires-diplomatiques" ||
		pathname === "/affaires-diplomatiques/";

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 h-full overflow-y-auto citizen-scrollbar">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
						<Globe2 className="h-5 w-5 text-emerald-500" />
					</div>
					<div>
						<h1 className="text-xl font-bold">Affaires Diplomatiques</h1>
						<p className="text-sm text-muted-foreground">
							Pipeline IA — Cibles, Stratégie, Contact, Rapports, Projets
						</p>
					</div>
				</div>
				<Link
					href="/affaires-diplomatiques"
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
						isIndex
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
					)}
				>
					<LayoutDashboard className="h-4 w-4" />
					Vue d'ensemble
				</Link>
			</motion.div>

			{/* Pipeline Stepper */}
			<div className="border border-border/50 rounded-xl bg-card p-1">
				<PipelineStepper counts={counts} />
			</div>

			{/* Outlet — sous-routes par phase */}
			<div className="flex-1 min-h-0">{children}</div>
		</div>
	);
}
