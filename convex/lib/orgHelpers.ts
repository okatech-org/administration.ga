import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/**
 * orgHelpers — Helpers de lecture unifiée pour les orgs (Phase D2)
 *
 * Pattern : widen-migrate-narrow. Ces helpers lisent d'abord les nouveaux
 * sous-objets structurés (addresses, protocol, branding, orgCalendar) avec
 * fallback automatique sur les champs plats historiques (address, headOfMission,
 * logoUrl, openingHours).
 *
 * TOUT NOUVEAU CODE DOIT UTILISER CES HELPERS au lieu d'accéder directement
 * aux champs de `orgs`. Cela rend le futur narrow (suppression des champs
 * plats) non invasif.
 *
 * Usage :
 *   const address = getOrgAddress(org);
 *   const homName = await getOrgHeadOfMissionName(ctx, org);
 *   const schedule = await getOrgSchedule(ctx, org);
 */

type OrgDoc = Doc<"orgs">;
type ReadCtx = QueryCtx | MutationCtx | ActionCtx;

// ─── 1. Adresse ────────────────────────────────────────────

/**
 * Retourne l'adresse physique principale d'une org.
 * Priorité : `addresses.physical` > `address` (plat historique).
 */
export function getOrgAddress(
  org: OrgDoc,
): OrgDoc["address"] | null {
  if (org.addresses?.physical) {
    return org.addresses.physical;
  }
  return org.address ?? null;
}

/**
 * Retourne l'adresse postale (si différente de la physique).
 * Retourne null si pas d'adresse postale distincte.
 */
export function getOrgPostalAddress(
  org: OrgDoc,
): NonNullable<OrgDoc["addresses"]>["postal"] | null {
  return org.addresses?.postal ?? null;
}

// ─── 2. Chef de mission ────────────────────────────────────

/**
 * Retourne le nom complet du chef de mission.
 * Priorité : résolution via `protocol.headOfMissionUserId` > `headOfMission` (plat).
 */
export async function getOrgHeadOfMissionName(
  ctx: ReadCtx,
  org: OrgDoc,
): Promise<string | null> {
  if (org.protocol?.headOfMissionUserId) {
    const db = "db" in ctx ? ctx.db : null;
    if (db) {
      const user = await db.get(org.protocol.headOfMissionUserId);
      if (user) {
        const first = (user as { firstName?: string }).firstName ?? "";
        const last = (user as { lastName?: string }).lastName ?? "";
        const name = `${first} ${last}`.trim();
        return name || user.email || null;
      }
    }
  }
  return org.headOfMission ?? null;
}

/**
 * Retourne le titre du chef de mission (FR).
 * Priorité : `protocol.headOfMissionTitleFr` > `headOfMissionTitle` (plat).
 */
export function getOrgHeadOfMissionTitle(
  org: OrgDoc,
  lang: "fr" | "en" = "fr",
): string | null {
  const protocolTitle =
    lang === "en"
      ? org.protocol?.headOfMissionTitleEn ?? org.protocol?.headOfMissionTitleFr
      : org.protocol?.headOfMissionTitleFr;
  return protocolTitle ?? org.headOfMissionTitle ?? null;
}

/**
 * Retourne le grade diplomatique du chef de mission.
 */
export function getOrgHeadOfMissionGrade(org: OrgDoc): string | null {
  return org.protocol?.headOfMissionGrade ?? null;
}

// ─── 3. Logo & Branding ────────────────────────────────────

/**
 * Retourne l'URL du logo (nécessite action ctx pour générer URL signée Storage).
 * Priorité : `branding.logoStorageId` (URL signée) > `logoUrl` (URL directe).
 */
export async function getOrgLogoUrl(
  ctx: ReadCtx,
  org: OrgDoc,
): Promise<string | null> {
  if (org.branding?.logoStorageId) {
    // ActionCtx et MutationCtx ont storage.getUrl, QueryCtx aussi en V1.10+
    const storage = "storage" in ctx ? ctx.storage : null;
    if (storage) {
      try {
        const url = await storage.getUrl(org.branding.logoStorageId);
        if (url) return url;
      } catch {
        // Fall through à logoUrl
      }
    }
  }
  return org.logoUrl ?? null;
}

// ─── 4. Juridiction ────────────────────────────────────────

/**
 * Retourne la liste des pays de juridiction primaire.
 * Priorité : `jurisdiction.primary` > `jurisdictionCountries` (plat).
 */
export function getOrgJurisdictionPrimary(
  org: OrgDoc,
): string[] {
  if (org.jurisdiction?.primary && org.jurisdiction.primary.length > 0) {
    return org.jurisdiction.primary;
  }
  return (org.jurisdictionCountries ?? []) as string[];
}

// ─── 5. Horaires ───────────────────────────────────────────

/**
 * Retourne le schedule hebdomadaire par défaut d'une org.
 * Priorité : `orgCalendar.serviceHours[default]` > `orgs.openingHours` > null.
 */
export async function getOrgSchedule(
  ctx: ReadCtx,
  org: OrgDoc,
): Promise<OrgDoc["openingHours"] | null> {
  const db = "db" in ctx ? ctx.db : null;
  if (db) {
    const calendar = await db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", org._id as Id<"orgs">))
      .first();
    if (calendar) {
      const defaultEntry = (
        calendar.serviceHours as Array<{
          scopeType: string;
          schedule: OrgDoc["openingHours"];
        }>
      ).find((s) => s.scopeType === "default");
      if (defaultEntry?.schedule) {
        return defaultEntry.schedule;
      }
    }
  }
  return org.openingHours ?? null;
}

/**
 * Retourne la timezone d'une org.
 * Priorité : `orgCalendar.timezone` > `orgs.timezone`.
 */
export async function getOrgTimezone(
  ctx: ReadCtx,
  org: OrgDoc,
): Promise<string> {
  const db = "db" in ctx ? ctx.db : null;
  if (db) {
    const calendar = await db
      .query("orgCalendar")
      .withIndex("by_org", (q) => q.eq("orgId", org._id as Id<"orgs">))
      .first();
    if (calendar?.timezone) return calendar.timezone;
  }
  return org.timezone ?? "Europe/Paris";
}

// ─── 6. Statut cycle de vie ────────────────────────────────

/**
 * Retourne le statut cycle de vie d'une org.
 * Priorité : `identityExtended.status` > dérivation depuis `isActive`.
 */
export function getOrgStatus(org: OrgDoc): string {
  if (org.identityExtended?.status) {
    return org.identityExtended.status;
  }
  return org.isActive ? "active" : "inactive";
}

/**
 * Retourne true si l'org est opérationnelle (accepte les demandes citoyens).
 * Les statuts "active" et "maintenance" sont considérés comme opérationnels.
 */
export function isOrgOperational(org: OrgDoc): boolean {
  const status = getOrgStatus(org);
  return status === "active" || status === "maintenance";
}
