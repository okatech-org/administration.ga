import { query } from "./_generated/server";

export const find1982 = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.filter(p => {
       if (!p.identity?.birthDate) return false;
       const d = new Date(p.identity.birthDate);
       return d.getFullYear() === 1982 || d.getFullYear() === 1984 || d.getFullYear() === 1985;
    });
  }
});
