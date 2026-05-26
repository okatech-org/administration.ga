"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Briefcase,
	Building2,
	Crown,
	Landmark,
	Layers,
	MapPin,
	MessageCircle,
	Scale,
	Search,
	Shield,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/design-system/page-header";
import { RepsGrid } from "@/components/admin/reps-grid";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

// Les 13 types institutionnels gabonais (cf. OrgType dans
// convex/lib/constants.ts, section "Administration nationale, Phase 1").
// Le référentiel officiel est ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md.
const ADMINISTRATION_TYPES = [
	{ value: "all", labelFr: "Toutes", labelEn: "All", icon: Building2 },
	{
		value: "presidency",
		labelFr: "Présidence",
		labelEn: "Presidency",
		icon: Crown,
	},
	{
		value: "vice_presidency",
		labelFr: "Vice-Présidence",
		labelEn: "Vice-Presidency",
		icon: Crown,
	},
	{
		value: "government",
		labelFr: "Gouvernement",
		labelEn: "Government",
		icon: Briefcase,
	},
	{
		value: "ministry",
		labelFr: "Ministères",
		labelEn: "Ministries",
		icon: Briefcase,
	},
	{
		value: "delegated_ministry",
		labelFr: "Ministères délégués",
		labelEn: "Delegated Ministries",
		icon: Briefcase,
	},
	{
		value: "directorate_general",
		labelFr: "Directions générales",
		labelEn: "Directorates General",
		icon: Layers,
	},
	{
		value: "public_establishment",
		labelFr: "Établissements publics",
		labelEn: "Public Establishments",
		icon: Building2,
	},
	{
		value: "national_agency",
		labelFr: "Agences nationales",
		labelEn: "National Agencies",
		icon: Building2,
	},
	{
		value: "independent_authority",
		labelFr: "Autorités indépendantes",
		labelEn: "Independent Authorities",
		icon: Shield,
	},
	{
		value: "parliament_chamber",
		labelFr: "Parlement",
		labelEn: "Parliament",
		icon: Landmark,
	},
	{
		value: "supreme_court",
		labelFr: "Juridictions suprêmes",
		labelEn: "Supreme Courts",
		icon: Scale,
	},
	{
		value: "consultative_institution",
		labelFr: "Institutions consultatives",
		labelEn: "Consultative Institutions",
		icon: MessageCircle,
	},
	{
		value: "local_authority",
		labelFr: "Collectivités locales",
		labelEn: "Local Authorities",
		icon: MapPin,
	},
] as const;

// Tous les types considérés comme "Administration nationale gabonaise".
// Exclut explicitement les héritages diplomatiques (embassy, consulate, etc.)
// qui restent visibles dans /reps.
const NATIONAL_ADMIN_TYPES: ReadonlySet<string> = new Set(
	ADMINISTRATION_TYPES.filter((t) => t.value !== "all").map((t) => t.value),
);

// Niveaux de tutelle gabonais (cf. convex/schemas/orgs.ts ligne 55-63).
//   0 = institution souveraine — pas de tutelle (Présidence, Vice-Présidence,
//       Parlement, juridictions suprêmes, AAI, institution consultative)
//   1 = ministère ou ministère délégué (rattaché à la Présidence)
//   2 = direction générale / établissement public / agence nationale /
//       collectivité locale (rattaché à un ministère)
//   3 = service / sous-direction / bureau d'ordre (rattaché à une DG)
const TUTELLE_LEVELS = [
	{ value: "all", labelFr: "Tous niveaux", labelEn: "All levels" },
	{
		value: "0",
		labelFr: "0 · Institution souveraine",
		labelEn: "0 · Sovereign institution",
	},
	{ value: "1", labelFr: "1 · Ministère", labelEn: "1 · Ministry" },
	{
		value: "2",
		labelFr: "2 · Direction / Établissement",
		labelEn: "2 · Directorate / Establishment",
	},
	{ value: "3", labelFr: "3 · Service / Bureau", labelEn: "3 · Service / Office" },
] as const;

export default function AdministrationsPage() {
	const { t, i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const [selectedType, setSelectedType] = useState<string>("all");
	const [selectedTutelleLevel, setSelectedTutelleLevel] =
		useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");

	const {
		data: orgs,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.admin.listOrgs, {});

	// Filtres successifs : (1) types Administration nationale, (2) type
	// sélectionné dans les tabs, (3) niveau de tutelle, (4) recherche texte
	// sur nom/slug.
	const filteredOrgs = useMemo(() => {
		if (!orgs) return [] as Doc<"orgs">[];
		let result = (orgs as Doc<"orgs">[]).filter((o) =>
			NATIONAL_ADMIN_TYPES.has(o.type as string),
		);
		if (selectedType !== "all") {
			result = result.filter((o) => o.type === selectedType);
		}
		if (selectedTutelleLevel !== "all") {
			const lvl = Number(selectedTutelleLevel);
			result = result.filter((o) => o.tutelleLevel === lvl);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(o) =>
					o.name?.toLowerCase().includes(q) ||
					o.slug?.toLowerCase().includes(q),
			);
		}
		return result;
	}, [orgs, selectedType, selectedTutelleLevel, searchQuery]);

	// Comptes par type (et total) pour les badges des tabs.
	const countByType = useMemo(() => {
		const counts: Record<string, number> = { all: 0 };
		if (!orgs) return counts;
		for (const org of orgs as Doc<"orgs">[]) {
			if (NATIONAL_ADMIN_TYPES.has(org.type as string)) {
				counts.all += 1;
				counts[org.type] = (counts[org.type] ?? 0) + 1;
			}
		}
		return counts;
	}, [orgs]);

	if (error) {
		return (
			<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
				<div className="text-destructive">
					{t("superadmin.common.error")}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			<PageHeader
				icon={<Landmark className="h-5 w-5" />}
				title={
					lang === "fr"
						? "Catalogue des Administrations"
						: "Public Administrations Catalog"
				}
				subtitle={
					lang === "fr"
						? "Référentiel des institutions publiques gabonaises — Présidence, Gouvernement, ministères, directions générales, établissements publics, autorités indépendantes, parlement, juridictions suprêmes, collectivités locales."
						: "Gabonese public institutions registry — Presidency, Government, ministries, directorates general, public establishments, independent authorities, parliament, supreme courts, local authorities."
				}
			/>

			<div className="flex flex-wrap items-center gap-3">
				<div className="relative max-w-md flex-1 min-w-[240px]">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={
							lang === "fr"
								? "Rechercher par nom ou slug…"
								: "Search by name or slug…"
						}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={selectedTutelleLevel}
					onValueChange={setSelectedTutelleLevel}
				>
					<SelectTrigger className="w-[260px]">
						<SelectValue
							placeholder={
								lang === "fr" ? "Niveau de tutelle" : "Tutelle level"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{TUTELLE_LEVELS.map((lvl) => (
							<SelectItem key={lvl.value} value={lvl.value}>
								{lang === "fr" ? lvl.labelFr : lvl.labelEn}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Tabs
				value={selectedType}
				onValueChange={setSelectedType}
				className="flex-1"
			>
				<TabsList className="h-auto justify-start w-max gap-1 p-1 flex-wrap">
					{ADMINISTRATION_TYPES.map((type) => {
						const Icon = type.icon;
						const count = countByType[type.value] ?? 0;
						return (
							<TabsTrigger
								key={type.value}
								value={type.value}
								className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
							>
								<Icon className="h-3.5 w-3.5" />
								{lang === "fr" ? type.labelFr : type.labelEn}
								<span className="text-[10px] text-muted-foreground ml-0.5">
									{count}
								</span>
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value={selectedType} className="mt-4">
					{isPending ? (
						<div className="text-muted-foreground py-12 text-center">
							{lang === "fr" ? "Chargement…" : "Loading…"}
						</div>
					) : filteredOrgs.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-16 bg-background rounded-xl border border-border/60">
							<div className="rounded-full bg-muted/60 p-4">
								<Building2 className="h-8 w-8 text-muted-foreground" />
							</div>
							<div className="text-center">
								<p className="font-medium text-foreground/80">
									{lang === "fr"
										? "Aucune administration trouvée"
										: "No administration found"}
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									{lang === "fr"
										? "Ajustez les filtres ou créez une institution depuis le volet « Administrations » (/reps)."
										: "Adjust filters or create an institution from the « Administrations » panel (/reps)."}
								</p>
							</div>
						</div>
					) : (
						<RepsGrid data={filteredOrgs} />
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
