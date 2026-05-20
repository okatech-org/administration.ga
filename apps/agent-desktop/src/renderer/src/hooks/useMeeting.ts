import { useState, useCallback } from "react";
import {
  useAuthenticatedConvexQuery,
  useConvexActionQuery,
  useConvexMutationQuery,
} from "./useConvexHooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Hook for managing meeting lifecycle:
 * - Create a meeting
 * - Join and get a LiveKit token
 * - Leave/end the meeting
 */
export function useMeeting(meetingId?: Id<"meetings">) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: meeting } = useAuthenticatedConvexQuery(
    api.functions.meetings.get,
    meetingId ? { meetingId } : "skip",
  );

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

  const requestTokenAction = useConvexActionQuery(
    api.actions.livekit.requestToken,
  );

  const connect = useCallback(
    async (id: Id<"meetings">) => {
      try {
        setIsConnecting(true);
        setError(null);
        await joinMeetingMutation.mutateAsync({ meetingId: id });
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

  const disconnect = useCallback(
    async (id: Id<"meetings">) => {
      try {
        // `intentional: true` bypass la protection 5s anti-StrictMode
        // (cf. `meetings.leave`) — raccrocher utilisateur explicite.
        await leaveMeetingMutation.mutateAsync({
          meetingId: id,
          intentional: true,
        });
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
