/**
 * Demarche Unified Card — Card unifiee pour requests ET dossiers
 */

"use client";

import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	CalendarClock,
	ChevronRight,
	Clock,
	FileText,
	FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedDemarche {
	id: string;
	type: "request" | "dossier";
	reference: string;
	serviceName: string;
	status: string;
	statusLabel: string;
	statusColor: string;
	statusBgColor: string;
	createdAt: number;
	/** Nombre d'actions en attente (requests seulement) */
	pendingActionsCount: number;
	/** Deadline du dossier */
	deadline?: number;
	/** Etape courante (dossiers seulement) */
	currentStep?: string;
	/** Progression (dossiers) : etape X sur Y */
	stepProgress?: { current: number; total: number };
	/** Nom de l'organisme */
	orgName?: string;
	/** Lien vers la page detail */
	href: string;
	linkParams: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeadlineInfo(dateLimite?: number) {
	if (!dateLimite) return null;
	const daysLeft = Math.ceil((dateLimite - Date.now()) / 86400000);
	if (daysLeft < 0)
		return { label: "En retard", color: "text-rose-500", urgent: true };
	if (daysLeft <= 3)
		return {
			label: `${daysLeft}j restant${daysLeft > 1 ? "s" : ""}`,
			color: "text-amber-500",
			urgent: true,
		};
	return {
		label: `${daysLeft}j restants`,
		color: "text-muted-foreground",
		urgent: false,
	};
}

function formatDateFr(ts: number): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(ts));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DemarcheUnifiedCardProps {
	demarche: UnifiedDemarche;
}

export function DemarcheUnifiedCard({ demarche }: DemarcheUnifiedCardProps) {
	const router = useRouter();
	const deadline = getDeadlineInfo(demarche.deadline);
	const isRequest = demarche.type === "request";
	const TypeIcon = isRequest ? FileText : FolderOpen;

	const handleClick = () => {
		if (isRequest) {
			router.push(`/my-space/requests/${demarche.linkParams.reference ?? demarche.id}`);
		} else {
			router.push(`/my-space/demarches/${demarche.linkParams.dossierId ?? demarche.id}`);
		}
	};

	return (
		<button type="button" onClick={handleClick} className="group block w-full text-left">
			<FlatCard className="p-3.5 hover:shadow-sm transition-all">
				<div className="flex items-start gap-3">
					{/* Icone statut */}
					<div
						className={cn(
							"p-2 rounded-lg border shrink-0",
							demarche.statusBgColor,
						)}
					>
						<TypeIcon className={cn("w-4 h-4", demarche.statusColor)} />
					</div>

					{/* Contenu principal */}
					<div className="flex-1 min-w-0">
						{/* Reference + statut */}
						<div className="flex items-center gap-2 mb-0.5 flex-wrap">
							<span className="text-[10px] font-mono text-muted-foreground">
								{demarche.reference}
							</span>
							<Badge
								variant="outline"
								className={cn(
									"text-[10px] border px-1.5 py-0 h-4",
									demarche.statusBgColor,
									demarche.statusColor,
								)}
							>
								{demarche.statusLabel}
							</Badge>
							{demarche.type === "dossier" && (
								<Badge
									variant="outline"
									className="text-[9px] border px-1 py-0 h-3.5 text-muted-foreground"
								>
									Procedure
								</Badge>
							)}
						</div>

						{/* Service name */}
						<p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
							{demarche.serviceName}
						</p>

						{/* Step info (dossiers) */}
						{demarche.currentStep && (
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Etape : {demarche.currentStep}
							</p>
						)}

						{/* Step progress bar (dossiers) */}
						{demarche.stepProgress && demarche.stepProgress.total > 1 && (
							<div className="flex items-center gap-2 mt-1.5">
								<div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
									<div
										className="h-full rounded-full bg-primary transition-all"
										style={{
											width: `${(demarche.stepProgress.current / demarche.stepProgress.total) * 100}%`,
										}}
									/>
								</div>
								<span className="text-[9px] text-muted-foreground shrink-0">
									{demarche.stepProgress.current}/{demarche.stepProgress.total}
								</span>
							</div>
						)}

						{/* Metadata row */}
						<div className="flex items-center gap-3 mt-1.5 flex-wrap">
							{/* Date */}
							<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
								<CalendarClock className="w-3 h-3" />
								{formatDateFr(demarche.createdAt)}
							</span>

							{/* Org */}
							{demarche.orgName && (
								<span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
									{demarche.orgName}
								</span>
							)}

							{/* Pending actions */}
							{demarche.pendingActionsCount > 0 && (
								<Badge
									variant="outline"
									className="text-[9px] h-4 px-1.5 py-0 gap-0.5 text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10"
								>
									<AlertTriangle className="w-2.5 h-2.5" />
									{demarche.pendingActionsCount} action{demarche.pendingActionsCount > 1 ? "s" : ""}
								</Badge>
							)}

							{/* Deadline */}
							{deadline && (
								<span
									className={cn(
										"flex items-center gap-1 text-[10px]",
										deadline.color,
									)}
								>
									{deadline.urgent ? (
										<AlertTriangle className="w-2.5 h-2.5" />
									) : (
										<Clock className="w-2.5 h-2.5" />
									)}
									{deadline.label}
								</span>
							)}
						</div>
					</div>

					{/* Chevron */}
					<ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary shrink-0 mt-1 transition-colors" />
				</div>
			</FlatCard>
		</button>
	);
}
