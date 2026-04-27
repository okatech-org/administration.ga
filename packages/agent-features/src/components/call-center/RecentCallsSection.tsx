"use client";

import {
	ArrowDownLeft,
	ArrowUpRight,
	ChevronDown,
	History,
	PhoneMissed,
	PhoneOff,
	RotateCw,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { bucketLabelKey, groupByDate } from "./date-groups";

export interface RecentCallRow {
	_id: string;
	orgId: string | null;
	callLineId: string | null;
	lineLabel: string | null;
	lineColor: string | null;
	title: string;
	isInbound: boolean;
	callStatus: string | null;
	endReason: string | null;
	wasAnswered: boolean;
	startedAt: number;
	endedAt: number;
	durationSeconds: number;
	caller: {
		userId: string;
		displayName: string;
		email: string | null;
	};
}

function formatDuration(seconds: number): string {
	if (seconds < 1) return "—";
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m${s.toString().padStart(2, "0")}`;
}

const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
	hour: "2-digit",
	minute: "2-digit",
});

function RecentCallRowItem({
	row,
	pending,
	onCallBack,
}: {
	row: RecentCallRow;
	pending: boolean;
	onCallBack: (userId: Id<"users">, orgId: Id<"orgs">) => void;
}) {
	const { t } = useTranslation();
	const initials =
		row.caller.displayName
			.split(" ")
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?";

	const isAbandoned = row.endReason === "cancelled" || row.endReason === "timeout";
	const isDeclined = row.endReason === "declined" || row.endReason === "rejected";
	const Icon = row.wasAnswered
		? row.isInbound
			? ArrowDownLeft
			: ArrowUpRight
		: isAbandoned
			? PhoneMissed
			: isDeclined
				? PhoneOff
				: PhoneMissed;
	// Couleurs alignées sur la charte (4 accents seulement) :
	//   - répondu = primary
	//   - abandonné = foreground muted
	//   - manqué/refusé = destructive
	const iconTint = row.wasAnswered
		? "text-primary"
		: isAbandoned
			? "text-muted-foreground"
			: "text-destructive";

	const canCallBack = !!row.orgId;

	return (
		<li className="relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
			{row.lineColor ? (
				<span
					className="absolute inset-y-2 left-0 w-0.5 rounded-full"
					style={{ backgroundColor: row.lineColor }}
					aria-hidden
				/>
			) : null}

			<Avatar className="h-8 w-8 shrink-0">
				<AvatarFallback className="bg-muted text-[10px] font-bold">
					{initials}
				</AvatarFallback>
			</Avatar>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<Icon className={cn("h-3 w-3 shrink-0", iconTint)} />
					<p className="truncate text-[13px] font-semibold">
						{row.caller.displayName}
					</p>
				</div>
				<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
					{row.lineLabel ? <span className="truncate">{row.lineLabel}</span> : null}
					<span>{TIME_FMT.format(new Date(row.endedAt))}</span>
					{row.wasAnswered ? (
						<span className="font-mono">{formatDuration(row.durationSeconds)}</span>
					) : null}
				</div>
			</div>

			<Button
				size="sm"
				variant="outline"
				className="h-7 gap-1 text-[11px]"
				disabled={!canCallBack || pending}
				onClick={() => {
					if (row.orgId) {
						onCallBack(row.caller.userId as Id<"users">, row.orgId as Id<"orgs">);
					}
				}}
				title={t("callCenter.missed.callBack")}
			>
				<RotateCw className={cn("h-3 w-3", pending && "animate-spin")} />
				{t("callCenter.missed.callBack")}
			</Button>
		</li>
	);
}

/**
 * Section "Récents" — derniers appels terminés visibles par l'agent
 * (answered, abandoned, missed). Réduite par défaut, dépliable au clic.
 *
 * Groupage par date (Aujourd'hui / Hier / Cette semaine / Plus tôt) pour
 * permettre à l'agent de scanner rapidement même quand l'historique est long.
 * Pas de plafond hardcodé : on rend tout ce que le serveur renvoie ; le
 * scroll du parent prend le relais.
 */
export function RecentCallsSection({
	rows,
	onCallBack,
	pendingIds,
}: {
	rows: RecentCallRow[];
	onCallBack: (userId: Id<"users">, orgId: Id<"orgs">) => void;
	pendingIds: Set<string>;
}) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);

	if (rows.length === 0) return null;

	const buckets = groupByDate(rows, (r) => r.endedAt);

	return (
		<div className="mt-4 flex flex-col gap-2">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
				className="flex w-full items-center justify-between rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/40"
			>
				<div className="flex items-center gap-2">
					<History className="h-3.5 w-3.5 text-muted-foreground" />
					<h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						{t("callCenter.recent.title", "Récents")}
					</h4>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
						{rows.length}
					</span>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 text-muted-foreground transition-transform",
							expanded && "rotate-180",
						)}
					/>
				</div>
			</button>

			{expanded ? (
				<div className="flex flex-col gap-3">
					{buckets.map((bucket) => (
						<div key={bucket.key} className="flex flex-col gap-1.5">
							<div className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
								{t(bucketLabelKey(bucket.key))}
							</div>
							<ul className="flex flex-col gap-1.5">
								{bucket.rows.map((r) => (
									<RecentCallRowItem
										key={r._id}
										row={r}
										pending={pendingIds.has(r._id)}
										onCallBack={onCallBack}
									/>
								))}
							</ul>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
