/**
 * Affaires Consulaires — Fusion Demandes + Registre Consulaire
 *
 * Page unique avec 2 tabs horizontaux embarquant les composants existants.
 * Les routes /requests et /consular-registry restent fonctionnelles.
 */

import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, IdCard, Users } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// Imports lazy des pages existantes
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const RequestsPage = lazy(() =>
	import("./requests/index").then((m) => ({ default: m.Route.options.component as React.ComponentType })),
);
const ConsularRegistryPage = lazy(() =>
	import("./consular-registry/index").then((m) => ({ default: m.Route.options.component as React.ComponentType })),
);

export const Route = createFileRoute("/_app/affaires-consulaires")({
	component: AffairesConsulairesPage,
});

const TABS = [
	{ id: "demandes", label: "Demandes", icon: ClipboardList },
	{ id: "registre", label: "Registre Consulaire", icon: IdCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AffairesConsulairesPage() {
	const [activeTab, setActiveTab] = useState<TabId>("demandes");

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 h-full">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
						<Users className="h-5 w-5 text-blue-500" />
					</div>
					<div>
						<h1 className="text-xl font-bold">Affaires Consulaires</h1>
						<p className="text-sm text-muted-foreground">
							Gestion des demandes et du registre consulaire
						</p>
					</div>
				</div>
			</motion.div>

			{/* Tabs */}
			<div className="flex items-center gap-1 border border-border/50 rounded-xl bg-card p-1">
				{TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
								isActive
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0">
				<Suspense
					fallback={
						<div className="flex items-center justify-center h-64">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					}
				>
					{activeTab === "demandes" && <RequestsPage />}
					{activeTab === "registre" && <ConsularRegistryPage />}
				</Suspense>
			</div>
		</div>
	);
}
