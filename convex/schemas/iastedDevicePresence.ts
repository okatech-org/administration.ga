/**
 * iAsted Device Presence Schema
 *
 * Sprint 10 — A4 (Ronde 3) : Continuité multi-device.
 *
 * Tracking des sessions iAsted actives par device pour permettre le handoff
 * entre desktop, mobile, agent-desktop, etc. Le user voit ses devices
 * connectés et peut transférer une session vocale d'un device à l'autre.
 *
 * Cycle de vie :
 *   1. Au démarrage d'une session vocale → `registerDevice` (upsert)
 *   2. Heartbeat toutes les 30 s pendant la session active
 *   3. Au cleanup → `unregisterDevice`
 *   4. Cron toutes les 5 min → marque inactifs les devices sans heartbeat > 90 s
 *
 * Privacy : aucune donnée sensible stockée — juste device label (« Chrome MacOS »,
 * « iPhone Safari ») + timestamps. Pas de geolocation, pas de IP.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const iastedDevicePresenceTable = defineTable({
	/** Propriétaire. */
	userId: v.id("users"),
	/**
	 * Identifiant stable par browser/device. Généré côté client (UUID v4)
	 * et stocké en localStorage pour persister entre sessions. Permet
	 * d'éviter les doublons quand le user rafraîchit la page.
	 */
	deviceId: v.string(),
	/**
	 * Label humain : « Chrome — MacBook Pro », « iPhone — Safari », etc.
	 * Composé côté client via `navigator.userAgent` + plateforme.
	 */
	label: v.string(),
	/** Surface où le device est actif (filtre les handoffs cross-surface). */
	surface: v.union(
		v.literal("agent"),
		v.literal("backoffice"),
		v.literal("citizen"),
	),
	/**
	 * État de la session vocale sur ce device :
	 *   - `idle` : device connecté à l'app mais pas en session vocale
	 *   - `active` : session vocale en cours
	 *   - `handoff_pending` : handoff demandé (le target device va prendre le relai)
	 *   - `handoff_received` : ce device vient de recevoir un handoff (à activer)
	 */
	state: v.union(
		v.literal("idle"),
		v.literal("active"),
		v.literal("handoff_pending"),
		v.literal("handoff_received"),
	),
	/** Timestamp du dernier heartbeat (pour cleanup des zombies). */
	lastHeartbeatAt: v.number(),
	/** Création initiale. */
	registeredAt: v.number(),
	/**
	 * Si state=handoff_pending : ID du device cible (qui va prendre le relai).
	 * Si state=handoff_received : ID du device source (d'où vient le handoff).
	 */
	peerDeviceId: v.optional(v.string()),
})
	.index("by_user", ["userId"])
	.index("by_user_device", ["userId", "deviceId"])
	.index("by_user_state", ["userId", "state"]);
