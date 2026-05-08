/**
 * Actions Pending Widget — Liste des actions en attente sur les requests
 */

import Link from "next/link";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	ChevronRight,
	FileUp,
	Info,
	PenLine,
} from "lucide-react";
import { FlatCard } from "@/components/my-space/flat-card";
import { SectionHeader } from "@/components/my-space/section-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionType =
	| "upload_document"
	| "complete_info"
	| "schedule_appointment"
	| "confirm_info";

export interface PendingAction {
	actionId: string;
	type: ActionType;
	message?: string;
	deadline?: number;
	requestReference: string;
	serviceName: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
	ActionType,
	{ icon: typeof FileUp; label: string; color: string; bgColor: string }
> = {
	upload_document: {
		icon: FileUp,
		label: "Document a fournir",
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-500/10",
	},
	complete_info: {
		icon: PenLine,
		label: "Information a completer",
		color: "text-amber-600 dark:text-amber-400",
		bgColor: "bg-amber-500/10",
	},
	schedule_appointment: {
		icon: Calendar,
		label: "RDV a planifier",
		color: "text-purple-600 dark:text-purple-400",
		bgColor: "bg-purple-500/10",
	},
	confirm_info: {
		icon: Info,
		label: "Information a confirmer",
		color: "text-indigo-600 dark:text-indigo-400",
		bgColor: "bg-indigo-500/10",
	},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeadlineLabel(deadline?: number) {
	if (!deadline) return null;
	const daysLeft = Math.ceil((deadline - Date.now()) / 86400000);
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

// ─── Component ────────────────────────────────────────────────────────────────

interface ActionsPendingWidgetProps {
	actions: PendingAction[];
}

export function ActionsPendingWidget({ actions }: ActionsPendingWidgetProps) {
	return (
		<FlatCard className="p-3.5">
			<SectionHeader
				icon={<AlertTriangle className="w-3.5 h-3.5" />}
				iconBgClass="bg-rose-500/10"
				iconTextClass="text-rose-600 dark:text-rose-400"
				title={
					<span className="flex items-center gap-2">
						Actions requises
						{actions.length > 0 && (
							<Badge
								variant="outline"
								className="text-[10px] h-4 px-1.5 py-0 text-rose-600 dark:text-rose-400 border-rose-500/20"
							>
								{actions.length}
							</Badge>
						)}
					</span>
				}
			/>

			{actions.length === 0 ? (
				<div className="flex items-center gap-2.5 py-6 justify-center">
					<CheckCircle2 className="w-5 h-5 text-green-500" />
					<p className="text-xs text-muted-foreground">
						Aucune action en attente
					</p>
				</div>
			) : (
				<div className="space-y-2 mt-2">
					{actions.slice(0, 4).map((action) => {
						const config = ACTION_CONFIG[action.type];
						const deadline = getDeadlineLabel(action.deadline);
						const Icon = config.icon;

						return (
							<Link
								key={action.actionId}
								href={`/my-space/requests/${action.requestReference}`}
								className="group"
							>
								<div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
									<div
										className={cn(
											"p-1.5 rounded-md shrink-0",
											config.bgColor,
										)}
									>
										<Icon
											className={cn("w-3.5 h-3.5", config.color)}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
											{config.label}
										</p>
										<p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
											{action.serviceName}
										</p>
										{action.message && (
											<p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5 italic">
												{action.message}
											</p>
										)}
										{deadline && (
											<p
												className={cn(
													"text-[10px] mt-0.5 flex items-center gap-1",
													deadline.color,
												)}
											>
												{deadline.urgent && (
													<AlertTriangle className="w-2.5 h-2.5" />
												)}
												{deadline.label}
											</p>
										)}
									</div>
									<ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
								</div>
							</Link>
						);
					})}
					{actions.length > 4 && (
						<p className="text-[10px] text-center text-muted-foreground pt-1">
							+{actions.length - 4} autre{actions.length - 4 > 1 ? "s" : ""} action{actions.length - 4 > 1 ? "s" : ""}
						</p>
					)}
				</div>
			)}
		</FlatCard>
	);
}

// ─── Banner compact mobile ────────────────────────────────────────────────────

export function ActionsBanner({ count }: { count: number }) {
	if (count === 0) return null;
	return (
		<Link href="/my-space/requests">
			<div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15">
				<div className="p-1.5 rounded-md bg-rose-500/15">
					<AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
						{count} action{count > 1 ? "s" : ""} requise{count > 1 ? "s" : ""}
					</p>
					<p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">
						Des documents ou informations sont attendus
					</p>
				</div>
				<ChevronRight className="w-4 h-4 text-rose-500/50 shrink-0" />
			</div>
		</Link>
	);
}
