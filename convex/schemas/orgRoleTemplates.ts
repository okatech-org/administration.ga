import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";
import { taskCodeValidator } from "../lib/taskCodes";
import { moduleCodeValidator } from "../lib/moduleCodes";

/**
 * Table orgRoleTemplates — Templates de rôles personnalisables par organisation
 * Phase C3
 *
 * Permet à un super admin de définir des « rôles types » réutilisables (ex:
 * « Vice-Consul Visa », « Agent Polyvalent ») avec un préset de tâches et
 * d'accès modules. Lors de la création d'un nouveau poste, l'utilisateur peut
 * partir d'un template au lieu de cocher manuellement 15+ tâches.
 *
 * Différence vs les templates système (`ORGANIZATION_TEMPLATES` dans roles.ts) :
 *   - Les templates org sont éditables par l'utilisateur
 *   - Ils sont scopés à une org spécifique
 *   - Ils peuvent être copiés depuis les templates système ou créés from scratch
 */

export const orgRoleTemplatesTable = defineTable({
  orgId: v.id("orgs"),

  // Identité du template
  code: v.string(), // ex: "vice_consul_visa"
  name: localizedStringValidator, // { fr: "Vice-Consul Visa", en: "Vice-Consul Visa" }
  description: v.optional(localizedStringValidator),
  grade: v.optional(
    v.union(
      v.literal("chief"),
      v.literal("deputy_chief"),
      v.literal("counselor"),
      v.literal("agent"),
      v.literal("external"),
    ),
  ),

  // Préset de tâches (sera copié dans la position au moment de l'utilisation)
  taskPresets: v.array(taskCodeValidator),

  // Préset d'accès aux modules (équivalent à position.moduleAccess)
  moduleAccess: v.optional(
    v.array(
      v.object({
        moduleCode: moduleCodeValidator,
        accessLevel: v.union(
          v.literal("reader"),
          v.literal("editor"),
          v.literal("admin"),
        ),
      }),
    ),
  ),

  // Origine : créé depuis un template système ou from scratch
  basedOnSystemTemplate: v.optional(v.string()), // ex: "consul_general"

  // Utilisation (compteur dénormalisé pour stats UI)
  usageCount: v.optional(v.number()),

  // Audit
  createdBy: v.id("users"),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_active", ["orgId", "deletedAt"])
  .index("by_org_code", ["orgId", "code"]);
