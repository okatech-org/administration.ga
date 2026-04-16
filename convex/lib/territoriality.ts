/**
 * Territoriality Logic
 * 
 * Manages the relationship between citizens and consular organizations
 * based on their residence and current location.
 * 
 * Key concepts:
 * - managedByOrgId: The organization where the citizen is registered (based on residence > 6 months)
 * - signaledToOrgId: The organization where the citizen is temporarily located (< 6 months)
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { CountryCode } from "./countryCodeValidator";
import { orgHandlesConsularAffairs } from "./permissions";

type DbContext = QueryCtx | MutationCtx;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum months of stay to be considered a resident (triggers org transfer) */
export const RESIDENCE_THRESHOLD_MONTHS = 6;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TerritorialityParams {
  /** Country where the user officially resides */
  residenceCountry: CountryCode;
  /** Country where the user is currently located */
  currentLocation: CountryCode;
  /** Duration of current stay in months */
  stayDuration: number;
}

export interface TerritorialityResult {
  /** 
   * The organization that manages this user's consular affairs.
   * Based on residence country (stays >= 6 months).
   */
  shouldTransferToCurrentLocation: boolean;
  
  /**
   * Whether the user should be signaled to the org in their current location.
   * True when currentLocation differs from residenceCountry AND stayDuration < 6 months.
   */
  shouldSignalToCurrentLocation: boolean;
  
  /**
   * Explanation of the determination for debugging/display.
   */
  explanation: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine the organizational relationship for a user based on territoriality rules.
 * 
 * Rules:
 * 1. User stays >= 6 months in current location → Transfer management to local org
 * 2. User stays < 6 months in different country → Signal to local org, keep original management
 * 3. User in residence country → No signaling needed
 * 
 * @param params The user's residence and location information
 * @returns Determination of organizational relationships
 */
export function determineTerritoriality(
  params: TerritorialityParams
): TerritorialityResult {
  const { residenceCountry, currentLocation, stayDuration } = params;

  // Same country = no change needed
  if (residenceCountry === currentLocation) {
    return {
      shouldTransferToCurrentLocation: false,
      shouldSignalToCurrentLocation: false,
      explanation: `L'usager réside et se trouve dans le même pays (${residenceCountry}).`,
    };
  }

  // Different country, check duration
  if (stayDuration >= RESIDENCE_THRESHOLD_MONTHS) {
    // Long stay = transfer management
    return {
      shouldTransferToCurrentLocation: true,
      shouldSignalToCurrentLocation: false,
      explanation: `Séjour de ${stayDuration} mois (≥ ${RESIDENCE_THRESHOLD_MONTHS}). L'usager devrait être rattaché à l'organisation de ${currentLocation}.`,
    };
  }

  // Short stay = signal only
  return {
    shouldTransferToCurrentLocation: false,
    shouldSignalToCurrentLocation: true,
    explanation: `Séjour temporaire de ${stayDuration} mois (< ${RESIDENCE_THRESHOLD_MONTHS}). Signalement à ${currentLocation}, rattachement maintenu à ${residenceCountry}.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a user is traveling (in a different country than residence)
 */
export function isTraveling(
  residenceCountry: CountryCode,
  currentLocation: CountryCode
): boolean {
  return residenceCountry !== currentLocation;
}

/**
 * Determine if a stay is considered long-term (>= 6 months)
 */
export function isLongTermStay(stayDuration: number): boolean {
  return stayDuration >= RESIDENCE_THRESHOLD_MONTHS;
}

// ═══════════════════════════════════════════════════════════════════════════
// DB-AWARE HELPERS — Rattachement auto-calculé depuis la base
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Priorité des types d'organisations pour la gestion consulaire d'un pays.
 * Un consulat général prime sur une ambassade quand les deux couvrent le pays.
 */
const MANAGING_ORG_TYPE_PRIORITY: Record<string, number> = {
  general_consulate: 1,
  high_commission: 2,
  embassy: 3,
  high_representation: 3,
  permanent_mission: 4,
};

function managingOrgRank(type: string): number {
  return MANAGING_ORG_TYPE_PRIORITY[type] ?? 99;
}

/**
 * Trouve l'org qui gère les affaires consulaires pour les citoyens résidant
 * dans un pays donné.
 *
 * Critères :
 *   1. Org active, non soft-deleted
 *   2. `jurisdictionCountries` inclut le pays (ou `country` équivaut au pays)
 *   3. L'org a au moins un module consulaire (orgHandlesConsularAffairs)
 *   4. En cas de plusieurs candidats : consulat général > haute commission > ambassade
 *
 * Retourne `null` si aucune org ne gère les affaires consulaires pour ce pays
 * (ex: pays sans représentation ou avec seulement une ambassade non-consulaire).
 */
export async function findManagingOrgForCountry(
  ctx: DbContext,
  country: CountryCode | string,
): Promise<Doc<"orgs"> | null> {
  const orgs = await ctx.db
    .query("orgs")
    .withIndex("by_active_notDeleted", (q) =>
      q.eq("isActive", true).eq("deletedAt", undefined),
    )
    .collect();

  const candidates = orgs.filter((org) => {
    // Doit couvrir ce pays
    const jurisdictionCountries = org.jurisdictionCountries ?? [];
    const coversCountry =
      jurisdictionCountries.includes(country as CountryCode) ||
      org.country === country;
    if (!coversCountry) return false;
    // Doit gérer les affaires consulaires
    return orgHandlesConsularAffairs(org);
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => managingOrgRank(a.type) - managingOrgRank(b.type));
  return candidates[0];
}

/**
 * Trouve l'org à signaler pour un séjour temporaire dans un pays donné.
 * Même logique que `findManagingOrgForCountry` : l'org doit gérer les
 * affaires consulaires dans le pays de séjour.
 */
export async function findSignaledOrgForCountry(
  ctx: DbContext,
  country: CountryCode | string,
): Promise<Doc<"orgs"> | null> {
  return findManagingOrgForCountry(ctx, country);
}

/**
 * Résout `managedByOrgId` et `signaledToOrgId` pour un profil à partir
 * de sa résidence et de sa localisation courante, en lisant la base.
 *
 * Retourne un objet prêt à être injecté dans un `ctx.db.patch`/`ctx.db.insert`
 * (les champs valent `null` si aucune org consulaire ne correspond).
 */
export async function resolveProfileAttachment(
  ctx: DbContext,
  params: {
    residenceCountry?: CountryCode | string | null;
    currentLocation?: CountryCode | string | null;
    stayDuration?: number;
  },
): Promise<{
  managedByOrgId: Id<"orgs"> | undefined;
  signaledToOrgId: Id<"orgs"> | undefined;
}> {
  const { residenceCountry, currentLocation, stayDuration } = params;

  if (!residenceCountry) {
    return { managedByOrgId: undefined, signaledToOrgId: undefined };
  }

  // Cas 1 : résidence seule (pas de localisation renseignée ou identique)
  if (!currentLocation || currentLocation === residenceCountry) {
    const org = await findManagingOrgForCountry(ctx, residenceCountry);
    return {
      managedByOrgId: org?._id,
      signaledToOrgId: undefined,
    };
  }

  // Cas 2 : localisation différente, séjour long → transfert
  const result = determineTerritoriality({
    residenceCountry: residenceCountry as CountryCode,
    currentLocation: currentLocation as CountryCode,
    stayDuration: stayDuration ?? 0,
  });

  if (result.shouldTransferToCurrentLocation) {
    const org = await findManagingOrgForCountry(ctx, currentLocation);
    return {
      managedByOrgId: org?._id,
      signaledToOrgId: undefined,
    };
  }

  // Cas 3 : localisation différente, séjour court → signalement
  if (result.shouldSignalToCurrentLocation) {
    const [residenceOrg, currentOrg] = await Promise.all([
      findManagingOrgForCountry(ctx, residenceCountry),
      findSignaledOrgForCountry(ctx, currentLocation),
    ]);
    return {
      managedByOrgId: residenceOrg?._id,
      signaledToOrgId: currentOrg?._id,
    };
  }

  // Fallback (même pays, pas traité ci-dessus)
  const org = await findManagingOrgForCountry(ctx, residenceCountry);
  return {
    managedByOrgId: org?._id,
    signaledToOrgId: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE HELPER — Legacy (carte pays → org pré-chargée)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate org IDs for a user based on their location.
 * Pure helper — utilise une carte pays → org pré-chargée. Préférer
 * `resolveProfileAttachment` qui lit directement depuis la base.
 *
 * @param residenceCountry The user's residence country
 * @param currentLocation The user's current location
 * @param stayDuration Duration of current stay in months
 * @param orgsByCountry A map of country codes to org IDs
 */
export function resolveOrganizationIds(
  residenceCountry: CountryCode,
  currentLocation: CountryCode,
  stayDuration: number,
  orgsByCountry: Map<CountryCode, Id<"orgs">>
): {
  managedByOrgId: Id<"orgs"> | null;
  signaledToOrgId: Id<"orgs"> | null;
} {
  const result = determineTerritoriality({
    residenceCountry,
    currentLocation,
    stayDuration,
  });

  const residenceOrg = orgsByCountry.get(residenceCountry) ?? null;
  const currentOrg = orgsByCountry.get(currentLocation) ?? null;

  if (result.shouldTransferToCurrentLocation) {
    return {
      managedByOrgId: currentOrg,
      signaledToOrgId: null,
    };
  }

  if (result.shouldSignalToCurrentLocation) {
    return {
      managedByOrgId: residenceOrg,
      signaledToOrgId: currentOrg,
    };
  }

  return {
    managedByOrgId: residenceOrg,
    signaledToOrgId: null,
  };
}
