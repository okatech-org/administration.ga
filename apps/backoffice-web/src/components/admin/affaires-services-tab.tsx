/**
 * AffairesServicesTab — Vue d'ensemble des services consulaires
 *
 * Composant autonome affichant les stats KPI et la grille de catégories
 * avec possibilité d'édition rapide de chaque service.
 */

import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import {
	FileText,
	Folder,
	Globe,
	IdCard,
	Pencil,
	Plane,
	Plus,
	ShieldCheck,
	Stamp,
	UserPlus,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Category metadata ─────────────────────────────────────────
const CATEGORY_INFO: Record<
	string,
	{ label: string; icon: React.ElementType; color: string; bgColor: string; description: string }
> = {
	passport: { label: "Passeports", icon: Plane, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", description: "Délivrance et renouvellement de passeports" },
	visa: { label: "Visas", icon: Stamp, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", description: "Visas d'entrée et de transit" },
	civil_status: { label: "État civil", icon: FileText, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30", description: "Actes de naissance, mariage, décès" },
	registration: { label: "Immatriculation", icon: UserPlus, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", description: "Inscription consulaire des citoyens" },
	legalization: { label: "Légalisation", icon: ShieldCheck, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30", description: "Authentification de documents" },
	consular_card: { label: "Carte consulaire", icon: IdCard, color: "text-teal-600", bgColor: "bg-teal-50 dark:bg-teal-950/30", description: "Cartes d'identité consulaire" },
	emergency: { label: "Urgences", icon: ShieldCheck, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", description: "Services d'urgence consulaire" },
	other: { label: "Autres", icon: Folder, color: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30", description: "Autres services consulaires" },
};

export function AffairesServicesTab() {
	const { i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const { data: services, isPending, error } = useAuthenticatedConvexQuery(
		api.functions.services.listCatalog,
		{},
	);

	// ── Stats ──
	const totalServices = services?.length ?? 0;
	const activeServices = services?.filter((s) => (s as any).isActive !== false).length ?? 0;

	const servicesByCategory = useMemo(() => {
		const groups: Record<string, any[]> = {};
		if (services) {
			for (const svc of services) {
				const cat = (svc as any).category || "other";
				if (!groups[cat]) groups[cat] = [];
				groups[cat].push(svc);
			}
		}
		return groups;
	}, [services]);

	const onlineCount = useMemo(() => {
		if (!services) return 0;
		return services.filter((s) => (s as any).isOnline === true).length;
	}, [services]);

	if (error) {
		return (
			<div className="text-destructive text-sm">
				{lang === "fr" ? "Erreur lors du chargement des services." : "Error loading services."}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* ── Stats KPI ── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-primary">
							{isPending ? "..." : totalServices}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Total services" : "Total services"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-green-600">
							{isPending ? "..." : activeServices}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Services actifs" : "Active services"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-amber-600">
							{Object.keys(servicesByCategory).length}
						</div>
						<div className="text-xs text-muted-foreground">
							{lang === "fr" ? "Catégories" : "Categories"}
						</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-blue-600">
							{isPending ? "..." : onlineCount}
						</div>
						<div className="text-xs text-muted-foreground">
							<Globe className="h-3.5 w-3.5 inline mr-1" />
							{lang === "fr" ? "En ligne" : "Online"}
						</div>
					</div>
				</FlatCard>
			</div>

			{/* ── Action : Nouveau service ── */}
			<div className="flex justify-end">
				<Button asChild>
					<Link to="/services/new">
						<Plus className="mr-2 h-4 w-4" />
						{lang === "fr" ? "Nouveau service" : "New service"}
					</Link>
				</Button>
			</div>

			{/* ── Grille de catégories ── */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{Object.entries(CATEGORY_INFO).map(([catKey, catInfo]) => {
					const catServices = servicesByCategory[catKey] || [];
					const IconComponent = catInfo.icon;
					return (
						<FlatCard key={catKey}>
							<div className="p-3 lg:p-4 pb-3">
								<div className="flex items-center gap-3">
									<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", catInfo.bgColor)}>
										<IconComponent className={cn("h-5 w-5", catInfo.color)} />
									</div>
									<div className="flex-1">
										<p className="text-base font-semibold">{catInfo.label}</p>
										<p className="text-xs text-muted-foreground">{catInfo.description}</p>
									</div>
									<Badge variant="outline">
										{catServices.length} service{catServices.length !== 1 ? "s" : ""}
									</Badge>
								</div>
							</div>
							<div className="p-3 lg:p-4 pt-0">
								{isPending ? (
									<div className="text-xs text-muted-foreground animate-pulse">
										{lang === "fr" ? "Chargement..." : "Loading..."}
									</div>
								) : catServices.length > 0 ? (
									<div className="space-y-1.5">
										{catServices.map((svc: any) => (
											<div
												key={svc._id}
												className="group flex items-center justify-between rounded-md border px-3 py-2 bg-card hover:bg-muted/50 transition-colors"
											>
												<div className="flex items-center gap-2">
													<div
														className={cn(
															"h-2 w-2 rounded-full",
															svc.isActive !== false ? "bg-green-500" : "bg-gray-300",
														)}
													/>
													<span className="text-sm">{svc.name?.fr ?? svc.name}</span>
													{svc.isActive === false && (
														<Badge variant="secondary" className="text-[10px] h-4 px-1">
															{lang === "fr" ? "Inactif" : "Inactive"}
														</Badge>
													)}
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
													asChild
												>
													<a href={`/services/${svc._id}/edit`}>
														<Pencil className="h-3.5 w-3.5" />
														<span className="sr-only">
															{lang === "fr" ? "Modifier" : "Edit"}
														</span>
													</a>
												</Button>
											</div>
										))}
									</div>
								) : (
									<p className="text-xs text-muted-foreground italic">
										{lang === "fr"
											? "Aucun service dans cette catégorie"
											: "No services in this category"}
									</p>
								)}
							</div>
						</FlatCard>
					);
				})}
			</div>
		</div>
	);
}
