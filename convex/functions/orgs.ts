import { v } from "convex/values"
import { query } from "../_generated/server"
import { createInvitedUserHelper } from "../lib/users"
import { authQuery, authMutation } from "../lib/customFunctions"
import { getMembership } from "../lib/auth"
import { assertCanDoTask } from "../lib/permissions"
import { error, ErrorCode } from "../lib/errors"
import { logCortexAction } from "../lib/neocortex"
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types"
import {
  RequestStatus,
  orgTypeValidator,
  addressValidator,
  orgSettingsValidator,
  localizedStringValidator,
  orgIdentityExtendedValidator,
  orgProtocolValidator,
  orgAddressesValidator,
  orgJurisdictionValidator,
  orgBrandingValidator,
  callsConfigValidator,
  internalMailConfigValidator,
  notificationsConfigValidator,
  chatsConfigValidator,
} from "../lib/validators"
import { taskCodeValidator } from "../lib/taskCodes"
import { MODULE_ACCESS_TASKS, moduleCodeValidator } from "../lib/moduleCodes"
import { countryCodeValidator, CountryCode } from "../lib/countryCodeValidator"
import { canDoTask } from "../lib/permissions"
import {
  requestsByOrg,
  membershipsByOrg,
  orgServicesByOrg,
  appointmentsByOrg,
} from "../lib/aggregates"
import {
  getOrgSchedule,
  getOrgAddress,
  getOrgHeadOfMissionName,
  getOrgLogoUrl,
  getOrgTimezone,
  getOrgStatus,
  isOrgOperational,
} from "../lib/orgHelpers"

/**
 * List all active organizations
 */
export const list = query({
  args: {
    type: v.optional(orgTypeValidator),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined)
      )
      .take(200)

    // Filter by type/country if provided
    if (args.type) {
      orgs = orgs.filter((org) => org.type === args.type)
    }
    if (args.country) {
      orgs = orgs.filter((org) => org.country === args.country)
    }

    return orgs
  },
})

/**
 * List organizations by jurisdiction country
 * Returns consulates/embassies whose jurisdiction includes the given country
 */
export const listByJurisdiction = query({
  args: {
    residenceCountry: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active orgs
    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined)
      )
      .take(200)

    // Filter to consulates/embassies that have this country in their jurisdiction
    const consulateTypes = ["embassy", "consulate", "general_consulate"]

    return orgs.filter((org) => {
      if (!consulateTypes.includes(org.type)) return false
      if (!org.jurisdictionCountries || org.jurisdictionCountries.length === 0)
        return false
      return org.jurisdictionCountries.includes(
        args.residenceCountry as CountryCode
      )
    })
  },
})

/**
 * Get organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()

    if (org?.deletedAt) return null
    return org
  },
})

/**
 * Get organization by ID
 */
export const getById = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId)
    if (org?.deletedAt) return null
    return org
  },
})

/**
 * Phase F2.1 — Query unifiée qui retourne l'org avec TOUS les champs dérivés
 * (adresse, horaires, chef de mission, logo, timezone, status) calculés via
 * les helpers `orgHelpers.ts`. Centralise les lectures en un seul point.
 *
 * À utiliser au lieu de `getById` quand le client a besoin des champs dérivés
 * pour éviter les lectures directes de champs dépréciés (`openingHours`,
 * `logoUrl`, `headOfMission`, `address`).
 *
 * Usage :
 *   const { data: org } = useAuthenticatedConvexQuery(
 *     api.functions.orgs.getDetailedById,
 *     { orgId }
 *   );
 *   const address = org?._derived.address;
 *   const schedule = org?._derived.schedule;
 */
export const getDetailedById = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId)
    if (!org || org.deletedAt) return null

    const [address, schedule, headOfMissionName, logoUrl, timezone] =
      await Promise.all([
        Promise.resolve(getOrgAddress(org)),
        getOrgSchedule(ctx, org),
        getOrgHeadOfMissionName(ctx, org),
        getOrgLogoUrl(ctx, org),
        getOrgTimezone(ctx, org),
      ])

    return {
      ...org,
      _derived: {
        address,
        schedule,
        headOfMissionName,
        logoUrl,
        timezone,
        status: getOrgStatus(org),
        isOperational: isOrgOperational(org),
      },
    }
  },
})

/**
 * Phase E.4 — Query publique qui retourne le schedule unifié d'une org,
 * en passant par le helper (orgCalendar > openingHours fallback).
 *
 * À utiliser côté admin (backoffice + agent-web) au lieu de lire
 * `org.openingHours` directement.
 */
export const getSchedule = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId)
    if (!org || org.deletedAt) return null
    return await getOrgSchedule(ctx, org)
  },
})

/**
 * Create a new organization
 */
export const create = authMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    type: orgTypeValidator,
    country: countryCodeValidator,
    timezone: v.string(),
    address: addressValidator,
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    // Positions to create (pre-filled from template, possibly edited)
    positions: v.optional(
      v.array(
        v.object({
          code: v.string(),
          title: localizedStringValidator,
          description: v.optional(localizedStringValidator),
          level: v.number(),
          grade: v.optional(v.string()),
          tasks: v.array(taskCodeValidator),
          isRequired: v.optional(v.boolean()),
        })
      )
    ),
    // Template type used for position initialization
    templateType: v.optional(v.string()),
    // Modules activated for this org (from template defaults)
    modules: v.optional(v.array(moduleCodeValidator)),
  },
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()

    if (existing) {
      throw error(ErrorCode.ORG_SLUG_EXISTS)
    }

    const { positions, templateType, modules, ...orgData } = args

    const orgId = await ctx.db.insert("orgs", {
      ...orgData,
      modules: modules,
      isActive: true,
      updatedAt: Date.now(),
    })

    // Add creator as member (position assigned separately)
    await ctx.db.insert("memberships", {
      orgId,
      userId: ctx.user._id,
    })

    // Create positions from template/edited list
    if (positions && positions.length > 0) {
      const now = Date.now()
      for (const pos of positions) {
        await ctx.db.insert("positions", {
          orgId,
          code: pos.code,
          title: pos.title,
          description: pos.description,
          level: pos.level,
          grade: pos.grade,
          tasks: pos.tasks,
          isRequired: pos.isRequired ?? false,
          isActive: true,
          createdBy: ctx.user._id,
          updatedAt: now,
        })
      }
    }

    await logCortexAction(ctx, {
      action: "CREATE_ORG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: orgId,
      userId: ctx.user._id,
      apres: { name: args.name, slug: args.slug, type: args.type },
      signalType: SIGNAL_TYPES.ORG_CREEE,
    })

    return orgId
  },
})

/**
 * Update organization details
 */
export const update = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.optional(v.string()),
    address: v.optional(addressValidator),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    timezone: v.optional(v.string()),
    settings: v.optional(orgSettingsValidator),
    logoUrl: v.optional(v.string()),
    jurisdictionCountries: v.optional(v.array(countryCodeValidator)),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    const { orgId, ...updates } = args

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    await ctx.db.patch(orgId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: orgId,
      userId: ctx.user._id,
      apres: cleanUpdates,
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return orgId
  },
})

// ============================================================================
// PHASE 1 — Mutations granulaires par section (paramétrage représentation)
// ============================================================================
// Chaque mutation met à jour un sous-objet spécifique pour permettre l'auto-save
// par section dans l'UI (SettingsTabsLayout). Toutes vérifient settings.manage.
// ============================================================================

/**
 * Met à jour le bloc identité étendue (accréditation, cycle de vie).
 *
 * Le nom multilingue n'est plus géré ici — voir `updateOrgName` qui maintient
 * `name` (string plate) + `nameI18n` (LocalizedString) en cohérence.
 */
export const updateIdentityExtended = authMutation({
  args: {
    orgId: v.id("orgs"),
    identityExtended: orgIdentityExtendedValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await ctx.db.patch(args.orgId, {
      identityExtended: args.identityExtended,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_IDENTITY",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { identityExtended: args.identityExtended },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour le nom multilingue d'une organisation.
 *
 * `nameI18n` est la source de vérité éditée. Le champ plat `name` est
 * maintenu en cohérence (locale "fr" en priorité, sinon première locale
 * non vide) pour rétrocompatibilité avec tous les call-sites qui lisent
 * encore `org.name` directement.
 */
export const updateOrgName = authMutation({
  args: {
    orgId: v.id("orgs"),
    nameI18n: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    // Filtrer les locales vides
    const cleaned: Record<string, string> = {}
    for (const [locale, value] of Object.entries(args.nameI18n)) {
      const trimmed = value.trim()
      if (trimmed) cleaned[locale] = trimmed
    }
    if (Object.keys(cleaned).length === 0) {
      throw new Error("Au moins une langue doit être renseignée pour le nom de l'organisation.")
    }

    // Locale canonique : fr en priorité, sinon première locale non vide
    const canonicalName = cleaned.fr ?? Object.values(cleaned)[0]

    await ctx.db.patch(args.orgId, {
      name: canonicalName,
      nameI18n: cleaned,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_IDENTITY",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { name: canonicalName, nameI18n: cleaned },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour le protocole diplomatique (chef de poste, grade, credentials).
 */
export const updateProtocol = authMutation({
  args: {
    orgId: v.id("orgs"),
    protocol: orgProtocolValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    // Validation : si headOfMissionMembershipId fourni, il doit exister pour cette org
    if (args.protocol.headOfMissionMembershipId) {
      const hom = await ctx.db.get(args.protocol.headOfMissionMembershipId)
      if (!hom || hom.orgId !== args.orgId) {
        throw error(
          ErrorCode.VALIDATION_ERROR,
          "Le chef de poste doit être membre de cette représentation"
        )
      }
    }

    await ctx.db.patch(args.orgId, {
      protocol: args.protocol,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_PROTOCOL",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { protocol: args.protocol },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour les adresses structurées (physique + postale + correspondance).
 * Garde aussi `orgs.address` synchronisé avec `addresses.physical` pour la
 * rétrocompatibilité avec le code qui lit encore le champ plat.
 */
export const updateAddresses = authMutation({
  args: {
    orgId: v.id("orgs"),
    addresses: orgAddressesValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await ctx.db.patch(args.orgId, {
      addresses: args.addresses,
      // Sync du champ plat historique pour compatibilité ascendante
      address: args.addresses.physical,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_ADDRESSES",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { addresses: args.addresses },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour la juridiction enrichie (primaire, secondaire, sous-juridictions).
 * Garde aussi `orgs.jurisdictionCountries` synchronisé avec `jurisdiction.primary`
 * pour la rétrocompatibilité.
 */
export const updateJurisdiction = authMutation({
  args: {
    orgId: v.id("orgs"),
    jurisdiction: orgJurisdictionValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    // Validation : les sous-juridictions doivent pointer vers des orgs existantes si fournies
    if (args.jurisdiction.subJurisdictions) {
      for (const sub of args.jurisdiction.subJurisdictions) {
        if (sub.honoraryConsulateOrgId) {
          const ref = await ctx.db.get(sub.honoraryConsulateOrgId)
          if (!ref) {
            throw error(
              ErrorCode.VALIDATION_ERROR,
              `Consulat honoraire introuvable pour la sous-juridiction "${sub.name}"`
            )
          }
        }
      }
    }

    await ctx.db.patch(args.orgId, {
      jurisdiction: args.jurisdiction,
      jurisdictionCountries: args.jurisdiction.primary,
      jurisdictionNotes: args.jurisdiction.notes,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_JURISDICTION",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { jurisdiction: args.jurisdiction },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour le branding (logo, couleurs, photos, réseaux sociaux, description publique).
 */
export const updateBranding = authMutation({
  args: {
    orgId: v.id("orgs"),
    branding: orgBrandingValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await ctx.db.patch(args.orgId, {
      branding: args.branding,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_BRANDING",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { branding: args.branding },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Change le statut de cycle de vie d'une représentation (active/maintenance/archived/...).
 * Met à jour uniquement identityExtended.status pour audit clair.
 */
export const updateStatus = authMutation({
  args: {
    orgId: v.id("orgs"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("draft"),
      v.literal("maintenance"),
      v.literal("archived"),
      v.literal("suspended")
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    const org = await ctx.db.get(args.orgId)
    if (!org) throw error(ErrorCode.NOT_FOUND, "Représentation introuvable")

    const currentIdentity = org.identityExtended ?? {}
    const newIdentity = { ...currentIdentity, status: args.status }

    // Synchronise le flag historique isActive
    const isActive = args.status === "active" || args.status === "maintenance"

    await ctx.db.patch(args.orgId, {
      identityExtended: newIdentity,
      isActive,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_STATUS",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { status: args.status, reason: args.reason, isActive },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

// ============================================================================
// PHASE A4 — Validation cascade désactivation module
// ============================================================================

/**
 * Analyse l'impact d'une désactivation de module pour une org.
 *
 * Retourne :
 *   - positions ayant des tasks de ce module (count + liste de codes)
 *   - orgServices actifs liés à ce module (count)
 *   - requests en cours non clôturées sur ces services (count)
 *
 * Utilisé pour afficher une modale de confirmation avant désactivation.
 */
export const getModuleImpactAnalysis = authQuery({
  args: {
    orgId: v.id("orgs"),
    moduleCode: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.view")

    // 1. Positions ayant des tasks préfixées par "{moduleCode}."
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect()

    // Récupère les préfixes de tasks legacy associés au module canonique
    // (ex: consular_affairs → ["requests", "consular_registrations", "passports", ...])
    const moduleTaskPrefixes = new Set<string>()
    const mapping = MODULE_ACCESS_TASKS[args.moduleCode as keyof typeof MODULE_ACCESS_TASKS]
    if (mapping) {
      for (const level of ["reader", "editor", "admin"] as const) {
        for (const t of mapping[level] ?? []) {
          const prefix = t.split(".")[0]
          if (prefix) moduleTaskPrefixes.add(prefix)
        }
      }
    }

    const positionsImpacted = positions
      .filter((p) => !p.deletedAt)
      .filter((p) => {
        const tasks = (p as { tasks?: string[] }).tasks ?? []
        const moduleAccess =
          (p as { moduleAccess?: { moduleCode: string }[] }).moduleAccess ?? []
        return (
          tasks.some((t: string) => {
            const prefix = t.split(".")[0]
            return prefix && moduleTaskPrefixes.has(prefix)
          }) ||
          moduleAccess.some((m) => m.moduleCode === args.moduleCode)
        )
      })
      .map((p) => ({
        positionId: p._id,
        title: (p as { title?: { fr?: string; en?: string } }).title,
        code: (p as { code?: string }).code,
      }))

    // 2. orgServices actifs dont la catégorie correspond au module
    // Les catégories ServiceCategory mappent généralement aux moduleCodes
    // (ex: "passports" module ↔ "passport" category ↔ services passport)
    const orgServices = await ctx.db
      .query("orgServices")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId))
      .collect()

    const services = await Promise.all(
      orgServices
        .filter((os) => os.isActive !== false)
        .map(async (os) => {
          const service = await ctx.db.get(os.serviceId)
          return { os, service }
        })
    )

    const servicesImpacted = services.filter(({ service }) => {
      if (!service) return false
      const cat = (service as { category?: string }).category ?? ""
      // Heuristique : module "passports" couvre catégorie "passport", etc.
      return (
        cat === args.moduleCode ||
        cat === args.moduleCode.replace(/s$/, "") ||
        `${cat}s` === args.moduleCode
      )
    })

    // 3. Requests en cours sur ces services
    const serviceIds = servicesImpacted.map(({ os }) => os.serviceId)
    let requestsCount = 0
    if (serviceIds.length > 0) {
      const allRequests = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
        .collect()
      requestsCount = allRequests.filter((r) => {
        const status = (r as { status?: string }).status
        const sId = (r as { serviceId?: unknown }).serviceId
        return (
          status !== RequestStatus.Completed &&
          status !== RequestStatus.Cancelled &&
          serviceIds.some((id) => id === sId)
        )
      }).length
    }

    return {
      moduleCode: args.moduleCode,
      positionsCount: positionsImpacted.length,
      positions: positionsImpacted,
      servicesCount: servicesImpacted.length,
      services: servicesImpacted.map(({ os, service }) => ({
        orgServiceId: os._id,
        serviceId: os.serviceId,
        name: (service as { name?: { fr?: string; en?: string } } | null)?.name,
      })),
      requestsCount,
      hasImpact:
        positionsImpacted.length > 0 ||
        servicesImpacted.length > 0 ||
        requestsCount > 0,
    }
  },
})

// ============================================================================
// PHASE 2 — Mutations config Communication
// ============================================================================

/**
 * Helper pour merger un sous-objet dans orgSettings sans écraser les autres.
 */
async function patchOrgSettings(
  ctx: any,
  orgId: any,
  patch: Record<string, unknown>
) {
  const org = await ctx.db.get(orgId)
  if (!org) throw error(ErrorCode.NOT_FOUND, "Représentation introuvable")

  const currentSettings = (org.settings ?? {
    appointmentBuffer: 24,
    maxActiveRequests: 10,
    workingHours: {},
  }) as Record<string, unknown>

  await ctx.db.patch(orgId, {
    settings: { ...currentSettings, ...patch },
    updatedAt: Date.now(),
  })
}

/**
 * Met à jour la config iAppel globale (ring timeout, recording, fallback).
 */
export const updateCallsConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    calls: callsConfigValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await patchOrgSettings(ctx, args.orgId, { calls: args.calls })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_CALLS_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { calls: args.calls },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour la config iBoîte (tampons, signatures, templates, auto-répondeur).
 */
export const updateInternalMailConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    internalMail: internalMailConfigValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await patchOrgSettings(ctx, args.orgId, { internalMail: args.internalMail })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_INTERNAL_MAIL_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { internalMail: args.internalMail },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour la config notifications (canaux, events, quiet hours, escalation).
 */
export const updateNotificationsConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    notifications: notificationsConfigValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await patchOrgSettings(ctx, args.orgId, {
      notifications: args.notifications,
    })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_NOTIFICATIONS_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { notifications: args.notifications },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Met à jour la config chats (routage standard, auto-archive).
 */
export const updateChatsConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    chats: chatsConfigValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    await patchOrgSettings(ctx, args.orgId, { chats: args.chats })

    await logCortexAction(ctx, {
      action: "UPDATE_ORG_CHATS_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { chats: args.chats },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return args.orgId
  },
})

/**
 * Get organization members
 */
export const getMembers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined)
      )
      .collect()

    const activeMembers = memberships

    // Batch fetch users
    const userIds = [...new Set(activeMembers.map((m) => m.userId))]
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)))
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]))

    // Batch fetch positions
    const positionIds = [
      ...new Set(
        activeMembers.map((m) => m.positionId).filter((id) => id !== undefined)
      ),
    ] as NonNullable<(typeof activeMembers)[0]["positionId"]>[]
    const positions = await Promise.all(positionIds.map((id) => ctx.db.get(id)))
    const positionMap = new Map(
      positions.filter(Boolean).map((p) => [p!._id, p!])
    )

    return activeMembers
      .map((membership) => {
        const user = userMap.get(membership.userId)
        if (!user) return null
        const positionTitle = membership.positionId
          ? (positionMap.get(membership.positionId) as any)?.title
          : undefined

        return {
          ...user,
          membershipId: membership._id,
          positionId: membership.positionId,
          positionTitle,
          joinedAt: membership._creationTime,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  },
})

/**
 * List diplomatic members of a specific org with enriched profiles.
 * Used by team page (chef de mission view) and backoffice org detail.
 * Requires team.view permission.
 */
export const listOrgDiplomaticMembers = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, callerMembership, "team.view")

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect()

    const activeMembers = memberships.filter(
      (m) => !m.deletedAt && m.positionId
    )

    const enriched = await Promise.all(
      activeMembers.map(async (m) => {
        const [user, position] = await Promise.all([
          ctx.db.get(m.userId),
          m.positionId ? ctx.db.get(m.positionId) : null,
        ])

        return {
          membershipId: m._id,
          diplomaticProfile: (m as any).diplomaticProfile ?? null,
          isPublicContact: m.isPublicContact,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                firstName: (user as any).firstName,
                lastName: (user as any).lastName,
                avatarUrl: (user as any).avatarUrl,
              }
            : null,
          position: position
            ? {
                _id: position._id,
                code: position.code,
                title: position.title,
                grade: position.grade,
                level: position.level,
              }
            : null,
        }
      })
    )

    return enriched.filter((m) => m.user !== null)
  },
})

/**
 * Get org chart data: positions with occupants + unassigned members.
 * Used by the team/org chart page.
 */
export const getOrgChart = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "org.view")

    // 1. Get all positions for this org
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    // 2. Get all active memberships for this org
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined)
      )
      .collect()
    const activeMembers = memberships

    // 3. Batch fetch users
    const userIds = [...new Set(activeMembers.map((m) => m.userId))]
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)))
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]))

    // Build map of active position IDs to easily check validity
    const activePositionIds = new Set(positions.map((p) => p._id as string))

    // 4. Build a map: positionId → array of membership+user
    const validPositionIds = new Set(positions.map((p) => p._id))
    const positionOccupants = new Map<
      string,
      Array<{
        membership: (typeof activeMembers)[0]
        user: NonNullable<(typeof users)[0]>
      }>
    >()
    const assignedMembershipIds = new Set<string>()

    for (const m of activeMembers) {
      if (m.positionId && validPositionIds.has(m.positionId as any)) {
        const user = userMap.get(m.userId)
        if (user) {
          const posId = m.positionId as string
          if (!positionOccupants.has(posId)) {
            positionOccupants.set(posId, [])
          }
          positionOccupants.get(posId)!.push({ membership: m, user })
          assignedMembershipIds.add(m._id as string)
        }
      }
    }

    // 5. Build position list with occupants
    const positionsWithOccupants = positions
      .sort((a, b) => (a.level ?? 99) - (b.level ?? 99))
      .map((pos) => {
        const occupantsData = positionOccupants.get(pos._id as string) || []
        const occupants = occupantsData.map((occ) => ({
          userId: occ.user._id,
          name: occ.user.name,
          firstName: occ.user.firstName,
          lastName: occ.user.lastName,
          email: occ.user.email,
          avatarUrl: occ.user.avatarUrl,
          membershipId: occ.membership._id,
        }))
        return {
          _id: pos._id,
          code: pos.code,
          title: pos.title,
          description: pos.description,
          level: pos.level,
          grade: pos.grade,
          isRequired: pos.isRequired,
          tasks: pos.tasks,
          occupants: occupants,
          // Keep occupant for backwards compatibility temporarily
          occupant: occupants.length > 0 ? occupants[0] : null,
        }
      })

    // 6. Unassigned members (members without a positionId)
    const unassignedMembers = activeMembers
      .filter((m) => !assignedMembershipIds.has(m._id as string))
      .map((m) => {
        const user = userMap.get(m.userId)
        if (!user) return null
        return {
          userId: user._id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          membershipId: m._id,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    return {
      positions: positionsWithOccupants,
      unassignedMembers,
      totalPositions: positions.length,
      filledPositions: positionOccupants.size,
      vacantPositions: positions.length - positionOccupants.size,
    }
  },
})

/**
 * Add member to organization
 */
export const addMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
    positionId: v.optional(v.id("positions")),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage")

    // Check if already member
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q
          .eq("userId", args.userId)
          .eq("orgId", args.orgId)
          .eq("deletedAt", undefined)
      )
      .unique()

    if (existing) {
      throw error(ErrorCode.MEMBER_ALREADY_EXISTS)
    }

    // Validate position belongs to org if provided
    if (args.positionId) {
      const position = await ctx.db.get(args.positionId)
      if (!position || position.orgId !== args.orgId) {
        throw error(ErrorCode.POSITION_NOT_FOUND)
      }

      // Unassign any existing holder ONLY if the position is unique
      if (position.isUnique) {
        const existingHolder = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .filter((q) =>
            q.and(
              q.eq(q.field("positionId"), args.positionId),
              q.eq(q.field("deletedAt"), undefined)
            )
          )
          .first()

        if (existingHolder) {
          await ctx.db.patch(existingHolder._id, { positionId: undefined })
        }
      }
    }

    const membershipId = await ctx.db.insert("memberships", {
      orgId: args.orgId,
      userId: args.userId,
      positionId: args.positionId,
    })

    // Audit création membership (Phase D4)
    await logCortexAction(ctx, {
      action: "ADD_MEMBER",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "memberships",
      entiteId: membershipId,
      userId: ctx.user._id,
      apres: {
        orgId: args.orgId,
        userId: args.userId,
        positionId: args.positionId,
      },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    // Auto-créer la ligne personnelle (iAppel) si elle n'existe pas encore
    const existingPersonal = await ctx.db
      .query("callLines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .first()

    if (!existingPersonal) {
      const user = await ctx.db.get(args.userId)
      const label = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.email ||
          "Agent"
        : "Agent"
      const callLineId = await ctx.db.insert("callLines", {
        type: "personal",
        orgId: args.orgId,
        label,
        priority: 999,
        isActive: true,
        membershipIds: [membershipId],
        userId: args.userId,
      })

      // Audit auto-création ligne iAppel (Phase D4)
      await logCortexAction(ctx, {
        action: "AUTO_CREATE_PERSONAL_CALL_LINE",
        categorie: CATEGORIES_ACTION.METIER,
        entiteType: "callLines",
        entiteId: callLineId,
        userId: ctx.user._id,
        apres: {
          trigger: "addMember",
          orgId: args.orgId,
          userId: args.userId,
          membershipId,
        },
        signalType: SIGNAL_TYPES.ORG_MODIFIEE,
      })
    }

    return membershipId
  },
})

// updateMemberRole — REMOVED: use assignPosition instead (position-based permissions)

/**
 * Assign a position to a member (or remove position assignment)
 */
export const assignMemberPosition = authMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    positionId: v.optional(v.union(v.id("positions"), v.null())),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage")

    const membership = await ctx.db.get(args.membershipId)
    if (
      !membership ||
      membership.orgId !== args.orgId ||
      membership.deletedAt
    ) {
      throw error(ErrorCode.MEMBER_NOT_FOUND)
    }

    // Normaliser null → undefined (retirer la position)
    const positionId = args.positionId ?? undefined

    // If assigning a position, validate it belongs to this org
    if (positionId) {
      const position = await ctx.db.get(positionId)
      if (!position || position.orgId !== args.orgId) {
        throw new Error("Position not found in this organization")
      }

      // Check if another member already holds this position, ONLY if unique
      if (position.isUnique) {
        const existingHolder = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .filter((q) =>
            q.and(
              q.eq(q.field("positionId"), positionId),
              q.eq(q.field("deletedAt"), undefined),
              q.neq(q.field("_id"), args.membershipId)
            )
          )
          .first()

        if (existingHolder) {
          // Unassign the previous holder
          await ctx.db.patch(existingHolder._id, { positionId: undefined })
        }
      }
    }

    await ctx.db.patch(args.membershipId, { positionId })
    return args.membershipId
  },
})

/**
 * Remove member from organization
 */
export const removeMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage")

    // Cannot remove self
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF)
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q
          .eq("userId", args.userId)
          .eq("orgId", args.orgId)
          .eq("deletedAt", undefined)
      )
      .unique()

    if (!membership) {
      throw error(ErrorCode.MEMBER_NOT_FOUND)
    }

    // Soft delete
    await ctx.db.patch(membership._id, { deletedAt: Date.now() })
    return true
  },
})

/**
 * Get organization stats — uses Aggregate for O(log n) counts.
 */
export const getStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, membership, "org.view")

    const ns = args.orgId as string

    // All counts via Aggregate component — O(log n) each
    const [
      memberCount,
      pendingRequests,
      activeServices,
      scheduledAppointments,
    ] = await Promise.all([
      membershipsByOrg.count(ctx, { namespace: ns }),
      requestsByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: [RequestStatus.Pending] },
      }),
      orgServicesByOrg.count(ctx, {
        namespace: ns,
        bounds: { eq: 1 }, // isActive = true → sortKey = 1
      }),
      appointmentsByOrg.count(ctx, {
        namespace: ns,
        bounds: { prefix: ["scheduled"] },
      }),
    ])

    return {
      memberCount,
      pendingRequests,
      activeServices,
      upcomingAppointments: scheduledAppointments,
      updatedAt: Date.now(),
    }
  },
})

/**
 * Check if the current user can manage org settings (admin-level)
 */
export const isUserAdmin = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    if (ctx.user.isSuperadmin) return true

    const membership = await getMembership(ctx, ctx.user._id, args.orgId)
    return await canDoTask(ctx, ctx.user, membership, "settings.manage")
  },
})

/**
 * Get current user's position in the organization
 */
export const getMyPosition = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q
          .eq("userId", ctx.user._id)
          .eq("orgId", args.orgId)
          .eq("deletedAt", undefined)
      )
      .unique()

    if (!membership?.positionId) return null

    const position = await ctx.db.get(membership.positionId)
    if (!position || !position.isActive) return null

    return {
      positionId: position._id,
      code: position.code,
      title: position.title,
      level: position.level,
      grade: position.grade,
    }
  },
})

/**
 * Create a new user account (invite flow)
 */
export const createAccount = authMutation({
  args: {
    orgId: v.id("orgs"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId)
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage")

    const { email, firstName, lastName } = args
    const name = `${firstName} ${lastName}`

    // Call helper directly to avoid circular dependency
    const userId = await createInvitedUserHelper(
      ctx,
      email,
      name,
      firstName,
      lastName
    )

    return { userId }
  },
})

// ============================================================================
// ATTRIBUTION DE MODÈLES DE DOCUMENTS
// ============================================================================
//
// Permet à un super-admin d'attribuer explicitement des `documentTemplates`
// à une représentation précise — en complément du mécanisme d'applicabilité
// par type (`applicability` / `applicableOrgTypes`). Le résolveur de
// `listByOrg` effectue l'union des deux sources.

/**
 * Remplace intégralement la liste des modèles attribués à une représentation.
 * Permission : super-admin uniquement (c'est une décision de curation globale).
 */
export const assignTemplates = authMutation({
  args: {
    orgId: v.id("orgs"),
    templateIds: v.array(v.id("documentTemplates")),
  },
  handler: async (ctx, args) => {
    // Super-admin only (réutilise la gate de gestion des modèles globaux).
    const { assertCanManageGlobalTemplates } =
      await import("../lib/documentPermissions")
    assertCanManageGlobalTemplates(ctx.user)

    const org = await ctx.db.get(args.orgId)
    if (!org) throw error(ErrorCode.NOT_FOUND, "Représentation introuvable")

    // Vérifie que chaque template existe et est actif (évite les IDs orphelins).
    for (const id of args.templateIds) {
      const tpl = await ctx.db.get(id)
      if (!tpl) {
        throw error(ErrorCode.VALIDATION_ERROR, `Modèle introuvable : ${id}`)
      }
      if (!tpl.isActive) {
        throw error(
          ErrorCode.VALIDATION_ERROR,
          `Modèle archivé — impossible à attribuer : ${id}`
        )
      }
    }

    // Déduplique avant d'écrire.
    const deduped = Array.from(new Set(args.templateIds))

    await ctx.db.patch(args.orgId, {
      assignedTemplateIds: deduped,
      updatedAt: Date.now(),
    })

    await logCortexAction(ctx, {
      action: "ASSIGN_TEMPLATES",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgs",
      entiteId: args.orgId,
      userId: ctx.user._id,
      apres: { assignedTemplateIds: deduped },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    })

    return { orgId: args.orgId, count: deduped.length }
  },
})

/**
 * Retourne les modèles explicitement attribués à une représentation, enrichis
 * avec leur nom/type pour l'affichage direct. N'inclut PAS les modèles
 * visibles via l'applicabilité globale (cf. `documentTemplates.listByOrg`).
 */
export const listAssignedTemplates = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId)
    if (!org) return []
    const ids = org.assignedTemplateIds ?? []
    const templates = await Promise.all(ids.map((id) => ctx.db.get(id)))
    return templates
      .filter(
        (t): t is NonNullable<typeof t> => t !== null && t.isActive === true
      )
      .map((t) => ({
        _id: t._id,
        name: t.name,
        description: t.description,
        templateType: t.templateType,
        version: t.version,
        isGlobal: t.isGlobal,
      }))
  },
})

/**
 * Attribution par lot : attribue un ensemble de modèles à plusieurs
 * représentations en une seule transaction. Chaque org voit son tableau
 * `assignedTemplateIds` enrichi (union, pas remplacement) pour éviter
 * qu'une attribution en lot n'efface des attributions existantes.
 */
export const bulkAssignTemplates = authMutation({
  args: {
    orgIds: v.array(v.id("orgs")),
    templateIds: v.array(v.id("documentTemplates")),
    /** Si true, remplace l'attribution existante au lieu de l'enrichir. */
    replace: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { assertCanManageGlobalTemplates } =
      await import("../lib/documentPermissions")
    assertCanManageGlobalTemplates(ctx.user)

    // Vérifie que chaque template existe et est actif.
    for (const id of args.templateIds) {
      const tpl = await ctx.db.get(id)
      if (!tpl || !tpl.isActive) {
        throw error(
          ErrorCode.VALIDATION_ERROR,
          `Modèle introuvable ou archivé : ${id}`
        )
      }
    }

    let updated = 0
    for (const orgId of args.orgIds) {
      const org = await ctx.db.get(orgId)
      if (!org) continue
      const existing = org.assignedTemplateIds ?? []
      const next = args.replace
        ? Array.from(new Set(args.templateIds))
        : Array.from(new Set([...existing, ...args.templateIds]))
      await ctx.db.patch(orgId, {
        assignedTemplateIds: next,
        updatedAt: Date.now(),
      })
      updated += 1
    }

    return { updated, count: args.templateIds.length }
  },
})
