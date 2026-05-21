/**
 * Interconnexion souveraine — Backend Convex (Phase 7 administration.ga).
 *
 * Expose les queries et mutations utilisées pour acheminer un message via un
 * canal formel entre deux institutions (Présidence, VP-Gouvernement,
 * Ministères, Parlement, etc.).
 *
 * Modèle :
 *  - `sovereignChannels` : table des canaux symétriques A↔B
 *  - `sovereignChannelEvents` : journal d'évènements (sent, received, opened,
 *    acknowledged, error) servant de piste d'audit immuable.
 *
 * Workflow standard :
 *   1. `sendThroughChannel` → crée un event `sent` (et automatiquement un
 *      `received` côté destinataire pour matérialiser l'arrivée).
 *   2. Plus tard, le destinataire ouvre la pièce → event `opened` (côté UI,
 *      non implémenté en MVP — placeholder pour Phase ultérieure).
 *   3. Si le canal exige `requiresAcknowledgment`, le destinataire confirme
 *      via `acknowledgeChannelMessage` → event `acknowledged`.
 *
 * Sécurité :
 *  - Le caller DOIT appartenir à orgA ou orgB du canal (membership actif).
 *  - La classification du message DOIT être dans `allowedClassifications`.
 *  - SuperAdmin peut lister/inspecter les canaux d'une org arbitraire.
 *
 * Pas d'UI dédiée en Phase 7 ; ces functions sont consommées par
 * iCorrespondance et iBoîte.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership, isSuperadminUser } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";

const classificationValidator = v.union(
  v.literal("public"),
  v.literal("interne"),
  v.literal("confidentiel"),
  v.literal("secret"),
);

type CallerUser = { isSuperadmin: boolean; role?: string };

/**
 * Cherche la membership active du caller sur orgA ou orgB (priorité A).
 * Retourne `null` si le caller n'est sur aucune des deux mais est SuperAdmin.
 * Throw INSUFFICIENT_PERMISSIONS sinon.
 */
async function resolveEndpointMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  user: CallerUser,
  orgAId: Id<"orgs">,
  orgBId: Id<"orgs">,
) {
  const membershipA = await getMembership(ctx, userId, orgAId);
  if (membershipA) return membershipA;
  const membershipB = await getMembership(ctx, userId, orgBId);
  if (membershipB) return membershipB;
  if (isSuperadminUser(user)) return null;
  throw error(
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    "Aucune membership active sur les deux organisations endpoints du canal.",
  );
}

/**
 * Liste les canaux où l'org du caller (ou `orgId` fourni si superadmin) est
 * endpoint A ou B. SuperAdmin peut interroger n'importe quelle org.
 *
 * Sans `orgId`, on tente de résoudre l'unique membership active du caller :
 *  - si une seule membership, on la prend ;
 *  - sinon, on retourne tableau vide (le caller doit préciser).
 */
export const listChannels = authQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
  },
  handler: async (ctx, args) => {
    let targetOrgId: Id<"orgs"> | null = args.orgId ?? null;

    // Si pas d'orgId, on déduit de l'unique membership active du caller.
    if (!targetOrgId) {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_user_org", (q) => q.eq("userId", ctx.user._id))
        .collect();
      const active = memberships.filter((m) => m.deletedAt == null);
      if (active.length === 1) {
        targetOrgId = active[0].orgId;
      } else {
        // Aucune ou plusieurs orgs : on impose l'orgId explicite.
        return [];
      }
    }

    // SuperAdmin peut interroger n'importe quelle org ; les autres doivent
    // avoir une membership active sur la cible.
    if (!isSuperadminUser(ctx.user)) {
      const membership = await getMembership(ctx, ctx.user._id, targetOrgId);
      if (!membership) {
        throw error(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          "Aucune membership active sur cette organisation.",
        );
      }
    }

    // On recherche les canaux où targetOrgId est orgA OU orgB.
    const channelsAsA = await ctx.db
      .query("sovereignChannels")
      .withIndex("by_orgA", (q) => q.eq("orgAId", targetOrgId!))
      .collect();
    const channelsAsB = await ctx.db
      .query("sovereignChannels")
      .withIndex("by_orgB", (q) => q.eq("orgBId", targetOrgId!))
      .collect();

    // Fusion + déduplication (impossible en pratique car A < B, mais garde-fou).
    const map = new Map<Id<"sovereignChannels">, (typeof channelsAsA)[number]>();
    for (const c of [...channelsAsA, ...channelsAsB]) {
      map.set(c._id, c);
    }
    return [...map.values()]
      .filter((c) => c.isActive !== false)
      .sort((a, b) => a.label.localeCompare(b.label));
  },
});

/**
 * Retourne le canal existant entre deux orgs (ordre indifférent). Retourne
 * `null` si aucun canal n'existe entre A et B.
 */
export const getChannelBetween = authQuery({
  args: {
    orgAId: v.id("orgs"),
    orgBId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    if (args.orgAId === args.orgBId) {
      throw error(
        ErrorCode.INVALID_ARGUMENT,
        "Un canal ne peut pas relier une org à elle-même.",
      );
    }

    // Le caller doit être endpoint sur l'un des deux côtés (sauf superadmin).
    await resolveEndpointMembership(
      ctx,
      ctx.user._id,
      ctx.user,
      args.orgAId,
      args.orgBId,
    );

    // Cherche dans les deux sens : (orgA=A, orgB=B) ou (orgA=B, orgB=A).
    // En pratique, le seed insère toujours en ordre lexicographique du slug,
    // mais la query doit tolérer les deux directions.
    const direct = await ctx.db
      .query("sovereignChannels")
      .withIndex("by_orgA", (q) => q.eq("orgAId", args.orgAId))
      .filter((q) => q.eq(q.field("orgBId"), args.orgBId))
      .first();
    if (direct) return direct;

    const reverse = await ctx.db
      .query("sovereignChannels")
      .withIndex("by_orgA", (q) => q.eq("orgAId", args.orgBId))
      .filter((q) => q.eq(q.field("orgBId"), args.orgAId))
      .first();
    return reverse ?? null;
  },
});

/**
 * Envoie un message via un canal :
 *  1. Vérifie l'appartenance du caller à orgA ou orgB,
 *  2. Valide la classification,
 *  3. Crée un event `sent` (côté expéditeur),
 *  4. Crée immédiatement un event `received` (côté destinataire) pour
 *     matérialiser l'arrivée (modélisation synchrone en MVP — un message
 *     "envoyé" est "reçu" dans la foulée par l'org cible).
 *
 * Retourne :
 *  - `sentEventId` : identifiant de l'event "sent" (à acker éventuellement)
 *  - `receivedEventId` : identifiant de l'event "received" miroir
 *  - `requiresAcknowledgment` : flag pratique pour l'UI émettrice
 */
export const sendThroughChannel = authMutation({
  args: {
    channelId: v.id("sovereignChannels"),
    classification: classificationValidator,
    correspondanceId: v.optional(v.string()),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw error(ErrorCode.NOT_FOUND, "Canal introuvable.");
    }
    if (channel.isActive === false) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Canal désactivé — communication impossible.",
      );
    }

    if (!channel.allowedClassifications.includes(args.classification)) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        `Classification "${args.classification}" non autorisée sur ce canal.`,
      );
    }

    // Le caller doit appartenir à l'une des deux orgs endpoints.
    const callerMembership = await resolveEndpointMembership(
      ctx,
      ctx.user._id,
      ctx.user,
      channel.orgAId,
      channel.orgBId,
    );

    // Détermine l'expéditeur et le destinataire :
    // si la membership du caller est sur orgA → from = A, to = B (et inversement).
    let fromOrgId: Id<"orgs">;
    let toOrgId: Id<"orgs">;
    if (callerMembership && callerMembership.orgId === channel.orgAId) {
      fromOrgId = channel.orgAId;
      toOrgId = channel.orgBId;
    } else if (callerMembership && callerMembership.orgId === channel.orgBId) {
      fromOrgId = channel.orgBId;
      toOrgId = channel.orgAId;
    } else {
      // SuperAdmin sans membership : on prend A → B par défaut.
      fromOrgId = channel.orgAId;
      toOrgId = channel.orgBId;
    }

    const now = Date.now();

    const sentEventId = await ctx.db.insert("sovereignChannelEvents", {
      channelId: args.channelId,
      correspondanceId: args.correspondanceId,
      eventType: "sent",
      fromOrgId,
      toOrgId,
      byUserId: ctx.user._id,
      byMembershipId: callerMembership ? callerMembership._id : undefined,
      classification: args.classification,
      timestamp: now,
      detail: args.detail,
    });

    // Event miroir "received" pour matérialiser l'arrivée côté destinataire.
    // En MVP, modélisation synchrone : un message émis est immédiatement reçu
    // au sens du journal d'audit. Une future Phase pourra découpler (queue,
    // retry, latence simulée).
    const receivedEventId = await ctx.db.insert("sovereignChannelEvents", {
      channelId: args.channelId,
      correspondanceId: args.correspondanceId,
      eventType: "received",
      fromOrgId,
      toOrgId,
      byUserId: ctx.user._id,
      byMembershipId: callerMembership ? callerMembership._id : undefined,
      classification: args.classification,
      timestamp: now + 1, // +1 ms pour préserver l'ordre dans le journal
      detail: args.detail,
    });

    return {
      sentEventId,
      receivedEventId,
      requiresAcknowledgment: channel.requiresAcknowledgment,
    };
  },
});

/**
 * Accuse réception d'un message reçu sur un canal :
 *  - L'eventId doit pointer sur un event `received` ou `opened` antérieur.
 *  - Le caller doit appartenir à l'org destinataire de cet event.
 *  - Crée un nouvel event `acknowledged` lié au précédent.
 *
 * Idempotence : si un event `acknowledged` existe déjà pour le même
 * `correspondanceId` (si fourni) sur le même canal par le même caller,
 * retourne l'ID existant sans en créer un nouveau.
 */
export const acknowledgeChannelMessage = authMutation({
  args: {
    eventId: v.id("sovereignChannelEvents"),
  },
  handler: async (ctx, args) => {
    const sourceEvent = await ctx.db.get(args.eventId);
    if (!sourceEvent) {
      throw error(ErrorCode.NOT_FOUND, "Évènement source introuvable.");
    }
    if (
      sourceEvent.eventType !== "received" &&
      sourceEvent.eventType !== "opened"
    ) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Seuls les évènements 'received' ou 'opened' peuvent être acquittés.",
      );
    }

    const channel = await ctx.db.get(sourceEvent.channelId);
    if (!channel) {
      throw error(ErrorCode.NOT_FOUND, "Canal introuvable.");
    }

    // Le caller doit appartenir à l'org destinataire (toOrgId du sent originel).
    const callerMembership = await getMembership(
      ctx,
      ctx.user._id,
      sourceEvent.toOrgId,
    );
    if (!callerMembership && !isSuperadminUser(ctx.user)) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Seul un membre de l'org destinataire peut accuser réception.",
      );
    }

    // Idempotence : si un acknowledged existe déjà pour le même correspondanceId
    // sur ce canal par le même caller, on le retourne sans en créer un nouveau.
    if (sourceEvent.correspondanceId) {
      const existing = await ctx.db
        .query("sovereignChannelEvents")
        .withIndex("by_correspondance", (q) =>
          q.eq("correspondanceId", sourceEvent.correspondanceId),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("channelId"), sourceEvent.channelId),
            q.eq(q.field("eventType"), "acknowledged"),
            q.eq(q.field("byUserId"), ctx.user._id),
          ),
        )
        .first();
      if (existing) {
        return { acknowledgedEventId: existing._id, alreadyAcknowledged: true };
      }
    }

    const ackEventId = await ctx.db.insert("sovereignChannelEvents", {
      channelId: sourceEvent.channelId,
      correspondanceId: sourceEvent.correspondanceId,
      eventType: "acknowledged",
      // L'accusé "remonte" : from = destinataire originel, to = expéditeur originel.
      fromOrgId: sourceEvent.toOrgId,
      toOrgId: sourceEvent.fromOrgId,
      byUserId: ctx.user._id,
      byMembershipId: callerMembership ? callerMembership._id : undefined,
      classification: sourceEvent.classification,
      timestamp: Date.now(),
      detail: `Acquittement de l'évènement ${args.eventId}`,
    });

    return { acknowledgedEventId: ackEventId, alreadyAcknowledged: false };
  },
});

/**
 * Liste les évènements d'un canal, triés par timestamp desc (les plus récents
 * en premier). `limit` borné à [1, 50] (default 50). Le caller doit être
 * endpoint du canal (sauf superadmin).
 */
export const getChannelTrail = authQuery({
  args: {
    channelId: v.id("sovereignChannels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw error(ErrorCode.NOT_FOUND, "Canal introuvable.");
    }

    await resolveEndpointMembership(
      ctx,
      ctx.user._id,
      ctx.user,
      channel.orgAId,
      channel.orgBId,
    );

    const limit = Math.max(1, Math.min(args.limit ?? 50, 50));
    const events = await ctx.db
      .query("sovereignChannelEvents")
      .withIndex("by_channel_timestamp", (q) =>
        q.eq("channelId", args.channelId),
      )
      .order("desc")
      .take(limit);

    return events;
  },
});
