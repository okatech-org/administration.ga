/**
 * Seed les defaults `aiCapabilityConfig` pour toutes les orgs existantes.
 *
 * N'ACTIVE PAS le module `ai_assistant` — l'opt-in reste manuel via le
 * backoffice (ajout dans `org.modules[]`). Cette migration cree seulement
 * les rows de config par capability avec des defauts securises :
 *   - enabled: false
 *   - autoApplyAllowed: false
 *   - maxSensitivity: "medium"
 *   - dailyBudgetMicroCents: 100 cents = 100 000 000 micro-cents
 *
 * Ainsi, des qu'un admin ouvre l'onglet AI Assistant d'une org, les
 * 12 rows par capability sont deja presentes et il peut toggler sans
 * creation prealable.
 *
 * Idempotent — skip les (orgId, capabilityCode) deja en base.
 *
 * Invocation manuelle (dashboard Convex) :
 *   internal.migrations.addAiAssistantModule.run
 */

import { internalMutation } from "../_generated/server";

const ALL_CAPABILITIES = [
  "request_triage",
  "document_analysis",
  "document_drafting",
  "auto_summary",
  "next_step_suggestion",
  "risk_detection",
  "proactive_notifications",
  "voice_assist",
  "bulk_actions_helper",
  "correspondance_drafting",
  "meeting_prep",
  "compliance_check",
] as const;

const DEFAULT_BUDGET_MICRO_CENTS = 100_000_000; // = 100 cents = $1/jour

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let orgsScanned = 0;
    let created = 0;
    let alreadyPresent = 0;

    const orgs = await ctx.db.query("orgs").collect();

    for (const org of orgs) {
      orgsScanned++;

      for (const capabilityCode of ALL_CAPABILITIES) {
        const existing = await ctx.db
          .query("aiCapabilityConfig")
          .withIndex("by_org_capability", (q) =>
            q.eq("orgId", org._id).eq("capabilityCode", capabilityCode),
          )
          .unique();

        if (existing) {
          alreadyPresent++;
          continue;
        }

        await ctx.db.insert("aiCapabilityConfig", {
          orgId: org._id,
          capabilityCode,
          enabled: false,
          autoApplyAllowed: false,
          maxSensitivity: "medium",
          dailyBudgetMicroCents: DEFAULT_BUDGET_MICRO_CENTS,
          updatedAt: Date.now(),
        });
        created++;
      }
    }

    return { orgsScanned, created, alreadyPresent };
  },
});
