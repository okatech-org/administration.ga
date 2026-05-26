import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, internalMutation } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership, isBackOfficeUser } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import { canDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";
import { isPublicUser } from "../lib/userCategory";

/**
 * Internal query: Get meeting by ID (for use in actions).
 * Skips permission checks — the calling action handles auth.
 */
export const getForToken = internalQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }) => {
    return await ctx.db.get(meetingId);
  },
});

/**
 * Internal query utilisée par l'action `livekit.requestToken` pour appliquer
 * la restriction de publication à la seule catégorie "citoyen". Les agents,
 * même s'ils rejoignent un meeting dont `mediaType === "audio"` (par exemple
 * initié par un citoyen via `callOrganization`), doivent pouvoir activer leur
 * caméra via le toggle de CustomCallUI.
 */
export const isAuthSubjectCitizen = internalQuery({
  args: { authSubject: v.string() },
  handler: async (ctx, { authSubject }): Promise<boolean> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q: any) => q.eq("authId", authSubject))
      .unique();
    // Utilisateur introuvable → par sécurité, on considère "citoyen" (restreint).
    if (!user) return true;
    return await isPublicUser(ctx, user._id);
  },
});

/**
 * Résout le nom affichable d'un utilisateur à partir de son authSubject.
 * Utilisé par `actions/livekit.ts` pour fournir un `participant.name` propre
 * (vrai prénom+nom depuis la DB) au lieu de retomber sur `identity.subject`
 * qui est un hash interne illisible dans l'UI.
 */
export const getDisplayNameByAuthSubject = internalQuery({
  args: { authSubject: v.string() },
  handler: async (ctx, { authSubject }): Promise<string | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q: any) => q.eq("authId", authSubject))
      .unique();
    if (!user) return null;
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.email || null;
  },
});

// ============================================
// Helpers
// ============================================

/**
 * Generate a unique room name for a LiveKit session.
 * Format: mtg-{orgSlug}-{timestamp36}-{random}
 */
function generateRoomName(orgSlug: string): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  return `mtg-${orgSlug}-${ts}-${rand}`;
}

/** Max time (ms) a call can ring with no answer before hiding from agents. */
const CALL_RING_TIMEOUT_MS = 120_000;

/** Max time (ms) before a call without any connected participant is considered stale. */
const STALE_CALL_THRESHOLD_MS = 120_000;

/**
 * End stale active calls created by the given user.
 * Only ends calls that are older than STALE_CALL_THRESHOLD_MS
 * AND have no participant currently connected (joinedAt set, leftAt not set).
 */
async function endStaleCalls(
  ctx: { db: any },
  userId: Id<"users">,
) {
  const activeCalls = await ctx.db
    .query("meetings")
    .withIndex("by_createdBy", (q: any) => q.eq("createdBy", userId))
    .collect();

  const now = Date.now();
  for (const m of activeCalls) {
    if (m.type !== "call" || m.status !== "active") continue;
    // Only end calls older than threshold with no active participants
    const age = now - m._creationTime;
    if (age < STALE_CALL_THRESHOLD_MS) continue;
    const hasActiveParticipant = m.participants.some(
      (p: any) => p.joinedAt && !p.leftAt,
    );
    if (hasActiveParticipant) continue;
    await ctx.db.patch(m._id, { status: "ended", endedAt: now });
  }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get a single meeting by ID.
 */
export const get = authQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Réunion non trouvée");

    // Verify user is a participant or has org membership
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id,
    );
    if (!isParticipant) {
      if (!meeting.orgId) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
      if (!membership) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
    }

    return meeting;
  },
});

/**
 * List meetings for an organization (agent view).
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("active"),
        v.literal("ended"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    // Only require org membership — no specific task code needed to view org meetings
    await getMembership(ctx, ctx.user._id, args.orgId);

    let results;
    if (args.status) {
      results = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status as any),
        )
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("meetings")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .take(50);
    }

    // Enrich with participant names
    const userIds = new Set<string>();
    for (const m of results) {
      for (const p of m.participants) {
        userIds.add(p.userId);
      }
      userIds.add(m.createdBy);
    }
    const users = await Promise.all(
      [...userIds].map(async (uid) => {
        const user = await ctx.db.get(uid as Id<"users">);
        if (!user) return null;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Inconnu";
        return { id: uid, name };
      }),
    );
    const participantNames: Record<string, string> = {};
    for (const u of users) {
      if (u) participantNames[u.id] = u.name;
    }

    return { meetings: results, participantNames };
  },
});

/**
 * List meetings the current user is participating in (created or joined).
 * For citizens: shows calls where they were invited by agents.
 * For agents: shows calls they created.
 */
export const listMine = authQuery({
  args: {},
  handler: async (ctx) => {
    // 1. Get all meetings created by the user
    const created = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", ctx.user._id))
      .order("desc")
      .take(50);

    // 2. Also scan recent meetings to find those where user is a participant
    //    (Convex doesn't support indexing into arrays, so we scan recent meetings)
    const recentMeetings = await ctx.db
      .query("meetings")
      .order("desc")
      .take(200);

    const participatingIn = recentMeetings.filter(
      (m) =>
        m.createdBy !== ctx.user._id &&
        m.participants.some((p) => p.userId === ctx.user._id),
    );

    // 3. Merge and deduplicate, sorted by most recent first
    const allIds = new Set(created.map((m) => m._id));
    const merged = [...created];
    for (const m of participatingIn) {
      if (!allIds.has(m._id)) {
        merged.push(m);
        allIds.add(m._id);
      }
    }

    // Sort by creation time descending
    merged.sort((a, b) => b._creationTime - a._creationTime);

    const results = merged.slice(0, 50);

    // 4. Enrich with participant names
    const userIds = new Set<string>();
    for (const m of results) {
      for (const p of m.participants) {
        userIds.add(p.userId);
      }
      userIds.add(m.createdBy);
    }
    const users = await Promise.all(
      [...userIds].map(async (uid) => {
        const user = await ctx.db.get(uid as Id<"users">);
        if (!user) return null;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Inconnu";
        return { id: uid, name };
      }),
    );
    const participantNames: Record<string, string> = {};
    for (const u of users) {
      if (u) participantNames[u.id] = u.name;
    }

    return { meetings: results, participantNames };
  },
});

/**
 * Get meetings linked to a specific request.
 */
export const listByRequest = authQuery({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .order("desc")
      .collect();
  },
});

/**
 * Génère un fichier iCalendar (.ics) pour une réunion — téléchargeable
 * par le participant pour l'ajouter dans son calendrier (Outlook, Google
 * Calendar, Apple Calendar, etc.).
 *
 * Le format suit RFC 5545 avec lignes CRLF. La durée par défaut est d'1h si
 * aucun `endedAt` n'est connu.
 */
export const exportIcs = authQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Réunion non trouvée");

    // Permission : créateur OU participant OU membre de l'org hôte.
    const isCreator = meeting.createdBy === ctx.user._id;
    const isParticipant = meeting.participants.some(
      (p: any) => p.userId === ctx.user._id,
    );
    const isOrgMember =
      meeting.orgId != null &&
      (await ctx.db
        .query("memberships")
        .withIndex("by_user_org", (q: any) =>
          q.eq("userId", ctx.user._id).eq("orgId", meeting.orgId),
        )
        .first()) != null;

    if (!isCreator && !isParticipant && !isOrgMember) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas accès à cette réunion",
      );
    }

    // Date de début : scheduledAt → startedAt → createdAt.
    const startMs = meeting.scheduledAt ?? meeting.startedAt ?? meeting._creationTime;
    // Date de fin : endedAt si connu, sinon start + 1h.
    const endMs = meeting.endedAt ?? startMs + 60 * 60 * 1000;

    const organizer = await ctx.db.get(meeting.createdBy);
    const organizerName = organizer
      ? [organizer.firstName, organizer.lastName]
          .filter(Boolean)
          .join(" ") ||
        organizer.name ||
        organizer.email ||
        "Organisateur"
      : "Organisateur";
    const organizerEmail = organizer?.email ?? "noreply@consulat.ga";

    const now = new Date();
    const fmt = (ms: number) => {
      const d = new Date(ms);
      const pad = (n: number) => String(n).padStart(2, "0");
      return (
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
      );
    };

    // Échappement des champs texte pour ICS : \, ; , et newline → \n.
    const escape = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

    const title = escape(meeting.title);
    const description = escape(
      [
        `Réunion ${meeting.type === "call" ? "d'appel" : "virtuelle"} organisée via Consulat.ga`,
        `Room : ${meeting.roomName}`,
      ].join("\n"),
    );

    // STATUS ICS : `scheduled` → CONFIRMED, `cancelled` → CANCELLED, autres → CONFIRMED.
    const icsStatus =
      meeting.status === "cancelled" ? "CANCELLED" : "CONFIRMED";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Consulat.ga//iReunion//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:meeting-${meeting._id}@consulat.ga`,
      `DTSTAMP:${fmt(now.getTime())}`,
      `DTSTART:${fmt(startMs)}`,
      `DTEND:${fmt(endMs)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `ORGANIZER;CN=${escape(organizerName)}:mailto:${organizerEmail}`,
      `STATUS:${icsStatus}`,
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const ics = lines.join("\r\n");
    // Nom de fichier sûr : slugifier le titre.
    const slug = meeting.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "reunion";

    return {
      ics,
      filename: `${slug}.ics`,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new meeting or call.
 */
export const create = authMutation({
  args: {
    title: v.string(),
    type: v.union(v.literal("call"), v.literal("meeting")),
    orgId: v.id("orgs"),
    participantIds: v.array(v.id("users")),
    requestId: v.optional(v.id("requests")),
    appointmentId: v.optional(v.id("appointments")),
    scheduledAt: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    // "video" autorise audio+vidéo côté token ; "audio" restreint à MICROPHONE.
    // Par défaut : "video" pour les appels (toggle caméra dispo dans CustomCallUI),
    // "audio" pour les meetings planifiés.
    mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),
    recordingEnabled: v.optional(v.boolean()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is a member of the org
    await getMembership(ctx, ctx.user._id, args.orgId);

    // Get org for slug
    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation non trouvée");

    const roomName = generateRoomName(org.slug);

    // Build participants array with the creator as host
    const participants = [
      {
        userId: ctx.user._id,
        role: "host" as const,
      },
      ...args.participantIds
        .filter((id) => id !== ctx.user._id)
        .map((userId) => ({
          userId,
          role: "participant" as const,
        })),
    ];

    const meetingId = await ctx.db.insert("meetings", {
      title: args.title,
      type: args.type,
      status: args.scheduledAt ? "scheduled" : "active",
      roomName,
      orgId: args.orgId,
      createdBy: ctx.user._id,
      participants,
      requestId: args.requestId,
      appointmentId: args.appointmentId,
      maxParticipants: args.maxParticipants ?? (args.type === "call" ? 2 : 20),
      scheduledAt: args.scheduledAt,
      startedAt: args.scheduledAt ? undefined : Date.now(),
      mediaType: args.mediaType ?? (args.type === "call" ? "video" : "audio"),
      recordingEnabled: args.recordingEnabled,
      description: args.description?.trim() || undefined,
    });

    // ── Envoyer des notifications d'invitation aux participants ──
    // Le lien diffère selon le rôle du destinataire :
    //   - citoyen → `/my-space/meetings?join=<id>` (citizen-web)
    //   - agent / backoffice → `/icom?tab=imeeting&active=<id>` (iCom, agent-web)
    const now = Date.now();
    const creatorName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email || "Un agent";
    for (const participantId of args.participantIds) {
      if (participantId === ctx.user._id) continue; // Pas de notification au créateur
      const recipientIsCitizen = await isPublicUser(ctx, participantId);
      const link = recipientIsCitizen
        ? `/my-space/meetings?join=${meetingId}`
        : `/icom?tab=imeeting&active=${meetingId}`;
      await ctx.db.insert("notifications", {
        userId: participantId,
        type: "meeting_invitation" as any,
        title: args.type === "meeting" ? "Invitation à une réunion" : "Appel entrant",
        body: args.type === "meeting"
          ? `${creatorName} vous invite à "${args.title}"`
          : `${creatorName} vous appelle`,
        link,
        isRead: false,
        relatedId: meetingId as string,
        relatedType: "meeting",
        createdAt: now,
      });
    }

    return { meetingId, roomName };
  },
});

/**
 * Join a meeting or answer a call — adds the user to participants if not already present.
 * For calls with callStatus: transitions ringing → connected.
 */
export const join = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Réunion non trouvée");

    if (meeting.status === "ended" || meeting.status === "cancelled") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Cette réunion est terminée");
    }

    // For calls: check callStatus is answerable
    if (meeting.type === "call" && meeting.callStatus) {
      if (meeting.callStatus === "connected") {
        // Exception : le caller original (createdBy) ET le destinataire qui a
        // déjà décroché (answeredBy) peuvent rejoindre une room "connected"
        // — ce sont les deux participants légitimes. Le rejet ne concerne
        // qu'un tiers qui tenterait de pirater l'appel.
        const isLegitimateRejoin =
          ctx.user._id === meeting.createdBy ||
          (meeting.answeredBy !== undefined &&
            ctx.user._id === meeting.answeredBy);
        if (!isLegitimateRejoin) {
          throw error(ErrorCode.INVALID_ARGUMENT, "Cet appel est déjà pris par un autre agent");
        }
      }
      if (meeting.callStatus === "ended" || meeting.callStatus === "missed" || meeting.callStatus === "declined") {
        throw error(ErrorCode.INVALID_ARGUMENT, "Cet appel est terminé");
      }
    }

    // Check if user is already a participant (re-joining)
    const existingIndex = meeting.participants.findIndex(
      (p) => p.userId === ctx.user._id,
    );

    // Only enforce max participants for NEW joins
    if (existingIndex < 0) {
      const activeParticipants = meeting.participants.filter((p) => !p.leftAt);
      if (
        meeting.maxParticipants &&
        activeParticipants.length >= meeting.maxParticipants
      ) {
        throw error(ErrorCode.INVALID_ARGUMENT, "Nombre max de participants atteint");
      }
    }

    const participants = [...meeting.participants];

    if (existingIndex >= 0) {
      // Re-joining — update timestamps
      participants[existingIndex] = {
        ...participants[existingIndex],
        joinedAt: Date.now(),
        leftAt: undefined,
      };
    } else {
      participants.push({
        userId: ctx.user._id,
        joinedAt: Date.now(),
        role: "participant",
      });
    }

    // Auto-activate if still scheduled
    const patch: any = { participants };
    if (meeting.status === "scheduled") {
      patch.status = "active";
      patch.startedAt = Date.now();
    }

    // Transition callStatus → "connected" UNIQUEMENT quand un DESTINATAIRE
    // (≠ caller) rejoint. Le caller (createdBy) qui rejoint sa propre room
    // pour publier son audio ne doit pas déclencher la transition — sinon le
    // call passe à "connected" avant même que le destinataire ait pu décrocher,
    // et la mutation rejette ensuite le décrochage légitime du destinataire
    // avec "Cet appel est déjà pris par un autre agent".
    //
    // Couvre les deux scénarios légitimes :
    //  - Appel inbound (citoyen → org) : un agent qui décroche n'est pas le
    //    createdBy → transition.
    //  - Appel outbound (agent/admin → user via callUser/callBackRecent/
    //    callUserAsAdmin) : le destinataire qui rejoint n'est pas le
    //    createdBy → transition.
    //
    // Le caller qui rejoint passe ce bloc sans changement (état "ringing"
    // préservé jusqu'au décrochage réel du destinataire).
    const isCaller = ctx.user._id === meeting.createdBy;
    if (
      !isCaller &&
      meeting.type === "call" &&
      (meeting.callStatus === "ringing" || meeting.callStatus === "initiating")
    ) {
      patch.callStatus = "connected";
      if (!meeting.answeredBy) {
        patch.answeredBy = ctx.user._id;
        patch.answeredAt = Date.now();
      }
    }

    await ctx.db.patch(args.meetingId, patch);

    return meeting.roomName;
  },
});

/**
 * Leave a meeting — marks the user as having left.
 */
export const leave = authMutation({
  args: {
    meetingId: v.id("meetings"),
    // Bug 5 fix v2 (Ronde 3) : flag `intentional` pour distinguer un
    // raccrochage explicite (bouton "Quitter", tool vocal hangup_active_call)
    // d'un cleanup React transitoire (StrictMode double-mount, navigation
    // rapide). Quand `true`, by-pass la protection 5s qui empêche normalement
    // de mark le meeting `ended` dans la fenêtre fraîche post-création.
    intentional: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND);

    const idx = meeting.participants.findIndex(
      (p) => p.userId === ctx.user._id,
    );
    if (idx < 0) return; // Not a participant, no-op

    const participants = [...meeting.participants];
    participants[idx] = {
      ...participants[idx],
      leftAt: Date.now(),
    };

    // Auto-end if all participants have left, or if it's a 1-on-1 call (anyone leaving ends it)
    const stillActive = participants.filter((p) => !p.leftAt);
    const patch: any = { participants };

    const isCall = meeting.type === "call";
    const isEmpty = stillActive.length === 0;

    // Bug 5 fix (anti-StrictMode + race conditions) : ne PAS mark un
    // call/meeting comme `ended` dans les 5 premières secondes après sa
    // création — SAUF si le caller passe `intentional: true` (bouton
    // "Quitter" explicite OU tool vocal hangup_active_call). Ça by-pass
    // la protection pour permettre le raccrochage immédiat post-création.
    const ageMs = Date.now() - meeting._creationTime;
    const isProtectedFresh = ageMs < 5_000 && args.intentional !== true;

    let createMissedAbandoned = false;
    if ((isEmpty || isCall) && meeting.status === "active" && !isProtectedFresh) {
      patch.status = "ended";
      patch.endedAt = Date.now();
      // Update callStatus for calls
      if (isCall && meeting.callStatus) {
        if (meeting.callStatus === "connected") {
          patch.callStatus = "ended";
          patch.endReason = "normal";
        } else if (meeting.callStatus === "ringing" || meeting.callStatus === "initiating") {
          // Caller hung up before any agent answered
          patch.callStatus = "ended";
          patch.endReason = "cancelled";
          createMissedAbandoned = meeting.isOrgInbound === true && !!meeting.orgId;
        }
      }
    }

    await ctx.db.patch(args.meetingId, patch);

    // Log abandoned inbound org calls into missedCalls so agents can see them
    // and call back. Without this, cancelled-before-pickup calls are invisible.
    if (createMissedAbandoned && meeting.orgId) {
      const existing = await ctx.db
        .query("missedCalls")
        .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
        .first();
      if (!existing) {
        const callerUser = await ctx.db.get(meeting.createdBy);
        const displayName = callerUser
          ? [callerUser.firstName, callerUser.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            callerUser.email ||
            "Usager"
          : "Usager";
        const startedAt = meeting.startedAt ?? meeting._creationTime;
        const endedAt = patch.endedAt as number;
        await ctx.db.insert("missedCalls", {
          orgId: meeting.orgId,
          callLineId: meeting.callLineId,
          meetingId: meeting._id,
          caller: {
            userId: meeting.createdBy,
            displayName,
            email: callerUser?.email,
          },
          startedAt,
          endedAt,
          durationSeconds: Math.floor((endedAt - startedAt) / 1000),
          reason: "abandoned",
          callbackStatus: "pending",
        });
      }
    }
  },
});

/**
 * End a meeting (host or manager only).
 */
export const end = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND);

    // Only host or someone with manage permission
    const isHost = meeting.participants.some(
      (p) => p.userId === ctx.user._id && p.role === "host",
    );
    if (!isHost) {
      if (!meeting.orgId) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      // Verify at least org membership
      await getMembership(ctx, ctx.user._id, meeting.orgId);
    }

    await ctx.db.patch(args.meetingId, {
      status: "ended",
      endedAt: Date.now(),
    });
  },
});

/**
 * Cancel a scheduled meeting before it starts. Different from `end` which is
 * used to terminate an active meeting. Only the host (or an org admin) can
 * cancel; the meeting must still be in "scheduled" state.
 */
export const cancel = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND);

    if (meeting.status !== "scheduled") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Seules les réunions planifiées peuvent être annulées.",
      );
    }

    const isHost = meeting.participants.some(
      (p) => p.userId === ctx.user._id && p.role === "host",
    );
    if (!isHost) {
      if (!meeting.orgId) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      await getMembership(ctx, ctx.user._id, meeting.orgId);
    }

    await ctx.db.patch(args.meetingId, {
      status: "cancelled",
      endedAt: Date.now(),
    });
  },
});

// ============================================
// INBOUND ORG CALLS (citizen → org)
// ============================================

/**
 * List active inbound org calls for the current agent.
 * Only returns calls where:
 *  - isOrgInbound === true
 *  - status === "active"
 *  - No agent has joined yet (participants.length === 1, just the caller)
 *  - The agent's position includes a meetings task code
 */
export const listInboundOrgCalls = authQuery({
  args: {},
  handler: async (ctx) => {
    // Get all active memberships for this user
    const userMemberships = (await ctx.db
      .query("memberships")
      .collect())
      .filter(
        (m) => m.userId === ctx.user._id && !m.deletedAt,
      );

    if (userMemberships.length === 0) return [];

    // Build a set of membership IDs for fast lookup (for call line filtering)
    const myMembershipIds = new Set(userMemberships.map((m) => m._id as string));

    // Check which memberships have meetings.join permission
    const orgIdsWithPermission: Set<string> = new Set();
    for (const membership of userMemberships) {
      const canJoin = await canDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.meetings.join,
      );
      if (canJoin) {
        orgIdsWithPermission.add(membership.orgId);
      }
    }

    if (orgIdsWithPermission.size === 0) return [];

    // For each org, find active inbound calls
    const inboundCalls = [];
    for (const orgId of orgIdsWithPermission) {
      const calls = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId as any).eq("status", "active"),
        )
        .collect();

      const now = Date.now();
      // Filter for inbound, unanswered calls
      for (const c of calls) {
        if (c.isOrgInbound !== true) continue;

        // New callStatus-based filtering (with backward compat for old documents)
        if (c.callStatus) {
          // New system: only show "ringing" calls
          if (c.callStatus !== "ringing") continue;
        } else {
          // Legacy: no callStatus → use participant count heuristic
          const joinedCount = c.participants.filter((p) => p.joinedAt && !p.leftAt).length;
          if (joinedCount > 1) continue; // Already answered
        }

        // Auto-timeout: if ringing too long, don't show (stale call)
        if (now - c._creationTime > CALL_RING_TIMEOUT_MS) continue;

        // L'agent a explicitement refusé cet appel → l'exclure de sa vue.
        if (c.declinedBy?.includes(ctx.user._id)) continue;

        // Call line filtering: if the call targets a specific line,
        // only agents on that line should see it.
        // Fallback: if the line has no agents assigned, broadcast to all.
        if (c.callLineId) {
          const callLine = await ctx.db.get(c.callLineId);
          if (!callLine || !callLine.isActive) continue;
          // Only filter by line membership if the line actually has agents
          if (callLine.membershipIds.length > 0) {
            const isOnLine = callLine.membershipIds.some((mId) =>
              myMembershipIds.has(mId as string),
            );
            if (!isOnLine) continue;
          }
          // else: line has no agents → fall through to broadcast
        }
        // no callLineId or empty line → broadcast to all agents with permission

        inboundCalls.push(c);
      }
    }

    // Sort by most recent first
    inboundCalls.sort((a, b) => b._creationTime - a._creationTime);
    return inboundCalls;
  },
});

/**
 * Citizen calls an organization.
 * Creates an active inbound call — no org membership required.
 * Citizens are restricted to audio-only calls.
 */
export const callOrganization = authMutation({
  args: {
    orgId: v.id("orgs"),
    callLineId: v.optional(v.id("callLines")),
    mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    // Citoyens : forcer audio uniquement
    const isCitizen = await isPublicUser(ctx, ctx.user._id);
    const resolvedMediaType = isCitizen ? "audio" : (args.mediaType ?? "audio");
    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation non trouvée");

    // End any stale active calls from this user
    await endStaleCalls(ctx, ctx.user._id);

    // If a call line is specified, validate it belongs to this org
    let lineLabel: string | undefined;
    if (args.callLineId) {
      const callLine = await ctx.db.get(args.callLineId);
      if (!callLine || callLine.orgId !== args.orgId || !callLine.isActive) {
        throw error(ErrorCode.INVALID_ARGUMENT, "Ligne d'appel invalide");
      }
      lineLabel = callLine.label;
    }

    const roomName = generateRoomName(org.slug);
    const title = lineLabel
      ? `Appel entrant — ${org.name} — ${lineLabel}`
      : `Appel entrant — ${org.name}`;

    const meetingId = await ctx.db.insert("meetings", {
      title,
      type: "call",
      status: "active",
      callStatus: "initiating",
      roomName,
      orgId: args.orgId,
      createdBy: ctx.user._id,
      isOrgInbound: true,
      callLineId: args.callLineId,
      mediaType: resolvedMediaType,
      participants: [
        {
          userId: ctx.user._id,
          role: "host",
          joinedAt: Date.now(),
        },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});

/**
 * Agent calls a specific user (citizen or other agent).
 * Requires meetings.create task code.
 */
export const callUser = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetUserId: v.id("users"),
    mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    // Les utilisateurs back-office (SuperAdmin, AdminSystem, Admin) peuvent
    // appeler depuis n'importe quelle org visible — ils n'ont pas besoin
    // d'une membership dans celle-ci. Pour les agents métier, la membership
    // + task `meetings.create` reste obligatoire.
    if (!isBackOfficeUser(ctx.user)) {
      const membership = await getMembership(ctx, ctx.user._id, args.orgId);
      if (!membership) throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);

      const canCreate = await canDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.meetings.create,
      );
      if (!canCreate) throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const org = await ctx.db.get(args.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation non trouvée");

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw error(ErrorCode.NOT_FOUND, "Utilisateur non trouvé");

    // End any stale active calls from this user
    await endStaleCalls(ctx, ctx.user._id);

    const roomName = generateRoomName(org.slug);

    const meetingId = await ctx.db.insert("meetings", {
      title: `Appel — ${targetUser.firstName ?? ""} ${targetUser.lastName ?? ""}`.trim(),
      type: "call",
      status: "active",
      callStatus: "initiating",
      roomName,
      orgId: args.orgId,
      createdBy: ctx.user._id,
      mediaType: args.mediaType ?? "audio",
      participants: [
        {
          userId: ctx.user._id,
          role: "host",
          joinedAt: Date.now(),
        },
        {
          userId: args.targetUserId,
          role: "participant",
        },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});

/**
 * Citizen calls another citizen by email (C2C).
 * RESTRICTION : seuls les agents (Catégorie A) peuvent utiliser cette fonction.
 */
export const callCitizenByEmail = authMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Bloquer les citoyens (Catégorie B)
    const isCitizen = await isPublicUser(ctx, ctx.user._id);
    if (isCitizen) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Les ressortissants ne peuvent pas appeler d'autres ressortissants. Utilisez les lignes d'appel de votre représentation.",
      );
    }
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!targetUser) {
      throw error(ErrorCode.NOT_FOUND, "Aucun utilisateur trouvé avec cette adresse email.");
    }

    if (targetUser._id === ctx.user._id) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Vous ne pouvez pas vous appeler vous-même.");
    }

    // End any stale active calls from this user
    await endStaleCalls(ctx, ctx.user._id);

    const roomName = `mtg-c2c-${Date.now().toString(36)}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}`;

    const titleParts = [];
    if (targetUser.firstName) titleParts.push(targetUser.firstName);
    if (targetUser.lastName) titleParts.push(targetUser.lastName);
    const targetName = titleParts.join(" ") || "Appel vocal";

    const meetingId = await ctx.db.insert("meetings", {
      title: `Appel — ${targetName}`,
      type: "call",
      status: "active",
      roomName,
      createdBy: ctx.user._id,
      participants: [
        { userId: ctx.user._id, role: "host", joinedAt: Date.now() },
        { userId: targetUser._id, role: "participant" },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});

/**
 * Citizen calls another citizen by ID (C2C, used for history recall).
 * RESTRICTION : seuls les agents (Catégorie A) peuvent utiliser cette fonction.
 */
export const callCitizenById = authMutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Bloquer les citoyens (Catégorie B)
    const isCitizen = await isPublicUser(ctx, ctx.user._id);
    if (isCitizen) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Les ressortissants ne peuvent pas appeler d'autres ressortissants. Utilisez les lignes d'appel de votre représentation.",
      );
    }

    const targetUser = await ctx.db.get(args.targetUserId);

    if (!targetUser) {
      throw error(ErrorCode.NOT_FOUND, "Utilisateur introuvable.");
    }

    if (targetUser._id === ctx.user._id) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Vous ne pouvez pas vous appeler vous-même.");
    }

    // End any stale active calls from this user
    await endStaleCalls(ctx, ctx.user._id);

    const roomName = `mtg-c2c-${Date.now().toString(36)}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}`;

    const titleParts = [];
    if (targetUser.firstName) titleParts.push(targetUser.firstName);
    if (targetUser.lastName) titleParts.push(targetUser.lastName);
    const targetName = titleParts.join(" ") || "Appel vocal";

    const meetingId = await ctx.db.insert("meetings", {
      title: `Appel — ${targetName}`,
      type: "call",
      status: "active",
      roomName,
      createdBy: ctx.user._id,
      participants: [
        { userId: ctx.user._id, role: "host", joinedAt: Date.now() },
        { userId: targetUser._id, role: "participant" },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});


// ============================================
// CITIZEN → REQUEST AGENT (routed through standard line)
// ============================================

/**
 * Citoyen appelle l'agent traitant sa demande.
 * L'appel est routé via la ligne standard/par défaut de l'org,
 * PAS en appel direct vers l'agent.
 */
export const callRequestAgent = authMutation({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw error(ErrorCode.NOT_FOUND, "Demande non trouvée");
    if (request.userId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Cette demande ne vous appartient pas");
    }
    if (!request.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Aucune organisation liée à cette demande");
    }

    const org = await ctx.db.get(request.orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation non trouvée");

    // Trouver la ligne par défaut de l'org
    const callLines = await ctx.db
      .query("callLines")
      .withIndex("by_org_active", (q: any) =>
        q.eq("orgId", request.orgId).eq("isActive", true),
      )
      .collect();

    const defaultLine = callLines.find((l) => l.isDefault && l.type === "org");
    const fallbackLine = callLines.find((l) => l.type === "org");
    const callLineId = defaultLine?._id ?? fallbackLine?._id;

    await endStaleCalls(ctx, ctx.user._id);

    const roomName = generateRoomName(org.slug);

    const meetingId = await ctx.db.insert("meetings", {
      title: `Appel demande — ${org.name}`,
      type: "call",
      status: "active",
      callStatus: "initiating",
      roomName,
      orgId: request.orgId,
      createdBy: ctx.user._id,
      isOrgInbound: true,
      callLineId,
      requestId: args.requestId,
      mediaType: "audio",
      participants: [
        { userId: ctx.user._id, role: "host", joinedAt: Date.now() },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});

/**
 * Backoffice (Super Admin / Admin) calls a user from the global Users page.
 *
 * Contrairement à `callUser`, cette mutation ne reçoit pas d'orgId : elle est
 * pensée pour le bouton « Lancer un appel » de la page `/users` du backoffice,
 * où l'admin n'a pas sélectionné d'organisation au préalable.
 *
 * Résolution de l'orgId :
 *   1. Première membership active de la cible (l'appel est tracé dans son org)
 *   2. Sinon, première membership active du caller (fallback)
 *   3. Sinon, erreur lisible
 *
 * Réservée aux utilisateurs back-office (super_admin, admin_system, admin,
 * sous_admin) — bypasse les gates de tâches `meetings.create` au même titre
 * que la branche backoffice de `callUser` (cf. ligne 871).
 */
export const callUserAsAdmin = authMutation({
  args: {
    targetUserId: v.id("users"),
    mediaType: v.optional(v.union(v.literal("audio"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    if (!isBackOfficeUser(ctx.user)) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Cette action est réservée aux administrateurs.",
      );
    }

    if (args.targetUserId === ctx.user._id) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Vous ne pouvez pas vous appeler vous-même.");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw error(ErrorCode.NOT_FOUND, "Utilisateur non trouvé");

    const resolveFirstOrg = async (
      userId: Id<"users">,
    ): Promise<Id<"orgs"> | null> => {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_user_org", (q: any) => q.eq("userId", userId))
        .collect();
      const active = memberships.filter((m) => !m.deletedAt);
      return active[0]?.orgId ?? null;
    };

    let orgId = await resolveFirstOrg(args.targetUserId);
    if (!orgId) orgId = await resolveFirstOrg(ctx.user._id);
    if (!orgId) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Aucune organisation rattachée à cet utilisateur ou à votre compte — impossible de lancer l'appel.",
      );
    }

    const org = await ctx.db.get(orgId);
    if (!org) throw error(ErrorCode.NOT_FOUND, "Organisation non trouvée");

    await endStaleCalls(ctx, ctx.user._id);

    const roomName = generateRoomName(org.slug);
    const targetName =
      `${targetUser.firstName ?? ""} ${targetUser.lastName ?? ""}`.trim() ||
      targetUser.email ||
      "Appel";

    const meetingId = await ctx.db.insert("meetings", {
      title: `Appel — ${targetName}`,
      type: "call",
      status: "active",
      callStatus: "initiating",
      roomName,
      orgId,
      createdBy: ctx.user._id,
      mediaType: args.mediaType ?? "audio",
      participants: [
        {
          userId: ctx.user._id,
          role: "host",
          joinedAt: Date.now(),
        },
        {
          userId: args.targetUserId,
          role: "participant",
        },
      ],
      maxParticipants: 2,
      startedAt: Date.now(),
    });

    return { meetingId, roomName };
  },
});

// ============================================
// CALL STATE MACHINE MUTATIONS
// ============================================

/**
 * Transition a call from "initiating" to "ringing".
 * Called by the citizen frontend once connected to the LiveKit room.
 * This is what makes the call visible to agents.
 */
export const setCallRinging = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel non trouvé");

    // Only the caller can trigger ringing
    if (meeting.createdBy !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Seul l'appelant peut déclencher la sonnerie");
    }

    if (meeting.type !== "call") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Cette opération ne s'applique qu'aux appels");
    }

    // Only transition from "initiating"
    if (meeting.callStatus !== "initiating") return;

    await ctx.db.patch(args.meetingId, { callStatus: "ringing" });
  },
});

/**
 * Agent explicitly declines an incoming call.
 */
export const declineCall = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel non trouvé");

    if (meeting.type !== "call" || !meeting.isOrgInbound) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Cette opération ne s'applique qu'aux appels entrants");
    }

    if (meeting.callStatus !== "ringing") return;

    const currentDeclined = meeting.declinedBy ?? [];
    if (currentDeclined.includes(ctx.user._id)) return;

    const updatedDeclined = [...currentDeclined, ctx.user._id];
    await ctx.db.patch(args.meetingId, { declinedBy: updatedDeclined });
  },
});

// ============================================
// CALL HISTORY
// ============================================

/**
 * List call history for the current user.
 * Categorizes calls as incoming, outgoing, missed, declined.
 */
export const listCallHistory = authQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
  },
  handler: async (ctx, args) => {
    // Get calls created by user
    const myCalls = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", ctx.user._id))
      .order("desc")
      .take(100);

    // Filter to only calls (not meetings)
    const calls = myCalls.filter((m) => m.type === "call");

    // Also find calls where user was a participant (answered inbound calls)
    let answeredCalls: typeof calls = [];
    if (args.orgId) {
      const orgCalls = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .take(200);
      answeredCalls = orgCalls.filter(
        (m) =>
          m.type === "call" &&
          m.answeredBy === ctx.user._id,
      );
    }

    // Merge and deduplicate
    const allIds = new Set(calls.map((c) => c._id));
    const merged = [...calls];
    for (const c of answeredCalls) {
      if (!allIds.has(c._id)) {
        merged.push(c);
        allIds.add(c._id);
      }
    }
    merged.sort((a, b) => b._creationTime - a._creationTime);

    // Enrich with user names
    const userIds = new Set<string>();
    for (const c of merged) {
      for (const p of c.participants) userIds.add(p.userId);
      userIds.add(c.createdBy);
      if (c.answeredBy) userIds.add(c.answeredBy);
    }
    const users = await Promise.all(
      [...userIds].map(async (uid) => {
        const user = await ctx.db.get(uid as Id<"users">);
        if (!user) return null;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Inconnu";
        return { id: uid, name };
      }),
    );
    const userNames: Record<string, string> = {};
    for (const u of users) {
      if (u) userNames[u.id] = u.name;
    }

    // Categorize
    const categorized = merged.map((c) => {
      let category: "incoming" | "outgoing" | "missed" | "declined";
      if (c.callStatus === "missed") {
        category = "missed";
      } else if (c.callStatus === "declined") {
        category = "declined";
      } else if (c.isOrgInbound && c.createdBy !== ctx.user._id) {
        category = "incoming";
      } else {
        category = "outgoing";
      }
      const duration = c.answeredAt && c.endedAt
        ? c.endedAt - c.answeredAt
        : c.startedAt && c.endedAt
          ? c.endedAt - c.startedAt
          : undefined;

      return {
        ...c,
        category,
        duration,
      };
    });

    return { calls: categorized.slice(0, 50), userNames };
  },
});

// ============================================
// CALL ESCALATION (1:1 → multi-party)
// ============================================

/**
 * Add a participant to an active connected call.
 * Increases maxParticipants and notifies the new participant.
 */
export const addParticipant = authMutation({
  args: {
    meetingId: v.id("meetings"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel non trouvé");

    if (meeting.status !== "active") {
      throw error(ErrorCode.INVALID_ARGUMENT, "L'appel n'est pas actif");
    }

    // Verify caller is a participant
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id && p.joinedAt && !p.leftAt,
    );
    if (!isParticipant) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Vous n'êtes pas dans cet appel");
    }

    // Check target isn't already a participant
    const alreadyIn = meeting.participants.some(
      (p) => p.userId === args.targetUserId && !p.leftAt,
    );
    if (alreadyIn) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Ce participant est déjà dans l'appel");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw error(ErrorCode.NOT_FOUND, "Utilisateur non trouvé");

    const participants = [...meeting.participants];
    participants.push({
      userId: args.targetUserId,
      role: "participant",
    });

    // Increase maxParticipants if needed
    const newMax = Math.max(meeting.maxParticipants ?? 2, participants.length + 1);

    await ctx.db.patch(args.meetingId, {
      participants,
      maxParticipants: newMax,
    });

    // Send notification to the new participant. Lien spécifique au rôle.
    const callerName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.email || "Un agent";
    const recipientIsCitizen = await isPublicUser(ctx, args.targetUserId);
    const link = recipientIsCitizen
      ? `/my-space/meetings?join=${args.meetingId}`
      : `/icom?tab=imeeting&active=${args.meetingId}`;
    await ctx.db.insert("notifications", {
      userId: args.targetUserId,
      type: "meeting_invitation" as any,
      title: meeting.type === "meeting" ? "Invitation à une réunion" : "Appel entrant",
      body:
        meeting.type === "meeting"
          ? `${callerName} vous invite à rejoindre une réunion`
          : `${callerName} vous ajoute à un appel`,
      link,
      isRead: false,
      relatedId: args.meetingId as string,
      relatedType: "meeting",
      createdAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL: Stale call cleanup (called by cron)
// ============================================

/** Timeout thresholds for the cleanup cron */
const INITIATING_TIMEOUT_MS = 30_000;  // 30s to connect to LiveKit
const RINGING_TIMEOUT_MS = 120_000;    // 2 min for agent to answer

/**
 * Cron job: cleanup stale calls.
 * - "initiating" > 30s → "missed" (citizen never connected to LiveKit)
 * - "ringing" > 2 min → "missed" (no agent answered)
 * - "connected" with 0 active participants → "ended"
 */
export const cleanupStaleCalls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Process "initiating" calls that timed out
    const initiatingCalls = await ctx.db
      .query("meetings")
      .withIndex("by_callStatus_and_org", (q) => q.eq("callStatus", "initiating"))
      .take(50);

    for (const c of initiatingCalls) {
      if (now - c._creationTime > INITIATING_TIMEOUT_MS) {
        await ctx.db.patch(c._id, {
          callStatus: "missed",
          status: "ended",
          endReason: "timeout",
          endedAt: now,
        });
      }
    }

    // Process "ringing" calls that timed out
    const ringingCalls = await ctx.db
      .query("meetings")
      .withIndex("by_callStatus_and_org", (q) => q.eq("callStatus", "ringing"))
      .take(50);

    for (const c of ringingCalls) {
      if (now - c._creationTime > RINGING_TIMEOUT_MS) {
        await ctx.db.patch(c._id, {
          callStatus: "missed",
          status: "ended",
          endReason: "timeout",
          endedAt: now,
        });
      }
    }

    // Process "connected" calls with no active participants
    const connectedCalls = await ctx.db
      .query("meetings")
      .withIndex("by_callStatus_and_org", (q) => q.eq("callStatus", "connected"))
      .take(50);

    for (const c of connectedCalls) {
      const hasActive = c.participants.some((p) => p.joinedAt && !p.leftAt);
      if (!hasActive) {
        await ctx.db.patch(c._id, {
          callStatus: "ended",
          status: "ended",
          endReason: "normal",
          endedAt: now,
        });
      }
    }

  },
});

// ============================================================================
// SPRINT 6 — RGPD consent pour l'enregistrement
// ============================================================================

/**
 * Accepte l'enregistrement de l'appel (appelée par le citoyen).
 * Pré-condition : être participant du meeting.
 */
export const acceptRecordingConsent = authMutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Meeting introuvable");
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id,
    );
    if (!isParticipant) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Non-participant");
    }
    const now = Date.now();
    await ctx.db.patch(args.meetingId, {
      citizenConsent: {
        ...(meeting.citizenConsent ?? {}),
        recordingAccepted: true,
        recordingAcceptedAt: now,
      },
    });
    return { accepted: true };
  },
});

/**
 * Demande au citoyen son consentement pour enregistrer l'appel (appelée par l'agent).
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase ε.
 *
 * Écrit `citizenConsent.recordingConsentRequestedAt`. Le citizen-web observe
 * ce champ via subscription et affiche le banner tant qu'aucune décision
 * (`recordingAccepted`/`recordingDeclinedAt`) n'est enregistrée.
 */
export const requestRecordingConsent = authMutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Meeting introuvable");
    // L'agent doit être participant du meeting (sécurité minimale).
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id,
    );
    if (!isParticipant) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Non-participant");
    }
    const now = Date.now();
    await ctx.db.patch(args.meetingId, {
      citizenConsent: {
        ...(meeting.citizenConsent ?? {}),
        recordingConsentRequestedAt: now,
      },
    });
    return { requestedAt: now };
  },
});

/**
 * Refuse l'enregistrement de l'appel.
 */
export const declineRecordingConsent = authMutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Meeting introuvable");
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id,
    );
    if (!isParticipant) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Non-participant");
    }
    const now = Date.now();
    await ctx.db.patch(args.meetingId, {
      citizenConsent: {
        ...(meeting.citizenConsent ?? {}),
        recordingAccepted: false,
        recordingDeclinedAt: now,
      },
    });
    return { declined: true };
  },
});

// ============================================
// VOICE AGENT (iAsted) — Helpers
// ============================================

/**
 * Retourne la réunion / appel actif où l'utilisateur courant est participant.
 * Utilisé par les tools vocaux iAsted (hangup, add_participant, decline,
 * livekit_control) pour identifier la cible sans demander le meetingId au
 * modèle.
 *
 * Scope :
 *   - Meetings où je suis créateur (outbound) + status="active"
 *   - Meetings dans mes orgs (inbound) + status="active" où je suis participant
 *
 * Retourne le plus récent (par startedAt) ou null si aucun.
 */
export const getActiveCallForUser = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user._id;
    const isMine = (m: { participants: ReadonlyArray<{ userId: Id<"users">; leftAt?: number }> }) =>
      m.participants.some((p) => p.userId === userId && !p.leftAt);

    // Outbound (créateur = moi)
    const outbound = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Inbound — scan par org dont je suis membre actif
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const inbound: typeof outbound = [];
    for (const m of memberships) {
      const orgActive = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", m.orgId).eq("status", "active"),
        )
        .collect();
      for (const mtg of orgActive) {
        if (mtg.createdBy !== userId) inbound.push(mtg);
      }
    }

    const seen = new Set<string>();
    const candidates = [...outbound, ...inbound].filter((m) => {
      if (seen.has(m._id)) return false;
      seen.add(m._id);
      return isMine(m);
    });
    if (candidates.length === 0) return null;

    candidates.sort(
      (a, b) =>
        (b.startedAt ?? b._creationTime) - (a.startedAt ?? a._creationTime),
    );
    const m = candidates[0];
    return {
      meetingId: m._id,
      type: m.type,
      title: m.title,
      status: m.status,
      callStatus: m.callStatus,
      isOrgInbound: m.isOrgInbound ?? false,
      createdBy: m.createdBy,
      orgId: m.orgId,
    };
  },
});

/**
 * Retourne le dernier appel manqué éligible au rappel pour les orgs de
 * l'utilisateur courant. Si `callerName` est fourni, filtre les appelants
 * dont firstName/lastName matche (case-insensitive).
 *
 * Utilisé par le tool vocal `recall_missed_call`.
 */
export const findRecallableMissedCall = authQuery({
  args: {
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, { callerName }) => {
    const userId = ctx.user._id;

    // Orgs de l'utilisateur
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    if (memberships.length === 0) return null;

    const needle = callerName?.trim().toLowerCase();
    const matchesNeedle = (first?: string, last?: string, display?: string) => {
      if (!needle) return true;
      const hay = `${first ?? ""} ${last ?? ""} ${display ?? ""}`.toLowerCase();
      return hay.includes(needle);
    };

    // Collecter les missed calls pending les plus récents par org
    const candidates: Array<{
      missedCallId: Id<"missedCalls">;
      callerUserId: Id<"users">;
      callerDisplayName: string;
      startedAt: number;
      orgId: Id<"orgs">;
    }> = [];

    for (const m of memberships) {
      const list = await ctx.db
        .query("missedCalls")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", m.orgId).eq("callbackStatus", "pending"),
        )
        .order("desc")
        .take(20);
      for (const mc of list) {
        if (!mc.caller.userId) continue;
        const u = await ctx.db.get(mc.caller.userId);
        const first = (u as any)?.firstName as string | undefined;
        const last = (u as any)?.lastName as string | undefined;
        if (!matchesNeedle(first, last, mc.caller.displayName)) continue;
        candidates.push({
          missedCallId: mc._id,
          callerUserId: mc.caller.userId,
          callerDisplayName:
            mc.caller.displayName ||
            [first, last].filter(Boolean).join(" ") ||
            "Appelant",
          startedAt: mc.startedAt,
          orgId: m.orgId,
        });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.startedAt - a.startedAt);
    return candidates[0];
  },
});
