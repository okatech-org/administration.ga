import { useTranslation } from "react-i18next";
import {
	Building2,
	Globe,
	MapPin,
	Users,
	UserCheck,
	CheckCircle2,
	XCircle,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Map org type codes to French display names
const ORG_TYPE_LABELS: Record<string, { fr: string; icon: string }> = {
	embassy: { fr: "Ambassade", icon: "" },
	high_representation: { fr: "Haute Représentation", icon: "" },
	general_consulate: { fr: "Consulat Général", icon: "" },
	high_commission: { fr: "Haut-Commissariat", icon: "" },
	permanent_mission: { fr: "Mission Permanente", icon: "" },
	third_party: { fr: "Partenaire Tiers", icon: "" },
	consulate: { fr: "Consulat", icon: "" },
	honorary_consulate: { fr: "Consulat Honoraire", icon: "" },
	other: { fr: "Autre", icon: "" },
};

// Map country codes to names (subset — most common for Gabon diplomatic network)
const COUNTRY_NAMES: Record<string, string> = {
	ES: "Espagne", FR: "France", US: "États-Unis", GB: "Royaume-Uni",
	DE: "Allemagne", IT: "Italie", BE: "Belgique", MA: "Maroc",
	SN: "Sénégal", CM: "Cameroun", CG: "Congo", CD: "RD Congo",
	CI: "Côte d'Ivoire", GA: "Gabon", CN: "Chine", JP: "Japon",
	BR: "Brésil", CA: "Canada", SA: "Arabie Saoudite", AE: "Émirats",
	ZA: "Afrique du Sud", GQ: "Guinée Équatoriale", NG: "Nigeria",
	EG: "Égypte", RU: "Russie", IN: "Inde", TR: "Turquie",
	TG: "Togo", BJ: "Bénin", GH: "Ghana", KE: "Kenya",
	ET: "Éthiopie", TN: "Tunisie", DZ: "Algérie", LB: "Liban",
};

interface DeploymentData {
	activeOrgs: number;
	totalOrgs: number;
	activationRate: number;
	byType: Record<string, number>;
	byCountry: Record<string, { count: number; names: string[] }>;
	countriesCovered: number;
	orgsWithHeadOfMission: number;
	totalStaff: number;
}

export function DeploymentProgressCard({
	data,
	loading,
}: {
	data?: DeploymentData;
	loading: boolean;
}) {
	const { t } = useTranslation();

	if (loading || !data) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<Skeleton className="h-5 w-56" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-48 w-full" />
				</CardContent>
			</Card>
		);
	}

	const sortedCountries = Object.entries(data.byCountry)
		.sort(([, a], [, b]) => b.count - a.count);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Globe className="h-5 w-5 text-blue-500" />
					{t("superadmin.dashboard.deployment.title", "Déploiement des Représentations")}
				</CardTitle>
				<CardDescription>
					{t("superadmin.dashboard.deployment.description", "Couverture géographique et progression du réseau diplomatique")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Summary Stats Row */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div className="flex flex-col gap-1 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
						<div className="flex items-center gap-1.5">
							<Building2 className="h-3.5 w-3.5 text-blue-500" />
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">Actives</span>
						</div>
						<span className="text-2xl font-bold tabular-nums">{data.activeOrgs}</span>
						<span className="text-[10px] text-muted-foreground">/ {data.totalOrgs} total</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
						<div className="flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5 text-emerald-500" />
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pays</span>
						</div>
						<span className="text-2xl font-bold tabular-nums">{sortedCountries.length}</span>
						<span className="text-[10px] text-muted-foreground">{data.countriesCovered} juridictions</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
						<div className="flex items-center gap-1.5">
							<UserCheck className="h-3.5 w-3.5 text-amber-500" />
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">Chefs Mission</span>
						</div>
						<span className="text-2xl font-bold tabular-nums">{data.orgsWithHeadOfMission}</span>
						<span className="text-[10px] text-muted-foreground">/ {data.activeOrgs} postes</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg bg-violet-500/5 border border-violet-500/10 p-3">
						<div className="flex items-center gap-1.5">
							<Users className="h-3.5 w-3.5 text-violet-500" />
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider">Effectifs</span>
						</div>
						<span className="text-2xl font-bold tabular-nums">{data.totalStaff}</span>
						<span className="text-[10px] text-muted-foreground">agents déclarés</span>
					</div>
				</div>

				{/* Activation Rate Bar */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Taux d'activation</span>
						<span className="font-semibold">{data.activationRate}%</span>
					</div>
					<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
						{/* Dynamic width requires inline style — no Tailwind alternative for computed percentages */}
						{/* eslint-disable-next-line react/forbid-dom-props */}
						<div
							className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-700"
							style={{ width: `${data.activationRate}%` }}
						/>
					</div>
				</div>

				{/* By Type */}
				<div className="space-y-2">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Par type de représentation
					</h4>
					<div className="grid gap-1.5">
						{Object.entries(data.byType)
							.sort(([, a], [, b]) => b - a)
							.map(([type, count]) => {
								const info = ORG_TYPE_LABELS[type] ?? { fr: type, icon: "" };
								return (
									<div
										key={type}
										className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
									>
										<div className="flex items-center gap-2">
											<span className="text-sm">{info.icon}</span>
											<span className="text-sm">{info.fr}</span>
										</div>
										<span className="font-semibold tabular-nums text-sm">{count}</span>
									</div>
								);
							})}
					</div>
				</div>

				{/* By Country */}
				<div className="space-y-2">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Par pays d'implantation
					</h4>
					<div className="grid gap-1 max-h-[200px] overflow-y-auto">
						{sortedCountries.map(([country, info]) => (
							<div
								key={country}
								className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-center gap-2 min-w-0">
									<span className="text-xs font-mono text-muted-foreground w-5">{country}</span>
									<span className="truncate">{COUNTRY_NAMES[country] ?? country}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="font-semibold tabular-nums">{info.count}</span>
									{info.count > 0 ? (
										<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
									) : (
										<XCircle className="h-3.5 w-3.5 text-muted-foreground" />
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
