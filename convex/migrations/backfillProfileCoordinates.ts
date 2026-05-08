/**
 * Geocoding backfill : remplit `addresses.residence.coordinates` pour les
 * profils citoyens existants qui ont une adresse mais pas de lat/lng.
 *
 * Pré-requis : la variable d'environnement `GOOGLE_CLOUD_MAPS_API` doit être
 * configurée dans les Convex secrets — utilisée par l'action geocoding.
 *
 * Usage (dry-run obligatoire avant exécution réelle) :
 *
 *   # Comptage et simulation (aucune écriture, aucun appel Google)
 *   bunx convex run migrations/backfillProfileCoordinates:run '{"dryRun":true}'
 *
 *   # Exécution réelle (limite optionnelle, débit ralenti)
 *   bunx convex run migrations/backfillProfileCoordinates:run '{"dryRun":false,"limit":500,"delayMs":250}'
 *
 * Idempotent : skip les profils ayant déjà des coordonnées ou pas d'adresse.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 200;

interface BackfillCounts {
  total: number;
  alreadyHasCoords: number;
  noAddress: number;
  geocoded: number;
  geocodingFailed: number;
  written: number;
}

/**
 * Liste paginée des profils — l'action externe orchestre la boucle.
 */
export const listBatch = internalQuery({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("profiles").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ?? null,
    });
    return {
      profiles: page.page.map((p) => ({
        _id: p._id,
        residence: (p as any).addresses?.residence ?? null,
      })),
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Patch des coordonnées sur un profil — appelée uniquement hors dry-run.
 */
export const patchCoordinates = internalMutation({
  args: {
    profileId: v.id("profiles"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return false;

    const addresses = (profile as any).addresses ?? {};
    const residence = addresses.residence ?? {};

    // Idempotence : ne ré-écrit pas si déjà présent
    if (residence.coordinates?.lat && residence.coordinates?.lng) {
      return false;
    }

    await ctx.db.patch(args.profileId, {
      addresses: {
        ...addresses,
        residence: {
          ...residence,
          coordinates: { lat: args.lat, lng: args.lng },
        },
      },
    } as any);
    return true;
  },
});

function buildAddressString(residence: any): { address: string; region?: string } | null {
  if (!residence) return null;
  const parts = [
    residence.street,
    residence.postalCode,
    residence.city,
    residence.country,
  ].filter((s: unknown) => typeof s === "string" && s.trim().length > 0) as string[];

  if (parts.length === 0) return null;
  // Need at least street OR city to geocode meaningfully
  if (!residence.street && !residence.city) return null;

  return {
    address: parts.join(", "),
    region:
      typeof residence.country === "string" && residence.country.length === 2
        ? residence.country
        : undefined,
  };
}

export const run = internalAction({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BackfillCounts> => {
    const counts: BackfillCounts = {
      total: 0,
      alreadyHasCoords: 0,
      noAddress: 0,
      geocoded: 0,
      geocodingFailed: 0,
      written: 0,
    };

    const max = args.limit ?? Number.POSITIVE_INFINITY;
    const delay = args.delayMs ?? DEFAULT_DELAY_MS;

    let cursor: string | null = null;
    let processed = 0;

    while (true) {
      const batch: {
        profiles: Array<{ _id: Id<"profiles">; residence: any }>;
        cursor: string;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.backfillProfileCoordinates.listBatch,
        { cursor },
      );

      for (const p of batch.profiles) {
        if (processed >= max) break;
        counts.total += 1;
        processed += 1;

        if (p.residence?.coordinates?.lat && p.residence?.coordinates?.lng) {
          counts.alreadyHasCoords += 1;
          continue;
        }

        const built = buildAddressString(p.residence);
        if (!built) {
          counts.noAddress += 1;
          continue;
        }

        if (args.dryRun) {
          // En dry-run on simule uniquement le candidat — pas d'appel Google
          counts.geocoded += 1;
          continue;
        }

        const result: {
          success: boolean;
          lat?: number;
          lng?: number;
          error?: string;
        } = await ctx.runAction(internal.functions.places.geocodeAddress, {
          address: built.address,
          region: built.region,
        });

        if (result.success && result.lat !== undefined && result.lng !== undefined) {
          counts.geocoded += 1;
          const wrote: boolean = await ctx.runMutation(
            internal.migrations.backfillProfileCoordinates.patchCoordinates,
            { profileId: p._id, lat: result.lat, lng: result.lng },
          );
          if (wrote) counts.written += 1;
        } else {
          counts.geocodingFailed += 1;
        }

        // Throttle pour respecter le quota Google Places
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      if (batch.isDone || processed >= max) break;
      cursor = batch.cursor;
    }

    console.log(
      `[backfillProfileCoordinates] ${args.dryRun ? "DRY-RUN" : "EXECUTE"} done`,
      counts,
    );
    return counts;
  },
});
