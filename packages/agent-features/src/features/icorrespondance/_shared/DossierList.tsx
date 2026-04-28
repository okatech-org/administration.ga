"use client";

import { useState, useMemo } from "react";
import {
	Search,
	Plus,
	Loader2,
	AlertTriangle,
	FileText,
	ChevronRight,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type DossierStatus =
	| "brouillon"
	| "en_cours"
	| "en_attente"
	| "suspendu"
	| "valide"
	| "rejete"
	| "clos"
	| "archive";

type DossierPriorite = "normal" | "urgent" | "critique";

export interface DossierItem {
	_id: string;
	reference: string;
	status: DossierStatus;
	etapeCouranteCode: string;
	etapeCouranteOrdre: number;
	priorite: DossierPriorite;
	dateDepot: string;
	dateLimite?: string;
	typeLabel: { fr: string; en?: string };
	typeCode: string;
	demandeurName: string;
	agentTraitantId?: string;
}

export interface DossierListProps {
	dossiers: DossierItem[];
	onSelectDossier: (id: string) => void;
	onCreateDossier: () => void;
	isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CFG: Record<DossierStatus, { label: string; class: string; dot: string }> = {
	brouillon: {
		label: "Brouillon",
		class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
		dot: "bg-zinc-400",
	},
	en_cours: {
		label: "En cours",
		class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
		dot: "bg-blue-400",
	},
	en_attente: {
		label: "En attente",
		class: "bg-amber-500/15 text-amber-400 border-amber-500/20",
		dot: "bg-amber-400",
	},
	suspendu: {
		label: "Suspendu",
		class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
		dot: "bg-yellow-400",
	},
	valide: {
		label: "Validé",
		class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
		dot: "bg-emerald-400",
	},
	rejete: {
		label: "Rejeté",
		class: "bg-red-500/15 text-red-400 border-red-500/20",
		dot: "bg-red-400",
	},
	clos: {
		label: "Clos",
		class: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
		dot: "bg-zinc-400",
	},
	archive: {
		label: "Archivé",
		class: "bg-primary/15 text-primary border-primary/20",
		dot: "bg-primary",
	},
};

const STATUS_FILTERS: { value: DossierStatus | "all"; label: string }[] = [
	{ value: "all", label: "Tous" },
	{ value: "brouillon", label: "Brouillons" },
	{ value: "en_cours", label: "En cours" },
	{ value: "en_attente", label: "En attente" },
	{ value: "suspendu", label: "Suspendus" },
	{ value: "valide", label: "Validés" },
	{ value: "rejete", label: "Rejetés" },
	{ value: "clos", label: "Clos" },
	{ value: "archive", label: "Archivés" },
];

const PRIORITE_CFG: Record<DossierPriorite, { label: string; class: string }> = {
	normal: { label: "Normal", class: "" },
	urgent: {
		label: "Urgent",
		class: "bg-red-500/15 text-red-400 border-red-500/20",
	},
	critique: {
		label: "Critique",
		class: "bg-orange-500/15 text-orange-400 border-orange-500/20",
	},
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDateFr(dateStr: string): string {
	try {
		const d = new Date(dateStr);
		return d.toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
}

function isOverdue(dateLimite?: string): boolean {
	if (!dateLimite) return false;
	try {
		return new Date(dateLimite) < new Date();
	} catch {
		return false;
	}
}

function daysRemaining(dateLimite?: string): string | null {
	if (!dateLimite) return null;
	try {
		const diff = Math.ceil(
			(new Date(dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		if (diff < 0) return `${Math.abs(diff)}j en retard`;
		if (diff === 0) return "Aujourd'hui";
		return `${diff}j restants`;
	} catch {
		return null;
	}
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DossierList({
	dossiers,
	onSelectDossier,
	onCreateDossier,
	isLoading = false,
}: DossierListProps) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<DossierStatus | "all">("all");

	const filtered = useMemo(() => {
		let result = dossiers;

		if (statusFilter !== "all") {
			result = result.filter((d) => d.status === statusFilter);
		}

		if (search.trim()) {
			const q = search.toLowerCase().trim();
			result = result.filter(
				(d) =>
					d.reference.toLowerCase().includes(q) ||
					d.demandeurName.toLowerCase().includes(q) ||
					d.typeLabel.fr.toLowerCase().includes(q)
			);
		}

		return result;
	}, [dossiers, statusFilter, search]);

	return (
		<div className="space-y-4">
			{/* ── Toolbar ── */}
			<div className="border border-border/50 rounded-xl bg-card p-3">
				<div className="flex flex-wrap items-center gap-2">
					{/* Search */}
					<div className="relative flex-1 min-w-[200px] max-w-[360px]">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<input
							type="text"
							placeholder="Rechercher par référence..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>

					{/* Status filter */}
					<select
						value={statusFilter}
						onChange={(e) =>
							setStatusFilter(e.target.value as DossierStatus | "all")
						}
						className="h-8 px-2.5 text-xs rounded-lg border border-border/50 bg-background/50 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					>
						{STATUS_FILTERS.map((sf) => (
							<option key={sf.value} value={sf.value}>
								{sf.label}
							</option>
						))}
					</select>

					{/* Spacer */}
					<div className="flex-1" />

					{/* Create button */}
					<button
						type="button"
						onClick={onCreateDossier}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						Nouveau dossier
					</button>
				</div>
			</div>

			{/* ── Table ── */}
			<div className="border border-border/50 rounded-xl overflow-hidden bg-card">
				{/* Header */}
				<div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					<div className="col-span-2">Référence</div>
					<div className="col-span-2">Demandeur</div>
					<div className="col-span-1">Type</div>
					<div className="col-span-2">Étape courante</div>
					<div className="col-span-1">Statut</div>
					<div className="col-span-1">Priorité</div>
					<div className="col-span-1">Dépôt</div>
					<div className="col-span-2">Délai</div>
				</div>

				{/* Loading */}
				{isLoading && (
					<div className="flex items-center justify-center py-16 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						<span className="text-xs">Chargement des dossiers...</span>
					</div>
				)}

				{/* Empty */}
				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<FileText className="h-8 w-8 mb-2 opacity-40" />
						<span className="text-xs">Aucun dossier trouvé</span>
						{(search || statusFilter !== "all") && (
							<button
								type="button"
								onClick={() => {
									setSearch("");
									setStatusFilter("all");
								}}
								className="mt-2 text-xs text-primary hover:underline"
							>
								Effacer les filtres
							</button>
						)}
					</div>
				)}

				{/* Rows */}
				{!isLoading &&
					filtered.map((dossier) => {
						const statusCfg = STATUS_CFG[dossier.status];
						const overdue = isOverdue(dossier.dateLimite);
						const delai = daysRemaining(dossier.dateLimite);
						const prioriteCfg = PRIORITE_CFG[dossier.priorite];

						return (
							<div
								key={dossier._id}
								onClick={() => onSelectDossier(dossier._id)}
								className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors group"
							>
								{/* Référence + type badge */}
								<div className="col-span-2 flex items-center gap-2 min-w-0">
									<div className="min-w-0">
										<span className="text-xs font-medium text-foreground truncate block">
											{dossier.reference}
										</span>
										<span className="text-[10px] text-muted-foreground truncate block">
											{dossier.typeCode}
										</span>
									</div>
								</div>

								{/* Demandeur */}
								<div className="col-span-2 flex items-center min-w-0">
									<span className="text-xs text-foreground truncate">
										{dossier.demandeurName}
									</span>
								</div>

								{/* Type label */}
								<div className="col-span-1 flex items-center min-w-0">
									<span className="text-xs text-muted-foreground truncate">
										{dossier.typeLabel.fr}
									</span>
								</div>

								{/* Étape courante */}
								<div className="col-span-2 flex items-center gap-1.5 min-w-0">
									<span className="text-[10px] text-muted-foreground font-mono">
										{dossier.etapeCouranteOrdre}.
									</span>
									<span className="text-xs text-foreground truncate">
										{dossier.etapeCouranteCode}
									</span>
								</div>

								{/* Statut */}
								<div className="col-span-1 flex items-center">
									<span
										className={cn(
											"inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
											statusCfg.class
										)}
									>
										<span
											className={cn(
												"h-1.5 w-1.5 rounded-full",
												statusCfg.dot
											)}
										/>
										{statusCfg.label}
									</span>
								</div>

								{/* Priorité */}
								<div className="col-span-1 flex items-center">
									{dossier.priorite !== "normal" ? (
										<span
											className={cn(
												"inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
												prioriteCfg.class
											)}
										>
											{prioriteCfg.label}
										</span>
									) : (
										<span className="text-[10px] text-muted-foreground">
											-
										</span>
									)}
								</div>

								{/* Date dépôt */}
								<div className="col-span-1 flex items-center">
									<span className="text-xs text-muted-foreground">
										{formatDateFr(dossier.dateDepot)}
									</span>
								</div>

								{/* Délai */}
								<div className="col-span-2 flex items-center gap-1.5">
									{delai ? (
										<>
											{overdue && (
												<AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
											)}
											<span
												className={cn(
													"text-xs",
													overdue
														? "text-red-400 font-medium"
														: "text-muted-foreground"
												)}
											>
												{delai}
											</span>
										</>
									) : (
										<span className="text-[10px] text-muted-foreground">
											-
										</span>
									)}
									<ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>
							</div>
						);
					})}
			</div>

			{/* ── Footer count ── */}
			{!isLoading && (
				<div className="text-[10px] text-muted-foreground px-1">
					{filtered.length} dossier{filtered.length !== 1 ? "s" : ""} affichés
					{statusFilter !== "all" || search
						? ` sur ${dossiers.length}`
						: ""}
				</div>
			)}
		</div>
	);
}

export default DossierList;
