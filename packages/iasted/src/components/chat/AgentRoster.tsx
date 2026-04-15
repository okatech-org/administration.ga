/**
 * AgentRoster — pile d'avatars des agents assignés à une conversation citoyen.
 *
 * - Affiche jusqu'à `maxVisible` avatars superposés (défaut 3) + "+N" si plus.
 * - Chaque avatar porte son AgentStatusDot live (bordure blanche pour visibilité).
 * - DS v3 §5.12 : sizes 32px pour roster (AVATAR_SIZES.roster).
 *
 * Modèle de données : la source de vérité `assignedAgentIds[]` est côté consumer.
 * Le composant reçoit uniquement `agents` (liste enrichie avec avatar + status).
 */

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { AVATAR_SIZES } from "../../tokens/sizes";
import type { AgentStatusExtended } from "../../types/agent-presence";
import { AgentStatusDot } from "../primitives/AgentStatusDot";

export interface AgentRosterEntry {
	/** ID Convex du user agent. */
	id: string;
	/** Nom affiché (ex : "Mr Ray"). */
	name: string;
	/** URL de l'avatar (optionnel, fallback initiales). */
	avatarUrl?: string | null;
	/** Statut presence. */
	status?: AgentStatusExtended;
}

export interface AgentRosterProps {
	agents: AgentRosterEntry[];
	/** Nombre max d'avatars visibles (défaut 3). */
	maxVisible?: number;
	/** Taille en pixels (défaut 32 — AVATAR_SIZES.roster). */
	size?: number;
	/** Optionnel : handler de clic sur un avatar. */
	onAgentClick?: (agent: AgentRosterEntry) => void;
	className?: string;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AgentRoster({
	agents,
	maxVisible = 3,
	size = AVATAR_SIZES.roster,
	onAgentClick,
	className,
}: AgentRosterProps) {
	if (agents.length === 0) return null;

	const visibleAgents = agents.slice(0, maxVisible);
	const overflow = Math.max(0, agents.length - maxVisible);
	const sizePx = `${size}px`;

	return (
		<div className={cn("flex items-center", className)} role="list" aria-label="Agents assignés">
			{visibleAgents.map((agent, idx) => {
				const initials = getInitials(agent.name);
				return (
					<div
						key={agent.id}
						role="listitem"
						className={cn(
							"relative shrink-0 rounded-full ring-2 ring-card",
							idx > 0 && "-ml-2",
							onAgentClick && "cursor-pointer transition-transform hover:scale-105 active:scale-[0.97]",
						)}
						style={{ width: sizePx, height: sizePx, zIndex: visibleAgents.length - idx }}
						onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
						title={agent.name}
					>
						<Avatar className="h-full w-full">
							{agent.avatarUrl && <AvatarImage src={agent.avatarUrl} alt={agent.name} />}
							<AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
						{agent.status && (
							<AgentStatusDot
								status={agent.status}
								size={8}
								withBorder
								className="absolute -bottom-0.5 -right-0.5"
							/>
						)}
					</div>
				);
			})}
			{overflow > 0 && (
				<div
					className="-ml-2 flex shrink-0 items-center justify-center rounded-full bg-foreground/8 dark:bg-foreground/5 text-[10px] font-bold text-foreground ring-2 ring-card"
					style={{ width: sizePx, height: sizePx }}
					aria-label={`${overflow} autres agents`}
				>
					+{overflow}
				</div>
			)}
		</div>
	);
}
