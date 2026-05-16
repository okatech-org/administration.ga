/**
 * Récupère tous les staffs (memberships actifs) des orgs spécifiées par slug.
 * Évite le scan complet de `users` qui dépasse la limite 4096 reads sur le cloud.
 */
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

interface StaffEntry {
  label: string;
  email: string;
  role: string;
  orgSlug: string;
  orgName: string;
}

export const listOrgStaff = internalQuery({
  args: { orgSlugs: v.array(v.string()) },
  handler: async (ctx, { orgSlugs }): Promise<StaffEntry[]> => {
    const result: StaffEntry[] = [];

    for (const slug of orgSlugs) {
      const org = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!org) continue;

      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect();

      for (const m of memberships) {
        if (m.deletedAt) continue;
        const user = await ctx.db.get(m.userId);
        if (!user || !user.email || !user.isActive) continue;

        let positionCode = "";
        if (m.positionId) {
          const position = await ctx.db.get(m.positionId);
          if (position) positionCode = ((position as any).code ?? "") as string;
        }

        const label =
          user.name ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          user.email;

        result.push({
          label,
          email: user.email,
          role: positionCode || "agent",
          orgSlug: slug,
          orgName: org.name ?? slug,
        });
      }
    }

    result.sort(
      (a, b) =>
        a.orgName.localeCompare(b.orgName, "fr") ||
        a.label.localeCompare(b.label, "fr"),
    );
    return result;
  },
});
