/**
 * CitizenChatPane — pane chat pour citoyen.
 *
 * Ce composant orchestre l'affichage :
 * - Hero "Votre agent assigné" (si un agent est présent)
 * - Roster d'agents assignés (si multi-agents)
 * - Slot de contenu principal (liste de messages injectée par le consumer)
 *
 * Le CitizenChatPane est un shell de layout ; il NE gère PAS les messages eux-mêmes
 * (c'est le rôle de CitizenChatTab dans apps/citizen-web qui continue de gérer
 * l'intégration Convex/chat).
 */

"use client";

import { type ReactNode } from "react";
import { Headphones } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { AgentRoster, type AgentRosterEntry } from "./AgentRoster";
import { AgentStatusDot } from "../primitives/AgentStatusDot";
import type { AgentStatusExtended } from "../../types/agent-presence";

export interface CitizenChatPaneProps {
	/** Liste d'agents assignés (1 ou N selon le schéma supporté par le backend). */
	agents?: AgentRosterEntry[];
	/**
	 * Agent hero (mis en avant comme "Votre agent"). Si absent et `agents.length===1`,
	 * le hero est dérivé de l'unique agent de la liste.
	 */
	heroAgent?: AgentRosterEntry & {
		/** Description optionnelle (ex : "Disponible · répond en ~2 min"). */
		subtitle?: string;
		/** Étiquette de rôle (ex : "Standard"). */
		roleLabel?: string;
	};
	/** Handler de clic sur le CTA du hero (ex : ouvrir chat). */
	onHeroClick?: () => void;
	/** Libellé du CTA (défaut : "Parler"). */
	heroCtaLabel?: string;
	/** Contenu principal — typiquement la liste de messages + composer. */
	children: ReactNode;
	className?: string;
}

export function CitizenChatPane({
	agents,
	heroAgent,
	onHeroClick,
	heroCtaLabel = "Parler",
	children,
	className,
}: CitizenChatPaneProps) {
	const effectiveHero = heroAgent ?? (agents?.length === 1 ? agents[0] : undefined);
	const showRoster = agents && agents.length > 1;

	// Extraction sécurisée des champs optionnels propres à heroAgent (non présents sur AgentRosterEntry brut).
	const heroSubtitle = heroAgent?.subtitle;
	const heroRoleLabel = heroAgent?.roleLabel;

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{effectiveHero && (
				<div className="shrink-0 border-b border-foreground/5 bg-card px-3 py-2.5">
					<HeroBlock
						agent={effectiveHero}
						subtitle={heroSubtitle}
						roleLabel={heroRoleLabel}
						onClick={onHeroClick}
						ctaLabel={heroCtaLabel}
					/>
				</div>
			)}

			{showRoster && (
				<div className="flex shrink-0 items-center gap-3 border-b border-foreground/5 bg-card px-3 py-2">
					<span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
						Agents assignés
					</span>
					<AgentRoster agents={agents!} maxVisible={4} />
				</div>
			)}

			<div className="flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

function HeroBlock({
	agent,
	subtitle,
	roleLabel,
	onClick,
	ctaLabel,
}: {
	agent: AgentRosterEntry;
	subtitle?: string;
	roleLabel?: string;
	onClick?: () => void;
	ctaLabel: string;
}) {
	return (
		<div className="flex items-center gap-3">
			<div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<Headphones className="h-5 w-5 text-primary" />
				{agent.status && (
					<AgentStatusDot
						status={agent.status as AgentStatusExtended}
						size={10}
						withBorder
						className="absolute -bottom-0.5 -right-0.5"
					/>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
					Votre agent
				</p>
				<p className="truncate text-sm font-bold text-foreground">
					{agent.name}
					{roleLabel && (
						<span className="ml-1.5 text-xs font-medium text-muted-foreground">· {roleLabel}</span>
					)}
				</p>
				{subtitle && (
					<p className="truncate text-xs font-medium text-muted-foreground">{subtitle}</p>
				)}
			</div>

			{onClick && (
				<button
					type="button"
					onClick={onClick}
					className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.97]"
				>
					{ctaLabel}
				</button>
			)}
		</div>
	);
}
