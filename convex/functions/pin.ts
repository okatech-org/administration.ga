/**
 * pin.ts — Gestion du code PIN à 6 chiffres pour les citoyens.
 *
 * Le PIN est un raccourci de connexion (pas un remplacement de l'auth).
 * Sécurité : hash scrypt, rate limiter, verrouillage après 3 échecs,
 * re-vérification OTP obligatoire tous les 90 jours.
 */

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { authQuery, authMutation, backofficeMutation, backofficeQuery } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { logCortexAction } from "../lib/neocortex";

// ─── Constants ─────────────────────────────────────────────
const PIN_REGEX = /^\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const OTP_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours
const RECENT_OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie si un utilisateur a un PIN actif (pré-auth, publique).
 * Appelé AVANT la connexion pour décider du flux (PIN ou OTP).
 */
export const checkPinStatus = query({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.email && !args.phone) {
      return { hasPin: false };
    }

    // Valider le format des identifiants
    if (args.email && !EMAIL_REGEX.test(args.email)) return { hasPin: false };
    if (args.phone && !PHONE_REGEX.test(args.phone)) return { hasPin: false };

    // Trouver l'utilisateur
    let user;
    if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .unique();
    } else if (args.phone) {
      user = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone!))
        .unique();
    }

    // Anti-enumeration : reponse uniforme pour tous les cas d'echec
    // Ne jamais reveler si l'utilisateur existe ou non
    if (!user || !user.isActive || !(user as any).pinHash) {
      return { hasPin: false };
    }

    const now = Date.now();
    const lockedUntil = (user as any).pinLockedUntil;
    const lastOtp = (user as any).lastOtpVerifiedAt;

    return {
      hasPin: true,
      locked: !!(lockedUntil && lockedUntil > now),
      otpRequired: !lastOtp || now - lastOtp > OTP_EXPIRY_MS,
    };
  },
});

/**
 * Statut PIN pour la page settings (authentifié).
 */
export const getPinStatus = authQuery({
  args: {},
  handler: async (ctx) => {
    const user = ctx.user;
    return {
      hasPin: !!(user as any).pinHash,
      pinCreatedAt: (user as any).pinCreatedAt ?? null,
      lastOtpVerifiedAt: (user as any).lastOtpVerifiedAt ?? null,
      isLocked: !!((user as any).pinLockedUntil && (user as any).pinLockedUntil > Date.now()),
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie le PIN d'un utilisateur (pré-auth, publique).
 * Retourne authId en cas de succès pour créer la session HTTP.
 */
export const verifyPin = internalMutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider le format
    if (!PIN_REGEX.test(args.pin)) {
      return { success: false, error: ErrorCode.PIN_INVALID };
    }

    if (!args.email && !args.phone) {
      return { success: false, error: ErrorCode.INVALID_ARGUMENT };
    }

    // Valider le format des identifiants
    if (args.email && !EMAIL_REGEX.test(args.email)) {
      return { success: false, error: ErrorCode.INVALID_ARGUMENT };
    }
    if (args.phone && !PHONE_REGEX.test(args.phone)) {
      return { success: false, error: ErrorCode.INVALID_ARGUMENT };
    }

    // Trouver l'utilisateur
    let user;
    if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .unique();
    } else if (args.phone) {
      user = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone!))
        .unique();
    }

    if (!user || !user.isActive) {
      return { success: false, error: ErrorCode.USER_NOT_FOUND };
    }

    const pinHash = (user as any).pinHash;
    if (!pinHash) {
      return { success: false, error: ErrorCode.PIN_NOT_FOUND };
    }

    const now = Date.now();

    // Vérifier le verrouillage
    const lockedUntil = (user as any).pinLockedUntil;
    if (lockedUntil && lockedUntil > now) {
      return { success: false, error: ErrorCode.PIN_LOCKED };
    }

    // Vérifier l'expiration OTP (90 jours)
    const lastOtp = (user as any).lastOtpVerifiedAt;
    if (!lastOtp || now - lastOtp > OTP_EXPIRY_MS) {
      return { success: false, error: ErrorCode.PIN_OTP_REQUIRED };
    }

    // Vérifier le PIN via scrypt
    let isValid = false;
    try {
      isValid = await verifyPassword({ hash: pinHash, password: args.pin });
    } catch (cryptoErr: unknown) {
      // Erreur critique : le module crypto est indisponible
      console.error("[PIN] Erreur crypto lors de la verification:", cryptoErr);
      await logCortexAction(ctx, {
        action: "PIN_CRYPTO_FAILURE",
        categorie: "securite",
        entiteType: "user",
        entiteId: user._id,
        signalType: "ALERTE_SYSTEME",
        priorite: "CRITICAL",
      });
      return { success: false, error: ErrorCode.SERVICE_UNAVAILABLE };
    }

    if (!isValid) {
      // Incrémenter le compteur d'échecs
      const attempts = ((user as any).pinFailedAttempts ?? 0) + 1;
      const updates: any = { pinFailedAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updates.pinLockedUntil = now + LOCK_DURATION_MS;
        await logCortexAction(ctx, {
          action: "PIN_LOCKED",
          categorie: "securite",
          entiteType: "user",
          entiteId: user._id,
          signalType: "ALERTE_SYSTEME",
          priorite: "HIGH",
        });
      }

      await ctx.db.patch(user._id, updates);

      return {
        success: false,
        error: attempts >= MAX_FAILED_ATTEMPTS ? ErrorCode.PIN_LOCKED : ErrorCode.PIN_INVALID,
        attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      };
    }

    // Succès : reset du compteur
    await ctx.db.patch(user._id, {
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
    } as any);

    await logCortexAction(ctx, {
      action: "PIN_VERIFY_SUCCESS",
      categorie: "securite",
      entiteType: "user",
      entiteId: user._id,
      signalType: "UTILISATEUR_MODIFIE",
    });

    return { success: true, authId: user.authId };
  },
});

/**
 * Créer un code PIN (après première connexion OTP).
 * Exige une vérification OTP récente (< 10 minutes).
 */
export const createPin = authMutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    if (!PIN_REGEX.test(args.pin)) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    const user = ctx.user;

    // Vérifier qu'il n'y a pas déjà un PIN
    if ((user as any).pinHash) {
      throw error(ErrorCode.PIN_ALREADY_EXISTS);
    }

    // Vérifier OTP récent
    const lastOtp = (user as any).lastOtpVerifiedAt;
    if (!lastOtp || Date.now() - lastOtp > RECENT_OTP_WINDOW_MS) {
      throw error(ErrorCode.PIN_RECENT_OTP_REQUIRED);
    }

    // Hasher le PIN
    const pinHash = await hashPassword(args.pin);

    await ctx.db.patch(user._id, {
      pinHash,
      pinCreatedAt: Date.now(),
      pinFailedAttempts: 0,
    } as any);

    await logCortexAction(ctx, {
      action: "PIN_CREATED",
      categorie: "securite",
      entiteType: "user",
      entiteId: ctx.user._id,
      signalType: "TYPE_CREE",
    });
  },
});

/**
 * Modifier le code PIN (vérification de l'ancien obligatoire).
 */
export const updatePin = authMutation({
  args: {
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    if (!PIN_REGEX.test(args.currentPin) || !PIN_REGEX.test(args.newPin)) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    if (args.currentPin === args.newPin) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    const user = ctx.user;
    const pinHash = (user as any).pinHash;
    if (!pinHash) throw error(ErrorCode.PIN_NOT_FOUND);

    // Vérifier l'ancien PIN
    const isValid = await verifyPassword({ hash: pinHash, password: args.currentPin });
    if (!isValid) throw error(ErrorCode.PIN_INVALID);

    // Hasher le nouveau
    const newHash = await hashPassword(args.newPin);

    await ctx.db.patch(user._id, {
      pinHash: newHash,
      pinCreatedAt: Date.now(),
      pinFailedAttempts: 0,
    } as any);

    await logCortexAction(ctx, {
      action: "PIN_UPDATED",
      categorie: "securite",
      entiteType: "user",
      entiteId: ctx.user._id,
      signalType: "TYPE_MODIFIE",
    });
  },
});

/**
 * Supprimer le code PIN.
 */
export const deletePin = authMutation({
  args: {},
  handler: async (ctx) => {
    const user = ctx.user;

    await ctx.db.patch(user._id, {
      pinHash: undefined,
      pinCreatedAt: undefined,
      pinFailedAttempts: undefined,
      pinLockedUntil: undefined,
    } as any);

    await logCortexAction(ctx, {
      action: "PIN_DELETED",
      categorie: "securite",
      entiteType: "user",
      entiteId: ctx.user._id,
      signalType: "TYPE_SUPPRIME",
    });
  },
});

/**
 * Marquer la dernière vérification OTP réussie pour un utilisateur identifié
 * par son `authId` Better Auth. Appelée par le hook serveur Better Auth après
 * `/sign-in/email-otp` et `/phone-number/verify` — donc aucune identité à
 * propager côté client. No-op si la ligne `users` n'existe pas encore
 * (sign-up OTP : `ensureUser` ne s'est pas encore exécuté ; pas de PIN à
 * gérer dans ce cas).
 */
export const markOtpVerifiedByAuthId = internalMutation({
  args: { authId: v.string() },
  handler: async (ctx, { authId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
    if (!user) return;
    await ctx.db.patch(user._id, {
      lastOtpVerifiedAt: Date.now(),
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
    } as any);
  },
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — Gestion PIN depuis le backoffice
// ═══════════════════════════════════════════════════════════════

/**
 * Statut PIN d'un utilisateur pour le backoffice (SuperAdmin).
 */
export const adminGetPinStatus = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      hasPin: !!(user as any).pinHash,
      pinCreatedAt: (user as any).pinCreatedAt ?? null,
      lastOtpVerifiedAt: (user as any).lastOtpVerifiedAt ?? null,
      isLocked: !!((user as any).pinLockedUntil && (user as any).pinLockedUntil > Date.now()),
      pinFailedAttempts: (user as any).pinFailedAttempts ?? 0,
    };
  },
});

/**
 * Supprimer le PIN d'un utilisateur (SuperAdmin).
 */
export const adminDeletePin = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Utilisateur introuvable");

    await ctx.db.patch(userId, {
      pinHash: undefined,
      pinCreatedAt: undefined,
      pinFailedAttempts: undefined,
      pinLockedUntil: undefined,
    } as any);

    await logCortexAction(ctx, {
      action: "ADMIN_PIN_DELETED",
      categorie: "securite",
      entiteType: "user",
      entiteId: userId,
      signalType: "TYPE_SUPPRIME",
      priorite: "HIGH",
    });
  },
});

/**
 * Déverrouiller le PIN d'un utilisateur (SuperAdmin).
 */
export const adminUnlockPin = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Utilisateur introuvable");

    await ctx.db.patch(userId, {
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
    } as any);

    await logCortexAction(ctx, {
      action: "ADMIN_PIN_UNLOCKED",
      categorie: "securite",
      entiteType: "user",
      entiteId: userId,
      signalType: "UTILISATEUR_MODIFIE",
    });
  },
});
