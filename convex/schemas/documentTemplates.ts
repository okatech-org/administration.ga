import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
	serviceCategoryValidator,
	localizedStringValidator,
	orgTypeValidator,
} from "../lib/validators";

/**
 * Style typographique d'un niveau de titre (h1/h2/h3).
 * Factorisé car le validateur est identique pour les 3 niveaux.
 */
function headingStyleValidator() {
	return v.object({
		fontSize: v.number(),
		bold: v.boolean(),
		uppercase: v.boolean(),
		spacingBefore: v.optional(v.number()),
		spacingAfter: v.optional(v.number()),
		alignment: v.optional(
			v.union(
				v.literal("left"),
				v.literal("center"),
				v.literal("right"),
				v.literal("justify"),
			),
		),
	});
}

/** Formule stylistique (ouverture / clôture) optionnellement spécialisée. */
function formulaValidator() {
	return v.object({
		text: v.string(),
		templateType: v.optional(
			v.union(
				v.literal("certificate"),
				v.literal("attestation"),
				v.literal("receipt"),
				v.literal("letter"),
				v.literal("custom"),
			),
		),
	});
}

/**
 * Document Templates — templates for generating official PDF documents
 * (attestations, certificates, receipts, letters...).
 *
 * The `content` field is now a Tiptap JSON document (ProseMirror node tree).
 * Live preview, HTML serialization and PDF generation all walk this same tree
 * via the shared `@workspace/document-rendering` package.
 *
 * Templates are either global (managed by the platform super admin — read-only
 * for orgs) or org-specific (managed by agents with `documents.templates.manage`).
 * Every meaningful edit snapshots the current state into
 * `documentTemplateVersions`, preserving history.
 */
export const documentTemplatesTable = defineTable({
	// Basic info (localized labels)
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// Category — matches service categories
	category: v.optional(serviceCategoryValidator),

	// Optional link to a specific consular service
	serviceId: v.optional(v.id("services")),

	// Template type (certificate / attestation / receipt / letter / custom)
	templateType: v.union(
		v.literal("certificate"),
		v.literal("attestation"),
		v.literal("receipt"),
		v.literal("letter"),
		v.literal("custom")
	),

	// Tiptap JSON document. Validated at runtime — schema is too recursive for
	// `v` validators to express precisely.
	content: v.any(),

	// Cached HTML rendering of `content` (regenerated on save). Allows cheap
	// listing previews without re-running the Tiptap renderer.
	contentHtml: v.optional(v.string()),

	// Placeholders declared on the template. The picker UI reads this list and
	// the resolver validates all placeholder keys encountered in `content` are
	// covered here (fail-fast at generation time).
	placeholders: v.optional(
		v.array(
			v.object({
				key: v.string(),
				// Label kept optional for back-compat — newer templates rely on
				// the key alone (snake_case is human-readable enough).
				label: v.optional(localizedStringValidator),
				source: v.union(
					v.literal("user"),
					v.literal("profile"),
					v.literal("request"),
					v.literal("formData"),
					v.literal("org"),
					v.literal("system")
				),
				// Optional JSONPath against the source bucket (e.g. `identity.firstName`).
				path: v.optional(v.string()),
			})
		)
	),

	// Ownership
	orgId: v.optional(v.id("orgs")), // null = global template
	createdBy: v.optional(v.id("users")),

	// Visibility / lifecycle
	isGlobal: v.boolean(),
	isActive: v.boolean(),

	// ─── Accessibility by organization type (legacy) ─────────────────────
	// DEPRECATED — préférer `applicability` + `applicableOrgTypes` ci-dessous.
	// Conservé pour compatibilité avec les documents existants et lu en
	// fallback si `applicability` n'est pas encore renseigné.
	allowedOrgTypes: v.optional(v.array(orgTypeValidator)),

	// ─── Scope de diffusion (v1) ─────────────────────────────────────────
	// Détermine à quelles représentations ce modèle global s'applique.
	//   - "all"                ⇒ toutes les représentations
	//   - "specificOrgTypes"   ⇒ restreint aux types listés dans `applicableOrgTypes`
	// (v2 : ajouter "specificOrgs" avec `applicableOrgIds` pour cibler des
	// représentations précises.)
	applicability: v.optional(
		v.union(v.literal("all"), v.literal("specificOrgTypes")),
	),
	applicableOrgTypes: v.optional(v.array(orgTypeValidator)),

	// ─── Composition modulaire (3 facettes inline) ───────────────────────
	// Un modèle = 1 contenu Tiptap + 3 facettes qui décrivent sa mise en
	// forme et son style. Les 3 sont optionnelles ; valeurs par défaut
	// appliquées au rendu si absentes. Pas de table séparée — la
	// réutilisation se fait par clonage du modèle entier.

	// Facette 1 : entête (logo + titre institutionnel) + pied de page.
	headerFooter: v.optional(
		v.object({
			header: v.object({
				logoStorageId: v.optional(v.id("_storage")),
				logoAlignment: v.union(
					v.literal("left"),
					v.literal("center"),
					v.literal("right"),
				),
				// Hauteur de la bande d'entête en mm. Fallback : 30 mm.
				height: v.optional(v.number()),
				// Famille de police appliquée au nom de la représentation dans
				// l'entête. Fallback : "Optima". Liste curatée côté UI :
				// voir `HEADING_FONTS` dans EditorToolbar.
				fontFamily: v.optional(v.string()),
				// Contenu Tiptap — titres, adresse, devise.
				content: v.any(),
			}),
			footer: v.object({
				// Hauteur en mm. Fallback : 15 mm.
				height: v.optional(v.number()),
				content: v.any(),
				showPageNumbers: v.optional(v.boolean()),
			}),
		}),
	),

	// Facette 2 : typographie / structure des textes. Traduite en CSS
	// (HTML preview) et en styles React-PDF (export PDF).
	typography: v.optional(
		v.object({
			fontFamily: v.string(),
			fontSizeBase: v.number(), // pt
			lineHeight: v.number(), // multiplicateur
			defaultAlignment: v.union(
				v.literal("left"),
				v.literal("center"),
				v.literal("right"),
				v.literal("justify"),
			),
			headingStyles: v.object({
				h1: headingStyleValidator(),
				h2: headingStyleValidator(),
				h3: headingStyleValidator(),
			}),
			paragraphSpacingBefore: v.optional(v.number()), // mm
			paragraphSpacingAfter: v.optional(v.number()),
			paragraphFirstLineIndent: v.optional(v.number()),
			pageBreakBefore: v.optional(
				v.array(v.union(v.literal("h1"), v.literal("h2"), v.literal("h3"))),
			),
			widowOrphanControl: v.optional(v.boolean()),
			keepHeadingsWithNext: v.optional(v.boolean()),
		}),
	),

	// Facette 3 : voix / argumentaire — MÉTIER IA UNIQUEMENT, pas rendu
	// dans le PDF. Injecté dans le prompt de `templateAI.generateFromDocument`.
	voice: v.optional(
		v.object({
			tone: v.string(),
			register: v.union(
				v.literal("administratif"),
				v.literal("juridique"),
				v.literal("commercial"),
				v.literal("diplomatique"),
				v.literal("neutre"),
			),
			openingFormulas: v.optional(v.array(formulaValidator())),
			closingFormulas: v.optional(v.array(formulaValidator())),
			signatureFormulas: v.optional(v.array(v.string())),
			personPronoun: v.union(
				v.literal("je"),
				v.literal("nous"),
				v.literal("le_consulat"),
				v.literal("impersonnel"),
			),
			useFormalAddress: v.optional(v.boolean()),
			politenessLevel: v.union(
				v.literal("neutre"),
				v.literal("courtois"),
				v.literal("solennel"),
			),
			argumentationGuidelines: v.optional(v.string()),
			vocabularyPreferences: v.optional(
				v.array(
					v.object({
						prefer: v.string(),
						avoid: v.optional(v.array(v.string())),
					}),
				),
			),
		}),
	),

	// Locked once a document has been generated from this template. Further
	// edits force a new version rather than mutating the live record.
	lockedForEditing: v.optional(v.boolean()),
	/** Flipped on at the first generation; purely informational. */
	hasGeneratedDocuments: v.optional(v.boolean()),

	// Generation / publication behaviour
	/** If true, generated documents are automatically visible to the citizen. */
	autoPublishToCitizen: v.optional(v.boolean()),
	/** If true, a document cannot be published to a citizen until it is signed. */
	requireSignature: v.optional(v.boolean()),
	/** Position codes allowed to sign documents produced from this template. */
	allowedSignerPositions: v.optional(v.array(v.string())),

	// Paper settings
	paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
	orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),

	// Page margins in millimetres. Optional — falls back to 20 mm on all sides
	// at render time. Stored as numbers (1 mm = 2.83465 pt).
	marginTop: v.optional(v.number()),
	marginRight: v.optional(v.number()),
	marginBottom: v.optional(v.number()),
	marginLeft: v.optional(v.number()),

	// Clé stable d'identification pour le seed diplomatique — permet de
	// renommer un template (ex : ajouter des accents) sans casser
	// l'idempotence du seed. Présent uniquement sur les 25+1 templates
	// seedés (`diplo_*`, `receipt_default`) ; absent sur les templates
	// créés à la main ou clonés.
	seedKey: v.optional(v.string()),

	// Versioning metadata (history lives in `documentTemplateVersions`)
	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),

	// ─── Clone provenance ────────────────────────────────────────────────
	// Set when this template was created via `cloneFromGlobal`. Used to
	// surface a "source has a newer version" banner and to offer a one-click
	// sync through `syncFromSource`.
	clonedFromTemplateId: v.optional(v.id("documentTemplates")),
	/** Snapshot of the source template's `version` at clone time. */
	clonedFromVersion: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_category", ["category", "isActive"])
	.index("by_service", ["serviceId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_type", ["templateType", "isActive"])
	.index("by_seed_key", ["seedKey"]);
