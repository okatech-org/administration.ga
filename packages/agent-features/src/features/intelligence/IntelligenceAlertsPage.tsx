"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	BellRing,
	CheckCircle2,
	Loader2,
	XCircle,
} from "lucide-react";
import { useState } from "react";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

type AlertStatus = "new" | "acknowledged" | "dismissed";

const STATUS_LABELS: Record<AlertStatus, string> = {
	new: "Nouvelle",
	acknowledged: "Prise en compte",
	dismissed: "Rejetée",
};

const SEVERITY_CLASSES: Record<string, string> = {
	low: "bg-muted/50 text-muted-foreground border-border/50",
	medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const SEVERITY_LABELS: Record<string, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

export default function IntelligenceAlertsPage() {
	const { activeOrgId } = useOrg();
	const [status, setStatus] = useState<AlertStatus>("new");

	const { data: alerts, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceAlerts.listAlerts,
		activeOrgId ? { orgId: activeOrgId, status, limit: 100 } : "skip",
	);

	const { mutateAsync: ackMutate } = useConvexMutationQuery(
		api.functions.intelligenceAlerts.acknowledgeAlert,
	);
	const { mutateAsync: dismissMutate } = useConvexMutationQuery(
		api.functions.intelligenceAlerts.dismissAlert,
	);

	if (!activeOrgId) return null;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
			<PageHeader
				icon={<BellRing className="size-5" />}
				title="Alertes"
				subtitle="Inbox des alertes générées par les règles actives."
			/>

			<div className="flex gap-2">
				{(["new", "acknowledged", "dismissed"] as AlertStatus[]).map((s) => (
					<Button
						key={s}
						type="button"
						variant={s === status ? "default" : "outline"}
						size="sm"
						onClick={() => setStatus(s)}
					>
						{STATUS_LABELS[s]}
					</Button>
				))}
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : !alerts || alerts.length === 0 ? (
				<FlatCard className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
					<AlertTriangle className="size-8 opacity-50" />
					<div>Aucune alerte {STATUS_LABELS[status].toLowerCase()}.</div>
				</FlatCard>
			) : (
				<div className="flex flex-col gap-3">
					{alerts.map((alert) => (
						<AlertRow
							key={alert._id}
							alert={alert}
							orgId={activeOrgId}
							onAck={() =>
								ackMutate({ orgId: activeOrgId, alertId: alert._id })
							}
							onDismiss={() =>
								dismissMutate({
									orgId: activeOrgId,
									alertId: alert._id,
								})
							}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface AlertRowProps {
	alert: {
		_id: Id<"intelligenceAlerts">;
		title: string;
		summary?: string;
		severity: string;
		status: AlertStatus;
		createdAt: number;
	};
	orgId: Id<"orgs">;
	onAck: () => Promise<unknown>;
	onDismiss: () => Promise<unknown>;
}

function AlertRow({ alert, onAck, onDismiss }: AlertRowProps) {
	const [busy, setBusy] = useState<"ack" | "dismiss" | null>(null);

	const handleAck = async () => {
		setBusy("ack");
		try {
			await onAck();
		} finally {
			setBusy(null);
		}
	};
	const handleDismiss = async () => {
		setBusy("dismiss");
		try {
			await onDismiss();
		} finally {
			setBusy(null);
		}
	};

	return (
		<FlatCard className="flex flex-col gap-3 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className={cn("text-[10px]", SEVERITY_CLASSES[alert.severity])}
						>
							{SEVERITY_LABELS[alert.severity] ?? alert.severity}
						</Badge>
						<span className="text-xs text-muted-foreground">
							{formatDistanceToNow(alert.createdAt, {
								addSuffix: true,
								locale: fr,
							})}
						</span>
					</div>
					<div className="font-medium text-sm leading-tight">{alert.title}</div>
					{alert.summary && (
						<div className="text-xs text-muted-foreground">{alert.summary}</div>
					)}
				</div>

				{alert.status === "new" && (
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={handleAck}
							disabled={busy !== null}
						>
							{busy === "ack" ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<CheckCircle2 className="size-3.5" />
							)}
							<span className="ml-1.5">Accuser</span>
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={handleDismiss}
							disabled={busy !== null}
						>
							{busy === "dismiss" ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<XCircle className="size-3.5" />
							)}
							<span className="ml-1.5">Rejeter</span>
						</Button>
					</div>
				)}
			</div>
		</FlatCard>
	);
}
