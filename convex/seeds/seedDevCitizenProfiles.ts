/**
 * Seed des profils consulaires pour les comptes citoyens de démo.
 *
 * Chaque user (déjà créé par `seedDevAuthUsers`) reçoit ici un profil
 * minimal mais valide : userType + identity + pays de résidence +
 * `managedByOrgId` rattaché au consulat/ambassade compétent.
 *
 * Cela évite l'écran "Profil introuvable" sur /my-space côté citizen-web.
 *
 * Usage :
 *   bunx convex run seeds/seedDevCitizenProfiles:seedDevCitizenProfiles
 *
 * Idempotent : skip si un profil existe déjà pour l'user.
 */

import { internalMutation } from "../_generated/server";
import { Gender, PublicUserType } from "../lib/constants";
import { CountryCode } from "../lib/countryCodeValidator";

// ─────────────────────────────────────────────────────────────
// Profils à créer
// ─────────────────────────────────────────────────────────────

interface CitizenSeed {
	email: string;
	userType: PublicUserType;
	identity: {
		firstName: string;
		lastName: string;
		gender?: Gender;
		nationality: CountryCode;
		birthDate?: number;
		birthPlace?: string;
		birthCountry?: CountryCode;
	};
	countryOfResidence: CountryCode;
	// Slug de l'org gestionnaire (fr-consulat-paris, fr-ambassade-paris, es-ambassade-madrid)
	managedByOrgSlug?: string;
	phone?: string;
	addresses?: {
		residence?: { street: string; city: string; postalCode: string; country: CountryCode };
	};
}

// Date helper pour des âges plausibles
const yearsAgo = (years: number): number =>
	new Date(Date.now() - years * 365.25 * 24 * 60 * 60 * 1000).getTime();

const CITIZEN_PROFILES: CitizenSeed[] = [
	{
		email: "pellen-lakoumba.gueylord@yopmail.com",
		userType: PublicUserType.LongStay,
		identity: {
			firstName: "Gueylord",
			lastName: "PELLEN-LAKOUMBA",
			gender: Gender.Male,
			nationality: CountryCode.GA,
			birthDate: yearsAgo(34),
			birthPlace: "Libreville",
			birthCountry: CountryCode.GA,
		},
		countryOfResidence: CountryCode.FR,
		managedByOrgSlug: "fr-consulat-paris",
		phone: "+33 6 12 34 56 78",
		addresses: {
			residence: {
				street: "15 rue de Vaugirard",
				city: "Paris",
				postalCode: "75006",
				country: CountryCode.FR,
			},
		},
	},
	{
		email: "marie.ntsaga@yopmail.com",
		userType: PublicUserType.LongStay,
		identity: {
			firstName: "Marie",
			lastName: "NTSAGA",
			gender: Gender.Female,
			nationality: CountryCode.GA,
			birthDate: yearsAgo(29),
			birthPlace: "Port-Gentil",
			birthCountry: CountryCode.GA,
		},
		countryOfResidence: CountryCode.FR,
		managedByOrgSlug: "fr-consulat-paris",
		phone: "+33 6 78 90 12 34",
		addresses: {
			residence: {
				street: "42 boulevard Saint-Michel",
				city: "Paris",
				postalCode: "75005",
				country: CountryCode.FR,
			},
		},
	},
	{
		email: "jp.obame@yopmail.com",
		userType: PublicUserType.LongStay,
		identity: {
			firstName: "Jean-Pierre",
			lastName: "OBAME",
			gender: Gender.Male,
			nationality: CountryCode.GA,
			birthDate: yearsAgo(45),
			birthPlace: "Franceville",
			birthCountry: CountryCode.GA,
		},
		countryOfResidence: CountryCode.FR,
		managedByOrgSlug: "fr-consulat-paris",
		phone: "+33 7 23 45 67 89",
		addresses: {
			residence: {
				street: "8 avenue de la République",
				city: "Lyon",
				postalCode: "69003",
				country: CountryCode.FR,
			},
		},
	},
	{
		email: "sylvie.mouketou@yopmail.com",
		userType: PublicUserType.LongStay,
		identity: {
			firstName: "Sylvie",
			lastName: "MOUKETOU",
			gender: Gender.Female,
			nationality: CountryCode.GA,
			birthDate: yearsAgo(38),
			birthPlace: "Libreville",
			birthCountry: CountryCode.GA,
		},
		countryOfResidence: CountryCode.ES,
		managedByOrgSlug: "es-ambassade-madrid",
		phone: "+34 612 345 678",
		addresses: {
			residence: {
				street: "Calle de Alcalá 123",
				city: "Madrid",
				postalCode: "28009",
				country: CountryCode.ES,
			},
		},
	},
	{
		email: "christian.ndoumbe@yopmail.com",
		userType: PublicUserType.LongStay,
		identity: {
			firstName: "Christian",
			lastName: "NDOUMBE",
			gender: Gender.Male,
			nationality: CountryCode.GA,
			birthDate: yearsAgo(41),
			birthPlace: "Oyem",
			birthCountry: CountryCode.GA,
		},
		countryOfResidence: CountryCode.CA,
		// Pas d'org gestionnaire (Canada non seedé) — restera optionnel
		phone: "+1 514 555 0123",
		addresses: {
			residence: {
				street: "1234 rue Sainte-Catherine Ouest",
				city: "Montréal",
				postalCode: "H3B 1B6",
				country: CountryCode.CA,
			},
		},
	},
	{
		email: "sophie.martin@example.fr",
		userType: PublicUserType.VisaTourism,
		identity: {
			firstName: "Sophie",
			lastName: "MARTIN",
			gender: Gender.Female,
			nationality: CountryCode.FR,
			birthDate: yearsAgo(31),
			birthPlace: "Lille",
			birthCountry: CountryCode.FR,
		},
		countryOfResidence: CountryCode.FR,
		managedByOrgSlug: "fr-ambassade-paris",
		phone: "+33 6 55 44 33 22",
		addresses: {
			residence: {
				street: "76 rue Lecourbe",
				city: "Paris",
				postalCode: "75015",
				country: CountryCode.FR,
			},
		},
	},
];

// ─────────────────────────────────────────────────────────────
// Mutation
// ─────────────────────────────────────────────────────────────

export const seedDevCitizenProfiles = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const results = {
			profilesCreated: 0,
			profilesSkipped: 0,
			usersNotFound: 0,
			orgsNotFound: 0,
			errors: [] as string[],
		};

		for (const profile of CITIZEN_PROFILES) {
			try {
				// 1. Trouver l'user Convex par email
				const user = await ctx.db
					.query("users")
					.withIndex("by_email", (q) => q.eq("email", profile.email))
					.unique();

				if (!user) {
					results.usersNotFound++;
					results.errors.push(`User introuvable : ${profile.email}`);
					continue;
				}

				// 2. Skip si profil existe déjà
				const existing = await ctx.db
					.query("profiles")
					.withIndex("by_user", (q) => q.eq("userId", user._id))
					.unique();

				if (existing) {
					results.profilesSkipped++;
					continue;
				}

				// 3. Résoudre l'org gestionnaire par slug (optionnel)
				let managedByOrgId: any = undefined;
				if (profile.managedByOrgSlug) {
					const org = await ctx.db
						.query("orgs")
						.withIndex("by_slug", (q) => q.eq("slug", profile.managedByOrgSlug as string))
						.unique();
					if (org) {
						managedByOrgId = org._id;
					} else {
						results.orgsNotFound++;
					}
				}

				// 4. Insérer le profil
				await ctx.db.insert("profiles", {
					userId: user._id,
					userType: profile.userType,
					countryOfResidence: profile.countryOfResidence,
					managedByOrgId,
					identity: {
						firstName: profile.identity.firstName,
						lastName: profile.identity.lastName,
						gender: profile.identity.gender,
						nationality: profile.identity.nationality,
						birthDate: profile.identity.birthDate,
						birthPlace: profile.identity.birthPlace,
						birthCountry: profile.identity.birthCountry,
					},
					addresses: profile.addresses ?? {},
					contacts: {
						email: profile.email,
						phone: profile.phone,
					},
					family: {},
					completionScore: 60,
					updatedAt: now,
				});
				results.profilesCreated++;
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				results.errors.push(`${profile.email}: ${msg}`);
			}
		}

		return results;
	},
});
