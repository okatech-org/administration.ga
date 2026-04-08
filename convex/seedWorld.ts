import { mutation } from "./_generated/server";
import { seedWorldGuides } from "./seeds/guides_world";

export const run = mutation({
  handler: async (ctx) => {
    await seedWorldGuides(ctx);
    return "Seeded WORLD guides successfully.";
  },
});
