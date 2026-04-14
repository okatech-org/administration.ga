"use node";

/**
 * LiveKit Token Generation Action
 *
 * Generates JWT tokens for LiveKit room access.
 * Must run in Node.js environment for livekit-server-sdk.
 */
import { v } from "convex/values";
import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { AccessToken } from "livekit-server-sdk";
import { TrackSource } from "@livekit/protocol";

/**
 * Generate a LiveKit access token for a participant.
 * Internal-only — used by other Convex functions.
 */
export const generateToken = internalAction({
  args: {
    roomName: v.string(),
    participantIdentity: v.string(),
    participantName: v.string(),
  },
  handler: async (_ctx, { roomName, participantIdentity, participantName }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured");
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await token.toJwt();
  },
});

/**
 * Public action: Request a LiveKit token for a meeting.
 * Validates user authentication, fetches meeting data, checks access,
 * then generates and returns a JWT token.
 *
 * Called directly from the frontend.
 */
export const requestToken = action({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }): Promise<{ token: string; roomName: string; wsUrl: string; mediaType: "audio" | "video" }> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // Fetch meeting data via internal query (avoids TS2589)
    const meeting = await ctx.runQuery(internal.functions.meetings.getForToken, {
      meetingId,
    });

    if (!meeting) {
      throw new Error("Réunion non trouvée");
    }

    if (meeting.status === "ended" || meeting.status === "cancelled") {
      throw new Error("Cette réunion est terminée");
    }

    // Generate token
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL ?? "ws://localhost:7880";

    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured");
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: identity.subject,
      name: identity.name ?? "Participant",
      ttl: "2h",
    });

    // Enforcement mediaType : si audio-only, bloquer la caméra au niveau token
    const isAudioOnly = meeting.mediaType === "audio";

    token.addGrant({
      roomJoin: true,
      room: meeting.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Restreindre les sources publiables si audio uniquement
      ...(isAudioOnly ? { canPublishSources: [TrackSource.MICROPHONE] } : {}),
    });

    const jwt = await token.toJwt();

    return {
      token: jwt,
      roomName: meeting.roomName,
      wsUrl,
      mediaType: (meeting.mediaType ?? "audio") as "audio" | "video",
    };
  },
});
