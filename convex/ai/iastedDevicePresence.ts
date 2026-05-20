/**
 * iastedDevicePresence — CRUD presence + handoff multi-device (Sprint 10).
 *
 * Permet à l'utilisateur de :
 *   - voir ses devices iAsted actifs (desktop + mobile + tablet)
 *   - transférer une session vocale d'un device à l'autre (handoff)
 *
 * Côté client :
 *   - Hook `useIAstedDevicePresence(deviceId, surface, label)` register au mount
 *   - Heartbeat toutes les 30 s tant que la session vocale est active
 *   - Unregister au unmount
 *
 * Côté backend :
 *   - Cron toutes les 5 min marque inactifs les devices sans heartbeat > 90 s
 */

import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

const HEARTBEAT_TIMEOUT_MS = 90 * 1000;
const MAX_DEVICE_LABEL_LEN = 80;

const SURFACE = v.union(
	v.literal("agent"),
	v.literal("backoffice"),
	v.literal("citizen"),
);
const STATE = v.union(
	v.literal("idle"),
	v.literal("active"),
	v.literal("handoff_pending"),
	v.literal("handoff_received"),
);

function clampLabel(s: string): string {
	const trimmed = s.trim();
	return trimmed.length > MAX_DEVICE_LABEL_LEN
		? trimmed.slice(0, MAX_DEVICE_LABEL_LEN)
		: trimmed;
}

// ─────────────────────────────────────────────────────────────
// Register / heartbeat / unregister (client-driven)
// ─────────────────────────────────────────────────────────────

/**
 * Upsert : si un device avec ce userId+deviceId existe, le met à jour ;
 * sinon le crée. Auto-resets `state` à `idle` au register initial.
 */
export const registerDevice = mutation({
	args: {
		deviceId: v.string(),
		label: v.string(),
		surface: SURFACE,
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const now = Date.now();
		const existing = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.deviceId),
			)
			.unique();
		const label = clampLabel(args.label);
		if (existing) {
			await ctx.db.patch(existing._id, {
				label,
				surface: args.surface,
				lastHeartbeatAt: now,
				// On préserve `state` (peut être en plein handoff).
			});
			return existing._id;
		}
		return await ctx.db.insert("iastedDevicePresence", {
			userId: user._id,
			deviceId: args.deviceId,
			label,
			surface: args.surface,
			state: "idle",
			lastHeartbeatAt: now,
			registeredAt: now,
		});
	},
});

/** Heartbeat pendant une session vocale active (toutes les 30 s côté client). */
export const heartbeatDevice = mutation({
	args: {
		deviceId: v.string(),
		state: v.optional(STATE),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const existing = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.deviceId),
			)
			.unique();
		if (!existing) return; // device inconnu — appeler registerDevice d'abord
		const patch: any = { lastHeartbeatAt: Date.now() };
		if (args.state !== undefined) patch.state = args.state;
		await ctx.db.patch(existing._id, patch);
	},
});

/** Unregister : appelé au cleanup d'une session ou au beforeunload. */
export const unregisterDevice = mutation({
	args: { deviceId: v.string() },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const existing = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.deviceId),
			)
			.unique();
		if (!existing) return;
		await ctx.db.delete(existing._id);
	},
});

// ─────────────────────────────────────────────────────────────
// Listing pour UI Réglages (Sécurité > Devices connectés)
// ─────────────────────────────────────────────────────────────

export const listMyDevices = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const now = Date.now();
		return rows
			.map((r) => ({
				_id: r._id,
				deviceId: r.deviceId,
				label: r.label,
				surface: r.surface,
				state: r.state,
				lastHeartbeatAt: r.lastHeartbeatAt,
				registeredAt: r.registeredAt,
				isStale: now - r.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS,
				peerDeviceId: r.peerDeviceId,
			}))
			.sort((a, b) => b.lastHeartbeatAt - a.lastHeartbeatAt);
	},
});

// ─────────────────────────────────────────────────────────────
// Handoff workflow
// ─────────────────────────────────────────────────────────────

/**
 * Demande un handoff de la session vocale du device source vers le target.
 * Marque source=`handoff_pending` et target=`handoff_received`. Le target
 * device détecte ce state via une subscription Convex et démarre sa session
 * automatiquement, puis appelle `completeHandoff` pour finaliser.
 */
export const requestHandoff = mutation({
	args: {
		sourceDeviceId: v.string(),
		targetDeviceId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		if (args.sourceDeviceId === args.targetDeviceId) {
			throw new ConvexError("source et target ne peuvent pas être identiques.");
		}
		const source = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.sourceDeviceId),
			)
			.unique();
		const target = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.targetDeviceId),
			)
			.unique();
		if (!source) throw new ConvexError("Device source introuvable.");
		if (!target) throw new ConvexError("Device cible introuvable.");
		const now = Date.now();
		if (now - target.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS) {
			throw new ConvexError(
				"Le device cible n'est pas connecté ou n'a pas envoyé de heartbeat récent.",
			);
		}
		await ctx.db.patch(source._id, {
			state: "handoff_pending",
			peerDeviceId: args.targetDeviceId,
		});
		await ctx.db.patch(target._id, {
			state: "handoff_received",
			peerDeviceId: args.sourceDeviceId,
		});
	},
});

/**
 * Finalise le handoff après que le target ait pris le relai. Marque la
 * source `idle` (sa session vocale doit s'être disconnect côté client) et
 * le target `active`.
 */
export const completeHandoff = mutation({
	args: { thisDeviceId: v.string() },
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const me = await ctx.db
			.query("iastedDevicePresence")
			.withIndex("by_user_device", (q) =>
				q.eq("userId", user._id).eq("deviceId", args.thisDeviceId),
			)
			.unique();
		if (!me) return;
		if (me.state !== "handoff_received") return;
		const peerId = me.peerDeviceId;
		await ctx.db.patch(me._id, {
			state: "active",
			peerDeviceId: undefined,
			lastHeartbeatAt: Date.now(),
		});
		if (peerId) {
			const peer = await ctx.db
				.query("iastedDevicePresence")
				.withIndex("by_user_device", (q) =>
					q.eq("userId", user._id).eq("deviceId", peerId),
				)
				.unique();
			if (peer) {
				await ctx.db.patch(peer._id, {
					state: "idle",
					peerDeviceId: undefined,
				});
			}
		}
	},
});

// ─────────────────────────────────────────────────────────────
// Cron : cleanup des zombies (devices sans heartbeat > 90 s)
// ─────────────────────────────────────────────────────────────

export const sweepStaleDevicesInternal = internalMutation({
	args: {},
	handler: async (ctx) => {
		const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
		const rows = await ctx.db.query("iastedDevicePresence").collect();
		let count = 0;
		for (const r of rows) {
			if (r.lastHeartbeatAt < cutoff) {
				await ctx.db.delete(r._id);
				count++;
			}
		}
		return { swept: count };
	},
});
