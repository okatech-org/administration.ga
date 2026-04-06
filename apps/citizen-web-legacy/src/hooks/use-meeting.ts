import { useState, useCallback } from "react";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Hook for managing meeting lifecycle:
 * - Create a meeting
 * - Join and get a LiveKit token
 * - Leave/end the meeting
 *
 * Uses the project's TanStack Query wrappers for auth + error handling.
 */
export function useMeeting(meetingId?: Id<"meetings">) {
	const [token, setToken] = useState<string | null>(null);
	const [wsUrl, setWsUrl] = useState<string | null>(null);
	const [roomName, setRoomName] = useState<string | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Queries — TanStack Query wrappers
	const { data: meeting } = useAuthenticatedConvexQuery(
		api.functions.meetings.get,
		meetingId ? { meetingId } : "skip",
	);

	// Mutations — TanStack Query wrappers
	const createMeetingMutation = useConvexMutationQuery(
		api.functions.meetings.create,
	);
	const joinMeetingMutation = useConvexMutationQuery(
		api.functions.meetings.join,
	);
	const leaveMeetingMutation = useConvexMutationQuery(
		api.functions.meetings.leave,
	);
	const endMeetingMutation = useConvexMutationQuery(api.functions.meetings.end);

	// Actions — TanStack Query wrapper
	const requestTokenAction = useConvexActionQuery(
		api.actions.livekit.requestToken,
	);

	/**
	 * Connect to a meeting: join + get token
	 */
	const connect = useCallback(
		async (id: Id<"meetings">) => {
			try {
				setIsConnecting(true);
				setError(null);

				// Join the meeting
				await joinMeetingMutation.mutateAsync({ meetingId: id });

				// Get the LiveKit token
				const result = await requestTokenAction.mutateAsync({ meetingId: id });
				setToken(result.token);
				setWsUrl(result.wsUrl);
				setRoomName(result.roomName);
			} catch (err) {
				setError((err as Error).message);
				console.error("Failed to connect to meeting:", err);
			} finally {
				setIsConnecting(false);
			}
		},
		[joinMeetingMutation, requestTokenAction],
	);

	/**
	 * Disconnect from the meeting
	 */
	const disconnect = useCallback(
		async (id: Id<"meetings">) => {
			try {
				await leaveMeetingMutation.mutateAsync({ meetingId: id });
				setToken(null);
				setWsUrl(null);
				setRoomName(null);
			} catch (err) {
				console.error("Failed to leave meeting:", err);
			}
		},
		[leaveMeetingMutation],
	);

	return {
		meeting: meeting ?? null,
		token,
		wsUrl,
		roomName,
		isConnecting,
		error,
		connect,
		disconnect,
		createMeeting: createMeetingMutation,
		endMeeting: endMeetingMutation,
	};
}
