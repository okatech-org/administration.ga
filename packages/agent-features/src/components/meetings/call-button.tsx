"use client";

/**
 * CallButton — bouton « Appeler » pour initier un appel direct.
 *
 * Bug 9 (Ronde 2) — refactor majeur : ce composant ne contient PLUS son
 * propre Dialog. Il se contente :
 *   1. d'appeler `meetings.callUser` (créé la meeting avec callStatus="initiating"),
 *   2. de poster la fenêtre dans le store global via `callStore.openOutgoingCall(...)`.
 * Le rendu du Dialog + la connexion LiveKit + `setCallRinging` sont délégués
 * à `<GlobalOutgoingCallWindow>` (monté dans l'AppShell) qui consomme le store
 * et rend `<OutgoingCallDialog>`. Cela garantit que VOIX et MANUEL ouvrent
 * EXACTEMENT le même composant — plus de divergence UX.
 */

import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Phone } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import { api } from "@convex/_generated/api";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { captureEvent } from "../../lib/analytics";
import { useCallStore } from "../../stores/call-store";

// ============================================
// Types
// ============================================

interface CallButtonProps {
	orgId: Id<"orgs">;
	/** UserId of the person to call */
	participantUserId: Id<"users">;
	/** Optional: link the call to a request */
	requestId?: Id<"requests">;
	/** Optional: link the call to an appointment */
	appointmentId?: Id<"appointments">;
	/** Display label — defaults to "Appeler" */
	label?: string;
	/** Button variant */
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

// ============================================
// CallButton
// ============================================

/**
 * CallButton — Creates a LiveKit call and delegates the UI to the global
 * outgoing call window (cf. doc en tête).
 */
export function CallButton({
	orgId,
	participantUserId,
	requestId,
	appointmentId,
	label,
	variant = "outline",
	size = "sm",
	className,
}: CallButtonProps) {
	const { t } = useTranslation();
	const displayLabel = label ?? t("meetings.call");

	const { openOutgoingCall } = useCallStore();

	// Mutation `callUser` — crée une meeting avec callStatus="initiating".
	// La transition vers "ringing" est faite par <OutgoingCallDialog> dès que
	// la connexion LiveKit est établie côté appelant.
	const { mutateAsync: callUser, isPending: isCallingUser } =
		useConvexMutationQuery(api.functions.meetings.callUser);

	const handleCall = useCallback(async () => {
		try {
			// NB : `callUser` ne supporte pas requestId/appointmentId. Si on
			// veut lier l'appel à un dossier, on peut soit étendre `callUser`
			// soit faire un patch séparé après création — laissé en TODO si
			// besoin réel (le contexte du dossier reste accessible via le panneau
			// CitizenContextPanel pendant l'appel).
			void requestId;
			void appointmentId;
			const result = await callUser({
				orgId,
				targetUserId: participantUserId,
				mediaType: "video",
			});
			captureEvent("admin_livekit_call_started");
			// Bug 9 (Ronde 2) : on poste la fenêtre dans le store. Le composant
			// global <GlobalOutgoingCallWindow> détecte et monte le Dialog.
			openOutgoingCall({
				meetingId: result.meetingId,
				participantUserId,
				mediaType: "video",
				startedAt: Date.now(),
			});
		} catch (err) {
			console.error("Failed to start call:", err);
		}
	}, [
		orgId,
		participantUserId,
		requestId,
		appointmentId,
		callUser,
		openOutgoingCall,
	]);

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleCall}
			disabled={isCallingUser}
			className={className}
		>
			{isCallingUser ? (
				<Loader2 className="w-4 h-4 animate-spin mr-1.5" />
			) : (
				<Phone className="w-4 h-4 mr-1.5" />
			)}
			{displayLabel}
		</Button>
	);
}
