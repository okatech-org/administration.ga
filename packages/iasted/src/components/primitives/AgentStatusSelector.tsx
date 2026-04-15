/**
 * AgentStatusSelector — sélecteur de statut agent avec DND timed.
 *
 * Phase 3 : la partie **affichage** du statut est pleinement fonctionnelle.
 * La partie **écriture** (online/busy/away via mutation Convex) nécessite un
 * callback `onStatusChange` injecté par le consumer — le package reste
 * découplé. Le DND est géré localement (localStorage via `useAgentStatus`).
 *
 * UI pattern :
 * - Bouton principal = dot coloré + label du statut courant
 * - Dropdown menu (shadcn) :
 *   - 4 statuts explicites (online/busy/away/offline)
 *   - Section "Ne pas déranger" avec 3 durées (15min / 1h / 4h) + clear
 *
 * DS v3 :
 * - Dot coloré selon status (reuse AgentStatusDot)
 * - Texte : text-xs font-medium text-foreground
 * - Séparateurs : DropdownMenuSeparator (via @workspace/ui)
 */

"use client";

import { useMemo } from "react";
import { ChevronDown, Clock, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import type { AgentStatus, AgentStatusExtended } from "../../types/agent-presence";
import { AgentStatusDot } from "./AgentStatusDot";

const STATUS_LABELS: Record<AgentStatusExtended, string> = {
	online: "En ligne",
	busy: "Occupé",
	away: "Absent",
	offline: "Hors ligne",
	dnd: "Ne pas déranger",
};

/** Durées DND proposées (minutes). */
const DND_PRESETS_MIN = [15, 60, 240] as const;

export interface AgentStatusSelectorProps {
	/** Statut courant (dérivé par useAgentStatus). */
	status: AgentStatusExtended;
	/** Timestamp d'expiration DND (si actif). */
	dndUntil?: number;
	/** Handler de changement vers un statut explicite (mutation Convex côté consumer). */
	onStatusChange?: (status: AgentStatus) => void | Promise<void>;
	/** Handler d'activation DND (durée en ms UNIX absolute). */
	onSetDnd?: (expiresAt: number) => void;
	/** Handler de clear DND. */
	onClearDnd?: () => void;
	/** Désactive toute interaction (lecture seule). */
	disabled?: boolean;
	className?: string;
}

function formatDndRemaining(dndUntil: number, now: number = Date.now()): string {
	const remainingMin = Math.max(0, Math.round((dndUntil - now) / 60_000));
	if (remainingMin < 60) return `${remainingMin} min restantes`;
	const h = Math.floor(remainingMin / 60);
	const m = remainingMin % 60;
	return `${h}h${m > 0 ? ` ${m}min` : ""} restantes`;
}

export function AgentStatusSelector({
	status,
	dndUntil,
	onStatusChange,
	onSetDnd,
	onClearDnd,
	disabled = false,
	className,
}: AgentStatusSelectorProps) {
	const isDnd = status === "dnd";
	const now = Date.now();

	const dndLabel = useMemo(
		() => (dndUntil ? formatDndRemaining(dndUntil, now) : ""),
		[dndUntil, now],
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 rounded-lg bg-foreground/8 dark:bg-foreground/5 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12 active:scale-[0.97] disabled:opacity-60",
						className,
					)}
					aria-label={`Statut actuel : ${STATUS_LABELS[status]}`}
				>
					<AgentStatusDot status={status} size={8} />
					<span className="max-w-[140px] truncate">{STATUS_LABELS[status]}</span>
					{isDnd && dndUntil && (
						<span className="text-[10px] font-medium text-muted-foreground">
							· {dndLabel}
						</span>
					)}
					<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="w-60">
				<DropdownMenuLabel>Statut</DropdownMenuLabel>
				{(["online", "busy", "away", "offline"] as const).map((s) => {
					const isActive = !isDnd && status === s;
					return (
						<DropdownMenuItem
							key={s}
							onClick={() => onStatusChange?.(s)}
							disabled={!onStatusChange}
							className={cn("gap-2", isActive && "bg-foreground/5")}
						>
							<AgentStatusDot status={s} size={8} />
							<span className="flex-1 text-xs font-medium">{STATUS_LABELS[s]}</span>
							{isActive && <span className="text-[10px] text-primary">●</span>}
						</DropdownMenuItem>
					);
				})}

				<DropdownMenuSeparator />
				<DropdownMenuLabel className="flex items-center gap-1.5">
					<Clock className="h-3 w-3" />
					Ne pas déranger
				</DropdownMenuLabel>

				{DND_PRESETS_MIN.map((min) => (
					<DropdownMenuItem
						key={min}
						onClick={() => onSetDnd?.(Date.now() + min * 60_000)}
						disabled={!onSetDnd}
						className="gap-2 text-xs"
					>
						<AgentStatusDot status="dnd" size={8} />
						<span className="flex-1">
							{min < 60 ? `${min} minutes` : `${Math.floor(min / 60)}h`}
						</span>
					</DropdownMenuItem>
				))}

				{isDnd && onClearDnd && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onClearDnd} className="gap-2 text-xs text-rose-600">
							<X className="h-3 w-3" />
							<span className="flex-1">Terminer le mode DND</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
