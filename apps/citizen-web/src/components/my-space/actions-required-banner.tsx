/**
 * Banniere d'actions requises — s'affiche quand l'utilisateur a des actions en attente.
 * Design iProfil : FlatCard avec accent warning.
 */

import Link from "next/link";
import {
	AlertTriangle,
	ArrowRight,
	Calendar,
	CheckSquare,
	FileUp,
	Info,
} from "lucide-react";
import { FlatCard } from "@/components/my-space/flat-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActionInfo {
	requestId: string;
	requestReference?: string;
	serviceName?: string;
	actions: Array<{
		type: string;
		message?: string;
	}>;
}

interface ActionsRequiredBannerProps {
	/** Liste des requests avec des actions requises */
	pendingActions: ActionInfo[];
	className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ACTION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	upload_document: FileUp,
	complete_info: Info,
	schedule_appointment: Calendar,
	confirm_info: CheckSquare,
};

function getActionLabel(type: string): string {
	const labels: Record<string, string> = {
		upload_document: "Fournir un document",
		complete_info: "Completer des informations",
		schedule_appointment: "Prendre rendez-vous",
		confirm_info: "Confirmer des informations",
	};
	return labels[type] ?? type;
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function ActionsRequiredBanner({ pendingActions, className }: ActionsRequiredBannerProps) {

	if (pendingActions.length === 0) return null;

	const totalActions = pendingActions.reduce((sum, r) => sum + r.actions.length, 0);
	const firstAction = pendingActions[0];

	return (
		<FlatCard className={cn("bg-warning/[0.06] dark:bg-warning/[0.04] border-warning/20", className)}>
			<div className="p-4">
				<div className="flex items-start gap-3">
					{/* Icone pulsante */}
					<div className="relative shrink-0 mt-0.5">
						<div className="p-2 rounded-xl bg-warning/15">
							<AlertTriangle className="h-4 w-4 text-warning" />
						</div>
						<span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/60" />
							<span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
						</span>
					</div>

					{/* Contenu */}
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-foreground">
							{totalActions} action{totalActions > 1 ? "s" : ""} requise{totalActions > 1 ? "s" : ""}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							{pendingActions.length === 1
								? firstAction?.serviceName ?? "Demarche en cours"
								: `${pendingActions.length} demarches necessitent votre attention`}
						</p>

						{/* Types d'actions */}
						{totalActions <= 4 && (
							<div className="flex flex-wrap gap-1.5 mt-2">
								{pendingActions.flatMap((r) =>
									r.actions.map((action, idx) => {
										const ActionIcon = ACTION_TYPE_ICONS[action.type] ?? Info;
										return (
											<span
												key={`${r.requestId}-${idx}`}
												className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full"
											>
												<ActionIcon className="h-2.5 w-2.5" />
												{getActionLabel(action.type)}
											</span>
										);
									}),
								)}
							</div>
						)}
					</div>

					{/* CTA vers la premiere demarche */}
					{firstAction && (
						<Link
							href={`/my-space/requests/${firstAction.requestReference || firstAction.requestId}`}
						>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-3 text-xs font-medium bg-warning/10 hover:bg-warning/20 text-warning rounded-full shrink-0"
							>
								Voir
								<ArrowRight className="h-3 w-3 ml-1" />
							</Button>
						</Link>
					)}
				</div>
			</div>
		</FlatCard>
	);
}
