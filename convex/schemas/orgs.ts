import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  orgTypeValidator,
  ministrySubTypeValidator,
  addressValidator,
  orgSettingsValidator,
  weeklyScheduleValidator,
  orgIdentityExtendedValidator,
  orgProtocolValidator,
  orgAddressesValidator,
  orgJurisdictionValidator,
  orgBrandingValidator,
  localizedStringValidator,
} from "../lib/validators";
import { countryCodeValidator } from "../lib/countryCodeValidator";

/**
 * Organizations table - consulats/ambassades
 *
 * Historique : les champs "plats" historiques (address, email, phone, jurisdictionCountries,
 * headOfMission, logoUrl, description) restent en place pour compatibilité. Les nouveaux
 * sous-objets optionnels (identityExtended, protocol, addresses, jurisdiction, branding)
 * les enrichissent et sont destinés à devenir la source de vérité après migration complète
 * (pattern widen-migrate-narrow).
 */
export const orgsTable = defineTable({
  // Identité
  slug: v.string(),
  // Nom plat (canonique en français, conservé pour compatibilité avec tous
  // les call-sites qui attendent une string). Utiliser `getOrgName(org, locale)`
  // pour la lecture i18n-aware — il préfère `nameI18n` quand présent.
  name: v.string(),
  // Nom multilingue (Record<localeCode, string>). Source de vérité pour
  // l'édition multilingue ; `name` est synchronisé sur la locale "fr" ou,
  // à défaut, la première locale renseignée.
  nameI18n: v.optional(localizedStringValidator),
  type: orgTypeValidator,
  // Sous-type ministère (renseigné uniquement si type === "ministry").
  // Détermine le template de postes et les modules pré-activés (foreign_affairs
  // pour le MAE, justice/finance/interior pour les autres ministères futurs).
  ministrySubType: v.optional(ministrySubTypeValidator),
  // Hiérarchie organique : un consulat/ambassade peut être rattaché à un
  // ministère de tutelle. Validé côté mutation : parent doit être de type
  // "ministry". Aucune contrainte cyclique car arborescence à 2 niveaux max
  // côté diplomatique ; jusqu'à 4 niveaux côté administration nationale.
  parentOrgId: v.optional(v.id("orgs")),

  // Niveau hiérarchique dans la pyramide institutionnelle (Phase 1
  // administration.ga). Optionnel pour tolérer les rows existantes
  // (pattern widen-migrate-narrow) ; la migration
  // `backfillTutelleLevel` le calcule pour toutes les orgs existantes.
  //
  //   0 = souverain (Présidence, Vice-Présidence, Parlement, Cour suprême,
  //                  AAI, institution consultative — pas de tutelle)
  //   1 = ministère ou ministère délégué (rattaché à la Présidence)
  //   2 = direction générale / établissement public / agence nationale /
  //       collectivité locale (rattaché à un ministère)
  //   3 = service / sous-direction / bureau d'ordre (rattaché à une DG)
  //
  // Les types diplomatiques héritent du même schéma : ambassade/consulat
  // rattaché au MAE → tutelleLevel = 2.
  tutelleLevel: v.optional(v.number()),

  // Localisation (champs historiques - à migrer vers `addresses` et `jurisdiction`)
  country: countryCodeValidator,
  timezone: v.string(),
  address: addressValidator,
  jurisdictionCountries: v.optional(v.array(countryCodeValidator)),

  // Contact (historique)
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  fax: v.optional(v.string()),
  website: v.optional(v.string()),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),

  // @deprecated Phase E.4 — utiliser `orgCalendar.serviceHours` + helper
  // `getOrgSchedule(ctx, org)` au lieu de lire ce champ directement.
  // Maintenu en écriture uniquement via cron `syncLegacyOrgFields`.
  // Suppression planifiée en Phase F (après migration citizen-web).
  openingHours: v.optional(weeklyScheduleValidator),

  // Logo (historique - à migrer vers `branding.logoStorageId`)
  logoUrl: v.optional(v.string()),

  // Config
  settings: v.optional(orgSettingsValidator),

  // Diplomatic post info (historique - à migrer vers `protocol`)
  shortName: v.optional(v.string()), // Short display name
  headOfMission: v.optional(v.string()), // Name of head of mission
  headOfMissionTitle: v.optional(v.string()), // Title (Ambassadeur, Consul Général...)
  staffCount: v.optional(v.number()), // Staff count
  // Active feature modules. Stocké comme `string[]` (et non `moduleCodeValidator[]`)
  // pour tolérer les codes legacy hérités d'anciens schémas (ex: "intelligence",
  // "requests", "profiles", etc. fusionnés depuis dans les codes canoniques).
  // Les nouveaux writes passent par les API publiques qui valident toujours
  // contre `moduleCodeValidator`. Une migration `migrations.cleanupLegacyOrgModules`
  // nettoie ces tableaux ; cette tolérance reste comme filet de sécurité.
  modules: v.optional(v.array(v.string())),
  // Configuration modulaire enrichie avec capabilities/sous-modules par module.
  // Même tolérance legacy : `moduleCode` accepté comme string brut.
  orgModuleConfig: v.optional(v.array(v.object({
    moduleCode: v.string(),
    enabled: v.boolean(),
    capabilities: v.optional(v.array(v.string())),
    // Flag legacy : indique qu'un module a été activé hors-template (action
    // manuelle d'un admin). Présent sur d'anciennes rangées, conservé pour
    // ne pas casser la validation. Reste optionnel pour les nouveaux writes.
    isOutOfTemplate: v.optional(v.boolean()),
  }))),
  jurisdictionNotes: v.optional(v.string()), // Notes on jurisdiction (historique)

  // ──────────────────────────────────────────────────────────────
  // NOUVEAUX SOUS-OBJETS (Phase 1 Fondations) — tous optionnels
  // pour préserver les données existantes (pattern widen)
  // ──────────────────────────────────────────────────────────────

  // Identité étendue (nom officiel multilingue, accréditation, cycle de vie)
  identityExtended: v.optional(orgIdentityExtendedValidator),

  // Protocole diplomatique (chef de poste, grade, credentials)
  protocol: v.optional(orgProtocolValidator),

  // Adresses structurées (physique + postale + correspondance)
  addresses: v.optional(orgAddressesValidator),

  // Juridiction enrichie (primaire, secondaire, sous-juridictions)
  jurisdiction: v.optional(orgJurisdictionValidator),

  // Branding & page publique (logo Storage, couleurs, photos, réseaux sociaux)
  branding: v.optional(orgBrandingValidator),

  // Canaux de contact (téléphones, emails) — page publique de la représentation
  contacts: v.optional(
    v.object({
      channels: v.array(
        v.object({
          kind: v.string(),
          value: v.string(),
          label: v.optional(v.string()),
          available247: v.optional(v.boolean()),
          order: v.number(),
        }),
      ),
    }),
  ),

  // ──────────────────────────────────────────────────────────────
  // Modèles de documents explicitement attribués à cette représentation
  // ──────────────────────────────────────────────────────────────
  //
  // Complète le mécanisme d'applicabilité porté par `documentTemplates`
  // (`applicability: "all" | "specificOrgTypes"`). Les IDs listés ici sont
  // **en plus** de ce que l'applicabilité globale autorise déjà — un super-
  // admin peut ainsi attribuer un modèle restreint à un type différent
  // directement à une représentation précise, ou rendre un modèle visible
  // pour cette rep uniquement.
  //
  // La résolution côté `documentTemplates.listByOrg` retourne l'UNION :
  //   [templates visibles via applicability] ∪ [templates listés ici]
  assignedTemplateIds: v.optional(v.array(v.id("documentTemplates"))),

  // Status
  isActive: v.boolean(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()), // Soft delete
})
  .index("by_slug", ["slug"])
  .index("by_country", ["country"])
  .index("by_parent", ["parentOrgId"])
  .index("by_active_notDeleted", ["isActive", "deletedAt"])
  // Index Phase 1 administration.ga : filtrage par niveau hiérarchique.
  // Permet par exemple `getOrgsByLevel(0)` pour lister toutes les institutions
  // souveraines, ou `getOrgsByLevel(1)` pour tous les ministères.
  .index("by_tutelle_level", ["tutelleLevel"])
  // Index composé : enfants d'un parent à un niveau donné. Utile pour
  // `getOrgsByTutelle(parentOrgId)` quand on veut filtrer sur tutelleLevel.
  .index("by_parent_level", ["parentOrgId", "tutelleLevel"])
  .searchIndex("search_name", { searchField: "name" });
