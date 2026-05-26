import type { MutationCtx } from "../_generated/server";

/**
 * Helper to create a placeholder user for an invite.
 * Can be used by multiple mutations to avoid circular dependencies.
 */
export async function createInvitedUserHelper(
  ctx: MutationCtx,
  email: string,
  name: string,
  firstName?: string,
  lastName?: string
) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (existing) {
    // Mettre à jour le nom si le profil n'a pas encore de vrai nom
    // (Better Auth crée les users avec name = email)
    const needsNameUpdate =
      !existing.name ||
      existing.name === email ||
      (!existing.firstName && firstName);

    if (needsNameUpdate && (firstName || lastName)) {
      await ctx.db.patch(existing._id, {
        ...(name ? { name } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        updatedAt: Date.now(),
      });
    }
    return existing._id;
  }

  // Create placeholder
  return await ctx.db.insert("users", {
    authId: `invite_${email}`,
    email,
    name,
    firstName,
    lastName,
    isActive: true,
    isSuperadmin: false,
    updatedAt: Date.now(),
  });
}
