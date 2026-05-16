/**
 * BO_SEGMENTS — Taxonomie unifiée des segments iAsted côté Back-Office.
 *
 * Partagée par les onglets iAppel / iChat / iContact pour garantir un filtre
 * cohérent. Mapping métier :
 *   - Tous                : toutes populations confondues
 *   - Back-Office         : équipe de l'org + admins plateforme
 *   - Corps Diplomatique  : agents des autres représentations diplomatiques
 *   - Ressortissants      : profils consulaires gabonais (LongStay/ShortStay)
 *   - Étrangers           : profils consulaires étrangers (visa + admin services)
 *
 * Le filtre par segment est appliqué côté Convex via `searchContacts.source`.
 */

import { Briefcase, Globe, IdCard, Plane, Users } from "lucide-react";
import type { ContactSource } from "@/hooks/useContactSearch";

export interface BOSegment {
	id: ContactSource | "all";
	label: string;
	icon: typeof Users;
	hint?: string;
}

export const BO_SEGMENTS: BOSegment[] = [
	{
		id: "all",
		label: "Tous",
		icon: Users,
		hint: "Toutes populations confondues",
	},
	{
		id: "team",
		label: "Back-Office",
		icon: Briefcase,
		hint: "Équipe de la représentation + admins plateforme",
	},
	{
		id: "network",
		label: "Corps Diplomatique",
		icon: Globe,
		hint: "Agents des autres représentations diplomatiques",
	},
	{
		id: "citizens",
		label: "Ressortissants",
		icon: IdCard,
		hint: "Profils consulaires gabonais",
	},
	{
		id: "foreigners",
		label: "Étrangers",
		icon: Plane,
		hint: "Profils consulaires étrangers (visa, services admin)",
	},
];
