/**
 * TrackingTimeline — Timeline de suivi pour les copies envoyées.
 *
 * Affiche l'historique temps réel du traitement côté destinataire :
 * Envoyé → Reçu → Enregistré → Assigné → Approuvé → Répondu
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Check,
	Clock,
	FileText,
	Inbox,
	Loader2,
	MessageSquare,
	Send,
	UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface TrackingTimelineProps {
	itemId: Id<"correspondanceItems">;
	sentAt?: number;
	recipientStatus?: string;
	recipientStatusUpdatedAt?: number;
	arrivalReference?: string;
	arrivalDate?: number;
}

// Étapes du suivi dans l'ordre chronologique
const TRACKING_STEPS = [
	{
		key: "sent",
		label: "Envoyé",
		icon: Send,
		color: "text-violet-400",
		bgColor: "bg-violet-500/15",
		borderColor: "border-violet-500/30",
	},
	{
		key: "recu",
		label: "Réceptionné",
		icon: Inbox,
		color: "text-blue-400",
		bgColor: "bg-blue-500/15",
		borderColor: "border-blue-500/30",
	},
	{
		key: "en_attente",
		label: "En traitement",
		icon: Clock,
		color: "text-orange-400",
		bgColor: "bg-orange-500/15",
		borderColor: "border-orange-500/30",
	},
	{
		key: "approuve",
		label: "Approuvé",
		icon: Check,
		color: "text-emerald-400",
		bgColor: "bg-emerald-500/15",
		borderColor: "border-emerald-500/30",
	},
	{
		key: "repondu",
		label: "Répondu",
		icon: MessageSquare,
		color: "text-violet-400",
		bgColor: "bg-violet-500/15",
		borderColor: "border-violet-500/30",
	},
] as const;

/** Mapping recipientStatus → index dans TRACKING_STEPS */
const STATUS_TO_INDEX: Record<string, number> = {
	en_transit: 0,
	recu: 1,
	en_attente: 2,
	approuve: 3,
	repondu: 4,
};

function formatDate(ts?: number): string {
	if (!ts) return "—";
	const d = new Date(ts);
	return d.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function relativeTime(ts?: number): string {
	if (!ts) return "";
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "À l'instant";
	if (mins < 60) return `Il y a ${mins} min`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `Il y a ${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `Il y a ${days}j`;
	return formatDate(ts);
}

export function TrackingTimeline({
	itemId,
	sentAt,
	recipientStatus,
	recipientStatusUpdatedAt,
	arrivalReference,
	arrivalDate,
}: TrackingTimelineProps) {
	// Déterminer l'étape active
	const activeIndex = recipientStatus
		? (STATUS_TO_INDEX[recipientStatus] ?? 0)
		: 0;

	// Charger l'historique workflow pour les détails
	const { data: workflowSteps } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getWorkflowHistory,
		{ itemId },
	);

	return (
		<div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
			{/* Header */}
			<div className="flex items-center gap-2">
				<FileText className="h-4 w-4 text-primary" />
				<h4 className="text-sm font-semibold">Suivi de la correspondance</h4>
				{recipientStatus && (
					<Badge
						variant="outline"
						className={cn(
							"text-[9px] ml-auto",
							TRACKING_STEPS[activeIndex]?.color,
						)}
					>
						{TRACKING_STEPS[activeIndex]?.label}
					</Badge>
				)}
			</div>

			{/* Timeline verticale */}
			<div className="relative pl-4">
				{/* Ligne verticale */}
				<div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

				{TRACKING_STEPS.map((step, i) => {
					const isPast = i <= activeIndex;
					const isCurrent = i === activeIndex;
					const StepIcon = step.icon;

					// Trouver la date correspondante
					let stepDate: number | undefined;
					if (step.key === "sent") stepDate = sentAt;
					else if (step.key === "recu" && arrivalDate) stepDate = arrivalDate;
					else if (isPast && recipientStatusUpdatedAt && i === activeIndex) {
						stepDate = recipientStatusUpdatedAt;
					}

					return (
						<div
							key={step.key}
							className={cn(
								"relative flex items-start gap-3 pb-4 last:pb-0",
								!isPast && "opacity-40",
							)}
						>
							{/* Dot/icon */}
							<div
								className={cn(
									"relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
									isPast
										? cn(step.bgColor, step.borderColor)
										: "bg-muted border-border",
									isCurrent && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
								)}
							>
								{isCurrent && recipientStatus !== "repondu" ? (
									<Loader2 className={cn("h-3.5 w-3.5 animate-spin", step.color)} />
								) : (
									<StepIcon className={cn("h-3.5 w-3.5", isPast ? step.color : "text-muted-foreground")} />
								)}
							</div>

							{/* Content */}
							<div className="flex-1 min-w-0 pt-1">
								<div className="flex items-center gap-2">
									<span className={cn("text-xs font-medium", isPast ? "text-foreground" : "text-muted-foreground")}>
										{step.label}
									</span>
									{isCurrent && (
										<span className="text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
											Actuel
										</span>
									)}
								</div>

								{/* Date et détails */}
								{isPast && stepDate && (
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-[10px] text-muted-foreground">
											{formatDate(stepDate)}
										</span>
										<span className="text-[9px] text-muted-foreground/60">
											({relativeTime(stepDate)})
										</span>
									</div>
								)}

								{/* Numéro d'arrivée pour l'étape "Reçu" */}
								{step.key === "recu" && arrivalReference && isPast && (
									<div className="mt-1">
										<Badge variant="secondary" className="text-[9px]">
											Réf. arrivée : {arrivalReference}
										</Badge>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Historique détaillé (collapsible) */}
			{workflowSteps && workflowSteps.length > 0 && (
				<details className="group">
					<summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
						<Clock className="h-3 w-3" />
						Historique complet ({workflowSteps.length} actions)
					</summary>
					<div className="mt-2 space-y-1 pl-1">
						{workflowSteps.map((step: any) => (
							<div key={step._id} className="flex items-start gap-2 text-[10px] py-1">
								<span className="text-muted-foreground/50 shrink-0 w-24">
									{formatDate(step.createdAt)}
								</span>
								<span className="text-muted-foreground">
									<strong className="text-foreground/80">{step.actorName}</strong>
									{" — "}
									{step.comment ?? step.stepType}
								</span>
							</div>
						))}
					</div>
				</details>
			)}
		</div>
	);
}
