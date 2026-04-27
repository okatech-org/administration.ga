import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import { canDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";

/**
 * Centre d'Appels — queries et mutations pour la file d'attente multi-lignes.
 *
 * Sprint 1 (MVP) : file d'attente partagée par ligne, priorité visuelle, pickup séquentiel.
 * Sprint 2 ajoutera : vrai hold/resume, transfert, callback.
 */

// Doit rester aligné avec meetings.ts (même source de vérité).
const CALL_RING_TIMEOUT_MS = 120_000;

type LinePriority = "urgent" | "high" | "normal";

/**
 * Dérive la priorité visuelle d'un appel à partir de la ligne.
 * - callLines.priority ≤ 1 → "urgent"
 * - callLines.priority === 2 → "high"
 * - sinon → "normal"
 *
 * Si l'appel porte déjà un champ `priority` explicite, il prévaut.
 */
function derivePriority(
  meeting: Doc<"meetings">,
  line: Doc<"callLines"> | null,
): LinePriority {
  if (meeting.priority) {
    const p = meeting.priority;
    if (p === "low") return "normal";
    return p;
  }
  if (!line) return "normal";
  if (line.priority <= 1) return "urgent";
  if (line.priority === 2) return "high";
  return "normal";
}

/** Heartbeat récent = presence valide. */
const PRESENCE_FRESHNESS_MS = 90_000;

/**
 * Charge les présences actives de tous les agents d'une ligne, en parallèle.
 * Avant : `for (membership of line.membershipIds) { await get; await query; }` → N+1 séquentiel.
 * Après : un seul `Promise.all` sur les memberships, suivi d'un `Promise.all` sur les presences.
 * Sur une ligne de 10 agents : 20 round-trips → 2 round-trips concurrents.
 */
async function loadLinePresences(
  ctx: any,
  line: Doc<"callLines">,
): Promise<Map<string, Doc<"agentPresence"> | null>> {
  const byMembership = new Map<string, Doc<"agentPresence"> | null>();
  const now = Date.now();

  const memberships = await Promise.all(
    line.membershipIds.map((mid) => ctx.db.get(mid)),
  );

  const presences = await Promise.all(
    memberships.map((m) =>
      m
        ? ctx.db
            .query("agentPresence")
            .withIndex("by_user_and_org", (q: any) =>
              q.eq("userId", m.userId).eq("orgId", line.orgId),
            )
            .unique()
        : Promise.resolve(null),
    ),
  );

  line.membershipIds.forEach((mid, idx) => {
    const presence = presences[idx];
    const fresh =
      presence && now - presence.lastHeartbeat < PRESENCE_FRESHNESS_MS
        ? presence
        : null;
    byMembership.set(mid as string, fresh);
  });

  return byMembership;
}

/**
 * Retourne les `membershipIds` éligibles à recevoir ce meeting selon la stratégie.
 * - broadcast (défaut) : tous
 * - priority_order : 1er agent en ligne dans l'ordre `membershipIds[]`
 * - least_busy : agent avec le moins de currentCallIds actifs
 * - round_robin : dérivé de `meeting._creationTime % N` (déterministe, équitable à long terme)
 */
async function resolveEligibleMemberships(
  ctx: any,
  meeting: Doc<"meetings">,
  line: Doc<"callLines"> | null,
): Promise<Set<string> | "all"> {
  if (!line || line.membershipIds.length === 0) return "all";
  const strategy = line.loadBalancingStrategy ?? "broadcast";
  if (strategy === "broadcast") {
    return new Set(line.membershipIds.map((id) => id as string));
  }

  const presences = await loadLinePresences(ctx, line);

  // Un agent "disponible" a une presence fraîche, status != offline,
  // ET n'a pas de DND actif (dndUntil > now) — Phase β du plan Intelligence iAsted.
  const now = Date.now();
  const availableMembershipIds = line.membershipIds.filter((mid) => {
    const p = presences.get(mid as string);
    if (!p) return false;
    if (p.status === "offline") return false;
    if (p.dndUntil !== undefined && p.dndUntil > now) return false;
    return true;
  });

  if (availableMembershipIds.length === 0) {
    // Personne en ligne : fallback broadcast pour ne pas bloquer l'appel
    return new Set(line.membershipIds.map((id) => id as string));
  }

  if (strategy === "priority_order") {
    // Premier dans l'ordre `membershipIds[]` qui est disponible
    const first = availableMembershipIds[0];
    return new Set([first as string]);
  }

  if (strategy === "least_busy") {
    // Charge = nombre de currentCallIds (actifs + en attente)
    let leastId: string | null = null;
    let leastLoad = Number.POSITIVE_INFINITY;
    for (const mid of availableMembershipIds) {
      const p = presences.get(mid as string);
      const load = p?.currentCallIds?.length ?? (p?.currentCallId ? 1 : 0);
      if (load < leastLoad) {
        leastLoad = load;
        leastId = mid as string;
      }
    }
    return leastId ? new Set([leastId]) : "all";
  }

  if (strategy === "round_robin") {
    // Distribution déterministe : (creationTime / 1000) % N → agent index
    // Équitable à long terme sans nécessiter d'état serveur.
    const index =
      Math.floor(meeting._creationTime / 1000) % availableMembershipIds.length;
    const target = availableMembershipIds[index];
    return new Set([target as string]);
  }

  return "all";
}

/**
 * Liste des appels entrants ("ringing") visibles par l'agent courant,
 * enrichis pour l'affichage en file d'attente multi-lignes.
 *
 * Règles :
 * - File partagée : tous les agents d'une ligne voient les mêmes appels.
 * - Un agent voit un appel s'il a la permission `meetings.join` sur l'org
 *   ET qu'il appartient à la ligne (ou que la ligne n'est rattachée à personne).
 * - Tri : (priorité visuelle asc, priorité ligne asc, ancienneté asc).
 */
export const listQueuedCallsForAgent = authQuery({
  args: {},
  handler: async (ctx) => {
    // Memberships actives de l'agent
    const userMemberships = (await ctx.db
      .query("memberships")
      .collect())
      .filter((m) => m.userId === ctx.user._id && !m.deletedAt);

    if (userMemberships.length === 0) return [];

    const myMembershipIds = new Set<string>(
      userMemberships.map((m) => m._id as string),
    );

    // Orgs pour lesquelles l'agent peut répondre aux appels
    const orgIdsWithPermission = new Set<string>();
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

    const now = Date.now();
    const queued: Array<{
      meeting: Doc<"meetings">;
      line: Doc<"callLines"> | null;
      priority: LinePriority;
      linePriority: number;
    }> = [];

    for (const orgId of orgIdsWithPermission) {
      const calls = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId as Id<"orgs">).eq("status", "active"),
        )
        .collect();

      for (const c of calls) {
        if (c.isOrgInbound !== true) continue;
        if (c.callStatus && c.callStatus !== "ringing") continue;
        if (!c.callStatus) {
          // Legacy : heuristique sur les participants
          const joinedCount = c.participants.filter(
            (p) => p.joinedAt && !p.leftAt,
          ).length;
          if (joinedCount > 1) continue;
        }
        // Timeout visuel côté lecture — la cron finalise en base
        if (now - c._creationTime > CALL_RING_TIMEOUT_MS) continue;

        let line: Doc<"callLines"> | null = null;
        if (c.callLineId) {
          line = await ctx.db.get(c.callLineId);
          if (!line || !line.isActive) continue;
          if (line.membershipIds.length > 0) {
            const isOnLine = line.membershipIds.some((mId) =>
              myMembershipIds.has(mId as string),
            );
            if (!isOnLine) continue;

            // Routage intelligent : selon la stratégie de la ligne,
            // tous les agents ne voient pas forcément tous les appels.
            const eligible = await resolveEligibleMemberships(ctx, c, line);
            if (eligible !== "all") {
              const isTargeted = Array.from(eligible).some((mid) =>
                myMembershipIds.has(mid),
              );
              if (!isTargeted) continue;
            }
          }
        }

        queued.push({
          meeting: c,
          line,
          priority: derivePriority(c, line),
          linePriority: line?.priority ?? 99,
        });
      }
    }

    // Enrichissement : identité appelant + flag "dossiers ouverts" — tout en
    // parallèle. Avant on bouclait séquentiellement sur les callerIds (N round-
    // trips chacun pour user + profile + requests), ce qui devenait coûteux
    // dès qu'on avait quelques appels en file. Désormais 3 Promise.all groupés.
    const callerIdList = Array.from(
      new Set<string>(queued.map((q) => q.meeting.createdBy as string)),
    );

    const [users, profiles, requestsByUser] = await Promise.all([
      Promise.all(callerIdList.map((uid) => ctx.db.get(uid as Id<"users">))),
      Promise.all(
        callerIdList.map((uid) =>
          ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", uid as Id<"users">))
            .first(),
        ),
      ),
      Promise.all(
        callerIdList.map((uid) =>
          ctx.db
            .query("requests")
            .withIndex("by_user_status", (q) => q.eq("userId", uid as Id<"users">))
            .collect(),
        ),
      ),
    ]);

    const callerInfo = new Map<
      string,
      { name: string; nip: string | null; avatarUrl: string | null }
    >();
    const openRequestsByUser = new Map<string, number>();

    callerIdList.forEach((uid, idx) => {
      const user = users[idx];
      const profile = profiles[idx];
      if (!user) {
        callerInfo.set(uid, { name: "Usager", nip: null, avatarUrl: null });
      } else {
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          "Usager";
        callerInfo.set(uid, {
          name,
          nip: profile?.identity?.nip ?? null,
          avatarUrl: user.avatarUrl ?? null,
        });
      }
      const reqs = requestsByUser[idx] ?? [];
      const open = reqs.filter((r: any) => {
        const s = r.status;
        return s !== "completed" && s !== "cancelled" && s !== "rejected";
      }).length;
      openRequestsByUser.set(uid, open);
    });

    // Tri final : priorité visuelle → priorité ligne → ancienneté
    const priorityWeight: Record<LinePriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
    };
    queued.sort((a, b) => {
      const pa = priorityWeight[a.priority];
      const pb = priorityWeight[b.priority];
      if (pa !== pb) return pa - pb;
      if (a.linePriority !== b.linePriority)
        return a.linePriority - b.linePriority;
      return a.meeting._creationTime - b.meeting._creationTime;
    });

    // Labels des lignes d'origine (pour afficher "Redirigé de ...") — batch.
    const originalLineIdList = Array.from(
      new Set<string>(
        queued
          .map((q) => q.meeting.originalCallLineId as string | undefined)
          .filter(Boolean) as string[],
      ),
    );
    const originalLines = new Map<string, string>();
    const originalLineDocs = await Promise.all(
      originalLineIdList.map((lid) => ctx.db.get(lid as Id<"callLines">)),
    );
    originalLineIdList.forEach((lid, idx) => {
      const l = originalLineDocs[idx];
      if (l) originalLines.set(lid, l.label);
    });

    return queued.map(({ meeting, line, priority }) => {
      const info = callerInfo.get(meeting.createdBy as string) ?? {
        name: "Usager",
        nip: null,
        avatarUrl: null,
      };
      const openReqs = openRequestsByUser.get(meeting.createdBy as string) ?? 0;
      return {
        _id: meeting._id,
        _creationTime: meeting._creationTime,
        orgId: meeting.orgId ?? null,
        callLineId: meeting.callLineId ?? null,
        lineLabel: line?.label ?? null,
        lineColor: line?.color ?? null,
        lineIcon: line?.icon ?? null,
        linePriority: line?.priority ?? null,
        priority,
        mediaType: meeting.mediaType ?? "audio",
        requestId: meeting.requestId ?? null,
        caller: {
          userId: meeting.createdBy,
          name: info.name,
          nip: info.nip,
          avatarUrl: info.avatarUrl,
        },
        hasOpenRequests: openReqs > 0,
        openRequestsCount: openReqs,
        incomingMs: Date.now() - meeting._creationTime,
        // Transparence IVR : si l'appel a été redirigé, le signaler à l'agent
        wasRedirected: meeting.fallbackApplied === true,
        originalLineLabel: meeting.originalCallLineId
          ? (originalLines.get(meeting.originalCallLineId as string) ?? null)
          : null,
      };
    });
  },
});

/**
 * Liste les slots actifs (callStatus: "connected" ou "on_hold") de l'agent courant.
 * Alimente l'ActiveCallsBar.
 */
export const listActiveCallsForUser = authQuery({
  args: {},
  handler: async (ctx) => {
    // Memberships → orgs accessibles
    const userMemberships = (await ctx.db
      .query("memberships")
      .collect())
      .filter((m) => m.userId === ctx.user._id && !m.deletedAt);

    const orgIds = new Set<string>(
      userMemberships.map((m) => m.orgId as string),
    );

    const candidates: Doc<"meetings">[] = [];

    // Parcours par org → callStatus "connected" puis "on_hold"
    for (const orgId of orgIds) {
      for (const status of ["connected", "on_hold"] as const) {
        const rows = await ctx.db
          .query("meetings")
          .withIndex("by_callStatus_and_org", (q) =>
            q.eq("callStatus", status).eq("orgId", orgId as Id<"orgs">),
          )
          .collect();
        for (const r of rows) {
          if (r.type !== "call") continue;
          // Filtrer : l'agent est participant actif, ou il a décroché
          const isAnswerer = r.answeredBy === ctx.user._id;
          const isParticipant = r.participants.some(
            (p) => p.userId === ctx.user._id && !p.leftAt,
          );
          if (!isAnswerer && !isParticipant) continue;
          candidates.push(r);
        }
      }
    }

    // Enrichir avec identité appelant
    const callerIds = new Set<string>(
      candidates.map((m) => m.createdBy as string),
    );
    const callerNames = new Map<string, string>();
    for (const uid of callerIds) {
      const u = await ctx.db.get(uid as Id<"users">);
      if (!u) {
        callerNames.set(uid, "Usager");
        continue;
      }
      callerNames.set(
        uid,
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
          u.email ||
          "Usager",
      );
    }

    // Lignes
    const lineIds = new Set<string>(
      candidates
        .map((m) => m.callLineId as string | undefined)
        .filter(Boolean) as string[],
    );
    const lines = new Map<string, Doc<"callLines">>();
    for (const lid of lineIds) {
      const l = await ctx.db.get(lid as Id<"callLines">);
      if (l) lines.set(lid, l);
    }

    return candidates
      .sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0))
      .map((m) => {
        const line = m.callLineId ? lines.get(m.callLineId as string) : null;
        return {
          _id: m._id,
          callStatus: m.callStatus ?? "connected",
          answeredAt: m.answeredAt ?? null,
          parkedAt: m.parkedAt ?? null,
          mediaType: m.mediaType ?? "audio",
          orgId: m.orgId ?? null,
          callerName: callerNames.get(m.createdBy as string) ?? "Usager",
          callerUserId: m.createdBy,
          lineLabel: line?.label ?? null,
          lineColor: line?.color ?? null,
          priority: derivePriority(m, line ?? null),
        };
      });
  },
});

/**
 * Mutation pickupCall — l'agent décroche un appel de la file.
 *
 * Précondition serveur : `callStatus === "ringing"` (first-click-wins).
 * Le 2e agent qui clique en même temps reçoit INVALID_ARGUMENT.
 *
 * Sprint 1 : si l'agent a déjà un appel actif, on le termine avant de décrocher le nouveau.
 * Sprint 2 : remplacer par un park/resume via `putCallOnHold`.
 *
 * Retourne `{ meetingId, roomName }` — le token LiveKit est obtenu séparément
 * via `api.actions.livekit.requestToken`.
 */
export const pickupCall = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel introuvable");

    if (meeting.type !== "call" || meeting.isOrgInbound !== true) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Cette opération ne s'applique qu'aux appels entrants",
      );
    }

    // Précondition first-click-wins
    if (meeting.callStatus !== "ringing") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        meeting.callStatus === "connected"
          ? "Cet appel est déjà pris par un autre agent"
          : "Cet appel n'est plus disponible",
      );
    }

    if (!meeting.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Appel sans organisation");
    }

    // Vérifier permission et appartenance à la ligne
    const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
    if (!membership) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'appartenez pas à cette organisation",
      );
    }
    const canJoin = await canDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.meetings.join,
    );
    if (!canJoin) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas la permission de répondre aux appels",
      );
    }
    if (meeting.callLineId) {
      const line = await ctx.db.get(meeting.callLineId);
      if (!line || !line.isActive) {
        throw error(ErrorCode.INVALID_ARGUMENT, "Ligne d'appel invalide");
      }
      if (line.membershipIds.length > 0) {
        const isOnLine = line.membershipIds.some(
          (mId) => (mId as string) === (membership._id as string),
        );
        if (!isOnLine) {
          throw error(
            ErrorCode.INSUFFICIENT_PERMISSIONS,
            "Vous n'êtes pas assigné à cette ligne",
          );
        }
      }
    }

    // Sprint 2 : parquer l'appel actif courant (au lieu de le terminer).
    // L'agent peut ensuite reprendre l'appel parqué via `resumeCall`.
    const now = Date.now();
    const presence = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", meeting.orgId as Id<"orgs">),
      )
      .first();

    const previousActiveId =
      presence?.activeCallId ?? presence?.currentCallId ?? null;
    if (previousActiveId && previousActiveId !== args.meetingId) {
      const prev = await ctx.db.get(previousActiveId);
      if (prev && prev.type === "call" && prev.callStatus === "connected") {
        await ctx.db.patch(prev._id, {
          callStatus: "on_hold",
          parkedAt: now,
        });
      }
    }

    // Mettre à jour le meeting : connected + answeredBy + ajouter participant
    const participants = [...meeting.participants];
    const existingIndex = participants.findIndex(
      (p) => p.userId === ctx.user._id,
    );
    if (existingIndex >= 0) {
      participants[existingIndex] = {
        ...participants[existingIndex],
        joinedAt: now,
        leftAt: undefined,
      };
    } else {
      participants.push({
        userId: ctx.user._id,
        role: "participant",
        joinedAt: now,
      });
    }

    await ctx.db.patch(args.meetingId, {
      callStatus: "connected",
      status: "active",
      answeredBy: ctx.user._id,
      answeredAt: now,
      participants,
    });

    // Mettre à jour la présence (currentCallIds[] + activeCallId)
    if (presence) {
      const nextIds = new Set<string>(
        (presence.currentCallIds ?? []).map((id) => id as string),
      );
      if (previousActiveId && previousActiveId !== args.meetingId) {
        nextIds.delete(previousActiveId as string);
      }
      nextIds.add(args.meetingId as string);
      await ctx.db.patch(presence._id, {
        status: "busy",
        currentCallId: args.meetingId,
        currentCallIds: [...nextIds] as unknown as Id<"meetings">[],
        activeCallId: args.meetingId,
        lastActivity: now,
      });
    } else {
      await ctx.db.insert("agentPresence", {
        userId: ctx.user._id,
        orgId: meeting.orgId,
        status: "busy",
        lastHeartbeat: now,
        lastActivity: now,
        currentCallId: args.meetingId,
        currentCallIds: [args.meetingId],
        activeCallId: args.meetingId,
      });
    }

    return { meetingId: args.meetingId, roomName: meeting.roomName };
  },
});

/**
 * Mutation putCallOnHold — parque un appel (audio coupé côté agent).
 *
 * Côté serveur : transitionne `callStatus` connected → on_hold et date le parkedAt.
 * Si c'était le slot actif de l'agent, `activeCallId` est effacé de la présence.
 *
 * Côté client : le hook correspondant coupe le mic et désabonne l'audio de la room.
 */
export const putCallOnHold = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel introuvable");

    if (meeting.type !== "call") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Cette opération ne s'applique qu'aux appels",
      );
    }
    if (meeting.callStatus !== "connected") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Seul un appel connecté peut être mis en attente",
      );
    }

    // Vérifier que l'agent est bien participant de l'appel
    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id && p.joinedAt && !p.leftAt,
    );
    if (!isParticipant) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'êtes pas dans cet appel",
      );
    }

    // Permission spécifique : meetings.hold (fallback meetings.join pour rétrocompat)
    if (!meeting.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Appel sans organisation");
    }
    const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
    if (!membership) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    const canHold =
      (await canDoTask(ctx, ctx.user, membership, TaskCode.meetings.hold)) ||
      (await canDoTask(ctx, ctx.user, membership, TaskCode.meetings.join));
    if (!canHold) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas la permission de mettre en attente",
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.meetingId, {
      callStatus: "on_hold",
      parkedAt: now,
    });

    // Si c'était le slot actif, on vide activeCallId (l'agent n'a plus de slot audio live)
    const presence = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", meeting.orgId as Id<"orgs">),
      )
      .first();
    if (presence && presence.activeCallId === args.meetingId) {
      await ctx.db.patch(presence._id, {
        activeCallId: undefined,
        // L'agent reste busy s'il conserve au moins un currentCallId ; sinon online.
        status:
          (presence.currentCallIds ?? []).length > 0 ? "busy" : "online",
        lastActivity: now,
      });
    }
  },
});

/**
 * Mutation resumeCall — reprend un appel en attente.
 * Parque automatiquement l'actif courant (si différent) pour respecter l'invariant
 * "au plus 1 slot audio-live".
 */
export const resumeCall = authMutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel introuvable");

    if (meeting.type !== "call" || meeting.callStatus !== "on_hold") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Cet appel n'est pas en attente",
      );
    }
    if (!meeting.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Appel sans organisation");
    }

    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id,
    );
    if (!isParticipant) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'êtes pas dans cet appel",
      );
    }

    const membership = await getMembership(ctx, ctx.user._id, meeting.orgId);
    if (!membership) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    const canHold =
      (await canDoTask(ctx, ctx.user, membership, TaskCode.meetings.hold)) ||
      (await canDoTask(ctx, ctx.user, membership, TaskCode.meetings.join));
    if (!canHold) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();
    const presence = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", meeting.orgId as Id<"orgs">),
      )
      .first();

    const previousActiveId = presence?.activeCallId ?? null;
    if (previousActiveId && previousActiveId !== args.meetingId) {
      const prev = await ctx.db.get(previousActiveId);
      if (prev && prev.type === "call" && prev.callStatus === "connected") {
        await ctx.db.patch(prev._id, {
          callStatus: "on_hold",
          parkedAt: now,
        });
      }
    }

    // Reprendre l'appel : on_hold → connected
    await ctx.db.patch(args.meetingId, {
      callStatus: "connected",
      parkedAt: undefined,
    });

    if (presence) {
      await ctx.db.patch(presence._id, {
        activeCallId: args.meetingId,
        status: "busy",
        lastActivity: now,
      });
    }
  },
});

/**
 * Mutation endCallSlot — termine un slot et, s'il était actif,
 * reprend automatiquement le slot le plus récemment parqué.
 *
 * Retourne `{ resumedMeetingId? }` pour que le client puisse demander un nouveau token
 * LiveKit et rafraîchir l'audio actif.
 */
export const endCallSlot = authMutation({
  args: {
    meetingId: v.id("meetings"),
    reason: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("timeout"),
        v.literal("declined"),
        v.literal("error"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel introuvable");

    if (meeting.type !== "call") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Cette opération ne s'applique qu'aux appels",
      );
    }

    const now = Date.now();
    const wasActiveForUser =
      meeting.callStatus === "connected" &&
      meeting.participants.some(
        (p) => p.userId === ctx.user._id && p.joinedAt && !p.leftAt,
      );

    // Marquer le participant comme "left"
    const participants = meeting.participants.map((p) =>
      p.userId === ctx.user._id && !p.leftAt ? { ...p, leftAt: now } : p,
    );
    const stillActive = participants.filter((p) => !p.leftAt).length;

    const patch: any = {
      participants,
    };

    // Pour un appel 1:1, le départ d'un agent termine l'appel.
    // Pour les calls multi-party (future), on attendra 0 participants.
    if (stillActive <= 1 || meeting.type === "call") {
      patch.status = "ended";
      patch.endedAt = now;
      patch.callStatus = "ended";
      patch.endReason = args.reason ?? "normal";
    }

    await ctx.db.patch(args.meetingId, patch);

    // Mettre à jour la présence et auto-reprendre le held le plus récent
    let resumedMeetingId: Id<"meetings"> | null = null;
    if (meeting.orgId) {
      const presence = await ctx.db
        .query("agentPresence")
        .withIndex("by_user_and_org", (q) =>
          q
            .eq("userId", ctx.user._id)
            .eq("orgId", meeting.orgId as Id<"orgs">),
        )
        .first();

      if (presence) {
        const nextIds = (presence.currentCallIds ?? []).filter(
          (id) => (id as string) !== (args.meetingId as string),
        );
        let nextActive: Id<"meetings"> | undefined = undefined;

        if (wasActiveForUser) {
          // Chercher le plus récent on_hold parmi les slots restants
          const heldMeetings = await Promise.all(
            nextIds.map((id) => ctx.db.get(id)),
          );
          const heldSorted = heldMeetings
            .filter(
              (m): m is NonNullable<typeof m> =>
                !!m && m.type === "call" && m.callStatus === "on_hold",
            )
            .sort((a, b) => (b.parkedAt ?? 0) - (a.parkedAt ?? 0));
          const mostRecent = heldSorted[0];
          if (mostRecent) {
            await ctx.db.patch(mostRecent._id, {
              callStatus: "connected",
              parkedAt: undefined,
            });
            nextActive = mostRecent._id;
            resumedMeetingId = mostRecent._id;
          }
        } else if (presence.activeCallId === args.meetingId) {
          // Le slot ne semblait pas actif mais présence dit le contraire → clean
          nextActive = undefined;
        } else {
          nextActive = presence.activeCallId;
        }

        await ctx.db.patch(presence._id, {
          currentCallIds:
            nextIds as unknown as Id<"meetings">[] | undefined,
          currentCallId: nextActive,
          activeCallId: nextActive,
          status: nextActive ? "busy" : nextIds.length > 0 ? "busy" : "online",
          lastActivity: now,
        });
      }
    }

    return { resumedMeetingId };
  },
});

/**
 * Mutation transferCall — transfère un appel actif à un autre agent
 * ou à une autre ligne (Sprint 2 : version simple, ajoute le target comme participant).
 *
 * Règles :
 * - L'agent courant doit être participant actif.
 * - Le target doit avoir la permission `meetings.join` sur l'org.
 * - Si `targetLineId` : réassigne callLineId (les agents de la nouvelle ligne verront l'appel).
 */
export const transferCall = authMutation({
  args: {
    meetingId: v.id("meetings"),
    targetUserId: v.optional(v.id("users")),
    targetLineId: v.optional(v.id("callLines")),
  },
  handler: async (ctx, args) => {
    if (!args.targetUserId && !args.targetLineId) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Préciser un agent ou une ligne cible",
      );
    }

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw error(ErrorCode.NOT_FOUND, "Appel introuvable");

    if (meeting.type !== "call" || meeting.callStatus !== "connected") {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Seul un appel connecté peut être transféré",
      );
    }

    const isParticipant = meeting.participants.some(
      (p) => p.userId === ctx.user._id && p.joinedAt && !p.leftAt,
    );
    if (!isParticipant) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'êtes pas dans cet appel",
      );
    }

    if (!meeting.orgId) {
      throw error(ErrorCode.INVALID_ARGUMENT, "Appel sans organisation");
    }

    const myMembership = await getMembership(
      ctx,
      ctx.user._id,
      meeting.orgId,
    );
    if (!myMembership) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    const canTransfer = await canDoTask(
      ctx,
      ctx.user,
      myMembership,
      TaskCode.meetings.transfer,
    );
    if (!canTransfer) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();
    const patch: any = {};

    // Transfert vers un agent spécifique : on l'ajoute comme participant
    // et on parque l'appel en attendant qu'il décroche.
    if (args.targetUserId) {
      const target = await ctx.db.get(args.targetUserId);
      if (!target)
        throw error(ErrorCode.NOT_FOUND, "Agent cible introuvable");
      const targetMembership = await getMembership(
        ctx,
        args.targetUserId,
        meeting.orgId,
      );
      if (!targetMembership) {
        throw error(
          ErrorCode.INVALID_ARGUMENT,
          "Agent cible non membre de l'organisation",
        );
      }
      const canJoin = await canDoTask(
        ctx,
        target,
        targetMembership,
        TaskCode.meetings.join,
      );
      if (!canJoin) {
        throw error(
          ErrorCode.INVALID_ARGUMENT,
          "Agent cible sans permission d'appel",
        );
      }

      const alreadyIn = meeting.participants.some(
        (p) => p.userId === args.targetUserId && !p.leftAt,
      );
      if (!alreadyIn) {
        patch.participants = [
          ...meeting.participants,
          {
            userId: args.targetUserId,
            role: "participant" as const,
          },
        ];
      }
      // Le transfert met l'appel en ringing vers le nouvel agent
      patch.callStatus = "ringing";
      patch.answeredBy = undefined;
      patch.answeredAt = undefined;
    }

    // Transfert vers une ligne : on rebranche callLineId, repasse en ringing
    if (args.targetLineId) {
      const line = await ctx.db.get(args.targetLineId);
      if (!line || line.orgId !== meeting.orgId || !line.isActive) {
        throw error(ErrorCode.INVALID_ARGUMENT, "Ligne cible invalide");
      }
      patch.callLineId = args.targetLineId;
      patch.callStatus = "ringing";
      patch.answeredBy = undefined;
      patch.answeredAt = undefined;
    }

    await ctx.db.patch(args.meetingId, patch);

    // L'agent courant se retire de la présence active
    const presence = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", meeting.orgId as Id<"orgs">),
      )
      .first();
    if (presence) {
      const nextIds = (presence.currentCallIds ?? []).filter(
        (id) => (id as string) !== (args.meetingId as string),
      );
      await ctx.db.patch(presence._id, {
        currentCallIds:
          nextIds as unknown as Id<"meetings">[] | undefined,
        activeCallId:
          presence.activeCallId === args.meetingId
            ? undefined
            : presence.activeCallId,
        currentCallId:
          presence.currentCallId === args.meetingId
            ? undefined
            : presence.currentCallId,
        status: nextIds.length > 0 ? "busy" : "online",
        lastActivity: now,
      });
    }
  },
});


/**
 * Cron interne — ferme les appels parqués depuis trop longtemps.
 *
 * Un appel qui reste en `on_hold` > 30 min indique que l'agent a oublié
 * ou s'est déconnecté. Politique : fermer, basculer en missed et créer
 * une entrée `missedCalls` en `pending` pour activer le rappel.
 */
const PARKED_TIMEOUT_MS = 30 * 60 * 1000;

export const cleanupParkedCalls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const parkedRows = await ctx.db
      .query("meetings")
      .withIndex("by_callStatus_and_org", (q) => q.eq("callStatus", "on_hold"))
      .take(100);

    for (const m of parkedRows) {
      if (!m.parkedAt) continue;
      if (now - m.parkedAt < PARKED_TIMEOUT_MS) continue;

      // Terminer l'appel
      await ctx.db.patch(m._id, {
        callStatus: "ended",
        status: "ended",
        endReason: "timeout",
        endedAt: now,
      });

      // Créer l'entrée missedCalls pour le workflow de rappel
      if (!m.orgId) continue;
      const callerUser = await ctx.db.get(m.createdBy);
      const displayName = callerUser
        ? [callerUser.firstName, callerUser.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          callerUser.email ||
          "Usager"
        : "Usager";

      await ctx.db.insert("missedCalls", {
        orgId: m.orgId,
        callLineId: m.callLineId,
        meetingId: m._id,
        caller: {
          userId: m.createdBy,
          displayName,
          email: callerUser?.email,
        },
        startedAt: m._creationTime,
        endedAt: now,
        durationSeconds: Math.floor((now - m._creationTime) / 1000),
        reason: "timeout",
        callbackStatus: "pending",
      });
    }
  },
});

// ══════════════════════════════════════════════════════════════════════
// MISSED CALLS — vue agent + rappel (Sprint 3)
// ══════════════════════════════════════════════════════════════════════

/**
 * Liste les appels manqués visibles par l'agent courant (toutes orgs confondues).
 * Filtre par défaut : statuts `pending` + `assigned` (à traiter), triés du plus récent.
 *
 * Retourne des rows enrichies prêtes à afficher dans la file : callerName,
 * lineLabel/lineColor, assignedToMe, incomingMs équivalent (endedAt delta).
 */
export const listMissedCallsForAgent = authQuery({
  args: {
    limit: v.optional(v.number()),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userMemberships = (await ctx.db
      .query("memberships")
      .collect())
      .filter((m) => m.userId === ctx.user._id && !m.deletedAt);

    if (userMemberships.length === 0) return [];

    const orgIdsWithPermission = new Set<string>();
    const myMembershipByOrg = new Map<string, Doc<"memberships">>();
    for (const membership of userMemberships) {
      const canJoin = await canDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.meetings.join,
      );
      if (canJoin) {
        orgIdsWithPermission.add(membership.orgId);
        myMembershipByOrg.set(membership.orgId as string, membership);
      }
    }
    if (orgIdsWithPermission.size === 0) return [];

    const limit = args.limit ?? 30;
    const statuses: Array<
      "pending" | "assigned" | "in_progress" | "completed" | "ignored"
    > = args.includeCompleted
      ? ["pending", "assigned", "in_progress", "completed"]
      : ["pending", "assigned", "in_progress"];

    const collected: Doc<"missedCalls">[] = [];
    for (const orgId of orgIdsWithPermission) {
      for (const status of statuses) {
        const rows = await ctx.db
          .query("missedCalls")
          .withIndex("by_org_status", (q) =>
            q.eq("orgId", orgId as Id<"orgs">).eq("callbackStatus", status),
          )
          .order("desc")
          .take(limit);
        collected.push(...rows);
      }
    }

    // Déduplique et tri global par date de fin décroissante
    const unique = new Map<string, Doc<"missedCalls">>();
    for (const m of collected) unique.set(m._id as string, m);
    const sorted = Array.from(unique.values())
      .sort((a, b) => b.endedAt - a.endedAt)
      .slice(0, limit);

    // Enrichissement
    const lineIds = new Set<string>(
      sorted
        .map((m) => m.callLineId as string | undefined)
        .filter(Boolean) as string[],
    );
    const lines = new Map<string, Doc<"callLines">>();
    for (const lid of lineIds) {
      const l = await ctx.db.get(lid as Id<"callLines">);
      if (l) lines.set(lid, l);
    }

    return sorted.map((mc) => {
      const line = mc.callLineId ? lines.get(mc.callLineId as string) : null;
      const membership = myMembershipByOrg.get(mc.orgId as string);
      const assignedToMe =
        !!mc.callbackAssignedTo &&
        !!membership &&
        (mc.callbackAssignedTo as string) === (membership._id as string);
      return {
        _id: mc._id,
        orgId: mc.orgId,
        callLineId: mc.callLineId ?? null,
        lineLabel: line?.label ?? null,
        lineColor: line?.color ?? null,
        meetingId: mc.meetingId,
        reason: mc.reason,
        callbackStatus: mc.callbackStatus,
        startedAt: mc.startedAt,
        endedAt: mc.endedAt,
        durationSeconds: mc.durationSeconds ?? null,
        assignedToMe,
        caller: {
          userId: mc.caller.userId ?? null,
          displayName: mc.caller.displayName ?? "Usager",
          email: mc.caller.email ?? null,
          phoneNumber: mc.caller.phoneNumber ?? null,
        },
      };
    });
  },
});

/**
 * Liste les appels récents (terminés) sur toutes les orgs où l'agent peut décrocher.
 *
 * Sert à la section "Récents" de l'iAppel — vue rapide des appels traités + abandonnés
 * + manqués pour que l'agent ait un retour immédiat sur son activité.
 */
export const listRecentCallsForAgent = authQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userMemberships = (await ctx.db
      .query("memberships")
      .collect())
      .filter((m) => m.userId === ctx.user._id && !m.deletedAt);

    if (userMemberships.length === 0) return [];

    const orgIdsWithPermission = new Set<string>();
    for (const membership of userMemberships) {
      const canJoin = await canDoTask(
        ctx,
        ctx.user,
        membership,
        TaskCode.meetings.join,
      );
      if (canJoin) orgIdsWithPermission.add(membership.orgId);
    }
    if (orgIdsWithPermission.size === 0) return [];

    const limit = args.limit ?? 15;

    const collected: Doc<"meetings">[] = [];
    for (const orgId of orgIdsWithPermission) {
      const rows = await ctx.db
        .query("meetings")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", orgId as Id<"orgs">).eq("status", "ended"),
        )
        .order("desc")
        .take(limit);
      for (const row of rows) {
        if (row.type !== "call") continue;
        collected.push(row);
      }
    }

    const sorted = collected
      .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
      .slice(0, limit);

    // Enrichissement : ligne + appelant
    const lineIds = new Set<string>(
      sorted.map((m) => m.callLineId as string | undefined).filter(Boolean) as string[],
    );
    const lines = new Map<string, Doc<"callLines">>();
    for (const lid of lineIds) {
      const l = await ctx.db.get(lid as Id<"callLines">);
      if (l) lines.set(lid, l);
    }

    const callerIds = new Set<string>(sorted.map((m) => m.createdBy as string));
    const callers = new Map<string, Doc<"users">>();
    for (const uid of callerIds) {
      const u = await ctx.db.get(uid as Id<"users">);
      if (u) callers.set(uid, u);
    }

    return sorted.map((m) => {
      const line = m.callLineId ? lines.get(m.callLineId as string) : null;
      const caller = callers.get(m.createdBy as string);
      const displayName = caller
        ? [caller.firstName, caller.lastName].filter(Boolean).join(" ").trim() ||
          caller.email ||
          "Usager"
        : "Usager";
      const startedAt = m.startedAt ?? m._creationTime;
      const endedAt = m.endedAt ?? startedAt;
      const wasAnswered = !!m.answeredAt;
      return {
        _id: m._id,
        orgId: m.orgId,
        callLineId: m.callLineId ?? null,
        lineLabel: line?.label ?? null,
        lineColor: line?.color ?? null,
        title: m.title,
        isInbound: m.isOrgInbound === true,
        callStatus: m.callStatus ?? null,
        endReason: m.endReason ?? null,
        wasAnswered,
        startedAt,
        endedAt,
        durationSeconds: wasAnswered
          ? Math.floor((endedAt - (m.answeredAt ?? startedAt)) / 1000)
          : 0,
        caller: {
          userId: m.createdBy,
          displayName,
          email: caller?.email ?? null,
        },
      };
    });
  },
});

/**
 * Mutation callBackMissedCall — l'agent rappelle un citoyen qui a manqué son appel.
 *
 * - Charge le missedCall, vérifie la permission `meetings.create` sur l'org
 * - Crée un meeting outbound (similar callUser)
 * - Marque le missedCall en `completed` avec référence vers le nouveau meeting
 * - Retourne `{ meetingId, roomName }` — le client demande ensuite le token LiveKit
 */
export const callBackMissedCall = authMutation({
  args: { missedCallId: v.id("missedCalls") },
  handler: async (ctx, args) => {
    const mc = await ctx.db.get(args.missedCallId);
    if (!mc) throw error(ErrorCode.NOT_FOUND, "Rappel introuvable");
    if (mc.callbackStatus === "completed") {
      throw error(ErrorCode.INVALID_ARGUMENT, "Ce rappel est déjà traité");
    }
    if (!mc.caller.userId) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Impossible de rappeler : identité de l'appelant inconnue",
      );
    }

    const membership = await getMembership(ctx, ctx.user._id, mc.orgId);
    if (!membership) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    const canCreate = await canDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.meetings.create,
    );
    if (!canCreate) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas la permission d'émettre un appel",
      );
    }

    const org = await ctx.db.get(mc.orgId);
    if (!org)
      throw error(ErrorCode.NOT_FOUND, "Organisation introuvable");
    const targetUser = await ctx.db.get(mc.caller.userId);
    if (!targetUser)
      throw error(ErrorCode.NOT_FOUND, "Citoyen cible introuvable");

    const now = Date.now();
    const roomName = `mtg-cb-${(org as any).slug ?? "call"}-${now.toString(
      36,
    )}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}`;

    const meetingId = await ctx.db.insert("meetings", {
      title: `Rappel — ${mc.caller.displayName ?? "Usager"}`,
      type: "call",
      status: "active",
      roomName,
      orgId: mc.orgId,
      createdBy: ctx.user._id,
      callLineId: mc.callLineId ?? undefined,
      // "video" → token non restreint → la caméra peut être togglée côté agent
      mediaType: "video",
      participants: [
        {
          userId: ctx.user._id,
          role: "host" as const,
          joinedAt: now,
        },
        {
          userId: mc.caller.userId,
          role: "participant" as const,
        },
      ],
      maxParticipants: 2,
      startedAt: now,
    });

    // Marquer le missedCall complété
    await ctx.db.patch(args.missedCallId, {
      callbackStatus: "completed",
      callbackCompletedAt: now,
      callbackByMembershipId: membership._id,
      callbackMeetingId: meetingId,
    });

    return { meetingId, roomName };
  },
});

// ══════════════════════════════════════════════════════════════════════
// SUPERVISION — KPIs temps réel (Sprint 3)
// ══════════════════════════════════════════════════════════════════════

/**
 * KPIs live pour un org — destiné au SupervisionPanel.
 *
 * Requiert `meetings.supervise`. Calcule :
 *  - queueDepth : nombre d'appels `ringing` par ligne
 *  - avgWaitSeconds : moyenne des temps d'attente (ringing → connected) sur la journée
 *  - slaBreachPct : % d'appels ayant dépassé le slaResponseSeconds de leur ligne
 *  - agentsOnline / agentsBusy : via agentPresence
 *  - callsToday / missedToday : volumes depuis 00:00 local UTC
 */
export const getSupervisionMetrics = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    if (!membership) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    const canSupervise = await canDoTask(
      ctx,
      ctx.user,
      membership,
      TaskCode.meetings.supervise,
    );
    if (!canSupervise) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Accès superviseur requis",
      );
    }

    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    // Lignes actives de l'org
    const lines = await ctx.db
      .query("callLines")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true),
      )
      .collect();
    const linesById = new Map<string, Doc<"callLines">>();
    for (const l of lines) linesById.set(l._id as string, l);

    // Appels du jour (orgId + status active/ended)
    const activeCalls = await ctx.db
      .query("meetings")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "active"),
      )
      .collect();
    const endedCalls = await ctx.db
      .query("meetings")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "ended"),
      )
      .order("desc")
      .take(300);

    const callsToday = [
      ...activeCalls.filter(
        (m) => m.type === "call" && m._creationTime >= startOfDayMs,
      ),
      ...endedCalls.filter(
        (m) => m.type === "call" && m._creationTime >= startOfDayMs,
      ),
    ];
    const missedToday = callsToday.filter((m) => m.callStatus === "missed");

    // Queue depth par ligne (appels ringing)
    const queueByLine = new Map<string, number>();
    const queueUrgentByLine = new Map<string, number>();
    for (const m of activeCalls) {
      if (m.type !== "call") continue;
      if (m.callStatus !== "ringing") continue;
      const key = (m.callLineId as string | undefined) ?? "__unassigned__";
      queueByLine.set(key, (queueByLine.get(key) ?? 0) + 1);
      const line = m.callLineId ? linesById.get(m.callLineId as string) : null;
      const isUrgent =
        (m.priority === "urgent") ||
        (line && line.priority <= 1);
      if (isUrgent) {
        queueUrgentByLine.set(
          key,
          (queueUrgentByLine.get(key) ?? 0) + 1,
        );
      }
    }

    // Temps d'attente (answeredAt - _creationTime) pour les appels connectés aujourd'hui
    const waitMsSamples: { lineKey: string; waitMs: number; overSLA: boolean }[] = [];
    for (const m of callsToday) {
      if (m.callStatus !== "connected" && m.callStatus !== "ended") continue;
      if (!m.answeredAt) continue;
      const waitMs = m.answeredAt - m._creationTime;
      if (waitMs < 0 || waitMs > 10 * 60 * 1000) continue; // filtre outliers
      const key = (m.callLineId as string | undefined) ?? "__unassigned__";
      const line = m.callLineId ? linesById.get(m.callLineId as string) : null;
      const slaMs = line?.slaResponseSeconds
        ? line.slaResponseSeconds * 1000
        : 30 * 1000;
      waitMsSamples.push({
        lineKey: key,
        waitMs,
        overSLA: waitMs > slaMs,
      });
    }

    const perLineKpi = new Map<
      string,
      {
        queueDepth: number;
        queueUrgent: number;
        avgWaitSeconds: number;
        slaBreachPct: number;
        samples: number;
      }
    >();
    for (const [key, depth] of queueByLine) {
      perLineKpi.set(key, {
        queueDepth: depth,
        queueUrgent: queueUrgentByLine.get(key) ?? 0,
        avgWaitSeconds: 0,
        slaBreachPct: 0,
        samples: 0,
      });
    }
    for (const s of waitMsSamples) {
      const existing = perLineKpi.get(s.lineKey) ?? {
        queueDepth: 0,
        queueUrgent: 0,
        avgWaitSeconds: 0,
        slaBreachPct: 0,
        samples: 0,
      };
      existing.samples += 1;
      existing.avgWaitSeconds =
        (existing.avgWaitSeconds * (existing.samples - 1) +
          s.waitMs / 1000) /
        existing.samples;
      existing.slaBreachPct =
        (existing.slaBreachPct * (existing.samples - 1) +
          (s.overSLA ? 100 : 0)) /
        existing.samples;
      perLineKpi.set(s.lineKey, existing);
    }

    // Presence agents
    const presences = await ctx.db
      .query("agentPresence")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const HEARTBEAT_TIMEOUT_MS = 90 * 1000;
    const recentPresences = presences.filter(
      (p) => now - p.lastHeartbeat < HEARTBEAT_TIMEOUT_MS,
    );
    const agentsOnline = recentPresences.filter(
      (p) => p.status === "online" || p.status === "busy" || p.status === "away",
    ).length;
    const agentsBusy = recentPresences.filter((p) => p.status === "busy").length;

    // Résultat
    const perLine = Array.from(perLineKpi.entries()).map(([key, kpi]) => {
      const line = key !== "__unassigned__" ? linesById.get(key) : null;
      return {
        lineId: (line?._id as string) ?? null,
        label: line?.label ?? "—",
        color: line?.color ?? null,
        priority: line?.priority ?? 99,
        slaResponseSeconds: line?.slaResponseSeconds ?? null,
        queueDepth: kpi.queueDepth,
        queueUrgent: kpi.queueUrgent,
        avgWaitSeconds: Math.round(kpi.avgWaitSeconds * 10) / 10,
        slaBreachPct: Math.round(kpi.slaBreachPct),
        samples: kpi.samples,
      };
    });

    // Tri : par priorité ligne, puis queueDepth desc
    perLine.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.queueDepth - a.queueDepth;
    });

    const totalQueueDepth = perLine.reduce((acc, l) => acc + l.queueDepth, 0);
    const totalSamples = Array.from(perLineKpi.values()).reduce(
      (acc, k) => acc + k.samples,
      0,
    );
    const globalAvgWait =
      totalSamples === 0
        ? 0
        : Array.from(perLineKpi.values()).reduce(
            (acc, k) => acc + k.avgWaitSeconds * k.samples,
            0,
          ) / totalSamples;
    const globalSlaBreachPct =
      totalSamples === 0
        ? 0
        : Array.from(perLineKpi.values()).reduce(
            (acc, k) => acc + k.slaBreachPct * k.samples,
            0,
          ) / totalSamples;

    return {
      now,
      global: {
        queueDepth: totalQueueDepth,
        avgWaitSeconds: Math.round(globalAvgWait * 10) / 10,
        slaBreachPct: Math.round(globalSlaBreachPct),
        agentsOnline,
        agentsBusy,
        callsToday: callsToday.length,
        missedToday: missedToday.length,
      },
      perLine,
    };
  },
});

// ══════════════════════════════════════════════════════════════════════
// IVR FALLBACK (Sprint 4) — redirection automatique vers ligne de secours
// ══════════════════════════════════════════════════════════════════════

/**
 * Cron interne — applique le fallback IVR sur les appels qui stagnent.
 *
 * Pour chaque appel `ringing` dont l'âge dépasse `slaResponseSeconds` de sa ligne :
 *  - Si `fallbackApplied` déjà true → on ignore (évite les boucles)
 *  - Si la ligne a `fallbackCallLineId` + `fallbackAction = "other_line"` :
 *    → on rebranche callLineId vers la ligne de secours, marque fallbackApplied=true
 *    → les agents de la nouvelle ligne voient l'appel au prochain poll
 *  - Si `fallbackAction = "notification_only"` :
 *    → on crée directement une missedCalls `pending` (sans attendre le timeout)
 *      tout en laissant l'appel sonner → double chance de réponse
 *  - `voicemail` : non implémenté (requiert LiveKit egress)
 *
 * Défaut SLA si non configuré : 30s.
 */
const DEFAULT_SLA_SECONDS = 30;

export const processCallFallbacks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ringingRows = await ctx.db
      .query("meetings")
      .withIndex("by_callStatus_and_org", (q) => q.eq("callStatus", "ringing"))
      .take(200);

    for (const m of ringingRows) {
      if (m.type !== "call") continue;
      if (m.fallbackApplied === true) continue;
      if (!m.callLineId) continue;

      const line = await ctx.db.get(m.callLineId);
      if (!line || !line.fallbackAction) continue;

      const slaMs =
        (line.slaResponseSeconds ?? DEFAULT_SLA_SECONDS) * 1000;
      const ageMs = now - m._creationTime;
      if (ageMs < slaMs) continue;

      if (line.fallbackAction === "other_line" && line.fallbackCallLineId) {
        const target = await ctx.db.get(line.fallbackCallLineId);
        if (!target || !target.isActive) continue;
        await ctx.db.patch(m._id, {
          callLineId: line.fallbackCallLineId,
          originalCallLineId: m.originalCallLineId ?? m.callLineId,
          fallbackApplied: true,
        });
        continue;
      }

      if (line.fallbackAction === "notification_only") {
        // Crée un missedCalls pending SANS terminer le meeting
        // (l'appel continue de sonner jusqu'au ring_timeout).
        if (!m.orgId) continue;
        const existing = await ctx.db
          .query("missedCalls")
          .withIndex("by_meeting", (q) => q.eq("meetingId", m._id))
          .first();
        if (existing) continue;

        const callerUser = await ctx.db.get(m.createdBy);
        const displayName = callerUser
          ? [callerUser.firstName, callerUser.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            callerUser.email ||
            "Usager"
          : "Usager";

        await ctx.db.insert("missedCalls", {
          orgId: m.orgId,
          callLineId: m.callLineId,
          meetingId: m._id,
          caller: {
            userId: m.createdBy,
            displayName,
            email: callerUser?.email,
          },
          startedAt: m._creationTime,
          endedAt: now,
          durationSeconds: Math.floor(ageMs / 1000),
          reason: "no_agent",
          callbackStatus: "pending",
        });
        await ctx.db.patch(m._id, { fallbackApplied: true });
        continue;
      }

      // Sprint 6 — voicemail : crée row voicemails pending + déclenche egress.
      // La row sera complétée par le webhook /webhooks/livekit-egress.
      if (line.fallbackAction === "voicemail") {
        await ctx.runMutation(
          internal.functions.voicemails.startVoicemailForMeeting,
          { meetingId: m._id },
        );
        // Clôture de l'appel côté routing — la room LiveKit continue de tourner
        // côté citoyen jusqu'au raccrochage (captured par l'egress).
        await ctx.db.patch(m._id, {
          status: "ended",
          callStatus: "ended",
          endReason: "voicemail_recorded",
          endedAt: now,
          fallbackApplied: true,
        });
        continue;
      }
    }
  },
});

// ══════════════════════════════════════════════════════════════════════
// STATS par ligne — recalcul horaire (Sprint 5)
// ══════════════════════════════════════════════════════════════════════

/**
 * Cron interne — met à jour `callLines.stats` pour chaque ligne active.
 *
 * Pour chaque ligne :
 *  - totalCallsLast30Days : meetings.type="call" du dernier mois avec ce callLineId
 *    ou originalCallLineId (inclut les redirigés dans le total de la ligne d'origine)
 *  - missedCallsLast30Days : missedCalls créés sur cette ligne dans la même fenêtre
 *  - averageResponseSeconds : moyenne (answeredAt - _creationTime) des appels connected
 *  - lastUpdatedAt : maintenant
 *
 * Exécution horaire (pas critique temps réel — le SupervisionPanel lit directement
 * depuis meetings/missedCalls pour la journée en cours).
 */
const STATS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const refreshCallLinesStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const windowStart = now - STATS_WINDOW_MS;

    const lines = await ctx.db.query("callLines").take(500);
    const activeLines = lines.filter((l) => l.isActive);

    for (const line of activeLines) {
      // Tous les meetings de l'org dans la fenêtre
      const orgMeetings = await ctx.db
        .query("meetings")
        .withIndex("by_org", (q) => q.eq("orgId", line.orgId))
        .collect();

      const windowCalls = orgMeetings.filter(
        (m) =>
          m.type === "call" &&
          m._creationTime >= windowStart &&
          (m.callLineId === line._id || m.originalCallLineId === line._id),
      );

      // Temps de réponse moyen (appels answered uniquement)
      const answered = windowCalls.filter((m) => m.answeredAt);
      const avgResponseMs =
        answered.length > 0
          ? answered.reduce(
              (acc, m) => acc + ((m.answeredAt ?? 0) - m._creationTime),
              0,
            ) / answered.length
          : undefined;

      // Missed
      const missed = await ctx.db
        .query("missedCalls")
        .withIndex("by_callLine", (q) => q.eq("callLineId", line._id))
        .collect();
      const missedInWindow = missed.filter(
        (m) => m.startedAt >= windowStart,
      ).length;

      await ctx.db.patch(line._id, {
        stats: {
          totalCallsLast30Days: windowCalls.length,
          missedCallsLast30Days: missedInWindow,
          averageResponseSeconds:
            avgResponseMs !== undefined
              ? Math.round(avgResponseMs / 1000)
              : undefined,
          lastUpdatedAt: now,
        },
      });
    }
  },
});

