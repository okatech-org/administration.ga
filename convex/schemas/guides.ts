import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Guide types — les 3 piliers de contenu contextualise
 */
export const guideTypeValidator = v.union(
  v.literal("arrival"),    // Guide d'arrivee & integration
  v.literal("practical"),  // Guide pratique / vie dans le pays
  v.literal("return"),     // Guide de retour au Gabon
);

/**
 * Localized string validator (fr + en)
 */
const localizedStringLiteValidator = v.object({
  fr: v.string(),
  en: v.string(),
});

/**
 * Guide section item (accordion content)
 */
const guideItemValidator = v.object({
  title: v.string(),
  detail: v.string(),
});

/**
 * External link
 */
const usefulLinkValidator = v.object({
  label: v.string(),
  url: v.string(),
  description: v.string(),
});

/**
 * Guide section — une section thematique du guide
 */
const guideSectionValidator = v.object({
  id: v.string(),
  iconName: v.string(),   // Nom Lucide serialise (ex: "Plane", "Heart")
  title: v.string(),
  color: v.string(),      // Classe CSS couleur texte
  iconBg: v.string(),     // Classe CSS fond icone
  intro: v.string(),
  image: v.optional(v.string()),
  items: v.array(guideItemValidator),
  tips: v.array(v.string()),
  links: v.optional(v.array(usefulLinkValidator)),
});

/**
 * Savoir-vivre item (conseils culturels)
 */
const savoirVivreItemValidator = v.object({
  iconName: v.string(),
  title: v.string(),
  description: v.string(),
});

/**
 * Common mistake item
 */
const erreurItemValidator = v.object({
  erreur: v.string(),
  conseil: v.string(),
});

/**
 * Useful number/contact
 */
const numeroUtileValidator = v.object({
  label: v.string(),
  number: v.string(),
  color: v.string(),
  category: v.union(v.literal("local"), v.literal("gabon")),
  type: v.union(v.literal("phone"), v.literal("email"), v.literal("address")),
  description: v.optional(v.string()),
});

/**
 * Guides table — contenu contextualise par pays
 *
 * Chaque guide est identifie par (type, countryCode).
 * Le countryCode "WORLD" sert de fallback generique.
 */
export const guidesTable = defineTable({
  // Identite
  slug: v.string(),
  type: guideTypeValidator,
  countryCode: v.string(), // CountryCode ou "WORLD"

  // Contenu bilingue
  title: localizedStringLiteValidator,
  subtitle: localizedStringLiteValidator,
  heroImage: v.optional(v.string()),

  // Sections structurees
  sections: v.array(guideSectionValidator),

  // Sections speciales (optionnelles)
  savoirVivre: v.optional(v.array(savoirVivreItemValidator)),
  erreurs: v.optional(v.array(erreurItemValidator)),
  numeros: v.optional(v.array(numeroUtileValidator)),

  // Rattachement
  orgId: v.optional(v.id("orgs")),

  // Meta
  isActive: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_type_country", ["type", "countryCode"])
  .index("by_country", ["countryCode"])
  .index("by_slug", ["slug"])
  .index("by_active", ["isActive"]);
