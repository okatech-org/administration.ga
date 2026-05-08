"use client";

import { api } from "@convex/_generated/api";
import { Briefcase, Loader2 } from "lucide-react";
import { useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Combobox,
	type ComboboxOption,
} from "@workspace/ui/components/combobox";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { getAllCountriesSorted } from "@workspace/shared/utils/country";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const SECTOR_LABELS: Record<string, string> = {
	energy: "Énergie",
	oil_gas: "Pétrole & Gaz",
	mining: "Mines",
	fintech: "Fintech",
	banking: "Banque",
	it_software: "IT / Logiciel",
	cybersecurity: "Cybersécurité",
	biotech: "Biotech",
	health: "Santé",
	defense: "Défense",
	aerospace: "Aérospatial",
	nuclear: "Nucléaire",
	telecom: "Télécoms",
	ai_ml: "IA / ML",
	research: "Recherche",
};

const SECTORS = Object.keys(SECTOR_LABELS);

const ALL_COUNTRIES = "__all__";

const COUNTRY_OPTIONS: ComboboxOption[] = (() => {
	const all = getAllCountriesSorted();
	return [
		{ value: ALL_COUNTRIES, label: "Tous les pays" },
		...all.map((c) => ({
			value: c.code,
			label: `${c.flag} ${c.name} (${c.code})`,
		})),
	];
})();

export default function IntelligenceCohortsPage() {
	const { activeOrgId } = useOrg();
	const [country, setCountry] = useState<string>("");
	const [selectedSector, setSelectedSector] = useState<string | null>(null);

	const { data: stats, isLoading: statsLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceTal.getSectorStats,
		activeOrgId
			? { orgId: activeOrgId, country: country.trim() || undefined }
			: "skip",
	);

	const { data: matches, isLoading: matchesLoading } =
		useAuthenticatedConvexQuery(
			api.functions.intelligenceTal.listProfilesBySector,
			activeOrgId && selectedSector
				? {
						orgId: activeOrgId,
						sector: selectedSector,
						country: country.trim() || undefined,
						limit: 100,
					}
				: "skip",
		);

	if (!activeOrgId) return null;

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<Briefcase className="size-5" />}
				title="Cohortes stratégiques (TAL)"
				subtitle="Profils diaspora classés par secteur sensible (énergie, défense, IT, finance...)."
			/>

			<div className="flex flex-wrap items-end gap-3">
				<div className="flex flex-col gap-1.5">
					<Label>Pays de résidence</Label>
					<Combobox
						options={COUNTRY_OPTIONS}
						value={country || ALL_COUNTRIES}
						onValueChange={(v) => setCountry(v === ALL_COUNTRIES ? "" : v)}
						placeholder="Tous les pays"
						searchPlaceholder="Rechercher un pays…"
						emptyText="Aucun pays."
						className="h-9 w-64"
					/>
				</div>
			</div>

			{statsLoading ? (
				<Skeleton className="h-32 w-full" />
			) : stats ? (
				<FlatCard className="flex flex-col gap-3 p-4">
					<div className="text-xs text-muted-foreground">
						{stats.totalScanned} profils scannés · {stats.totalMatched}{" "}
						classés dans au moins un secteur stratégique
						{stats.byCountry ? ` · pays ${stats.byCountry}` : ""}
					</div>
					<div className="flex flex-wrap gap-2">
						{SECTORS.map((s) => {
							const count = stats.perSector?.[s] ?? 0;
							const isSelected = selectedSector === s;
							return (
								<Button
									key={s}
									type="button"
									size="sm"
									variant={isSelected ? "default" : "outline"}
									disabled={count === 0}
									onClick={() => setSelectedSector(isSelected ? null : s)}
								>
									{SECTOR_LABELS[s]}
									<Badge
										variant="secondary"
										className={cn(
											"ml-1.5 text-[10px]",
											count > 0 ? "" : "opacity-50",
										)}
									>
										{count}
									</Badge>
								</Button>
							);
						})}
					</div>
				</FlatCard>
			) : null}

			{selectedSector && (
				<FlatCard className="flex flex-col gap-3 p-4">
					<div className="text-sm font-medium">
						{SECTOR_LABELS[selectedSector]} — profils correspondants
					</div>

					{matchesLoading ? (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="size-3.5 animate-spin" />
							Chargement…
						</div>
					) : !matches || matches.length === 0 ? (
						<div className="text-sm text-muted-foreground">
							Aucun profil correspondant.
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{matches.map((m) => (
								<div
									key={m.profileId}
									className="flex flex-col gap-0.5 rounded-md border border-border/50 px-3 py-2"
								>
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-sm font-medium">{m.fullName}</span>
										{m.country && (
											<Badge variant="outline" className="text-[10px]">
												{m.country}
											</Badge>
										)}
									</div>
									{m.professionTitle && (
										<div className="text-xs text-muted-foreground">
											{m.professionTitle}
										</div>
									)}
									<div className="flex flex-wrap gap-1 pt-1">
										{m.sectors.map((s) => (
											<Badge
												key={s}
												variant="outline"
												className="text-[9px]"
											>
												{SECTOR_LABELS[s] ?? s}
											</Badge>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</FlatCard>
			)}
		</div>
	);
}
