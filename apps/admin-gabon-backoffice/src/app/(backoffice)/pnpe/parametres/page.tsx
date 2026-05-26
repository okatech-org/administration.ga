/**
 * Paramètres PNPE — référentiels métier.
 *
 * Vue en lecture des nomenclatures utilisées par la plateforme PNPE :
 * codes NAF Gabon (17 secteurs), types de contrats (7 valeurs), niveaux
 * d'études (12 valeurs), statuts D.E (8 valeurs).
 *
 * MVP : lecture seule — les valeurs sont définies dans les validators
 * Convex (`convex/lib/validators/pnpe.ts`). Modification = nouvelle version
 * du schema + migration. Pas d'édition runtime au backoffice (cohérent
 * avec le pattern des autres référentiels critiques).
 */
"use client";

import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import {
	Briefcase,
	FileBox,
	GraduationCap,
	Info,
	Settings,
} from "lucide-react";

// ─── Référentiels (source de vérité : convex/lib/validators/pnpe.ts) ─

const SECTEURS_NAF = [
	{ code: "AGRICULTURE_PECHE", label: "Agriculture, pêche" },
	{ code: "MINES_EXTRACTION", label: "Mines, extraction" },
	{ code: "PETROLE_GAZ", label: "Pétrole, gaz" },
	{ code: "INDUSTRIE_MANUFACTURE", label: "Industrie manufacturière" },
	{ code: "BTP_CONSTRUCTION", label: "BTP, construction" },
	{ code: "COMMERCE", label: "Commerce" },
	{ code: "TRANSPORT_LOGISTIQUE", label: "Transport, logistique" },
	{ code: "HOTELLERIE_RESTAURATION", label: "Hôtellerie, restauration" },
	{ code: "TELECOMS_NUMERIQUE", label: "Télécoms, numérique" },
	{ code: "BANQUE_ASSURANCE", label: "Banque, assurance" },
	{ code: "SANTE_SOCIAL", label: "Santé, social" },
	{ code: "EDUCATION_FORMATION", label: "Éducation, formation" },
	{ code: "ADMINISTRATION_PUBLIQUE", label: "Administration publique" },
	{ code: "SERVICES_AUX_ENTREPRISES", label: "Services aux entreprises" },
	{ code: "ARTS_CULTURE_SPORT", label: "Arts, culture, sport" },
	{ code: "ENERGIE_EAU", label: "Énergie, eau" },
	{ code: "AUTRES", label: "Autres" },
];

const TYPES_CONTRATS = [
	{ code: "CDI", label: "Contrat à durée indéterminée", articles: "L. 27" },
	{ code: "CDD", label: "Contrat à durée déterminée", articles: "L. 35" },
	{ code: "STAGE", label: "Stage conventionné", articles: "—" },
	{
		code: "ALTERNANCE",
		label: "Apprentissage / professionnalisation",
		articles: "L. 23-25",
	},
	{ code: "INTERIM", label: "Mission d'intérim", articles: "L. 47" },
	{
		code: "INSERTION",
		label: "Contrat d'insertion",
		articles: "—",
	},
	{ code: "INDEPENDANT", label: "Auto-entrepreneur / freelance", articles: "—" },
];

const NIVEAUX_ETUDES = [
	{ code: "AUCUN", label: "Sans diplôme" },
	{ code: "CEP", label: "Certificat d'études primaires" },
	{ code: "BEPC", label: "Brevet d'études du premier cycle" },
	{ code: "BAC_A", label: "Baccalauréat série A (littéraire)" },
	{ code: "BAC_B", label: "Baccalauréat série B (économique)" },
	{ code: "BAC_C", label: "Baccalauréat série C (mathématiques)" },
	{ code: "BAC_D", label: "Baccalauréat série D (sciences naturelles)" },
	{ code: "BAC_PRO", label: "Baccalauréat professionnel" },
	{ code: "BAC_PLUS_2", label: "BTS, DUT, DEUG" },
	{ code: "BAC_PLUS_3", label: "Licence" },
	{ code: "BAC_PLUS_5", label: "Master, ingénieur" },
	{ code: "DOCTORAT", label: "Doctorat" },
];

const STATUTS_DEMANDEUR = [
	{ code: "BROUILLON", label: "Inscription en cours", terminal: false },
	{ code: "EN_VALIDATION", label: "En attente conseiller", terminal: false },
	{ code: "ACTIF", label: "Actif, peut candidater", terminal: false },
	{ code: "EN_FORMATION", label: "Inscrit en formation", terminal: false },
	{ code: "EN_CONTRAT", label: "Embauché ou apprenti", terminal: false },
	{ code: "PLACE", label: "Insertion réussie (suivi)", terminal: false },
	{ code: "SUSPENDU", label: "Inactif temporairement", terminal: false },
	{ code: "RADIE", label: "Compte clos", terminal: true },
];

// ─── Page ──────────────────────────────────────────────────────

export default function PnpeParametresPage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.parametres.title", "Paramètres PNPE")}
				subtitle={t(
					"pnpe.parametres.subtitle",
					"Référentiels métier en lecture — codes NAF, types de contrats, niveaux d'études, statuts D.E",
				)}
				icon={Settings}
			/>

			{/* Note importante */}
			<FlatCard className="border-amber-500/30 bg-amber-500/5">
				<div className="p-4 flex gap-3">
					<Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
					<div className="text-sm">
						<strong className="text-foreground">Source de vérité</strong>
						<p className="text-muted-foreground mt-1">
							Les nomenclatures ci-dessous sont définies par typage strict dans
							{" "}
							<code className="text-xs px-1 py-0.5 rounded bg-background">
								convex/lib/validators/pnpe.ts
							</code>
							. Toute modification nécessite une version de schema + migration.
							La modification runtime n'est pas exposée pour préserver la
							cohérence des données métier.
						</p>
					</div>
				</div>
			</FlatCard>

			{/* ─── Codes NAF Gabon ──────────────────────── */}
			<section>
				<SectionHeader
					icon={<Briefcase />}
					title={t(
						"pnpe.parametres.naf.title",
						`Secteurs d'activité (NAF Gabon) — ${SECTEURS_NAF.length} valeurs`,
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.parametres.naf.subtitle",
						"Classification adaptée au tissu économique gabonais (pétrole, mines, BTP en avant)",
					)}
				</p>
				<FlatCard>
					<div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
						{SECTEURS_NAF.map((s) => (
							<div
								key={s.code}
								className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/40"
							>
								<span className="truncate">{s.label}</span>
								<code className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
									{s.code}
								</code>
							</div>
						))}
					</div>
				</FlatCard>
			</section>

			{/* ─── Types de contrats ───────────────────── */}
			<section>
				<SectionHeader
					icon={<FileBox />}
					title={t(
						"pnpe.parametres.contrats.title",
						`Types de contrats — ${TYPES_CONTRATS.length} valeurs`,
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.parametres.contrats.subtitle",
						"Code du travail gabonais : articles cités à titre indicatif (vérifier le code en vigueur)",
					)}
				</p>
				<FlatCard>
					<div className="divide-y">
						{TYPES_CONTRATS.map((c) => (
							<div
								key={c.code}
								className="flex items-center gap-3 px-4 py-2.5 text-sm"
							>
								<code className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 min-w-[88px] text-center">
									{c.code}
								</code>
								<span className="flex-1 truncate">{c.label}</span>
								<span className="text-xs text-muted-foreground shrink-0">
									{c.articles}
								</span>
							</div>
						))}
					</div>
				</FlatCard>
			</section>

			{/* ─── Niveaux d'études ────────────────────── */}
			<section>
				<SectionHeader
					icon={<GraduationCap />}
					title={t(
						"pnpe.parametres.niveaux.title",
						`Niveaux d'études — ${NIVEAUX_ETUDES.length} valeurs`,
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.parametres.niveaux.subtitle",
						"Système éducatif gabonais. Les BAC série A/B/C/D correspondent aux filières classiques.",
					)}
				</p>
				<FlatCard>
					<div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
						{NIVEAUX_ETUDES.map((n) => (
							<div
								key={n.code}
								className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/40"
							>
								<span className="truncate">{n.label}</span>
								<code className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
									{n.code}
								</code>
							</div>
						))}
					</div>
				</FlatCard>
			</section>

			{/* ─── Statuts D.E ─────────────────────────── */}
			<section>
				<SectionHeader
					icon={<Info />}
					title={t(
						"pnpe.parametres.statuts.title",
						`Statuts Demandeur d'Emploi — ${STATUTS_DEMANDEUR.length} valeurs`,
					)}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.parametres.statuts.subtitle",
						"Workflow : BROUILLON → EN_VALIDATION → ACTIF → (EN_FORMATION | EN_CONTRAT) → PLACE",
					)}
				</p>
				<FlatCard>
					<div className="divide-y">
						{STATUTS_DEMANDEUR.map((s) => (
							<div
								key={s.code}
								className="flex items-center gap-3 px-4 py-2.5 text-sm"
							>
								<code className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 min-w-[120px] text-center">
									{s.code}
								</code>
								<span className="flex-1 truncate">{s.label}</span>
								{s.terminal && (
									<Badge variant="outline" className="text-xs">
										Terminal
									</Badge>
								)}
							</div>
						))}
					</div>
				</FlatCard>
			</section>
		</div>
	);
}
