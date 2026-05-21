/**
 * SuperAdminCallTrigger — Lance un appel audio/vidéo depuis la page /users.
 *
 * Réservé aux Super Admins. Trois variantes d'affichage :
 *   - "menu-items"    : <DropdownMenuItem>… pour s'insérer dans un menu existant
 *   - "icon-buttons"  : 2 boutons icônes audio/vidéo
 *   - "controlled"    : aucun déclencheur visible, l'appel est piloté par la
 *                       prop `programmaticTrigger` (utilisé par la vue Carte
 *                       dont le popup Mapbox est rendu en innerHTML).
 *
 * Anti-concurrence : le hook `useCallStore` empêche un second appel parallèle.
 */

"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Phone, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";
import {
	ActiveCallDialog,
	type ActiveCallMediaType,
} from "@/components/meetings/active-call-dialog";
import { cn } from "@/lib/utils";

export interface SuperAdminCallTargetUser {
	_id: Id<"users">;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	avatarUrl?: string | null;
}

interface SuperAdminCallTriggerProps {
	targetUser: SuperAdminCallTargetUser;
	variant?: "menu-items" | "icon-buttons" | "controlled";
	/**
	 * Pour la variante "controlled" : objet incrémenté à chaque clic externe.
	 * Le composant déclenche l'appel quand `programmaticTrigger` change et que
	 * sa valeur est non-null.
	 */
	programmaticTrigger?: { mediaType: ActiveCallMediaType; nonce: number } | null;
	className?: string;
}

export function SuperAdminCallTrigger({
	targetUser,
	variant = "menu-items",
	programmaticTrigger,
	className,
}: SuperAdminCallTriggerProps) {
	const { isSuperAdmin } = useCurrentAdminRole();
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	const [activeMeetingId, setActiveMeetingId] =
		useState<Id<"meetings"> | null>(null);
	const [activeMediaType, setActiveMediaType] =
		useState<ActiveCallMediaType>("audio");
	const [pendingMedia, setPendingMedia] =
		useState<ActiveCallMediaType | null>(null);
	const [lastNonce, setLastNonce] = useState<number | null>(null);

	const { mutateAsync: callUserAsAdmin } = useConvexMutationQuery(
		api.functions.meetings.callUserAsAdmin,
	);

	const targetName =
		`${targetUser.firstName ?? ""} ${targetUser.lastName ?? ""}`.trim() ||
		targetUser.email ||
		"Utilisateur";

	const launchCall = async (mediaType: ActiveCallMediaType) => {
		if (globalActiveMeetingId) {
			toast.error("Un appel est déjà en cours");
			return;
		}
		setPendingMedia(mediaType);
		try {
			const result = await callUserAsAdmin({
				targetUserId: targetUser._id,
				mediaType,
			});
			const meetingId = result.meetingId as Id<"meetings">;
			setActiveMeetingId(meetingId);
			setActiveMediaType(mediaType);
			setGlobalMeetingId(meetingId);
			toast.success(
				mediaType === "audio"
					? `Appel audio vers ${targetName}…`
					: `Appel vidéo vers ${targetName}…`,
			);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du lancement de l'appel");
		} finally {
			setPendingMedia(null);
		}
	};

	// Variante "controlled" : déclencher l'appel quand le nonce change.
	useEffect(() => {
		if (variant !== "controlled") return;
		if (!programmaticTrigger) return;
		if (programmaticTrigger.nonce === lastNonce) return;
		setLastNonce(programmaticTrigger.nonce);
		void launchCall(programmaticTrigger.mediaType);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [programmaticTrigger, variant]);

	const handleCloseDialog = () => {
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	};

	if (!isSuperAdmin) return null;

	const isAnyPending = pendingMedia !== null;
	const disabled = isAnyPending || !!globalActiveMeetingId;

	const dialog = (
		<ActiveCallDialog
			meetingId={activeMeetingId}
			mediaType={activeMediaType}
			onClose={handleCloseDialog}
		/>
	);

	if (variant === "controlled") {
		return dialog;
	}

	if (variant === "menu-items") {
		return (
			<>
				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						void launchCall("audio");
					}}
					disabled={disabled}
					className="cursor-pointer focus:bg-muted focus:text-foreground"
				>
					<Phone className="mr-2 h-4 w-4 text-emerald-600" />
					Lancer un appel audio
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						void launchCall("video");
					}}
					disabled={disabled}
					className="cursor-pointer focus:bg-muted focus:text-foreground"
				>
					<Video className="mr-2 h-4 w-4 text-blue-600" />
					Lancer un appel vidéo
				</DropdownMenuItem>
				{dialog}
			</>
		);
	}

	// icon-buttons
	return (
		<div className={cn("inline-flex items-center gap-0.5", className)}>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
				disabled={disabled}
				title={`Appel audio vers ${targetName}`}
				onClick={(e) => {
					e.stopPropagation();
					void launchCall("audio");
				}}
			>
				<Phone className="h-3.5 w-3.5" />
			</Button>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-7 w-7 text-blue-600 hover:bg-blue-500/10"
				disabled={disabled}
				title={`Appel vidéo vers ${targetName}`}
				onClick={(e) => {
					e.stopPropagation();
					void launchCall("video");
				}}
			>
				<Video className="h-3.5 w-3.5" />
			</Button>
			{dialog}
		</div>
	);
}
