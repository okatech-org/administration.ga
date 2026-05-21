/**
 * DemarcheProgressCard — carte enrichie pour les demarches (requests + dossiers).
 * Design iProfil : FlatCard avec border-left accent colore et barre de progression.
 */

import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import {
	AlertTriangle,
	CalendarClock,
	Clock,
	FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
import { Badge } from "@/components/ui/badge";
import {
	type DossierStatus,
	DOSSIER_STATUS_CONFIG,
	formatDateFr,
	getDeadlineInfo,
	getRequestProgressPercent,
} from "@/lib/dossier-status-config";
import { REQUEST_STATUS_CONFIG } from "@/lib/request-status-config";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RequestDemarcheData {
	type: "request";
	_id: Id<"requests">;
	reference?: string;
	status: string;
	_creationTime: number;
	service?: { name?: Record<string, string> } | null;
	org?: { name?: string } | null;
	actionsRequired?: Array<{ type: string; completedAt?: number }>;
}

interface DossierDemarcheData {
	type: "dossier";
	_id: string;
	reference?: string;
	status: string;
	dateDepot: number;
	dateLimite?: number;
	typeLabel?: { fr: string; en?: string };
	etapeLabel?: { fr: string; en?: string };
	etapeCouranteOrdre?: number;
	totalEtapes?: number;
}

export type DemarcheData = RequestDemarcheData | DossierDemarcheData;

interface DemarcheProgressCardProps {
	demarche: DemarcheData;
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function DemarcheProgressCard({ demarche }: DemarcheProgressCardProps) {
	if (demarche.type === "request") return <RequestProgressCard request={demarche} />;
	return <DossierProgressCard dossier={demarche} />;
}

// ─── Request Progress Card ──────────────────────────────────────────────────

function RequestProgressCard({
	request,
}: {
	request: RequestDemarcheData;
}) {
	const { t, i18n } = useTranslation();
	const statusConfig = REQUEST_STATUS_CONFIG[request.status as keyof typeof REQUEST_STATUS_CONFIG];
	const progress = getRequestProgressPercent(request.status);
	const serviceName = request.service?.name
		? getLocalizedValue(request.service.name, i18n.language)
		: t("requests.unknownService");

	// Actions non completees
	const pendingActions = request.actionsRequired?.filter((a) => !a.completedAt) ?? [];
	const hasPendingActions = pendingActions.length > 0;

	// Couleur de bordure selon le statut
	const borderColorMap: Record<string, string> = {
		draft: "border-l-muted-foreground/30",
		submitted: "border-l-success",
		pending: "border-l-warning",
		under_review: "border-l-primary",
		in_production: "border-l-[oklch(0.55_0.20_290)]",
		validated: "border-l-success",
		rejected: "border-l-destructive",
		appointment_scheduled: "border-l-primary",
		ready_for_pickup: "border-l-success",
		completed: "border-l-success",
		cancelled: "border-l-muted-foreground/30",
	};

	return (
		<Link
			href={`/my-space/requests/${request.reference || request._id}`}
			className="block group"
		>
			<FlatCard className={cn("border-l-[3px] transition-all active:scale-[0.97]", borderColorMap[request.status] ?? "border-l-muted-foreground/30")}>
				<div className="p-3.5 space-y-2.5">
					{/* Ligne 1 : Reference + Status */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 min-w-0">
							{request.reference && (
								<span className="text-[10px] font-mono text-muted-foreground shrink-0">
									{request.reference}
								</span>
							)}
							{hasPendingActions && (
								<span className="relative flex h-2 w-2 shrink-0">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/60" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
								</span>
							)}
						</div>
						{statusConfig && (
							<Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", statusConfig.className)}>
								{t(statusConfig.i18nKey, statusConfig.fallback)}
							</Badge>
						)}
					</div>

					{/* Ligne 2 : Nom du service */}
					<p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors truncate">
						{serviceName}
					</p>

					{/* Ligne 3 : Barre de progression */}
					<div className="space-y-1">
						<div className="h-1.5 rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full bg-primary transition-all duration-500"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-muted-foreground">
								{progress}%
							</span>
							<span className="text-[10px] text-muted-foreground flex items-center gap-1">
								<CalendarClock className="h-2.5 w-2.5" />
								{formatDateFr(request._creationTime)}
							</span>
						</div>
					</div>

					{/* Ligne 4 : Actions requises (si presente) */}
					{hasPendingActions && (
						<div className="flex items-center gap-1.5 text-[10px] font-medium text-warning">
							<AlertTriangle className="h-3 w-3" />
							{pendingActions.length} action{pendingActions.length > 1 ? "s" : ""} requise{pendingActions.length > 1 ? "s" : ""}
						</div>
					)}
				</div>
			</FlatCard>
		</Link>
	);
}

// ─── Dossier Progress Card ──────────────────────────────────────────────────

function DossierProgressCard({
	dossier,
}: {
	dossier: DossierDemarcheData;
}) {
	const status = dossier.status as DossierStatus;
	const statusConfig = DOSSIER_STATUS_CONFIG[status];
	const deadline = getDeadlineInfo(dossier.dateLimite);
	const StatusIcon = statusConfig?.icon ?? FileText;

	// Progression basee sur etapes si disponible
	const progress =
		dossier.etapeCouranteOrdre && dossier.totalEtapes
			? Math.round((dossier.etapeCouranteOrdre / dossier.totalEtapes) * 100)
			: null;

	return (
		<Link
			href={`/my-space/demarches/${dossier._id}`}
			className="block group"
		>
			<FlatCard className={cn("border-l-[3px] transition-all active:scale-[0.97]", statusConfig?.borderColor ?? "border-l-muted-foreground/30")}>
				<div className="p-3.5 space-y-2.5">
					{/* Ligne 1 : Reference + Status */}
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-mono text-muted-foreground">
							{dossier.reference ?? "---"}
						</span>
						<Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 gap-1", statusConfig?.bgColor, statusConfig?.color)}>
							<StatusIcon className="h-2.5 w-2.5" />
							{statusConfig?.label ?? status}
						</Badge>
					</div>

					{/* Ligne 2 : Type de demarche */}
					<p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors truncate">
						{dossier.typeLabel?.fr ?? "Demarche"}
					</p>

					{/* Ligne 3 : Etape courante */}
					<p className="text-xs text-muted-foreground">
						Etape : {dossier.etapeLabel?.fr ?? "---"}
					</p>

					{/* Ligne 4 : Barre de progression (si etapes connues) */}
					{progress !== null && (
						<div className="space-y-1">
							<div className="h-1.5 rounded-full bg-muted overflow-hidden">
								<div
									className="h-full rounded-full bg-primary transition-all duration-500"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<span className="text-[10px] text-muted-foreground">
								Etape {dossier.etapeCouranteOrdre}/{dossier.totalEtapes}
							</span>
						</div>
					)}

					{/* Ligne 5 : Dates et deadline */}
					<div className="flex items-center justify-between">
						<span className="text-[10px] text-muted-foreground flex items-center gap-1">
							<CalendarClock className="h-2.5 w-2.5" />
							{formatDateFr(dossier.dateDepot)}
						</span>
						{deadline && (
							<span className={cn("text-[10px] flex items-center gap-1 font-medium", deadline.color)}>
								{deadline.urgent ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
								{deadline.label}
							</span>
						)}
					</div>
				</div>
			</FlatCard>
		</Link>
	);
}
