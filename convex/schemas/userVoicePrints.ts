/**
 * User Voice Prints Schema
 *
 * Sprint 5.5 (Ronde 3) — Voice biometric soft.
 *
 * Empreinte vocale per-user pour authentification additionnelle sur actions
 * sensibles (suspend_user, assign_role, etc.). Pas un remplacement de l'auth
 * primaire (better-auth/Convex Auth) — un facteur additionnel optionnel.
 *
 * Stockage : vecteur Float32 sérialisé en base64 (16-32 features MFCC-like
 * extraits côté browser via Web Audio API). Pas d'audio brut stocké (RGPD).
 *
 * Limites :
 *   - 3 voiceprints max par user (enrollement, refresh, secours)
 *   - confidence calculée via cosine similarity (seuil par défaut 0.7)
 *   - L'empreinte expire après 6 mois (renforce la sécurité, force refresh)
 *
 * Mode opératoire :
 *   1. Enrollment au 1ʳᵉ usage d'une action sensible (consentement explicite)
 *   2. Vérification automatique à chaque action sensible suivante
 *   3. Si match < seuil → mode dégradé (challenge phrase au lieu de skip)
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userVoicePrintsTable = defineTable({
	/** Propriétaire de l'empreinte. */
	userId: v.id("users"),
	/**
	 * Vecteur de features vocales sérialisé en base64 (Float32Array →
	 * Uint8Array → base64). Taille typique : 16-32 floats × 4 octets ≈ 128 B.
	 * Pas d'audio brut stocké : seul le vecteur de features est persisté.
	 */
	embeddingB64: v.string(),
	/** Algorithme d'extraction (versionné pour permettre la migration). */
	algorithm: v.string(),
	/** Timestamp d'enrollment. */
	createdAt: v.number(),
	/**
	 * Dernière vérification réussie (cosine ≥ seuil). Sert au monitoring
	 * et à archiver les empreintes obsolètes (jamais matchées depuis 3 mois).
	 */
	lastMatchedAt: v.optional(v.number()),
	/** Compteur de matches successifs (sert au score de confiance). */
	matchCount: v.number(),
	/**
	 * Si true, empreinte révoquée (compromise, ou user a demandé suppression).
	 * On garde la ligne pour audit, mais elle est exclue des vérifications.
	 */
	revoked: v.boolean(),
})
	.index("by_user", ["userId"])
	.index("by_user_revoked", ["userId", "revoked"]);
