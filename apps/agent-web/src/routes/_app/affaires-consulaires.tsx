/**
 * Affaires Consulaires — Hub de navigation
 *
 * Page avec 4 tabs horizontaux qui redirigent vers les routes existantes.
 * Chaque onglet navigue vers la route dédiée au lieu d'embarquer le composant.
 */

import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { ClipboardList, IdCard, Users } from "lucide-react";
import { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/affaires-consulaires")({
	component: AffairesConsulairesPage,
});

const TABS = [
	{ id: "demandes", label: "Demandes", icon: ClipboardList, href: "/requests" },
	{ id: "registre", label: "Registre Consulaire", icon: IdCard, href: "/consular-registry" },
] as const;

function AffairesConsulairesPage() {
	const navigate = useNavigate();
	const location = useLocation();

	// Déterminer l'onglet actif basé sur l'URL courante
	const activeTab = useMemo(() => {
		const path = location.pathname;
		if (path.startsWith("/requests")) return "demandes";
		if (path.startsWith("/consular-registry")) return "registre";
		return null; // On est sur /affaires-consulaires sans sous-route
	}, [location.pathname]);

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6">
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
							Gestion des demandes, registre, rendez-vous et services consulaires
						</p>
					</div>
				</div>
			</motion.div>

			{/* Tabs — navigation vers les routes dédiées */}
			<div className="flex items-center gap-1 border border-border/50 rounded-xl bg-card p-1 overflow-x-auto">
				{TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => navigate({ to: tab.href })}
							className={cn(
								"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
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

			{/* Message si aucun onglet sélectionné */}
			{!activeTab && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-16 text-center"
				>
					<div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
						<Users className="h-8 w-8 text-blue-500/60" />
					</div>
					<h3 className="text-lg font-semibold mb-1">Sélectionnez un volet</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Choisissez un onglet ci-dessus pour accéder aux demandes, au registre consulaire, aux rendez-vous ou aux services.
					</p>
				</motion.div>
			)}
		</div>
	);
}
