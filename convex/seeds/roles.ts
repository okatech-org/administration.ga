/**
 * Seed du système de rôles
 *
 * Initialise les positions et groupes ministériels
 * pour toutes les organisations existantes en base.
 *
 * Les presets de tâches sont définis dans le code (POSITION_TASK_PRESETS),
 * plus besoin de table `roleModules`.
 *
 * Utilisation:
 *   npx convex run seeds/roles:seedOrgRoles
 *
 * Ordre d'exécution:
 *   1. seedDiplomaticNetwork (si pas déjà fait)
 *   2. seedOrgRoles — crée positions + ministryGroups pour chaque org
 */
import { mutation } from "../_generated/server";
import {
  getOrgTemplate,
  getPresetTasks,
  type OrgTemplateType,
} from "../lib/roles";

// ═══════════════════════════════════════════════════════════════
// 1. SEED ORG ROLES (positions + ministry groups)
// ═══════════════════════════════════════════════════════════════

/**
 * Pour chaque organisation existante sans positions,
 * applique le template correspondant à son `type`.
 *
 * Crée:
 *   - ministryGroups (si le template en a)
 *   - positions (avec lien vers ministryGroupId)
 *
 * Idempotent — skip les orgs déjà initialisées.
 */
export const seedOrgRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      orgsProcessed: 0,
      orgsSkipped: 0,
      positionsCreated: 0,
      ministryGroupsCreated: 0,
      errors: [] as string[],
    };

    // Get all orgs
    const allOrgs = await ctx.db.query("orgs").collect();

    for (const org of allOrgs) {
      try {
        // Skip if already has positions
        const existingPositions = await ctx.db
          .query("positions")
          .withIndex("by_org", (q) => q.eq("orgId", org._id).eq("isActive", true))
          .first();

        if (existingPositions) {
          results.orgsSkipped++;
          continue;
        }

        // Find the matching template
        const orgType = (org as any).type as string | undefined;
        if (!orgType) {
          results.errors.push(`${org.slug}: no type field`);
          continue;
        }

        const template = getOrgTemplate(orgType as OrgTemplateType);
        if (!template) {
          results.errors.push(`${org.slug}: no template for type "${orgType}"`);
          continue;
        }

        const now = Date.now();

        // Create ministry groups
        const ministryGroupIds: Record<string, string> = {};
        if (template.ministryGroups) {
          for (const group of template.ministryGroups) {
            const id = await ctx.db.insert("ministryGroups", {
              orgId: org._id,
              code: group.code,
              label: group.label,
              description: group.description,
              icon: group.icon,
              sortOrder: group.sortOrder,
              parentCode: group.parentCode,
              isActive: true,
            });
            ministryGroupIds[group.code] = id;
            results.ministryGroupsCreated++;
          }
        }

        // Create positions
        for (const pos of template.positions) {
          await ctx.db.insert("positions", {
            orgId: org._id,
            code: pos.code,
            title: pos.title,
            description: pos.description,
            level: pos.level,
            grade: pos.grade,
            ministryGroupId: pos.ministryCode
              ? (ministryGroupIds[pos.ministryCode] as any)
              : undefined,
            tasks: getPresetTasks(pos.taskPresets),
            isRequired: pos.isRequired,
            isActive: true,
            updatedAt: now,
          });
          results.positionsCreated++;
        }

        // Set org modules from template
        await ctx.db.patch(org._id, { modules: template.modules });

        results.orgsProcessed++;
      } catch (error) {
        results.errors.push(
          `${org.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return results;
  },
});

// ═══════════════════════════════════════════════════════════════
// 2. SYNC — Update existing positions' tasks from presets
// ═══════════════════════════════════════════════════════════════

/**
 * Re-derive every position's `tasks` array from its code → template → taskPresets.
 * Non-destructive: only patches the tasks field, leaves everything else intact.
 *
 * Usage:
 *   npx convex run seeds/roles:syncPositionTasks
 */
export const syncPositionTasks = mutation({
  args: {},
  handler: async (ctx) => {
    const results = { updated: 0, skipped: 0, errors: [] as string[] };

    const allOrgs = await ctx.db.query("orgs").collect();

    for (const org of allOrgs) {
      const orgType = (org as any).type as string | undefined;
      if (!orgType) continue;

      const template = getOrgTemplate(orgType as OrgTemplateType);
      if (!template) continue;

      const positions = await ctx.db
        .query("positions")
        .withIndex("by_org", (q) => q.eq("orgId", org._id).eq("isActive", true))
        .collect();

      for (const pos of positions) {
        const tpl = template.positions.find((t) => t.code === pos.code);
        if (!tpl) {
          results.skipped++;
          continue;
        }

        const newTasks = getPresetTasks(tpl.taskPresets);
        await ctx.db.patch(pos._id, { tasks: newTasks, updatedAt: Date.now() });
        results.updated++;
      }

      // Also sync org modules from template
      await ctx.db.patch(org._id, { modules: template.modules });
    }

    return results;
  },
});

// ═══════════════════════════════════════════════════════════════
// 3. CLEANUP — Remove all role data (dev only)
// ═══════════════════════════════════════════════════════════════

/**
 * Supprime TOUTES les données de rôles (dev/reset uniquement).
 *   Destructif — ne pas utiliser en production.
 */
export const purgeAllRoleData = mutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;

    // Delete all positions
    const positions = await ctx.db.query("positions").collect();
    for (const p of positions) {
      await ctx.db.delete(p._id);
      deleted++;
    }

    // Delete all ministry groups
    const groups = await ctx.db.query("ministryGroups").collect();
    for (const g of groups) {
      await ctx.db.delete(g._id);
      deleted++;
    }

    return { deleted };
  },
});
