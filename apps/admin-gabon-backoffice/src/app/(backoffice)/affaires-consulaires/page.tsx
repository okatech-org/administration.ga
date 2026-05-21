"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, Globe, Wrench, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffairesRequestsTab } from "@/components/admin/affaires-requests-tab";
import { AffairesServicesTab } from "@/components/admin/affaires-services-tab";
import { PageHeader } from "@/components/design-system/page-header";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

export default function AffairesConsulairesPage() {
	const { i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const [activeTab, setActiveTab] = useState("demandes");

	// Lifted state
	const [searchQuery, setSearchQuery] = useState("");
	const [orgFilter, setOrgFilter] = useState<string>("all");

	// Fetch orgs for the combobox filter
	const { data: orgs } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const orgOptions: ComboboxOption[] = useMemo(() => {
		const opts: ComboboxOption[] = [
			{ value: "all", label: lang === "fr" ? "Tous les organismes" : "All organizations" },
		];
		if (orgs) {
			for (const org of orgs) {
				opts.push({ value: org._id, label: org.name });
			}
		}
		return opts;
	}, [orgs, lang]);

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			{/* ─── Header ─── */}
			<PageHeader
				icon={<Globe className="h-5 w-5" />}
				title={lang === "fr" ? "Affaires Consulaires" : "Consular Affairs"}
				subtitle={lang === "fr"
					? "Suivi des demandes et gestion du catalogue de services consulaires"
					: "Track requests and manage the consular services catalog"}
			/>

			{/* ─── Onglets ─── */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4 flex-1">
				<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
					<TabsList className="h-auto justify-start w-fit shrink-0 gap-1 p-1">
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

					{activeTab === "demandes" && (
						<div className="flex flex-col sm:flex-row gap-3 flex-1 xl:justify-end xl:max-w-2xl">
							<div className="relative flex-1">
								<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={lang === "fr"
										? "Rechercher par référence, nom, email ou organisme…"
										: "Search by reference, name, email or org..."
									}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 h-10 w-full text-sm bg-card border-border"
								/>
							</div>
							<Combobox
								options={orgOptions}
								value={orgFilter}
								onValueChange={setOrgFilter}
								placeholder={lang === "fr" ? "Tous les organismes" : "All orgs"}
								searchPlaceholder={lang === "fr" ? "Rechercher un organisme…" : "Search org..."}
								emptyText={lang === "fr" ? "Aucun organisme trouvé" : "No org found"}
								className="w-full sm:w-[240px] h-10 bg-card border-border"
							/>
						</div>
					)}
				</div>

				<TabsContent value="demandes" className="mt-0 outline-none border-none flex-1 flex flex-col">
					<AffairesRequestsTab searchQuery={searchQuery} orgFilter={orgFilter} />
				</TabsContent>

				<TabsContent value="services" className="mt-0 outline-none border-none">
					<AffairesServicesTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
