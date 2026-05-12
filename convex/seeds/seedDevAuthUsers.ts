/**
 * Seed des utilisateurs de démo pour le bouton DEV Account Switcher.
 *
 * Crée les comptes Better Auth (`components.betterAuth.adapter`) + les rows
 * correspondantes dans la table `users` Convex. Utilisé pour permettre le
 * dev sign-in (`/dev/sign-in`) sans flow d'inscription manuel.
 *
 * Usage :
 *   bunx convex run seeds/seedDevAuthUsers:seedDevAuthUsers
 *
 * Idempotent : si l'email existe déjà côté Better Auth, on passe en mode
 * "skip" pour cet utilisateur.
 */

import { internalMutation } from "../_generated/server";
import { components } from "../_generated/api";

interface DevSeedAccount {
	email: string;
	name: string;
	isSuperadmin?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Comptes à seeder — alignés avec apps/*/. env.local NEXT_PUBLIC_DEV_ACCOUNTS
// ─────────────────────────────────────────────────────────────

const DEV_ACCOUNTS: DevSeedAccount[] = [
	// ── Superadmin / Admins (backoffice) ──
	{ email: "iasted@me.com", name: "iAsted SuperAdmin", isSuperadmin: true },
	{ email: "admin@okafrancois.dev", name: "Assistant Agent" },
	{ email: "admin+manager@okafrancois.dev", name: "Manager Test" },
	{ email: "okatech+jerome@icloud.com", name: "Jerome Agent" },

	// ── Citoyens gabonais résidents à l'étranger (citizen-web) ──
	{ email: "pellen-lakoumba.gueylord@yopmail.com", name: "PELLEN-LAKOUMBA Gueylord" },
	{ email: "marie.ntsaga@yopmail.com", name: "NTSAGA Marie" },
	{ email: "jp.obame@yopmail.com", name: "OBAME Jean-Pierre" },
	{ email: "sylvie.mouketou@yopmail.com", name: "MOUKETOU Sylvie" },
	{ email: "christian.ndoumbe@yopmail.com", name: "NDOUMBE Christian" },

	// ── Ressortissant étranger (citizen-web) ──
	{ email: "sophie.martin@example.fr", name: "Sophie MARTIN" },

	// ── Consulat Général du Gabon en France (agent-web) ──
	{ email: "consul-general@consulatdugabon.fr", name: "Consul Général" },
	{ email: "consul@consulatdugabon.fr", name: "Gwenaëlle NTSAGA" },
	{ email: "vice-consul1@consulatdugabon.fr", name: "Christiane MOUELE" },
	{ email: "vice-consul2@consulatdugabon.fr", name: "Madina ANDJAYI KEITA" },
	{ email: "secretaire1@consulatdugabon.fr", name: "Léa Marcelle ASSEH AKORE" },
	{ email: "secretaire2@consulatdugabon.fr", name: "Nelly CALAMEPAT" },
	{ email: "secretaire3@consulatdugabon.fr", name: "Jacqueline MPEMBA" },
	{ email: "assistant-admin1@consulatdugabon.fr", name: "Carmel Leger KINGA MIHINDOU" },
	{ email: "assistant-admin2@consulatdugabon.fr", name: "Ray Proclèm NGOMONDAMI" },

	// ── Ambassade du Gabon en France (agent-web) ──
	{ email: "ambassadeur@ambassadedugabon.fr", name: "Marc Ngoubou" },
	{ email: "agent@ambassadedugabon.fr", name: "Isaac Koumba" },

	// ── Ambassade du Gabon en Espagne (agent-web) ──
	{ email: "ambassadegabon.madrid@gmail.com", name: "Allegra Pamela BONGO" },
	{ email: "ognagnaf@yahoo.fr", name: "Franck Elvis OGNAGNA OCKOGHO" },
	{ email: "chancellerie.es@gmail.com", name: "Mélanie EKIBA" },
	{ email: "chrisalline.mouyapou@gouv.ga", name: "Chrisalline MOUYAPOU NGOUBOU" },
];

// ─────────────────────────────────────────────────────────────
// Mutation
// ─────────────────────────────────────────────────────────────

export const seedDevAuthUsers = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const results = {
			betterAuthCreated: 0,
			betterAuthSkipped: 0,
			convexUsersCreated: 0,
			convexUsersSkipped: 0,
			errors: [] as string[],
		};

		for (const account of DEV_ACCOUNTS) {
			try {
				// ── 1. Vérifier si l'user Better Auth existe déjà ──
				const existing = await ctx.runQuery(
					components.betterAuth.adapter.findMany,
					{
						model: "user",
						where: [{ field: "email", value: account.email }],
						paginationOpts: { numItems: 1, cursor: null },
					},
				);
				const existingUsers = ((existing as any)?.page ?? existing ?? []) as any[];

				let authUserId: string;

				if (existingUsers.length > 0) {
					authUserId = String(existingUsers[0]._id ?? existingUsers[0].id);
					results.betterAuthSkipped++;

					// On s'assure que emailVerified est bien à true (sinon /dev/sign-in échoue)
					if (!existingUsers[0].emailVerified) {
						await ctx.runMutation(components.betterAuth.adapter.updateOne, {
							input: {
								model: "user",
								where: [{ field: "_id", value: existingUsers[0]._id ?? existingUsers[0].id }],
								update: { emailVerified: true },
							},
						} as any);
					}
				} else {
					// ── 2. Créer l'user Better Auth ──
					const createResult = await ctx.runMutation(
						components.betterAuth.adapter.create,
						{
							input: {
								model: "user",
								data: {
									email: account.email,
									name: account.name,
									emailVerified: true,
									image: null,
									createdAt: now,
									updatedAt: now,
								},
							},
						} as any,
					);
					authUserId = String((createResult as any)._id ?? (createResult as any).id);
					results.betterAuthCreated++;
				}

				// ── 3. Vérifier si la row Convex `users` existe ──
				const existingConvexUser = await ctx.db
					.query("users")
					.withIndex("by_authId", (q) => q.eq("authId", authUserId))
					.unique();

				if (existingConvexUser) {
					results.convexUsersSkipped++;
					continue;
				}

				// Vérifier aussi par email (cas placeholder pre-existant)
				const byEmail = await ctx.db
					.query("users")
					.withIndex("by_email", (q) => q.eq("email", account.email))
					.unique();

				if (byEmail) {
					// Lier la row existante au nouveau authId
					await ctx.db.patch(byEmail._id, {
						authId: authUserId,
						name: account.name,
						updatedAt: now,
					});
					results.convexUsersSkipped++;
					continue;
				}

				// ── 4. Créer la row Convex `users` ──
				await ctx.db.insert("users", {
					authId: authUserId,
					email: account.email,
					name: account.name,
					isActive: true,
					isSuperadmin: account.isSuperadmin ?? false,
					updatedAt: now,
				});
				results.convexUsersCreated++;
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				results.errors.push(`${account.email}: ${msg}`);
			}
		}

		return results;
	},
});
