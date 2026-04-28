import { internalMutation } from "../_generated/server";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

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

