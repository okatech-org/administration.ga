/**
 * Antennes PNPE — gestion du réseau territorial.
 *
 * Liste des 7 antennes régionales avec statut, affectation chef d'antenne et
 * conseillers, horaires d'ouverture. CRUD réservé direction PNPE +
 * admin Ministère du Travail (re-vérifié côté Convex mutation `antennes.create`).
 *
 * MVP : lecture + indicateur de couverture territoriale (provinces non couvertes).
 * Création / édition / fermeture seront branchées dans une PR ultérieure.
 */
"use client";

import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Clock,
	Mail,
	MapPin,
	Phone,
	PlusCircle,
	XCircle,
} from "lucide-react";

// ─── Référentiel ─────────────────────────────────────────────

const PROVINCE_LABEL: Record<string, string> = {
	ESTUAIRE: "Estuaire",
	HAUT_OGOOUE: "Haut-Ogooué",
	MOYEN_OGOOUE: "Moyen-Ogooué",
	NGOUNIE: "Ngounié",
	NYANGA: "Nyanga",
	OGOOUE_IVINDO: "Ogooué-Ivindo",
	OGOOUE_LOLO: "Ogooué-Lolo",
	OGOOUE_MARITIME: "Ogooué-Maritime",
	WOLEU_NTEM: "Woleu-Ntem",
};

const ALL_PROVINCES = Object.keys(PROVINCE_LABEL);

const STATUT_LABEL: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
	OPERATIONNELLE: { label: "Opérationnelle", icon: CheckCircle2, tone: "emerald" },
	EN_OUVERTURE: { label: "En ouverture", icon: Clock, tone: "amber" },
	SUSPENDUE: { label: "Suspendue", icon: XCircle, tone: "rose" },
};

function formatProvince(code: string): string {
	return PROVINCE_LABEL[code] ?? code;
}

function formatDateMaybe(ts?: number): string {
	if (!ts) return "—";
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

// ─── Carte antenne ────────────────────────────────────────────

interface AntenneCardProps {
	antenne: any;
}

function AntenneCard({ antenne }: AntenneCardProps) {
	const statutMeta = STATUT_LABEL[antenne.statut] ?? STATUT_LABEL.OPERATIONNELLE!;
	const StatutIcon = statutMeta.icon;
	const toneClass = {
		emerald: "border-emerald-500/30 bg-emerald-500/5",
		amber: "border-amber-500/30 bg-amber-500/5",
		rose: "border-rose-500/30 bg-rose-500/5",
	}[statutMeta.tone] ?? "";

	return (
		<FlatCard className={`relative ${toneClass}`}>
			<div className="p-4 space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
							<h3 className="font-semibold truncate">{antenne.nom}</h3>
						</div>
						<div className="text-xs text-muted-foreground mt-0.5 ml-6">
							{formatProvince(antenne.province)} · {antenne.ville}
						</div>
					</div>
					<Badge variant="outline" className="shrink-0 gap-1 text-xs">
						<StatutIcon className="h-3 w-3" />
						{statutMeta.label}
					</Badge>
				</div>

				<div className="text-xs space-y-1.5 text-muted-foreground">
					{antenne.telephone && (
						<div className="flex items-center gap-1.5">
							<Phone className="h-3 w-3" />
							<span className="tabular-nums">{antenne.telephone}</span>
						</div>
					)}
					{antenne.email && (
						<div className="flex items-center gap-1.5">
							<Mail className="h-3 w-3" />
							<span className="truncate">{antenne.email}</span>
						</div>
					)}
					{antenne.dateOuverture && (
						<div className="flex items-center gap-1.5">
							<Clock className="h-3 w-3" />
							<span>Ouverte le {formatDateMaybe(antenne.dateOuverture)}</span>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between pt-2 border-t text-xs">
					<span className="text-muted-foreground">
						{antenne.conseillers?.length ?? 0} conseiller(s) affecté(s)
					</span>
					<span className="font-mono text-muted-foreground">{antenne.slug}</span>
				</div>
			</div>
		</FlatCard>
	);
}

// ─── Page ────────────────────────────────────────────────────

export default function PnpeAntennesPage() {
	const { t } = useTranslation();

	// Cast `(api as any)` : codegen Convex stale (cf. PR #33).
	const { data: antennes, isLoading } = useAuthenticatedConvexQuery(
		(api as any).functions.pnpe.antennes.list,
		{},
	);

	const list = (antennes ?? []) as any[];
	const coveredProvinces = new Set(list.map((a) => a.province));
	const uncoveredProvinces = ALL_PROVINCES.filter((p) => !coveredProvinces.has(p));

	const operational = list.filter((a) => a.statut === "OPERATIONNELLE").length;
	const opening = list.filter((a) => a.statut === "EN_OUVERTURE").length;
	const suspended = list.filter((a) => a.statut === "SUSPENDUE").length;

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.antennes.title", "Antennes régionales PNPE")}
				subtitle={t(
					"pnpe.antennes.subtitle",
					"Gestion du réseau territorial — 7 antennes ouvertes, 2 provinces à couvrir (Ngounié, Ogooué-Ivindo)",
				)}
				icon={MapPin}
				actions={
					<Button size="sm" disabled className="gap-1.5">
						<PlusCircle className="h-4 w-4" />
						{t("pnpe.antennes.create", "Ouvrir une antenne")}
					</Button>
				}
			/>

			{/* ─── Synthèse couverture territoriale ──── */}
			<section>
				<SectionHeader
					icon={<MapPin />}
					title={t("pnpe.antennes.coverage.title", "Couverture territoriale")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.antennes.coverage.subtitle",
						"Indicateur clé d'égal accès au service public de l'emploi",
					)}
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<FlatCard className="border-emerald-500/30 bg-emerald-500/5">
						<div className="p-4">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								<span className="text-sm font-medium">Opérationnelles</span>
							</div>
							<div className="text-2xl font-semibold mt-1 tabular-nums">
								{isLoading ? <Skeleton className="h-7 w-12" /> : operational}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-amber-500/30 bg-amber-500/5">
						<div className="p-4">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-amber-600" />
								<span className="text-sm font-medium">En ouverture</span>
							</div>
							<div className="text-2xl font-semibold mt-1 tabular-nums">
								{isLoading ? <Skeleton className="h-7 w-12" /> : opening}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-rose-500/30 bg-rose-500/5">
						<div className="p-4">
							<div className="flex items-center gap-2">
								<XCircle className="h-4 w-4 text-rose-600" />
								<span className="text-sm font-medium">Suspendues</span>
							</div>
							<div className="text-2xl font-semibold mt-1 tabular-nums">
								{isLoading ? <Skeleton className="h-7 w-12" /> : suspended}
							</div>
						</div>
					</FlatCard>
					<FlatCard className="border-slate-500/30 bg-slate-500/5">
						<div className="p-4">
							<div className="flex items-center gap-2">
								<AlertTriangle className="h-4 w-4 text-slate-600" />
								<span className="text-sm font-medium">Provinces non couvertes</span>
							</div>
							<div className="text-2xl font-semibold mt-1 tabular-nums">
								{isLoading ? <Skeleton className="h-7 w-12" /> : uncoveredProvinces.length}
							</div>
						</div>
					</FlatCard>
				</div>

				{uncoveredProvinces.length > 0 && !isLoading && (
					<div className="mt-3 text-sm text-muted-foreground border-l-2 border-amber-500/50 pl-3">
						<strong className="text-foreground">
							{t("pnpe.antennes.coverage.uncoveredLabel", "À couvrir")}
							{" : "}
						</strong>
						{uncoveredProvinces.map((p) => formatProvince(p)).join(", ")}
					</div>
				)}
			</section>

			{/* ─── Liste des antennes ──────────────────── */}
			<section>
				<SectionHeader
					icon={<Building2 />}
					title={t("pnpe.antennes.list.title", "Réseau des antennes")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.antennes.list.subtitle",
						"Cliquer une antenne pour voir le détail (conseillers, horaires, statistiques locales)",
					)}
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{isLoading ? (
						<>
							<Skeleton className="h-44 w-full" />
							<Skeleton className="h-44 w-full" />
							<Skeleton className="h-44 w-full" />
						</>
					) : list.length === 0 ? (
						<div className="col-span-full text-sm text-muted-foreground py-12 text-center border rounded-lg">
							{t(
								"pnpe.antennes.list.empty",
								"Aucune antenne enregistrée. Lancer le seed `seedAntennesPnpe.ts` pour peupler le réseau.",
							)}
						</div>
					) : (
						list.map((antenne) => <AntenneCard key={antenne._id} antenne={antenne} />)
					)}
				</div>
			</section>
		</div>
	);
}
