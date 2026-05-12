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
import { AccessToken, EgressClient } from "livekit-server-sdk";
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

    // Résolution du nom propre depuis la DB — `identity.name` de better-auth
    // peut tomber sur un hash ou être absent, ce qui faisait apparaître
    // "570rjg5..." dans l'UI d'appel (côté correspondant).
    const dbDisplayName: string | null = await ctx.runQuery(
      internal.functions.meetings.getDisplayNameByAuthSubject,
      { authSubject: identity.subject },
    );

    const token = new AccessToken(apiKey, apiSecret, {
      identity: identity.subject,
      name: dbDisplayName ?? identity.name ?? "Participant",
      ttl: "2h",
    });

    // Enforcement per-user : les citoyens peuvent toujours toggler micro et
    // caméra sur n'importe quel appel (audio comme vidéo). Le partage d'écran
    // reste réservé aux RÉUNIONS multi-participants (type="meeting") — pas
    // d'écran partagé dans un appel 1:1.
    //
    // Le bouton caméra est purement client : le token n'a qu'à ne pas
    // l'empêcher. Les agents conservent un grant non restreint.
    const isCitizen: boolean = await ctx.runQuery(
      internal.functions.meetings.isAuthSubjectCitizen,
      { authSubject: identity.subject },
    );

    const allowScreenShare = meeting.type === "meeting";

    token.addGrant({
      roomJoin: true,
      room: meeting.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      ...(isCitizen
        ? {
            canPublishSources: allowScreenShare
              ? [
                  TrackSource.MICROPHONE,
                  TrackSource.CAMERA,
                  TrackSource.SCREEN_SHARE,
                  TrackSource.SCREEN_SHARE_AUDIO,
                ]
              : [TrackSource.MICROPHONE, TrackSource.CAMERA],
          }
        : {}),
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

// ============================================================================
// CITIZEN APPOINTMENT JOIN TOKEN — remote (video) appointments
// ============================================================================

/**
 * Public action: the citizen attendee requests a LiveKit token to join
 * their remote appointment. Permissions:
 *   - caller must be the appointment's attendee
 *   - appointment.mode must be "remote"
 *   - appointment not cancelled/completed
 *   - time window: 15 min before start → end of appointment
 */
export const createCitizenJoinToken = action({
  args: { appointmentId: v.id("appointments") },
  handler: async (
    ctx,
    { appointmentId },
  ): Promise<{ token: string; roomName: string; wsUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("NOT_AUTHENTICATED");

    const info = await ctx.runQuery(
      internal.functions.slots.getAppointmentForJoinToken,
      { appointmentId, authSubject: identity.subject },
    );
    if (!info) throw new Error("NOT_AUTHORIZED_OR_NOT_FOUND");

    if (info.mode !== "remote") throw new Error("NOT_REMOTE_APPOINTMENT");
    if (info.status === "cancelled" || info.status === "completed" || info.status === "no_show") {
      throw new Error("APPOINTMENT_NOT_JOINABLE");
    }

    // Time window: 15 min before start → end of appointment
    const start = new Date(`${info.date}T${info.time}:00`).getTime();
    const end = info.endTime
      ? new Date(`${info.date}T${info.endTime}:00`).getTime()
      : start + 60 * 60 * 1000;
    const now = Date.now();
    if (now < start - 15 * 60 * 1000 || now > end) {
      throw new Error("OUTSIDE_JOIN_WINDOW");
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL ?? "ws://localhost:7880";
    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_NOT_CONFIGURED");
    }

    const roomName = info.livekitRoomName ?? `appointment-${appointmentId}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: `citizen-${info.attendeeUserId}`,
      name: info.attendeeName,
      ttl: "2h",
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();
    return { token: jwt, roomName, wsUrl };
  },
});

// ============================================================================
// SPRINT 6 — SUPERVISION TOKEN (Listen / Whisper / Barge)
// ============================================================================

/**
 * Génère un token LiveKit pour un superviseur rejoignant un appel existant.
 *
 * Modes :
 *  - listen  : canSubscribe, pas de publish, hidden (invisible pour autres).
 *  - whisper : canSubscribe + canPublish MICROPHONE. L'identity commence par
 *              "supervisor_*_whisper" : côté citoyen, FilteredAudioRenderer
 *              filtrera le track par identité préfixée pour ne PAS le jouer.
 *  - barge   : participant normal (publish + subscribe, visible).
 *
 * L'appelant doit avoir `meetings.supervise`. Vérifié côté mutation
 * `startSupervision` qui est appelée en amont.
 */
export const requestSupervisionToken = action({
  args: {
    meetingId: v.id("meetings"),
    mode: v.union(
      v.literal("listen"),
      v.literal("whisper"),
      v.literal("barge"),
    ),
  },
  handler: async (
    ctx,
    { meetingId, mode },
  ): Promise<{
    token: string;
    roomName: string;
    wsUrl: string;
    identity: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("NOT_AUTHENTICATED");

    // Récupère le meeting + vérifie permission via l'internal query existante
    const meeting = await ctx.runQuery(internal.functions.meetings.getForToken, {
      meetingId,
    });
    if (!meeting) throw new Error("Réunion non trouvée");
    if (meeting.status !== "active") {
      throw new Error("Supervision impossible sur un appel non actif");
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL ?? "ws://localhost:7880";

    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured");
    }

    // Identity préfixée pour permettre le filtrage côté client
    const supervisorIdentity = `supervisor_${identity.subject}_${mode}`;
    const supervisorName =
      identity.name ?? identity.email ?? "Superviseur";

    const token = new AccessToken(apiKey, apiSecret, {
      identity: supervisorIdentity,
      name: supervisorName,
      ttl: "2h",
    });

    // Grants par mode
    if (mode === "listen") {
      token.addGrant({
        roomJoin: true,
        room: meeting.roomName,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        hidden: true, // Invisible pour les autres participants
      });
    } else if (mode === "whisper") {
      token.addGrant({
        roomJoin: true,
        room: meeting.roomName,
        canPublish: true,
        canPublishSources: [TrackSource.MICROPHONE],
        canSubscribe: true,
        canPublishData: true,
      });
    } else {
      // barge : participant normal, audio-only si meeting audio-only
      const isAudioOnly = meeting.mediaType === "audio";
      token.addGrant({
        roomJoin: true,
        room: meeting.roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        ...(isAudioOnly ? { canPublishSources: [TrackSource.MICROPHONE] } : {}),
      });
    }

    const jwt = await token.toJwt();
    return {
      token: jwt,
      roomName: meeting.roomName,
      wsUrl,
      identity: supervisorIdentity,
    };
  },
});

// ============================================================================
// SPRINT 6 — CALL RECORDING (RoomCompositeEgress)
// ============================================================================

/**
 * Garde env-vars : retourne true si toutes les env LiveKit Egress sont là.
 */
function hasEgressEnv(): boolean {
  return (
    !!process.env.LIVEKIT_API_KEY &&
    !!process.env.LIVEKIT_API_SECRET &&
    !!process.env.LIVEKIT_WS_URL
  );
}

/**
 * Construit un EgressClient. Lève si env manquante.
 */
function buildEgressClient(): EgressClient {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  // EgressClient accepte une base URL HTTP (pas WebSocket). On dérive si besoin.
  const egressUrl =
    process.env.LIVEKIT_EGRESS_URL ??
    (process.env.LIVEKIT_WS_URL ?? "").replace(/^ws/, "http");
  return new EgressClient(egressUrl, apiKey, apiSecret);
}

/**
 * Démarre l'enregistrement d'un appel via RoomCompositeEgress.
 *
 * Args : roomName + recordingId (déjà créé en base avec status=pending).
 * Retourne l'egressId pour corrélation avec le webhook.
 *
 * Stub si env manquante : retourne { status: "stub" }.
 */
export const startCallRecordingEgress = internalAction({
  args: {
    roomName: v.string(),
    recordingId: v.id("callRecordings"),
  },
  handler: async (_ctx, args) => {
    if (!hasEgressEnv()) {
      console.warn(
        "[SPRINT6][STUB] startCallRecordingEgress: LiveKit env missing, skipping",
      );
      return { status: "stub" as const, egressId: null };
    }

    try {
      const client = buildEgressClient();
      // Le filepath inclut le recordingId pour le retrouver via webhook
      const filepath = `recordings/${args.recordingId}.mp4`;
      // Note : EncodedFileOutput required ; on passe via any pour compat SDK
      // (EgressClient valide le shape à runtime, TS types sont stricts).
      const egressInfo = await client.startRoomCompositeEgress(
        args.roomName,
        { file: { filepath } } as any,
        { audioOnly: true } as any,
      );
      return {
        status: "started" as const,
        egressId: egressInfo.egressId,
      };
    } catch (err) {
      console.error("[SPRINT6] startCallRecordingEgress failed:", err);
      return {
        status: "failed" as const,
        egressId: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

/**
 * Arrête un enregistrement en cours.
 */
export const stopCallRecordingEgress = internalAction({
  args: {
    egressId: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!hasEgressEnv()) {
      console.warn("[SPRINT6][STUB] stopCallRecordingEgress: env missing");
      return { status: "stub" as const };
    }

    try {
      const client = buildEgressClient();
      await client.stopEgress(args.egressId);
      return { status: "stopped" as const };
    } catch (err) {
      console.error("[SPRINT6] stopCallRecordingEgress failed:", err);
      return {
        status: "failed" as const,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

// ============================================================================
// SPRINT 6 — VOICEMAIL (TrackEgress sur mic citoyen)
// ============================================================================

/**
 * Démarre un TrackEgress sur la track microphone d'un participant citoyen.
 * Utilisé par `callCenter.processCallFallbacks` quand finalAction="voicemail".
 *
 * IMPORTANT : le caller est responsable de créer préalablement la row
 * `voicemails` avec status=pending et de passer l'ID via le filepath pour
 * que le webhook puisse router la complétion.
 */
export const startVoicemailEgress = internalAction({
  args: {
    roomName: v.string(),
    voicemailId: v.id("voicemails"),
    /** Identity du participant citoyen dans la room (source du track à capturer). */
    participantIdentity: v.string(),
    /** Track SID si déjà connu (optionnel, sinon on passe le nom de track). */
    trackSid: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!hasEgressEnv()) {
      console.warn(
        "[SPRINT6][STUB] startVoicemailEgress: LiveKit env missing, skipping",
      );
      return { status: "stub" as const, egressId: null };
    }

    try {
      const client = buildEgressClient();
      // Format filepath : "voicemails/{voicemailId}.ogg" pour routing webhook
      const filepath = `voicemails/${args.voicemailId}.ogg`;

      if (!args.trackSid) {
        // Sans trackSid, on ne peut pas démarrer le TrackEgress. Fallback
        // sur un ParticipantEgress (audio only) qui capture tous les tracks
        // audio du participant.
        const info = await client.startRoomCompositeEgress(
          args.roomName,
          { file: { filepath } } as any,
          { audioOnly: true } as any,
        );
        return { status: "started" as const, egressId: info.egressId };
      }

      const info = await client.startTrackEgress(
        args.roomName,
        { filepath } as any,
        args.trackSid,
      );
      return { status: "started" as const, egressId: info.egressId };
    } catch (err) {
      console.error("[SPRINT6] startVoicemailEgress failed:", err);
      return {
        status: "failed" as const,
        egressId: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
