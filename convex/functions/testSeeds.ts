/**
 * Test Seeds — Sprint 6
 *
 * Mutations de seed utilisées par les tests Playwright authentifiés
 * (apps/agent-web/tests/e2e/call-center.auth.spec.ts).
 *
 * SÉCURITÉ : chaque handler vérifie `DEV_SIGNIN_ENABLED === "true"` en tête.
 * Si le flag n'est pas positionné, la mutation throw. Ainsi même si ces
 * fonctions sont exposées comme `api.*`, elles sont inoffensives en prod.
 */

import { v } from "convex/values";
import { authMutation } from "../lib/customFunctions";
import { mutation } from "../_generated/server";
import { error, ErrorCode } from "../lib/errors";
import type { Id } from "../_generated/dataModel";

function ensureDevMode(): void {
  if (process.env.DEV_SIGNIN_ENABLED !== "true") {
    throw error(
      ErrorCode.FORBIDDEN,
      "testSeeds disabled (DEV_SIGNIN_ENABLED != 'true')",
    );
  }
}

/**
 * Seed un agent test : user + membership supervisor + agentPresence online.
 * Idempotent : si l'email existe déjà, met à jour la membership et la presence.
 *
 * Retourne les IDs pour chaînage dans les tests.
 *
 * Utilise `mutation` (pas authMutation) car le test peut l'appeler sans session.
 */
export const seedTestAgent = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    orgId: v.optional(v.id("orgs")),
  },
  handler: async (ctx, args) => {
    ensureDevMode();

    // Trouve ou crée le user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", { authId: "test-" + Math.random().toString(36).slice(2), name: "Test User", isActive: true, isSuperadmin: false,
        email: args.email,
        firstName: args.firstName ?? "Test",
        lastName: args.lastName ?? "Agent",
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw error(ErrorCode.SERVICE_UNAVAILABLE, "User seed failed");

    // Trouve ou crée une org de test si pas fournie
    let orgId = args.orgId;
    if (!orgId) {
      const existing = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", "test-org-e2e"))
        .unique();
      if (existing) {
        orgId = existing._id;
      } else {
        orgId = await ctx.db.insert("orgs", {
          slug: "test-org-e2e",
          name: "E2E Test Consulat",
          type: "consulate" as any,
          country: "GA" as any,
          timezone: "Europe/Paris",
          address: {
            street: "1 rue de Test",
            city: "Paris",
            country: "FR" as any,
          } as any,
        } as any);
      }
    }

    // Trouve ou crée la membership supervisor (all perms pour tests)
    let membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", user!._id).eq("orgId", orgId!),
      )
      .unique();

    if (!membership) {
      const membershipId = await ctx.db.insert("memberships", {
        orgId: orgId!,
        userId: user._id,
        role: "supervisor" as any,
        position: "Agent Test E2E",
        tasks: [
          "meetings.create",
          "meetings.join",
          "meetings.manage",
          "meetings.view_history",
          "meetings.hold",
          "meetings.transfer",
          "meetings.supervise",
          "voicemails.view",
          "voicemails.listen",
          "voicemails.delete",
          "callRecordings.start",
          "callRecordings.stop",
          "callRecordings.listen",
          "callRecordings.delete",
          "notifications.push_subscribe",
          "schedules.view",
          "schedules.manage",
        ] as any,
      } as any);
      membership = await ctx.db.get(membershipId);
    }

    // Présence online
    const existingPresence = await ctx.db
      .query("agentPresence")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user!._id).eq("orgId", orgId!),
      )
      .unique();
    const now = Date.now();
    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        status: "online",
        lastHeartbeat: now,
        lastActivity: now,
      });
    } else {
      await ctx.db.insert("agentPresence", {
        userId: user._id,
        orgId: orgId,
        status: "online",
        lastHeartbeat: now,
        lastActivity: now,
        clientType: "test-e2e",
      });
    }

    return {
      userId: user._id,
      orgId,
      membershipId: membership!._id as Id<"memberships">,
    };
  },
});

/**
 * Seed 3 callLines de test (standard, urgent, etat-civil) assignées à un agent.
 */
export const seedTestCallLines = mutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    ensureDevMode();

    const lines = [
      { label: "Standard", priority: 3, color: "#9CA3AF" },
      { label: "Urgences", priority: 1, color: "#EF4444" },
      { label: "État Civil", priority: 2, color: "#3B82F6" },
    ];

    const created: Id<"callLines">[] = [];
    for (const spec of lines) {
      // Idempotence : skip si existe déjà
      const all = await ctx.db
        .query("callLines")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", args.orgId).eq("isActive", true),
        )
        .collect();
      const existing = all.find((l) => l.label === spec.label);
      if (existing) {
        if (!existing.membershipIds.includes(args.membershipId)) {
          await ctx.db.patch(existing._id, {
            membershipIds: [...existing.membershipIds, args.membershipId],
          });
        }
        created.push(existing._id);
        continue;
      }
      const id = await ctx.db.insert("callLines", {
        type: "org",
        orgId: args.orgId,
        label: spec.label,
        priority: spec.priority,
        color: spec.color,
        isActive: true,
        membershipIds: [args.membershipId],
        loadBalancingStrategy: "broadcast",
      });
      created.push(id);
    }
    return { lineIds: created };
  },
});

/**
 * Crée un appel entrant en status ringing pour tests pickup.
 */
export const seedInboundCall = mutation({
  args: {
    orgId: v.id("orgs"),
    callLineId: v.id("callLines"),
    citizenEmail: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("normal"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    ensureDevMode();

    const citizenEmail =
      args.citizenEmail ?? `citizen-e2e-${Date.now()}@test.local`;

    // Crée un user citoyen minimal
    let citizen = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", citizenEmail))
      .unique();
    if (!citizen) {
      const cid = await ctx.db.insert("users", { authId: "test-" + Math.random().toString(36).slice(2), name: "Test User", isActive: true, isSuperadmin: false,
        email: citizenEmail,
        firstName: "Test",
        lastName: "Citoyen",
      });
      citizen = await ctx.db.get(cid);
    }

    const roomName = `e2e-call-${Date.now()}`;
    const meetingId = await ctx.db.insert("meetings", {
      title: `E2E Inbound Call ${new Date().toISOString()}`,
      type: "call",
      status: "active",
      roomName,
      orgId: args.orgId,
      createdBy: citizen!._id,
      participants: [{ userId: citizen!._id, role: "host" }],
      isOrgInbound: true,
      callLineId: args.callLineId,
      callStatus: "ringing",
      priority: args.priority ?? "normal",
      mediaType: "audio",
    });

    return { meetingId, citizenId: citizen!._id };
  },
});

/**
 * Crée un voicemail pending avec transcript pour tests UI.
 */
export const seedVoicemail = mutation({
  args: {
    orgId: v.id("orgs"),
    callLineId: v.optional(v.id("callLines")),
    transcript: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    isRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    ensureDevMode();

    // 1. Trouve ou crée le citizen
    let citizen = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "citizen-vm-e2e@test.local"))
      .unique();
    if (!citizen) {
      const cid = await ctx.db.insert("users", { authId: "test-" + Math.random().toString(36).slice(2), name: "Test User", isActive: true, isSuperadmin: false,
        email: "citizen-vm-e2e@test.local",
        firstName: "Voicemail",
        lastName: "Leaver",
      });
      citizen = await ctx.db.get(cid);
    }
    if (!citizen) throw error(ErrorCode.SERVICE_UNAVAILABLE, "Citizen seed failed");

    // 2. Crée le meeting (ended)
    const meetingId = await ctx.db.insert("meetings", {
      title: "E2E Voicemail",
      type: "call",
      status: "ended",
      roomName: `e2e-vm-${Date.now()}`,
      orgId: args.orgId,
      createdBy: citizen._id,
      participants: [],
      isOrgInbound: true,
      callStatus: "ended",
      endReason: "voicemail_recorded",
    });

    // 3. Crée la voicemail
    const voicemailId = await ctx.db.insert("voicemails", {
      meetingId,
      orgId: args.orgId,
      callLineId: args.callLineId,
      citizenUserId: citizen._id,
      citizenDisplayName: "Voicemail Leaver",
      citizenPhoneOrEmail: "citizen-vm-e2e@test.local",
      transcript:
        args.transcript ??
        "Bonjour, je souhaiterais des informations sur le renouvellement de mon passeport. Merci de me rappeler.",
      durationMs: args.durationMs ?? 15_000,
      isRead: args.isRead ?? false,
      createdAt: Date.now(),
    });

    return { voicemailId, meetingId };
  },
});
