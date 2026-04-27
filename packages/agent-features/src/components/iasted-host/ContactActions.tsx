/**
 * ContactActions — boutons d'action rapides sur une ligne de contact iCom.
 *
 * Affiche 3 boutons icônes :
 *   1. Chat        → ouvre `<ChatButton>` (composer le 1er message + envoyer)
 *   2. Appel       → ouvre `<CallButton>` (LiveKit call instantané)
 *   3. Programmer  → navigue vers l'onglet iRéunion avec le contact pré-invité
 *
 * Pensé pour s'afficher au survol d'une ligne (parent: `group`). Peut aussi
 * être rendu en permanence via la prop `alwaysVisible`.
 */

"use client";

import type { Id } from "@convex/_generated/dataModel";
import { CalendarPlus } from "lucide-react";
import { useCallback } from "react";
import { useRouter } from "@workspace/routing";
import { Button } from "@workspace/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { CallButton } from "../meetings/call-button";
import { ChatButton } from "../../features/requests/components/chat-button";

interface ContactActionsProps {
	/** Org de l'agent connecté (utilisée pour scoper chat & appel). */
	orgId: Id<"orgs"> | null | undefined;
	participantUserId: Id<"users">;
	className?: string;
	/** When true, actions are always visible. Otherwise visible on group hover. */
	alwaysVisible?: boolean;
}

export function ContactActions({
	orgId,
	participantUserId,
	className,
	alwaysVisible = false,
}: ContactActionsProps) {
	const router = useRouter();

	if (!orgId) return null;

	const handleScheduleMeeting = useCallback(() => {
		// Pré-fill via query string. Le tab iRéunion lit `invite` au mount.
		router.push(`/icom?tab=imeeting&invite=${participantUserId}`);
	}, [router, participantUserId]);

	// Le clic sur un bouton ne doit pas déclencher l'éventuel onClick de la ligne parent.
	const stopPropagation = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation();
	};

	return (
		<TooltipProvider delayDuration={200}>
			<div
				onClick={stopPropagation}
				onKeyDown={stopPropagation}
				className={cn(
					"flex items-center gap-1 shrink-0 transition-opacity",
					alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
					className,
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<ChatButton
								orgId={orgId}
								participantUserId={participantUserId}
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								label=""
							/>
						</span>
					</TooltipTrigger>
					<TooltipContent>Envoyer un message</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<CallButton
								orgId={orgId}
								participantUserId={participantUserId}
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								label=""
							/>
						</span>
					</TooltipTrigger>
					<TooltipContent>Appeler</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={handleScheduleMeeting}
							aria-label="Programmer une réunion"
						>
							<CalendarPlus className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Programmer une réunion</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
