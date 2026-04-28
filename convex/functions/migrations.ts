import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { buildCorrespondanceSearchText } from "../lib/correspondanceHelpers";

/**
 * Migrations & synchronisation legacy — Phase D1
 *
 * Synchronise bidirectionnellement les champs historiques (plats) et les
 * nouveaux sous-objets structurés pour éviter la désynchronisation pendant
 * la phase de migration progressive (widen-migrate-narrow).
 *
 * Sync effectué :
 *   - orgs.addresses.physical → orgs.address (et inverse si addresses vide)
 *   - orgs.protocol.headOfMissionUserId → users[id].name → orgs.headOfMission
 *   - orgs.branding.logoStorageId → URL signée → orgs.logoUrl (one-way)
 *   - orgCalendar.serviceHours[default] → orgs.openingHours
 *
 * Exécuté par cron horaire. Idempotent.
 *
 * Phase G.2 — Observabilité : try/catch + logCortexAction pour succès/erreur.
 */

export const syncLegacyOrgFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    let syncedCount = 0;
    let skippedCount = 0;
    let totalCount = 0;

    try {
      const orgs = await ctx.db.query("orgs").collect();
      totalCount = orgs.length;

    for (const org of orgs) {
      if (org.deletedAt) {
        skippedCount++;
        continue;
      }

      const patch: Record<string, unknown> = {};

      // ── 1. Adresses : addresses.physical ↔ address ──
      if (org.addresses?.physical) {
        // Source de vérité = addresses.physical → met à jour address plat
        const physical = org.addresses.physical;
        const currentAddr = org.address ?? {
          street: "",
          city: "",
          postalCode: "",
          country: "GA",
        };
        const addressDiffers =
          currentAddr.street !== physical.street ||
          currentAddr.city !== physical.city ||
          currentAddr.postalCode !== physical.postalCode ||
          currentAddr.country !== physical.country;
        if (addressDiffers) {
          patch.address = {
            street: physical.street,
            city: physical.city,
            postalCode: physical.postalCode,
            country: physical.country,
            coordinates: physical.coordinates,
          };
        }
      } else if (org.address) {
        // Pas encore d'addresses structurées → backfill depuis plat
        patch.addresses = {
          physical: {
            street: org.address.street,
            city: org.address.city,
            postalCode: org.address.postalCode,
            country: org.address.country,
            coordinates: org.address.coordinates,
          },
        };
      }

      // ── 2. Chef de mission : protocol.headOfMissionUserId → headOfMission ──
      if (org.protocol?.headOfMissionUserId) {
        const user = await ctx.db.get(org.protocol.headOfMissionUserId);
        if (user) {
          const name =
            `${(user as { firstName?: string }).firstName ?? ""} ${(user as { lastName?: string }).lastName ?? ""}`.trim() ||
            user.email ||
            "";
          if (name && org.headOfMission !== name) {
            patch.headOfMission = name;
          }
          // Sync du titre bilingue → champ plat
          if (
            org.protocol.headOfMissionTitleFr &&
            org.headOfMissionTitle !== org.protocol.headOfMissionTitleFr
          ) {
            patch.headOfMissionTitle = org.protocol.headOfMissionTitleFr;
          }
        }
      }

      // ── 3. Jurisdiction : jurisdiction.primary → jurisdictionCountries ──
      if (org.jurisdiction?.primary && org.jurisdiction.primary.length > 0) {
        const currentList = org.jurisdictionCountries ?? [];
        const newList = org.jurisdiction.primary;
        if (
          currentList.length !== newList.length ||
          !currentList.every((c, i) => c === newList[i])
        ) {
          patch.jurisdictionCountries = newList;
        }
      }

      // ── 4. Horaires : orgCalendar.serviceHours[default] → openingHours ──
      const calendar = await ctx.db
        .query("orgCalendar")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first();
      if (calendar) {
        const defaultEntry = calendar.serviceHours.find(
          (s: { scopeType?: string }) => s.scopeType === "default",
        );
        if (defaultEntry) {
          // On ne vérifie pas l'égalité exacte (complexe) — on patch
          // uniquement si openingHours est absent
          if (!org.openingHours) {
            patch.openingHours = defaultEntry.schedule;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(org._id, {
          ...patch,
          updatedAt: Date.now(),
        });
        syncedCount++;
      }
    }

      // Phase G.2 — Audit trail succès du cron
      const duration = Date.now() - startTime;
      await logCortexAction(ctx, {
        action: "CRON_SYNC_LEGACY_ORG_FIELDS",
        categorie: CATEGORIES_ACTION.SYSTEME,
        entiteType: "migrations",
        entiteId: "syncLegacyOrgFields",
        userId: undefined,
        apres: {
          total: totalCount,
          synced: syncedCount,
          skipped: skippedCount,
          durationMs: duration,
        },
        signalType: SIGNAL_TYPES.SYSTEM_CRON_SUCCESS,
      });

      return {
        total: totalCount,
        synced: syncedCount,
        skipped: skippedCount,
      };
    } catch (err) {
      // Phase G.2 — Audit trail erreur du cron
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      await logCortexAction(ctx, {
        action: "CRON_SYNC_LEGACY_ORG_FIELDS_ERROR",
        categorie: CATEGORIES_ACTION.SYSTEME,
        entiteType: "migrations",
        entiteId: "syncLegacyOrgFields",
        userId: undefined,
        apres: {
          error: errorMessage,
          partial: { total: totalCount, synced: syncedCount, skipped: skippedCount },
          durationMs: duration,
        },
        signalType: SIGNAL_TYPES.SYSTEM_CRON_ERROR,
      });
      throw err;
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MIGRATION ONE-SHOT — Phase E.5 (post-refonte iCorrespondance + multilingue)
//
// À exécuter une fois après le déploiement des nouveaux schémas (nameI18n,
// identityExtended deprecated, correspondance.searchText). Idempotente.
//
// Lance avec :
//   npx convex run functions/migrations:migrateOrgsAndCorrespondance --prod
// ou en dry-run :
//   npx convex run functions/migrations:migrateOrgsAndCorrespondance \
//     '{"dryRun": true}'
//
// Couverture :
//   1. orgs.nameI18n          — backfill depuis identityExtended.officialName /
//                               officialNameLocal et/ou depuis name.
//   2. correspondanceItems.searchText — backfill via buildCorrespondanceSearchText
//      pour les rows pré-migration (sinon `searchItems` ne les retrouve pas).
//   3. correspondanceTypeConfigs — initialise les types standard pour les orgs
//      qui n'en ont aucun (équivalent à `initializeDefaultTypes` mais en bulk).
// ═════════════════════════════════════════════════════════════════════════════

export const migrateOrgsAndCorrespondance = internalMutation({
  args: {
    /** Si true, ne patche rien, retourne juste les comptes prévisionnels. */
    dryRun: v.optional(v.boolean()),
    /** Limite par table — utile pour itérer sur de gros datasets en plusieurs
     * exécutions sans dépasser les limites Convex. 0 = pas de limite. */
    limit: v.optional(v.number()),
    /** Code locale par défaut pour `officialNameLocal` (pas inférable via le
     * schéma). Ex: "ar" pour une représentation à Riyad. Défaut: "local". */
    defaultLocalLocale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const dry = args.dryRun ?? false;
    const limit = args.limit ?? 0;
    const localKey = args.defaultLocalLocale ?? "local";

    // ── 1. Orgs — backfill nameI18n ───────────────────────────────────
    const orgs = await ctx.db.query("orgs").collect();
    let orgsScanned = 0;
    let orgsPatched = 0;

    for (const org of orgs) {
      if (limit > 0 && orgsScanned >= limit) break;
      orgsScanned++;
      if (org.deletedAt) continue;

      const existing = org.nameI18n ?? {};
      const next: Record<string, string> = { ...existing };

      // Source 1 : identityExtended.officialName → fr (priorité haute)
      const officialFr = org.identityExtended?.officialName?.trim();
      if (officialFr && !next.fr) next.fr = officialFr;

      // Source 2 : org.name → fr (fallback si pas d'officialName)
      if (!next.fr && org.name) next.fr = org.name;

      // Source 3 : identityExtended.officialNameLocal → locale "local"
      // (ou la locale fournie en argument)
      const officialLocal = org.identityExtended?.officialNameLocal?.trim();
      if (officialLocal && !next[localKey]) next[localKey] = officialLocal;

      const changed =
        Object.keys(next).length !== Object.keys(existing).length ||
        Object.entries(next).some(([k, v]) => existing[k] !== v);

      if (changed && !dry) {
        await ctx.db.patch(org._id, {
          nameI18n: next,
          // Re-synchronise `name` sur la valeur fr (source de vérité côté
          // lecture string-only).
          name: next.fr ?? org.name,
          updatedAt: Date.now(),
        });
      }
      if (changed) orgsPatched++;
    }

    // ── 2. correspondanceItems — backfill searchText ──────────────────
    const items = await ctx.db.query("correspondanceItems").collect();
    let itemsScanned = 0;
    let itemsPatched = 0;

    for (const item of items) {
      if (limit > 0 && itemsScanned >= limit) break;
      itemsScanned++;
      if (item.deletedAt) continue;
      if (item.searchText && item.searchText.length > 0) continue;

      const computed = buildCorrespondanceSearchText({
        title: item.title,
        reference: item.reference,
        senderName: item.senderName,
        senderOrg: item.senderOrg,
        recipientName: item.recipientName,
        recipientOrg: item.recipientOrg,
        comment: item.comment,
        tags: item.tags,
        arrivalReference: item.arrivalReference,
      });

      if (!dry) {
        await ctx.db.patch(item._id, {
          searchText: computed,
          updatedAt: Date.now(),
        });
      }
      itemsPatched++;
    }

    // ── 3. Orgs sans correspondanceTypeConfigs → on note seulement ───
    // (la création est faite à la demande via `initializeDefaultTypes`
    // pour préserver le contrôle admin ; on ne force rien ici.)
    let orgsWithoutTypeConfigs = 0;
    for (const org of orgs) {
      if (org.deletedAt) continue;
      const existing = await ctx.db
        .query("correspondanceTypeConfigs")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .first();
      if (!existing) orgsWithoutTypeConfigs++;
    }

    const duration = Date.now() - startTime;
    const result = {
      dryRun: dry,
      durationMs: duration,
      orgs: { scanned: orgsScanned, patched: orgsPatched },
      correspondanceItems: { scanned: itemsScanned, patched: itemsPatched },
      orgsWithoutTypeConfigs,
    };

    await logCortexAction(ctx, {
      action: dry
        ? "MIGRATION_ORGS_CORRESPONDANCE_DRY_RUN"
        : "MIGRATION_ORGS_CORRESPONDANCE",
      categorie: CATEGORIES_ACTION.SYSTEME,
      entiteType: "migrations",
      entiteId: "migrateOrgsAndCorrespondance",
      userId: undefined,
      apres: result,
      signalType: SIGNAL_TYPES.SYSTEM_CRON_SUCCESS,
    });

    return result;
  },
});
