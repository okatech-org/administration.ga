/**
 * iCorrespondance — Configuration réseau (singleton)
 *
 * Réglages globaux par défaut hérités par toutes les représentations.
 * Modifications réservées au super admin (`correspondance.admin` ou
 * isSuperAdmin).
 *
 * Le document singleton est créé par la migration
 * `migrations/initCorrespondanceNetworkConfig`. Cette query retourne
 * `null` tant que la migration n'a pas tourné — le frontend doit gérer
 * ce cas (afficher un CTA "Initialiser la config réseau").
 */

import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import {
  authQuery,
  authMutation,
} from "../lib/customFunctions";
import { isSuperAdmin } from "../lib/permissions";
import { UserRole } from "../lib/constants";
import { error, ErrorCode } from "../lib/errors";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Récupère le document singleton ou null. */
async function getSingleton(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("correspondanceNetworkConfig")
    .withIndex("by_singleton", (q) => q.eq("isSingleton", true))
    .first();
}

/**
 * Vérifie que l'utilisateur peut administrer la configuration réseau.
 * Réservé aux rôles globaux : super_admin et admin_system. La config
 * réseau ne dépend d'aucune org : on contrôle donc sur le rôle effectif
 * plutôt que sur les permissions par-org.
 */
function assertCanAdminNetwork(user: Doc<"users">): void {
  if (isSuperAdmin(user)) return;
  if (user.role === UserRole.AdminSystem) return;
  throw error(
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    "Seul un super-admin ou un admin système peut éditer la configuration réseau iCorrespondance",
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Récupère la configuration réseau iCorrespondance.
 * Retourne `null` si la migration d'init n'a pas encore tourné.
 */
export const getNetworkConfig = authQuery({
  args: {},
  handler: async (ctx) => {
    return await getSingleton(ctx);
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Met à jour les réglages globaux du réseau (référence, workflow, signature,
 * filigrane). Les `standardTypes` ont leur propre mutation pour éviter de
 * remplacer la liste entière à chaque modification de champ.
 */
export const updateNetworkConfig = authMutation({
  args: {
    referencePattern: v.optional(v.string()),
    autoRouteByHierarchy: v.optional(v.boolean()),
    chiefApprovalRequired: v.optional(v.boolean()),
    signatureDefaults: v.optional(
      v.object({
        defaultLevel: v.number(),
        defaultSealStorageId: v.optional(v.id("_storage")),
      }),
    ),
    watermarkDefaults: v.optional(
      v.object({
        enabled: v.boolean(),
        text: v.optional(v.string()),
        opacity: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertCanAdminNetwork(ctx.user);

    const existing = await getSingleton(ctx);
    if (!existing) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Configuration réseau non initialisée. Lancez la migration initCorrespondanceNetworkConfig.",
      );
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };
    // On n'écrase que les champs explicitement passés (différencie "non fourni"
    // de "vidé volontairement"). Un futur PATCH explicit-undefined nécessitera
    // un wrapper, mais pour l'instant tous les champs sont optionnels.
    if (args.referencePattern !== undefined) {
      patch.referencePattern = args.referencePattern;
    }
    if (args.autoRouteByHierarchy !== undefined) {
      patch.autoRouteByHierarchy = args.autoRouteByHierarchy;
    }
    if (args.chiefApprovalRequired !== undefined) {
      patch.chiefApprovalRequired = args.chiefApprovalRequired;
    }
    if (args.signatureDefaults !== undefined) {
      patch.signatureDefaults = args.signatureDefaults;
    }
    if (args.watermarkDefaults !== undefined) {
      patch.watermarkDefaults = args.watermarkDefaults;
    }

    await ctx.db.patch(existing._id, patch);
    return existing._id;
  },
});

/**
 * Met à jour un type standard du catalogue réseau (activation par défaut,
 * workflow d'approbation, priorité/confidentialité par défaut).
 */
export const updateNetworkStandardType = authMutation({
  args: {
    typeCode: v.string(),
    enabledByDefault: v.optional(v.boolean()),
    workflowConfig: v.optional(
      v.object({
        requiresApproval: v.boolean(),
        approvalChain: v.array(
          v.object({
            ordre: v.number(),
            roleMinimum: v.string(),
            conditionType: v.union(
              v.literal("always"),
              v.literal("if_recipient_rank_above"),
              v.literal("if_external"),
            ),
            conditionValue: v.optional(v.string()),
          }),
        ),
        autoRouteByHierarchy: v.boolean(),
      }),
    ),
    prioriteParDefaut: v.optional(v.string()),
    confidentialiteParDefaut: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertCanAdminNetwork(ctx.user);

    const existing = await getSingleton(ctx);
    if (!existing) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Configuration réseau non initialisée",
      );
    }

    const idx = existing.standardTypes.findIndex(
      (t: { typeCode: string }) => t.typeCode === args.typeCode,
    );
    if (idx === -1) {
      throw error(
        ErrorCode.NOT_FOUND,
        `Type réseau "${args.typeCode}" introuvable`,
      );
    }

    const updated = [...existing.standardTypes];
    const current = updated[idx];
    updated[idx] = {
      ...current,
      enabledByDefault:
        args.enabledByDefault ?? current.enabledByDefault,
      workflowConfig: args.workflowConfig ?? current.workflowConfig,
      prioriteParDefaut:
        args.prioriteParDefaut ?? current.prioriteParDefaut,
      confidentialiteParDefaut:
        args.confidentialiteParDefaut ?? current.confidentialiteParDefaut,
    };

    await ctx.db.patch(existing._id, {
      standardTypes: updated,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });
    return existing._id;
  },
});
