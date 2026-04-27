"use client";

/**
 * LineFilterDropdown — bouton compact + popover pour filtrer la file d'appels
 * par ligne. Remplace le rail vertical `LineFilterRail` qui prenait toute une
 * colonne. On reste sur 2 colonnes (centre + drawer contexte) et on déclenche
 * le filtre depuis un bouton flottant en tête du centre.
 *
 * Affiche TOUTES les lignes actives configurées dans l'org (via
 * `api.functions.callLines.listByOrg`), pas juste celles qui ont un appel en
 * file. L'agent peut filtrer sur une ligne calme — c'est juste qu'il verra
 * "Tout est calme" comme contenu.
 *
 * - "Toutes les lignes" en première option (défaut)
 * - Une entrée par ligne configurée (code couleur + compteur d'appels en file)
 * - Tri : urgent d'abord, puis volume, puis priority configurée
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, ChevronDown, Circle, Inbox } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { useOrg } from "../../shell/org-provider";
import type { LineBucket } from "./LineFilterRail";

interface LineFilterDropdownProps {
	queue: Array<{
		callLineId: string | null;
		lineLabel: string | null;
		lineColor: string | null;
		priority: "urgent" | "high" | "normal";
	}>;
	selectedLineId: string | "all";
	onSelect: (lineId: string | "all") => void;
	totalCount: number;
	urgentCount: number;
}

export function LineFilterDropdown({
	queue,
	selectedLineId,
	onSelect,
	totalCount,
	urgentCount,
}: LineFilterDropdownProps) {
	const { t } = useTranslation();
	const { activeOrgId } = useOrg();

	// Toutes les lignes actives configurées dans l'org (même celles sans appel
	// en file actuellement). Permet d'appliquer un filtre proactif pour ne voir
	// que les appels d'une ligne calme dès qu'ils arrivent.
	const { data: orgLines } = useAuthenticatedConvexQuery(
		api.functions.callLines.listByOrg,
		activeOrgId ? { orgId: activeOrgId as Id<"orgs"> } : "skip",
	);

	const buckets: LineBucket[] = useMemo(() => {
		// Première passe : compter les appels par ligne depuis la file en cours.
		const counts = new Map<string | "__unassigned__", { count: number; urgentCount: number }>();
		for (const q of queue) {
			const key = (q.callLineId as string | null) ?? "__unassigned__";
			const existing = counts.get(key) ?? { count: 0, urgentCount: 0 };
			existing.count += 1;
			if (q.priority === "urgent") existing.urgentCount += 1;
			counts.set(key, existing);
		}

		// Deuxième passe : construire la liste à partir de TOUTES les lignes
		// configurées dans l'org. Une ligne sans appel garde un compteur 0.
		const result: Array<LineBucket & { priority?: number }> = [];
		const orgList = (orgLines as Array<{
			_id: string;
			label: string;
			color?: string | null;
			priority?: number;
		}> | undefined) ?? [];

		for (const line of orgList) {
			const stats = counts.get(line._id) ?? { count: 0, urgentCount: 0 };
			result.push({
				lineId: line._id,
				label: line.label,
				color: line.color ?? null,
				count: stats.count,
				urgentCount: stats.urgentCount,
				priority: line.priority,
			});
		}

		// Si la file contient des appels sans ligne assignée, ajouter le bucket "__unassigned__".
		const unassigned = counts.get("__unassigned__");
		if (unassigned && unassigned.count > 0) {
			result.push({
				lineId: null,
				label: t("callCenter.line.allAgents"),
				color: null,
				count: unassigned.count,
				urgentCount: unassigned.urgentCount,
			});
		}

		// Tri : urgent d'abord, puis volume, puis priorité configurée.
		result.sort((a, b) => {
			if (b.urgentCount !== a.urgentCount) return b.urgentCount - a.urgentCount;
			if (b.count !== a.count) return b.count - a.count;
			return (a.priority ?? 0) - (b.priority ?? 0);
		});

		return result;
	}, [queue, orgLines, t]);

	const selectedBucket =
		selectedLineId === "all"
			? null
			: buckets.find((b) => (b.lineId ?? "__unassigned__") === selectedLineId);

	const triggerLabel =
		selectedLineId === "all"
			? t("callCenter.queue.allLines")
			: selectedBucket?.label ?? t("callCenter.queue.allLines");

	const triggerCount =
		selectedLineId === "all"
			? totalCount
			: selectedBucket?.count ?? 0;
	const triggerUrgent =
		selectedLineId === "all"
			? urgentCount
			: selectedBucket?.urgentCount ?? 0;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-1.5"
					aria-label={t("callCenter.line.filterTitle")}
				>
					{selectedLineId === "all" ? (
						<Inbox className="h-3.5 w-3.5" />
					) : (
						<Circle
							className="h-3 w-3"
							fill={selectedBucket?.color ?? "currentColor"}
							style={{ color: selectedBucket?.color ?? "currentColor" }}
						/>
					)}
					<span className="text-xs font-medium truncate max-w-[160px]">
						{triggerLabel}
					</span>
					{triggerCount > 0 && (
						<span className="flex items-center gap-1">
							{triggerUrgent > 0 && (
								<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[9px] font-bold text-destructive">
									{triggerUrgent}
								</span>
							)}
							<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[9px] font-bold text-muted-foreground">
								{triggerCount}
							</span>
						</span>
					)}
					<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-1.5">
				<div className="px-2 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
					{t("callCenter.line.filterTitle")}
				</div>

				<button
					type="button"
					onClick={() => onSelect("all")}
					className={rowClass(selectedLineId === "all")}
				>
					<Inbox className="h-4 w-4 shrink-0" />
					<span className="flex-1 truncate text-sm font-medium">
						{t("callCenter.queue.allLines")}
					</span>
					<LineCounter count={totalCount} urgent={urgentCount} />
					{selectedLineId === "all" && (
						<Check className="h-3.5 w-3.5 text-primary shrink-0" />
					)}
				</button>

				{buckets.length > 0 && (
					<div className="my-1 border-t" />
				)}

				{buckets.map((b) => {
					const id = b.lineId ?? "__unassigned__";
					const selected = selectedLineId === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onSelect(id)}
							className={rowClass(selected)}
						>
							<Circle
								className="h-3 w-3 shrink-0"
								fill={b.color ?? "currentColor"}
								style={{ color: b.color ?? "currentColor" }}
							/>
							<span className="flex-1 truncate text-sm">{b.label}</span>
							<LineCounter count={b.count} urgent={b.urgentCount} />
							{selected && (
								<Check className="h-3.5 w-3.5 text-primary shrink-0" />
							)}
						</button>
					);
				})}
			</PopoverContent>
		</Popover>
	);
}

function rowClass(selected: boolean) {
	return cn(
		"flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
		selected
			? "bg-primary/10 text-primary"
			: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
	);
}

function LineCounter({ count, urgent }: { count: number; urgent: number }) {
	if (count === 0) return null;
	return (
		<span className="flex shrink-0 items-center gap-1">
			{urgent > 0 && (
				<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[9px] font-bold text-destructive">
					{urgent}
				</span>
			)}
			<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[9px] font-bold text-foreground/80">
				{count}
			</span>
		</span>
	);
}
