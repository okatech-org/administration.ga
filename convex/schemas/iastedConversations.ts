/**
 * iAsted Conversations Schema
 *
 * Sprint 7 (Ronde 3) — Persistance vocal ↔ texte.
 *
 * Une `conversation` = un fil continu entre l'utilisateur et iAsted, peu
 * importe le mode (vocal Realtime ou texte iChat). Sert deux usages :
 *
 *   1. **Continuité multi-mode** : commencer en vocal, basculer en chat
 *      texte sans perdre le contexte (et inversement).
 *   2. **Continuité dans le temps** : ré-ouvrir une session vocale dans
 *      l'heure et reprendre le fil exactement où il s'est arrêté.
 *
 * Le prompt builder lit la dernière conversation < 1h du même user et
 * injecte les N derniers messages dans le bloc dynamique du prompt.
 *
 * Distinct de :
 *   - `aiActivityLog` : audit log per-call (tool exécuté, latence, motif)
 *   - `iastedMemories` : mémoire long-terme (faits durables, préférences)
 *   - `aiRealtimeSessions` : tracking technique de la session WebRTC
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const iastedConversationsTable = defineTable({
	/** Propriétaire de la conversation. */
	userId: v.id("users"),
	/**
	 * Mode dans lequel le DERNIER message a été échangé. Permet à la prochaine
	 * session de comprendre dans quel canal l'utilisateur s'est arrêté.
	 *   - `voice` : session OpenAI Realtime
	 *   - `text`  : chat iChat (texte uniquement)
	 *   - `mixed` : alternance dans la même conversation
	 */
	lastMode: v.union(
		v.literal("voice"),
		v.literal("text"),
		v.literal("mixed"),
	),
	/**
	 * Messages bornés (cap dur à 50 entrées). Au-delà, on archive
	 * (truncate des plus anciens) pour borner la taille de la conversation.
	 * Pour des historiques plus longs, créer un système de threads/chunks.
	 */
	messages: v.array(
		v.object({
			role: v.union(v.literal("user"), v.literal("assistant")),
			content: v.string(),
			mode: v.union(v.literal("voice"), v.literal("text")),
			/** Timestamp d'ajout (ms epoch). */
			ts: v.number(),
		}),
	),
	/** Surface où la conversation a été initiée. */
	surface: v.union(
		v.literal("agent"),
		v.literal("backoffice"),
		v.literal("citizen"),
	),
	/** Org context au moment de l'init (peut être absent côté citoyen). */
	orgId: v.optional(v.id("orgs")),
	/** Création de la conversation. */
	createdAt: v.number(),
	/**
	 * Dernier message ajouté. Le prompt builder filtre les conversations
	 * < 1h pour la salutation contextualisée vocale.
	 */
	lastActivityAt: v.number(),
})
	.index("by_user", ["userId"])
	.index("by_user_activity", ["userId", "lastActivityAt"]);
