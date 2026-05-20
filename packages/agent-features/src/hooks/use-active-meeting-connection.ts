"use client";

import { useCallback } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import {
	activeMeetingStore,
	useActiveMeetingStore,
} from "../stores/active-meeting-store";

/**
 * Hook qui pilote le `activeMeetingStore` global. À monter une fois par
 * shell (cf. `FloatingMeetingWindow`). Les pages consomment uniquement
 * `joinMeeting` / `leaveMeeting` pour signaler une intention.
 */
export function useActiveMeetingConnection() {
	const state = useActiveMeetingStore();
	const joinMeetingMutation = useConvexMutationQuery(
		api.functions.meetings.join,
	);
	const leaveMeetingMutation = useConvexMutationQuery(
		api.functions.meetings.leave,
	);
	const endMeetingMutation = useConvexMutationQuery(api.functions.meetings.end);
	const requestTokenAction = useConvexActionQuery(
		api.actions.livekit.requestToken,
	);

	const joinMeeting = useCallback(
		async (meetingId: Id<"meetings">) => {
			// Si déjà connecté à la même réunion, no-op
			if (
				state.meetingId === meetingId &&
				(state.status === "connected" || state.status === "connecting")
			) {
				return;
			}
			activeMeetingStore.beginConnecting(meetingId);
			try {
				await joinMeetingMutation.mutateAsync({ meetingId });
				const result = await requestTokenAction.mutateAsync({ meetingId });
				activeMeetingStore.setCredentials({
					meetingId,
					token: result.token,
					wsUrl: result.wsUrl,
					mediaType: result.mediaType,
				});
			} catch (err) {
				activeMeetingStore.setError(
					meetingId,
					(err as Error).message ?? "Connexion impossible",
				);
			}
		},
		[joinMeetingMutation, requestTokenAction, state.meetingId, state.status],
	);

	const leaveMeeting = useCallback(async () => {
		const id = state.meetingId;
		if (!id) return;
		activeMeetingStore.reset();
		try {
			// `intentional: true` bypass la protection 5s anti-StrictMode
			// (cf. `meetings.leave`). C'est un raccrocher utilisateur explicite,
			// donc la réunion DOIT passer à `ended` immédiatement.
			await leaveMeetingMutation.mutateAsync({
				meetingId: id,
				intentional: true,
			});
		} catch {
			// best-effort — l'état local est déjà nettoyé
		}
	}, [leaveMeetingMutation, state.meetingId]);

	const endForAll = useCallback(async () => {
		const id = state.meetingId;
		if (!id) return;
		activeMeetingStore.reset();
		try {
			await endMeetingMutation.mutateAsync({ meetingId: id });
		} catch {
			// best-effort
		}
	}, [endMeetingMutation, state.meetingId]);

	return { state, joinMeeting, leaveMeeting, endForAll };
}
