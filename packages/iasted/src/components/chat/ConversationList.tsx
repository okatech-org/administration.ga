/**
 * ConversationList — liste paginée de conversations chat.
 *
 * Composant data-source-agnostic : reçoit les items déjà formatés.
 * Le consumer (citizen-web) fournit `items` depuis `usePaginatedConvexQuery`.
 *
 * DS v3 § 5.7 sub-cards : `rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5`.
 */

"use client";

import { type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import type { AgentStatusExtended } from "../../types/agent-presence";
import { AgentStatusDot } from "../primitives/AgentStatusDot";

export interface ConversationListItem {
	/** ID de la conversation. */
	id: string;
	/** Nom affiché (interlocuteur principal ou titre du groupe). */
	title: string;
	/** Dernier message (snippet tronqué côté consumer). */
	preview?: string;
	/** Timestamp du dernier message (pour affichage relatif, fourni déjà formatté). */
	timestampLabel?: string;
	/** Nombre de messages non lus. */
	unreadCount?: number;
	/** URL avatar (fallback initiales). */
	avatarUrl?: string | null;
	/** Statut presence de l'agent (affiché en dot). */
	agentStatus?: AgentStatusExtended;
	/** Pin flag (Mr Ray ou conversation épinglée). */
	pinned?: boolean;
	/** Badge contextuel (ex : "Standard", "Urgent"). */
	badge?: ReactNode;
}

export interface ConversationListProps {
	items: ConversationListItem[];
	activeItemId?: string;
	onItemClick: (itemId: string) => void;
	/** Handler de pagination (chargé plus loin). */
	onLoadMore?: () => void;
	/** État de pagination (pour afficher un loader ou masquer le bouton). */
	canLoadMore?: boolean;
	isLoadingMore?: boolean;
	/** Message quand la liste est vide (composant EmptyActionState ou simple text). */
	emptyState?: ReactNode;
	className?: string;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function ConversationList({
	items,
	activeItemId,
	onItemClick,
	onLoadMore,
	canLoadMore,
	isLoadingMore,
	emptyState,
	className,
}: ConversationListProps) {
	if (items.length === 0 && emptyState) {
		return <div className={cn("flex h-full items-center justify-center", className)}>{emptyState}</div>;
	}

	return (
		<ScrollArea className={cn("h-full", className)}>
			<ul className="flex flex-col gap-1 p-2">
				{items.map((item) => {
					const isActive = item.id === activeItemId;
					return (
						<li key={item.id}>
							<button
								type="button"
								onClick={() => onItemClick(item.id)}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors active:scale-[0.99]",
									isActive
										? "bg-primary/10"
										: "hover:bg-foreground/5 dark:hover:bg-foreground/8",
								)}
								aria-current={isActive ? "true" : undefined}
							>
								<div className="relative shrink-0">
									<Avatar className="h-10 w-10">
										{item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.title} />}
										<AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
											{getInitials(item.title)}
										</AvatarFallback>
									</Avatar>
									{item.agentStatus && (
										<AgentStatusDot
											status={item.agentStatus}
											size={8}
											withBorder
											className="absolute -bottom-0.5 -right-0.5"
										/>
									)}
								</div>

								<div className="min-w-0 flex-1 space-y-0.5">
									<div className="flex items-center gap-2">
										<span className="truncate text-sm font-bold text-foreground">
											{item.title}
										</span>
										{item.pinned && (
											<span
												className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary"
												aria-label="Épinglé"
											>
												Pin
											</span>
										)}
										{item.badge}
									</div>
									{item.preview && (
										<p className="truncate text-xs font-medium text-muted-foreground">
											{item.preview}
										</p>
									)}
								</div>

								<div className="flex shrink-0 flex-col items-end gap-1">
									{item.timestampLabel && (
										<span className="text-[10px] font-medium text-muted-foreground">
											{item.timestampLabel}
										</span>
									)}
									{item.unreadCount !== undefined && item.unreadCount > 0 && (
										<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
											{item.unreadCount}
										</span>
									)}
								</div>
							</button>
						</li>
					);
				})}
			</ul>

			{canLoadMore && onLoadMore && (
				<div className="flex justify-center p-3">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoadingMore}
						className="h-8 rounded-lg bg-foreground/8 px-4 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12 disabled:opacity-50 active:scale-[0.97]"
					>
						{isLoadingMore ? "Chargement…" : "Charger plus"}
					</button>
				</div>
			)}
		</ScrollArea>
	);
}
