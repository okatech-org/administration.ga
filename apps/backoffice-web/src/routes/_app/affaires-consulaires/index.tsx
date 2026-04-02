/**
 * Affaires Consulaires — Page unifiée à 2 onglets
 *
 * Onglet 1 : Demandes (suivi des demandes consulaires cross-org)
 * Onglet 2 : Catalogue Services (vue d'ensemble par catégorie + édition)
 */

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClipboardList, Globe, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffairesRequestsTab } from "@/components/admin/affaires-requests-tab";
import { AffairesServicesTab } from "@/components/admin/affaires-services-tab";

export const Route = createFileRoute("/_app/affaires-consulaires/")({
	component: AffairesConsulairesPage,
});

function AffairesConsulairesPage() {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			{/* ─── Header ─── */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Globe className="h-5 w-5 text-primary" />
					</div>
					{lang === "fr"
						? "Affaires Consulaires"
						: "Consular Affairs"}
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					{lang === "fr"
						? "Suivi des demandes et gestion du catalogue de services consulaires"
						: "Track requests and manage the consular services catalog"}
				</p>
			</div>

			{/* ─── Onglets ─── */}
			<Tabs defaultValue="demandes" className="flex-1">
				<TabsList className="h-auto justify-start w-max gap-1 bg-muted/50 p-1">
					<TabsTrigger
						value="demandes"
						className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
					>
						<ClipboardList className="h-3.5 w-3.5" />
						{lang === "fr" ? "Demandes" : "Requests"}
					</TabsTrigger>
					<TabsTrigger
						value="services"
						className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
					>
						<Wrench className="h-3.5 w-3.5" />
						{lang === "fr" ? "Catalogue Services" : "Service Catalog"}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="demandes" className="mt-4">
					<AffairesRequestsTab />
				</TabsContent>

				<TabsContent value="services" className="mt-4">
					<AffairesServicesTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
